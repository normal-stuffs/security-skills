---
name: privilege-escalation-audit
description: Audit code for privilege escalation paths — horizontal (user A acts as user B) and vertical (user becomes admin) — through role manipulation, insecure role checks, self-service promotion, and missing step-up verification. Use when reviewing role/permission handling, admin endpoints, team/org membership flows, and sensitive operations like payouts or credential changes.
---

# Privilege Escalation Audit

## Scope

Any path by which an authenticated caller gains rights beyond their granted
role: vertical (member → admin), horizontal (user A → user B), or
cross-tenant (member of org 1 → admin of org 2).

## Audit procedure

1. **Locate the role source of truth.** Where does the server learn the
   caller's role — DB lookup per request, session cache, JWT claim?
   Client-influenced sources (request body, unsigned cookie, stale token
   after demotion) are findings.
2. **Inventory role-changing operations.** Adding org members, assigning
   roles, inviting users, approving requests, changing plans. For each: who
   may perform it, and can the target role exceed the caller's own?
   - A manager who can invite `role=admin` invites themselves a second
     admin — vertical escalation by design flaw.
   - Role comparison done with `>` on an ordered enum that treats unknown
     roles as highest, or `includes()` on a string.
3. **Check membership/tenancy pivots.** Accept-invite endpoints: can the
   invitee pick their role? Can an invite for org A be redeemed into org B?
   Can a removed member's token/session still act?
4. **Sensitive operations without step-up.** Password/email change, payout
   destination, API key creation, disabling 2FA — do they require recent
   re-authentication? A stolen session with no step-up gate is full
   account control.
5. **Horizontal checks on shared resources.** Acting on another user's
   sessions, keys, files, or notifications must compare the resource owner
   to the caller server-side (see idor-audit for the lookup shapes).
6. **Demotion/deletion edge cases.** Admin removing themselves, last-admin
   removal, demoting someone whose sessions keep elevated claims until
   token expiry.

## Findings format

```
[privesc] <severity> <file:line> <flow>
  path:     <how a lower-privilege caller reaches higher rights>
  exploit:  <concrete request sequence>
```

Severity guide: Critical = vertical escalation to admin/owner or
cross-tenant admin; High = horizontal takeover of another account;
Medium = stale-privilege window or missing step-up with compensating
controls.

## Fix patterns

- **Server-side role resolution per request** for sensitive paths; treat
  cached/JWT roles as hints, re-check on privilege-affecting operations.
- **Role assignment ceiling:** a caller can only grant roles strictly
  below their own, enforced server-side in the assignment flow.
- **Invite binding:** invites are bound to email, org, and assigned role
  at creation; redemption accepts no role parameter.
- **Step-up auth** (password or second factor) for credential, payout, and
  2FA changes; invalidate other sessions on security-relevant changes.
- **Immediate revocation:** role changes and removals invalidate the
  target's sessions/tokens, not just future logins.

Cross-check with broken-access-control and idor-audit: escalation often
chains a missing check (BAC) with an unscoped object reference (IDOR).
