const RSVP_SPREADSHEET_ID_PROPERTY = "RSVP_SPREADSHEET_ID";
const RSVP_SUMMARY_SHEET_NAME = "RSVP Summary";
const RSVP_SUMMARY_HEADERS = ["Metric", "Count"];
const RSVP_SUMMARY_FIELDS = {
  totalRsvps: "Total RSVPs",
  acceptedRsvps: "Accepted RSVPs",
  declinedRsvps: "Declined RSVPs",
  acceptedGuests: "Accepted Guest Count",
  swimmingGuests: "Swimming Guest Count",
};
const RSVP_ALLOWED_FIELDS = ["attendance", "guests", "swimming"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Missing request data.");
    }

    const data = JSON.parse(e.postData.contents);
    if (!isValidSummarySubmission(data)) {
      throw new Error("Invalid RSVP data.");
    }

    lock.waitLock(10000);
    const sheet = getRsvpSummarySheet();
    const summary = readSummary(sheet);
    addSubmissionToSummary(summary, data);
    writeSummary(sheet, summary);

    return jsonResponse({ status: "success" });
  } catch (error) {
    return jsonResponse({ status: "error" });
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

function isValidSummarySubmission(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }

  const keys = Object.keys(data);
  return keys.length === RSVP_ALLOWED_FIELDS.length &&
    keys.every((key) => RSVP_ALLOWED_FIELDS.includes(key)) &&
    ["Joyfully Accepts", "Regretfully Declines"].includes(data.attendance) &&
    ["1", "2", "3", "4"].includes(data.guests) &&
    ["Yes, bringing swimwear!", "No, main program only"].includes(data.swimming);
}

function getRsvpSummarySheet() {
  const spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty(RSVP_SPREADSHEET_ID_PROPERTY);
  if (!spreadsheetId) {
    throw new Error("RSVP spreadsheet ID is not configured.");
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  let sheet = spreadsheet.getSheetByName(RSVP_SUMMARY_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(RSVP_SUMMARY_SHEET_NAME);
  }
  return sheet;
}

function emptySummary() {
  return {
    totalRsvps: 0,
    acceptedRsvps: 0,
    declinedRsvps: 0,
    acceptedGuests: 0,
    swimmingGuests: 0,
  };
}

function addSubmissionToSummary(summary, data) {
  summary.totalRsvps += 1;
  if (data.attendance === "Joyfully Accepts") {
    const guests = Number(data.guests);
    summary.acceptedRsvps += 1;
    summary.acceptedGuests += guests;
    if (data.swimming === "Yes, bringing swimwear!") {
      summary.swimmingGuests += guests;
    }
  } else {
    summary.declinedRsvps += 1;
  }
}

function readSummary(sheet) {
  const rows = sheet.getDataRange().getValues();
  if (
    rows.length === 0 ||
    (rows.length === 1 && rows[0].every((value) => value === "" || value === null))
  ) {
    return emptySummary();
  }

  if (hasHeaders(rows[0], RSVP_SUMMARY_HEADERS)) {
    return readSummaryRows(rows.slice(1));
  }
  throw new Error("RSVP Summary has an unrecognized layout; refusing to overwrite it.");
}

function hasHeaders(row, headers) {
  return row.length === headers.length &&
    headers.every((header, index) => row[index] === header);
}

function readSummaryRows(rows) {
  const summary = emptySummary();
  const metricFields = Object.keys(RSVP_SUMMARY_FIELDS);
  const seen = new Set();
  if (rows.length !== metricFields.length) {
    throw new Error("RSVP summary is incomplete; refusing to overwrite it.");
  }

  rows.forEach((row) => {
    const field = metricFields.find((key) => RSVP_SUMMARY_FIELDS[key] === row[0]);
    if (
      !field ||
      seen.has(field) ||
      row.length !== 2 ||
      !Number.isSafeInteger(row[1]) ||
      row[1] < 0
    ) {
      throw new Error("RSVP summary is invalid; refusing to overwrite it.");
    }
    summary[field] = row[1];
    seen.add(field);
  });
  return summary;
}

function writeSummary(sheet, summary) {
  const rows = [RSVP_SUMMARY_HEADERS];
  Object.keys(RSVP_SUMMARY_FIELDS).forEach((field) => {
    rows.push([RSVP_SUMMARY_FIELDS[field], summary[field]]);
  });
  sheet.getRange(1, 1, rows.length, RSVP_SUMMARY_HEADERS.length).setValues(rows);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
