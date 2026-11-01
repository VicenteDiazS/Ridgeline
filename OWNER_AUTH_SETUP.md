# Ridgeline owner login and recovery

## Account and project

- App: https://vicentediazs.github.io/Ridgeline/
- Owner email: `vicente.diaz.sal@gmail.com`
- Supabase project: `uqswuvutvmgganekppma` (Ridgeline)
- Organization: VicenteDiazS's Org
- Dashboard: https://supabase.com/dashboard/project/uqswuvutvmgganekppma
- The app password is separate from the GitHub and Supabase dashboard passwords.
- Store the password in a password manager. This repository intentionally does not store it.

## First-time owner account setup

The new project, Garage tables, photo buckets and access policies were created on October 31, 2026.
The owner account still needs to be created (verified before this documentation update).

1. Open Authentication > Users in the project dashboard.
2. Select Add user > Create new user.
3. Use `vicente.diaz.sal@gmail.com`, enter your chosen password privately, and leave Auto confirm user checked.
4. Select Create user.
5. Open the app, select Sign In, and use that email and password.

Do not post passwords in source code, SQL files, comments, issues or commits.

## Forgot password

1. Select **Forgot password?** in the app sign-in dialog, or open:
   https://vicentediazs.github.io/Ridgeline/reset-password.html
2. Enter the owner email and select **Send reset email**.
3. Check the inbox and spam folder. Open the newest reset link.
4. Enter the new password twice and select **Save new password**.
5. Return to Ridgeline and sign in with the new password.

The email flow requires an existing Auth user and successful email delivery.
A successful request does not confirm that the address has an account.
Expired or already-used links require a new reset email.

## Redirect configuration

Saved in the new project's Authentication > URL Configuration:

- Site URL: `https://vicentediazs.github.io/Ridgeline/`
- Allowed redirect: `https://vicentediazs.github.io/Ridgeline/reset-password.html`

The reset page processes recovery tokens in the URL fragment, removes them from the address bar, and sends password changes to Supabase over HTTPS. It does not save passwords in browser storage.

## Connection troubleshooting

“Cannot reach the password service” indicates a network failure or timeout, not a rejected password.
Check project health and the project URL/key in [owner-auth.js](./owner-auth.js) and [reset-password.html](./reset-password.html).
Do not clear Safari website data during recovery: it may contain the only remaining copies of Garage records or photos.

## Database setup and data limits

The schema is described in [supabase-setup.sql](./supabase-setup.sql). The deployed owner-check function also uses an empty search_path.
The existing behavior allows public shared-memory/photo reads and owner-only record edits/uploads; visitor logging allows public inserts and owner-only reads.
The old project's data was not migrated. Local Garage storage keys were preserved, while authentication sessions and failed-connection cooldowns were scoped to the new project.
Garage JSON backups include photo metadata, not image files.
