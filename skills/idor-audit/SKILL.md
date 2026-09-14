---
name: idor-audit
description: Audit code for Insecure Direct Object Reference (IDOR) — user-controlled object IDs used without ownership or tenancy verification — and apply fixes. Use when reviewing endpoints that take an id/key parameter, repository lookups, or any code that loads an entity by caller-supplied identifier.
---

# IDOR Audit

## Scope

IDOR (a Broken Access Control subtype): the application loads or mutates an
object using an identifier the caller supplies, without confirming the caller
owns or may access *that specific object*. Predictable identifiers
(sequential ints, short IDs) make exploitation trivial, but unguessable IDs
(UUIDs) do **not** fix the bug — they only slow enumeration.

## Audit procedure

1. **Find every identifier source.** Search for lookups keyed on request
   input: `req.params.id`, `req.query.*Id`, `req.body.*Id`, path variables,
   message payload IDs, filename/download tokens.
2. **Trace each ID into a data fetch.** Mark every call shaped like:
   - `repo.findById(id)`, `db.get(id)`, `User.find(id)`,
     `storage.download(key)`, `SELECT ... WHERE id = $1`
3. **For each fetch, ask: scoped to the caller?** The query must also carry
   the authenticated principal (owner/tenant/account):
   - BAD:  `findOne({ where: { id } })`
   - GOOD: `findOne({ where: { id, accountId: caller.accountId } })`
   If the scoping happens *after* the fetch (load, then compare), note
   whether a 404-vs-403 oracle or TOCTOU window leaks information.
4. **Check both read and write paths.** Update/delete/export/share endpoints
   are the high-severity cases; also check nested objects
   (`/accounts/:aid/invoices/:iid` — verify `:iid` belongs to `:aid`, not
   just that `:aid` is accessible).
5. **Check reference endpoints.** Search results, autocomplete, and
   "recent items" often leak object metadata (titles, amounts, emails) even
   when direct fetch is protected.
6. **Try the exploit mentally as two users.** User A creates object #100.
   Can user B GET/PATCH/DELETE `/objects/100`? Can B list `/objects?owner=A`?

## Findings format

```
[idor] <severity> <file:line> <method path>
  id source:  <param/query/body field>
  fetch:      <the unscoped lookup>
  missing:    ownership | tenancy | sharing check
  exploit:    <concrete cross-user request>
```

Severity guide: Critical = cross-user mutation or PII/financial read;
High = cross-user read of internal data; Medium = metadata-only oracle.

## Fix patterns

- **Scope the query by the server-side principal** — the `WHERE` clause must
  include the caller's tenant/account, always. This is the primary fix.
- **Verify nested ownership** — child IDs must be resolved through the
  parent (`invoice.accountId === caller.accountId`), not independently.
- **Uniform failure** — return the same 404 for "doesn't exist" and "not
  yours"; never distinguish with 403, which confirms the ID is valid.
- **Sharing models** — if objects can be shared, enforce an explicit
  permission table (`canAccess(caller, object)`) instead of ad-hoc checks.
- Do **not** rely on UUIDs, hashing IDs, or signed URLs as the control;
  they are complements to authorization, never substitutes.

After fixing, sweep for the same lookup shape elsewhere — IDOR rarely
appears exactly once.
