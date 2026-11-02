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

Money displays use en-US comma grouping and exactly three decimal digits (1,000,000.000). Preserve numeric JSON storage and up to three-decimal precision; monetary text inputs must parse formatted numbers without changing their value. Use the shared readable typography tokens (12/14/16/18/24/32px), adequate text contrast, a sticky Save header and responsive reflow. Month pages must use only the selected month for totals and charts; year pages show annual aggregates. Debt payments in JPY create one linked expense on the payment date atomically with the debt ledger; preserve payment history and linked expense metadata through sync and backups.

New expenses default to planned; legacy expenses without status remain paid to preserve existing totals. Only paid expenses reduce period balance; planned totals are separate. Balance means period income minus paid spending, not a wallet balance with opening funds. Preserve expense categories/status, debt dueDate and payment voided flags in backups. Canceling a debt payment must atomically remove only its linked expense and retain a voided history entry; reject repeated cancellation and principal below active payments. Debt deletion is allowed only with no payment history. Month search and analytics must stay within the selected period.

Credit card rules: new one-off purchases default to next calendar month, with editable billingMonth; only explicit ribo purchases add to revolving debt. Card statement = oneOff + principal + fees; carry = priorBalance + newRibo - principal. Never hardcode the user’s private statement values or treat 25,000 JPY as a universal payment. Confirmed statements create exactly one protected fee expense; settlement/undo changes bank cashflow and status, never recreates purchase/principal expenses. Preserve cards settings/statements, expense paymentMethod/settlement/billingMonth/cardFeeMonth, and salary earnedMonth/receivedOn through sync/backups. Bank due date from a statement overrides the configurable expected date; confirmation date is explicitly entered. Do not assume a verified cutoff day or holiday calendar. Run node test/card.test.js with the other checks.

The Credit & statements module UI is admin-only: hide sidebar/shortcut/overview entry points until calendar_is_admin returns literal true for the current verified user; recheck on navigation/actions and before dialog submission. Fail closed on lookup errors, clear role state across account changes/logout, and close revoked dialogs. Do not trust user_metadata/email/username for role. Preserve existing owner-scoped document data; this menu restriction does not change the generic document RLS/write policy.
