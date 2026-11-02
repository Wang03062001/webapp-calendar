# Repository workflow

This is a Vietnamese personal finance calendar for 2026–2033. Use the existing checkout; do not create another Git worktree unless the user asks.

## Development

- Node.js >=22; no dependency installation, database, API keys or credentials are required by the app.
- Run `npm run dev` to start the development server on port 5173.
- Run `node test/model.test.js` for the four model tests and `npm run build` for the static production build. Validate relevant browser interactions when changing UI behavior.
- Preserve browser-local financial data. Never commit financial backups, secrets, `.env` files, generated `dist/` files or temporary browser artifacts.

## User-authorized GitHub updates

The repository owner requested that completed code changes made by ChatGPT be committed and pushed to `Wang03062001/webapp-calendar` on `main`. Carry this preference forward in tasks working on this repository, unless the user's current instructions say otherwise.

- After completing an authorized edit, run appropriate checks, review the diff, commit the relevant changes with a descriptive message, and push to `origin main` without asking for the same permission again.
- Check the current branch and remote state first. If working on another branch, preserve existing work and integrate changes safely; never overwrite remote work or force-push to fulfill this preference.
- Reuse the platform's existing Git authentication. Do not put access tokens in files or ask for secrets in chat.
- If access, branch protection, failed checks, conflicting changes or a platform restriction prevents the update, report the precise blocker and preserve the work. Never claim GitHub has updated until the push and remote commit verification succeed.
- This is an agent workflow, not a background synchronization service. It applies while an agent is executing an authorized task in this repository; unrelated ChatGPT conversations cannot automatically change GitHub.
