# Netlify RSVP deployment

The repository-root `netlify.toml` builds only the Jewel Mae invitation. The
build script publishes the invitation as both `index.html` and
`jewel-mae-eighteen.html`; other dashboard files are not included in the
published site.

In Netlify site settings, add `JM18_GOOGLE_SCRIPT_URL` with the deployed Apps
Script Web App URL ending in `/exec`. Keep the URL out of the repository.

In the Apps Script project's Script Properties, set `RSVP_SPREADSHEET_ID` to
the spreadsheet ID; do not commit that ID. The Web App must run as the sheet
owner and allow anonymous submissions. Guests submit through the Netlify
Function at `/api/rsvp`, not directly to the spreadsheet.
