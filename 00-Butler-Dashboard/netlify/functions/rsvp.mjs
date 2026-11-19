const MAX_RSVP_BYTES = 8 * 1024;
const MAX_MESSAGE_LENGTH = 2_000;
const RSVP_TIMEOUT_MS = 20_000;

const validAttendance = new Set(["Joyfully Accepts", "Regretfully Declines"]);
const validGuestCounts = new Set(["1", "2", "3", "4"]);
const validSwimmingResponses = new Set([
  "Yes, bringing swimwear!",
  "No, main program only",
]);

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  };
}

function isSameOrigin(origin, host) {
  if (typeof origin !== "string" || typeof host !== "string" || !host) {
    return false;
  }

  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

function getAppsScriptUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.hostname !== "script.google.com" ||
      !url.pathname.startsWith("/macros/s/") ||
      !url.pathname.endsWith("/exec")
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Use POST to submit an RSVP." });
  }

  const headers = event.headers || {};
  const origin = headers.origin || headers.Origin;
  const host = headers.host || headers.Host;
  if (!isSameOrigin(origin, host)) {
    return jsonResponse(403, { error: "Same-origin requests only." });
  }

  const contentType = (headers["content-type"] || headers["Content-Type"] || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return jsonResponse(415, { error: "Send the RSVP as JSON." });
  }

  if (typeof event.body !== "string") {
    return jsonResponse(400, { error: "The request body must be valid JSON." });
  }

  const bodyBytes = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body, "utf8");
  if (bodyBytes.length === 0 || bodyBytes.length > MAX_RSVP_BYTES) {
    return jsonResponse(413, { error: "The RSVP request is too large." });
  }

  let payload;
  try {
    payload = JSON.parse(bodyBytes.toString("utf8"));
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
    return jsonResponse(400, { error: "The request body must be valid JSON." });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse(400, { error: "The request body must be a JSON object." });
  }

  const name = payload.name;
  const attendance = payload.attendance;
  const guests = payload.guests;
  const swimming = payload.swimming;
  const message = payload.message ?? "";

  if (typeof name !== "string" || !name.trim() || name.trim().length > 200) {
    return jsonResponse(400, { error: "Enter a name of 1 to 200 characters." });
  }
  if (typeof attendance !== "string" || !validAttendance.has(attendance)) {
    return jsonResponse(400, { error: "Choose a valid attendance response." });
  }
  if (typeof guests !== "string" || !validGuestCounts.has(guests)) {
    return jsonResponse(400, { error: "Choose a valid guest count." });
  }
  if (typeof swimming !== "string" || !validSwimmingResponses.has(swimming)) {
    return jsonResponse(400, { error: "Choose a valid swimming response." });
  }
  if (typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse(400, { error: "The guest names field is too long." });
  }

  const scriptUrl = getAppsScriptUrl(process.env.JM18_GOOGLE_SCRIPT_URL);
  if (!scriptUrl) {
    console.error("RSVP submission is unavailable: JM18_GOOGLE_SCRIPT_URL is not configured.");
    return jsonResponse(503, {
      error: "The RSVP service is not configured yet. Please contact the host.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RSVP_TIMEOUT_MS);
  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendance,
        guests,
        swimming,
      }),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok || !result || result.status !== "success") {
      throw new Error("Google Apps Script did not confirm the RSVP.");
    }

    return jsonResponse(200, { status: "success" });
  } catch (error) {
    console.error("RSVP forwarding failed:", error.name || "UnknownError");
    return jsonResponse(502, {
      error: "We could not submit your RSVP. Please try again later.",
    });
  } finally {
    clearTimeout(timeout);
  }
};
