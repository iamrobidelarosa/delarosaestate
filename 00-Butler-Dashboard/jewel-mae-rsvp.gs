const RSVP_SPREADSHEET_ID_PROPERTY = "RSVP_SPREADSHEET_ID";
const RSVP_SHEET_NAME = "Sheet1";
const RSVP_HEADERS = [
  "Timestamp",
  "Full Name",
  "Attendance Status",
  "Guests",
  "After Party Swimming",
  "Name of Other Guests",
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Missing request data.");
    }

    const data = JSON.parse(e.postData.contents);
    if (
      typeof data.name !== "string" ||
      !data.name.trim() ||
      !["Joyfully Accepts", "Regretfully Declines"].includes(data.attendance) ||
      !["1", "2", "3", "4"].includes(data.guests) ||
      !["Yes, bringing swimwear!", "No, main program only"].includes(data.swimming) ||
      typeof data.message !== "string"
    ) {
      throw new Error("Invalid RSVP data.");
    }

    const spreadsheetId = PropertiesService
      .getScriptProperties()
      .getProperty(RSVP_SPREADSHEET_ID_PROPERTY);
    if (!spreadsheetId) {
      throw new Error("RSVP spreadsheet ID is not configured.");
    }

    const sheet = SpreadsheetApp
      .openById(spreadsheetId)
      .getSheetByName(RSVP_SHEET_NAME);
    if (!sheet) {
      throw new Error("RSVP sheet was not found.");
    }

    lock.waitLock(10000);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(RSVP_HEADERS);
    }
    sheet.appendRow([
      new Date(),
      data.name.trim(),
      data.attendance,
      data.guests,
      data.swimming,
      data.message.trim() || "—",
    ]);

    return jsonResponse({ status: "success" });
  } catch (error) {
    return jsonResponse({ status: "error" });
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
