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
