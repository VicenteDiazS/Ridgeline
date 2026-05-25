# Owner Login Setup

This site is now wired for:

- public read access to Garage and site memory
- owner-only write, upload, restore, edit, and delete actions

To finish the secure setup, do these three steps.

## 1. Set the real owner email

Open [owner-auth.js](c:/Users/diazv/Desktop/Ridgeline/owner-auth.js) and replace:

`vicente.diaz.sal@gmail.com`

with the exact email address you will use to sign in through Supabase Auth.

## 2. Apply the secure Supabase policies

Run the SQL in [supabase-setup.sql](c:/Users/diazv/Desktop/Ridgeline/supabase-setup.sql) in the Supabase SQL editor for this project.

Those policies are designed to:

- allow `SELECT` for public visitors on the shared site memory rows
- allow storage reads for public visitors
- allow `INSERT`, `UPDATE`, and `DELETE` only for the signed-in owner email
- migrate older per-device Garage rows into the new shared site-memory key before the tighter rules take over
- create an owner-only visitor log with public insert and owner-only read

## 3. Create the owner account in Supabase Auth

In the Supabase dashboard:

1. Go to `Authentication`
2. Enable email/password sign-in if it is not already enabled
3. Create the owner user with the same email you placed in `owner-auth.js`
4. Set its password in Supabase Auth

After that, open the site, tap `Owner Sign In`, and sign in with that email/password pair.

## Important note

The UI lock is helpful, but the real security comes from the Supabase RLS and storage policies. Do not skip step 2.
