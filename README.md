# Ridgeline

GitHub Pages site for quick-reference information about a 2019 Honda Ridgeline.

## What This Repo Includes

- A mobile-friendly static site
- Quick links for fuse box info, manuals, maintenance notes, and truck details
- An NFC-friendly landing page for opening from iPhone tags placed around the truck

## GitHub Pages Setup

This repo is ready to publish as a GitHub Pages project site.

1. Push the contents of this repo to `main`.
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, choose:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/ (root)`
4. Save.

After GitHub finishes publishing, the site URL should be:

`https://vicentediazs.github.io/Ridgeline/`

## NFC Tag Target

Program each NFC tag to open:

`https://vicentediazs.github.io/Ridgeline/`

If you want, different tags can later point to section anchors like:

- `https://vicentediazs.github.io/Ridgeline/#fuses`
- `https://vicentediazs.github.io/Ridgeline/#maintenance`
- `https://vicentediazs.github.io/Ridgeline/#documents`

## Notes

- The site currently links to owner-manual resources and keeps fuse guidance conservative.
- Exact fuse assignments should always be cross-checked against the fuse box cover and the 2019 owner's manual before replacing a fuse.

## Ask Anton Secure Model Setup

Ask Anton now supports a safer proxy flow so model keys are never stored in the browser or committed to Git.

1. Run the proxy in `tools/ask-anton-proxy` with environment variables.
2. Keep the model key only in `.env` or your host secret manager.
3. In Ask Anton Settings, set `Proxy Endpoint` to your proxy URL (for local: `http://localhost:8787/api/ask-anton`).

See `tools/ask-anton-proxy/README.md` for setup details.

### Quick Local Fix (If Anton Falls Back To Local Answers)

If Ask Anton shows proxy/auth errors, do this exact flow:

1. Open `tools/ask-anton-proxy/.env` and set `OPENAI_API_KEY`.
2. Keep `ALLOWED_ORIGIN=*` for local file testing.
3. Start proxy:
   - `cd tools/ask-anton-proxy`
   - `node --env-file=.env server.mjs`
4. Confirm health endpoint:
   - `http://127.0.0.1:8787/health`
5. In Ask Anton Settings, use endpoint:
   - `http://127.0.0.1:8787/api/ask-anton`

If you still see `Missing bearer or basic authentication in header`, your browser is likely calling the provider directly instead of this proxy endpoint.
