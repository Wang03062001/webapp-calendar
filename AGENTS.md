# Repository workflow

This is a Vietnamese personal finance calendar with default years 2026–2033 and editable active years. Income/bonus/expenses and balance use JPY; savings/goals use VND and must never be subtracted from JPY without an explicit exchange-rate feature. Archiving a year preserves its financial records for restoration. Use the existing checkout; do not create another Git worktree unless the user asks.

## Development

- Node.js >=22; no dependency installation is required. Editing requires a verified signed-in Supabase user. Enter or Save Changes explicitly submits a snapshot; typing only caches an account-scoped draft. Cross-device sync uses Supabase Auth and the public configuration in `src/config.js`; database setup is in `supabase/setup.sql`. Never put service_role/secret keys in browser code.
- Run `npm run dev` to start the development server on port 5173.
- Run `node test/model.test.js`, `node test/sync.test.js`, `node test/admin.test.js` and `npm run build`. Validate relevant browser interactions when changing UI behavior. Supabase row-level security and optimistic revision checks must remain enforced; never silently overwrite an account's cloud data with a local draft.
- Preserve browser-local financial data. Never commit financial backups, secrets, `.env` files, generated `dist/` files or temporary browser artifacts.

## User-authorized GitHub updates

The repository owner requested that completed code changes made by ChatGPT be committed and pushed to `Wang03062001/webapp-calendar` on `main`. Carry this preference forward in tasks working on this repository, unless the user's current instructions say otherwise.

- After completing an authorized edit, run appropriate checks, review the diff, commit the relevant changes with a descriptive message, and push to `origin main` without asking for the same permission again.
- Check the current branch and remote state first. If working on another branch, preserve existing work and integrate changes safely; never overwrite remote work or force-push to fulfill this preference.
- Reuse the platform's existing Git authentication. Do not put access tokens in files or ask for secrets in chat.
- If access, branch protection, failed checks, conflicting changes or a platform restriction prevents the update, report the precise blocker and preserve the work. Never claim GitHub has updated until the push and remote commit verification succeed.
- This is an agent workflow, not a background synchronization service. It applies while an agent is executing an authorized task in this repository; unrelated ChatGPT conversations cannot automatically change GitHub.

## Administration

Supabase server-only admin and username login setup is documented in `supabase/ADMIN.md`. Never trust user_metadata role flags, ship service-role keys to the browser or hardcode a default admin password. Regenerate Dashboard function bundles with `node scripts/build-edge-functions.mjs` after modifying Edge Function source. Preserve RLS and banned-account guards when editing migrations.

Money displays use en-US comma grouping and exactly three decimal digits (1,000,000.000). Preserve numeric JSON storage and up to three-decimal precision; monetary text inputs must parse formatted numbers without changing their value. Keep typography at 50% of the 331bcfd sizes and preserve responsive reflow. Month pages must use only the selected month for totals and charts; year pages show annual aggregates. Debt payments in JPY create one linked expense on the payment date atomically with the debt ledger; preserve payment history and linked expense metadata through sync and backups.
