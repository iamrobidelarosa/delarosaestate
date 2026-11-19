# Netlify RSVP deployment

The repository-root `netlify.toml` builds only the Jewel Mae invitation. The
build script publishes the invitation as both `index.html` and
`jewel-mae-eighteen.html`; other dashboard files are not included in the
published site.

In Netlify site settings, add `JM18_GOOGLE_SCRIPT_URL` with the deployed Apps
Script Web App URL ending in `/exec`. Keep the URL out of the repository.

In the Apps Script project's Script Properties, set `RSVP_SPREADSHEET_ID` to the
spreadsheet ID; do not commit that ID. The Web App must run as the sheet
owner and allow anonymous submissions. Guests submit through the Netlify
Function at `/api/rsvp`, not directly to the spreadsheet.

The Netlify Function forwards only `attendance`, `guests`, and `swimming` to
Apps Script. Apps Script writes aggregate counts only: total responses,
accepted/declined responses, accepted guest count, and swimming guest count.
It does not write names, guest names, contact details, messages, timestamps, or
individual response rows. Counts are stored in a separate `RSVP Summary` tab;
the existing `Sheet1` is never read, changed, or cleared by the summary writer.
The summary tab is created if absent and initialized on its first submission.
Unexpected existing contents in `RSVP Summary` are rejected without being
overwritten.

The existing `Sheet1` rows are intentionally preserved, including any
previously submitted data; this change does not make existing data private or
remove it. Review spreadsheet sharing separately if those rows contain
personal information. Confirm `RSVP_SPREADSHEET_ID` points to the intended
spreadsheet. The spreadsheet ID and Web App URL remain server-side settings;
neither belongs in browser code.

Deploy the updated Apps Script and point `JM18_GOOGLE_SCRIPT_URL` to that Web
App deployment before publishing the Netlify Function change. An older script
version still expects per-person fields and will reject summary-only requests.
