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

function createAppsScriptHarness(initialSummary) {
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
  let sheet1Lookups = 0;
  let locked = false;
  const spreadsheet = {
    getSheetByName: (name) => {
      if (name === "Sheet1") {
        sheet1Lookups += 1;
        return originalSheet;
      }
      return name === "RSVP Summary" ? summarySheet : null;
    },
    insertSheet: (name) => {
      assert.equal(name, "RSVP Summary");
      summarySheet = new FakeSheet([[""]]);
      return summarySheet;
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
  };
}

function submit(context, payload) {
  return context.doPost({ postData: { contents: JSON.stringify(payload) } });
}

function summaryCounts(sheet) {
  return Array.from(sheet.values.slice(1), (row) => row[1]);
}

test("Netlify forwards only non-sensitive RSVP summary fields", async () => {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.JM18_GOOGLE_SCRIPT_URL;
  const payload = {
    name: "Private Guest Name",
    ...VALID_SUMMARY,
    message: "Private companion details",
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
    assert.deepEqual(forwarded, VALID_SUMMARY);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.JM18_GOOGLE_SCRIPT_URL;
    } else {
      process.env.JM18_GOOGLE_SCRIPT_URL = previousUrl;
    }
  }
});

test("RSVP preserves Sheet1 and creates an aggregate summary tab", () => {
  const harness = createAppsScriptHarness();
  const { context } = harness;

  const response = submit(context, VALID_SUMMARY);
  assert.equal(JSON.parse(response.body).status, "success");
  assert.equal(harness.getSheet1Lookups(), 0);
  assert.equal(
    JSON.stringify(harness.getOriginalSheet().values),
    harness.getOriginalSheetSnapshot(),
  );
  assert.deepEqual(harness.getSummarySheet().values[0], ["Metric", "Count"]);
  assert.deepEqual(summaryCounts(harness.getSummarySheet()), [1, 1, 0, 2, 2]);

  const rejected = submit(context, { ...VALID_SUMMARY, name: "Private Guest" });
  assert.equal(JSON.parse(rejected.body).status, "error");
  assert.deepEqual(summaryCounts(harness.getSummarySheet()), [1, 1, 0, 2, 2]);
});

test("RSVP initializes an empty summary tab and updates its aggregates", () => {
  const harness = createAppsScriptHarness([[""]]);
  submit(harness.context, VALID_SUMMARY);
  submit(harness.context, {
    attendance: "Regretfully Declines",
    guests: "1",
    swimming: "No, main program only",
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

test("RSVP fails closed on unexpected summary tab contents", () => {
  const harness = createAppsScriptHarness([["Unexpected", "Private Data"]]);
  const before = JSON.stringify(harness.getSummarySheet().values);
  const response = submit(harness.context, VALID_SUMMARY);

  assert.equal(JSON.parse(response.body).status, "error");
  assert.equal(JSON.stringify(harness.getSummarySheet().values), before);
  assert.equal(
    JSON.stringify(harness.getOriginalSheet().values),
    harness.getOriginalSheetSnapshot(),
  );
});
