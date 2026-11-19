const RSVP_SPREADSHEET_ID_PROPERTY = "RSVP_SPREADSHEET_ID";
const RSVP_SUMMARY_SHEET_NAME = "RSVP Summary";
const RSVP_DETAILS_SHEET_NAME = "RSVP Details";
const RSVP_SUMMARY_HEADERS = ["Metric", "Count"];
const RSVP_DETAILS_HEADERS = [
  "Timestamp",
  "Attendee Name",
  "Attendance Status",
  "Guest Count",
  "Other Guest Names",
  "After Party Swimming",
];
const RSVP_SUMMARY_ALLOWED_FIELDS = ["attendance", "guests", "swimming"];
const RSVP_SUMMARY_FIELDS = {
  totalRsvps: "Total RSVPs",
  acceptedRsvps: "Accepted RSVPs",
  declinedRsvps: "Declined RSVPs",
  acceptedGuests: "Accepted Guest Count",
  swimmingGuests: "Swimming Guest Count",
};
const RSVP_ALLOWED_FIELDS = ["name", "attendance", "guests", "swimming", "message"];
const MAX_NAME_LENGTH = 200;
const MAX_GUEST_NAMES_LENGTH = 2000;

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Missing request data.");
    }

    const data = JSON.parse(e.postData.contents);
    const includesDetails = isValidRsvpSubmission(data);
    if (!includesDetails && !isValidSummarySubmission(data)) {
      throw new Error("Invalid RSVP data.");
    }

    lock.waitLock(10000);
    const spreadsheet = getRsvpSpreadsheet();
    const sheet = getRsvpSummarySheet(spreadsheet);
    const summary = readSummary(sheet);
    if (includesDetails) {
      const detailsSheet = getRsvpDetailsSheet(spreadsheet);
      appendRsvpDetails(detailsSheet, data);
    }
    addSubmissionToSummary(summary, data);
    writeSummary(sheet, summary);

    return jsonResponse({ status: "success" });
  } catch (error) {
    Logger.log("RSVP submission failed: " + error.message);
    return jsonResponse({ status: "error" });
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

function isValidRsvpSubmission(data) {
  return hasExactFields(data, RSVP_ALLOWED_FIELDS) &&
    typeof data.name === "string" &&
    data.name.trim().length > 0 &&
    data.name.length <= MAX_NAME_LENGTH &&
    isValidResponseValues(data) &&
    typeof data.message === "string" &&
    data.message.length <= MAX_GUEST_NAMES_LENGTH;
}

function isValidSummarySubmission(data) {
  return hasExactFields(data, RSVP_SUMMARY_ALLOWED_FIELDS) &&
    isValidResponseValues(data);
}

function hasExactFields(data, allowedFields) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }
  const keys = Object.keys(data);
  return keys.length === allowedFields.length &&
    keys.every((key) => allowedFields.includes(key));
}

function isValidResponseValues(data) {
  return ["Joyfully Accepts", "Regretfully Declines"].includes(data.attendance) &&
    ["1", "2", "3", "4"].includes(data.guests) &&
    ["Yes, bringing swimwear!", "No, main program only"].includes(data.swimming);
}

function getRsvpSpreadsheet() {
  const spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty(RSVP_SPREADSHEET_ID_PROPERTY);
  if (!spreadsheetId) {
    throw new Error("RSVP spreadsheet ID is not configured.");
  }

  return SpreadsheetApp.openById(spreadsheetId);
}

function getRsvpSummarySheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(RSVP_SUMMARY_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(RSVP_SUMMARY_SHEET_NAME);
  }
  return sheet;
}

function getRsvpDetailsSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(RSVP_DETAILS_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(RSVP_DETAILS_SHEET_NAME);
  }

  const rows = sheet.getDataRange().getValues();
  if (
    rows.length === 0 ||
    (rows.length === 1 && rows[0].every((value) => value === "" || value === null))
  ) {
    sheet.getRange(1, 1, 1, RSVP_DETAILS_HEADERS.length)
      .setValues([RSVP_DETAILS_HEADERS]);
    return sheet;
  }

  if (!hasHeaders(rows[0], RSVP_DETAILS_HEADERS)) {
    throw new Error("RSVP Details has an unrecognized layout; refusing to write to it.");
  }
  return sheet;
}

function appendRsvpDetails(sheet, data) {
  sheet.appendRow([
    new Date(),
    literalCellValue(data.name.trim()),
    data.attendance,
    data.guests,
    literalCellValue(data.message.trim()),
    data.swimming,
  ]);
}

function literalCellValue(value) {
  return /^[\s]*[=+\-@]/.test(value) ? "'" + value : value;
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
