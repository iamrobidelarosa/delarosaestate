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

The Netlify Function forwards the RSVP form's attendee name, attendance,
number of guests, other guest names, and after-party swimming response to Apps
Script. Apps Script stores each response in a separate `RSVP Details` tab and
continues updating aggregate counts in `RSVP Summary`. Both tabs are created
when absent; unexpected existing contents are rejected rather than overwritten.
The existing `Sheet1` is never read, changed, or cleared by the integration.

The public spreadsheet makes the attendee names, guest names, attendance
status, and after-party choice visible and editable to anyone with its link.
Do not include contact details or unrelated sensitive information in RSVP
fields. Existing `Sheet1` rows remain as-is. Confirm `RSVP_SPREADSHEET_ID`
points to the intended spreadsheet. The spreadsheet ID and Web App URL remain
server-side settings; neither belongs in browser code.

Deploy the updated Apps Script Web App before publishing the Netlify Function
change. An older Apps Script deployment will reject the expanded RSVP payload.
