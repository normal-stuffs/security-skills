# security-skills

Security audit skills for AI coding agents. Finds and fixes **authorization
logic bugs** — the class of bugs scanners miss: Broken Access Control, IDOR,
authentication logic flaws, mass assignment, and privilege escalation.

## Install

```bash
# from npm registry (when published)
npm i security-skills
npm i -g security-skills

# directly from GitHub
npm i github:<owner>/security-skills
npm i -g github:<owner>/security-skills
```

On install, a `postinstall` script copies the skills into your agent skill
directories:

| Target | Used by |
|---|---|
| `~/.claude/skills/<name>/` | Claude Code (global) |
| `~/.omp/agent/skills/<name>/` | OMP agent (global) |
| `<project>/.claude/skills/<name>/` | Project-local installs only |

`npm uninstall` removes exactly what was installed (tracked via a manifest)
and never touches user-authored skills.

> **Note:** npm variants with script-approval policies (e.g. `allow-scripts`)
> may block lifecycle hooks on first install. If the skills don't appear
> after `npm i`, either approve the package
> (`npm approve-scripts security-skills`) and reinstall, or run the
> installer manually: `npx security-skills install`. Removal works the same
> way: `npx security-skills uninstall`.

## Bundled skills

| Skill | Finds and fixes |
|---|---|
| `broken-access-control` | Missing authorization checks on state-changing operations, tenant-isolation gaps, fail-open guards, client-controlled role checks |
| `idor-audit` | User-controlled object IDs fetched/mutated without ownership or tenancy scoping |
| `auth-logic-audit` | Password reset token flaws, session fixation, JWT misconfig, missing rate limits, account enumeration |
| `mass-assignment-audit` | `req.body` bound wholesale into models — settable `role`, `balance`, `tenantId` |
| `privilege-escalation-audit` | Role manipulation, self-promotion, invite pivots, missing step-up auth |

## Usage

Once installed, the agent picks each skill up by description when you ask it
to review code, e.g.:

- "audit the billing routes for access control issues"
- "check this update endpoint for IDOR"
- "review the password reset flow"

## CLI

```bash
security-skills list        # bundled skills + install status per directory
security-skills install     # re-run the installer manually
security-skills uninstall   # remove installed skills via manifests
```

## Layout

```
skills/<name>/SKILL.md    # one directory per skill
scripts/install.js        # postinstall copier
scripts/uninstall.js      # manifest-based removal
scripts/cli.js            # list/install/uninstall
```

## License

MIT
