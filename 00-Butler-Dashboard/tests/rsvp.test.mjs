import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { handler } from "../netlify/functions/rsvp.mjs";

const VALID_SUMMARY = {
  attendance: "Joyfully Accepts",
  guests: "2",
  swimming: "Yes, bringing swimwear!",
};

const VALID_RSVP = {
  name: "Attendee One",
  ...VALID_SUMMARY,
  message: "Companion One",
};

function createAppsScriptHarness(initialSummary, initialDetails) {
  class FakeSheet {
    constructor(values) {
      this.values = values.map((row) => [...row]);
    }

    getDataRange() {
      return { getValues: () => this.values.map((row) => [...row]) };
    }

    getRange(row, column, rowCount, columnCount) {
      return {
        setValues: (values) => {
          assert.equal(row, 1);
          assert.equal(column, 1);
          assert.equal(values.length, rowCount);
          assert.equal(values[0].length, columnCount);
          this.values = values.map((value) => [...value]);
        },
      };
    }

    appendRow(row) {
      this.values.push([...row]);
    }
  }

  const originalSheet = new FakeSheet([
    [
      "Timestamp",
      "Full Name",
      "Attendance Status",
      "Guests",
      "After Party Swimming",
      "Name of Other Guests",
    ],
    [
      new Date("2026-01-01"),
      "Private Guest A",
      "Joyfully Accepts",
      "2",
      "Yes, bringing swimwear!",
      "Private companion A",
    ],
  ]);
  const originalSheetSnapshot = JSON.stringify(originalSheet.values);
  let summarySheet = initialSummary
    ? new FakeSheet(initialSummary)
    : null;
  let detailsSheet = initialDetails
    ? new FakeSheet(initialDetails)
    : null;
  let sheet1Lookups = 0;
  let locked = false;
  const spreadsheet = {
    getSheetByName: (name) => {
      if (name === "Sheet1") {
        sheet1Lookups += 1;
        return originalSheet;
      }
      if (name === "RSVP Summary") return summarySheet;
      if (name === "RSVP Details") return detailsSheet;
      return null;
    },
    insertSheet: (name) => {
      if (name === "RSVP Summary") {
        summarySheet = new FakeSheet([[""]]);
        return summarySheet;
      }
      assert.equal(name, "RSVP Details");
      detailsSheet = new FakeSheet([[""]]);
      return detailsSheet;
    },
  };
  const context = {
    LockService: {
      getScriptLock: () => ({
        waitLock: () => {
          locked = true;
        },
        hasLock: () => locked,
        releaseLock: () => {
          locked = false;
        },
      }),
    },
    Logger: { log() {} },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) =>
          key === "RSVP_SPREADSHEET_ID" ? "configured-test-id" : null,
      }),
    },
    SpreadsheetApp: {
      openById: (id) => {
        assert.equal(id, "configured-test-id");
        return spreadsheet;
      },
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (body) => ({
        body,
        setMimeType() {
          return this;
        },
      }),
    },
  };
  vm.runInNewContext(
    fs.readFileSync(new URL("../jewel-mae-rsvp.gs", import.meta.url), "utf8"),
    context,
  );

  return {
    context,
    getOriginalSheet: () => originalSheet,
    getOriginalSheetSnapshot: () => originalSheetSnapshot,
    getSheet1Lookups: () => sheet1Lookups,
    getSummarySheet: () => summarySheet,
    getDetailsSheet: () => detailsSheet,
  };
}

function submit(context, payload) {
  return context.doPost({ postData: { contents: JSON.stringify(payload) } });
}

function summaryCounts(sheet) {
  return Array.from(sheet.values.slice(1), (row) => row[1]);
}

test("Netlify forwards the attendee and guest details required by the RSVP sheet", async () => {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.JM18_GOOGLE_SCRIPT_URL;
  const payload = {
    ...VALID_RSVP,
  };
  let forwarded;

  process.env.JM18_GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/test/exec";
  globalThis.fetch = async (_url, options) => {
    forwarded = JSON.parse(options.body);
    return { ok: true, json: async () => ({ status: "success" }) };
  };

  try {
    const response = await handler({
      httpMethod: "POST",
      headers: {
        origin: "https://invitation.example",
        host: "invitation.example",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(forwarded, VALID_RSVP);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.JM18_GOOGLE_SCRIPT_URL;
    } else {
      process.env.JM18_GOOGLE_SCRIPT_URL = previousUrl;
    }
  }
});

test("RSVP preserves Sheet1 and writes summary and per-response details to separate tabs", () => {
  const harness = createAppsScriptHarness();
  const { context } = harness;

  const response = submit(context, VALID_RSVP);
  assert.equal(JSON.parse(response.body).status, "success");
  assert.equal(harness.getSheet1Lookups(), 0);
  assert.equal(
    JSON.stringify(harness.getOriginalSheet().values),
    harness.getOriginalSheetSnapshot(),
  );
  assert.deepEqual(harness.getSummarySheet().values[0], ["Metric", "Count"]);
  assert.deepEqual(summaryCounts(harness.getSummarySheet()), [1, 1, 0, 2, 2]);
  assert.deepEqual(harness.getDetailsSheet().values[0], [
    "Timestamp",
    "Attendee Name",
    "Attendance Status",
    "Guest Count",
    "Other Guest Names",
    "After Party Swimming",
  ]);
  assert.ok(harness.getDetailsSheet().values[1][0]);
  assert.deepEqual(harness.getDetailsSheet().values[1].slice(1), [
    VALID_RSVP.name,
    VALID_RSVP.attendance,
    VALID_RSVP.guests,
    VALID_RSVP.message,
    VALID_RSVP.swimming,
  ]);

  const rejected = submit(context, { ...VALID_RSVP, unexpected: true });
  assert.equal(JSON.parse(rejected.body).status, "error");
  assert.deepEqual(summaryCounts(harness.getSummarySheet()), [1, 1, 0, 2, 2]);
  assert.equal(harness.getDetailsSheet().values.length, 2);
});

test("RSVP stores formula-like names and guest details as literal text", () => {
  const harness = createAppsScriptHarness();
  const payload = {
    ...VALID_RSVP,
    name: "=HYPERLINK(\"https://example.com\")",
    message: "+SUM(1,1)",
  };
  submit(harness.context, payload);

  assert.equal(harness.getDetailsSheet().values[1][1], "'" + payload.name);
  assert.equal(harness.getDetailsSheet().values[1][4], "'" + payload.message);
});

test("RSVP initializes an empty summary tab and updates its aggregates", () => {
  const harness = createAppsScriptHarness([[""]]);
  submit(harness.context, VALID_RSVP);
  submit(harness.context, {
    name: "Attendee Two",
    attendance: "Regretfully Declines",
    guests: "1",
    swimming: "No, main program only",
    message: "",
  });

  assert.deepEqual(
    harness.getSummarySheet().values[0],
    ["Metric", "Count"],
  );
  assert.deepEqual(summaryCounts(harness.getSummarySheet()), [2, 1, 1, 2, 2]);
  assert.equal(
    JSON.stringify(harness.getOriginalSheet().values),
    harness.getOriginalSheetSnapshot(),
  );
});

test("RSVP accepts the previous aggregate-only payload during deployment", () => {
  const harness = createAppsScriptHarness();
  const response = submit(harness.context, VALID_SUMMARY);

  assert.equal(JSON.parse(response.body).status, "success");
  assert.deepEqual(summaryCounts(harness.getSummarySheet()), [1, 1, 0, 2, 2]);
  assert.equal(harness.getDetailsSheet(), null);
});

test("RSVP fails closed on unexpected summary tab contents", () => {
  const harness = createAppsScriptHarness([["Unexpected", "Private Data"]]);
  const before = JSON.stringify(harness.getSummarySheet().values);
  const response = submit(harness.context, VALID_RSVP);

  assert.equal(JSON.parse(response.body).status, "error");
  assert.equal(JSON.stringify(harness.getSummarySheet().values), before);
  assert.equal(harness.getDetailsSheet(), null);
  assert.equal(
    JSON.stringify(harness.getOriginalSheet().values),
    harness.getOriginalSheetSnapshot(),
  );
});

test("RSVP fails closed when the details tab has an unexpected layout", () => {
  const unexpectedDetails = [["Unexpected", "Private Data"]];
  const harness = createAppsScriptHarness(undefined, unexpectedDetails);
  const before = JSON.stringify(harness.getDetailsSheet().values);
  const response = submit(harness.context, VALID_RSVP);

  assert.equal(JSON.parse(response.body).status, "error");
  assert.equal(JSON.stringify(harness.getDetailsSheet().values), before);
  assert.equal(
    JSON.stringify(harness.getOriginalSheet().values),
    harness.getOriginalSheetSnapshot(),
  );
});
