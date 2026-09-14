---
name: mass-assignment-audit
description: Audit code for mass assignment / over-posting — request bodies bound wholesale into models so callers can set fields they should not (role, isAdmin, balance, tenantId) — and apply fixes. Use when reviewing create/update endpoints, ORM entity construction, or any place request data flows into a data model.
---

# Mass Assignment Audit

## Scope

Mass assignment: the server copies client-supplied fields into a data model
without an allowlist, letting callers overwrite fields that were never meant
to be set from the outside — `role`, `isAdmin`, `balance`, `tenantId`,
`createdBy`, internal flags.

## Audit procedure

1. **Find wholesale binding.** Grep for the shapes:
   - `Object.assign(entity, req.body)`, `{ ...req.body }` into a model or
     `save()`
   - `Model.create(req.body)`, `Model.update(id, req.body)`
   - `merge(user, payload)`, `applyPatch(doc, req.body)`
   - Framework binders: `new Entity(req.body)`, `@ModelAttribute`,
     `Bind[FromBody]` without a DTO
2. **Diff bound fields against intended fields.** For each endpoint, list
   what the UI/API contract legitimately sends vs. what the model *accepts*.
   Every model field that is settable but not part of the contract is a
   candidate finding.
3. **Rank by field impact.** Look at the entity definition for sensitive
   columns: role/permissions, plan/tier, balance/credits, tenant/account
   foreign keys, approval/verification flags, `id` and created/updated
   metadata.
4. **Check the update paths especially.** PATCH/PUT handlers built from a
   generic `update(id, data)` helper are the most common source — one
   unguarded helper exposes every model that flows through it.
5. **Nested objects and arrays.** JSON merge of nested structures
   (`settings.role`, `acl[0].grant`) bypasses shallow allowlists.

## Findings format

```
[mass-assign] <severity> <file:line> <endpoint>
  binding:  <the wholesale-copy call>
  settable: <sensitive fields reachable through it>
  exploit:  <request body that escalates>
```

Severity guide: Critical = privilege/ownership/balance fields settable;
High = workflow or verification flags settable; Medium = internal metadata
with no direct privilege effect.

## Fix patterns

- **Explicit DTO / allowlist.** Build the update from named fields only:
  `const update = pick(req.body, ["displayName", "bio"])`. Never pass
  `req.body` to the model.
- **Schema validation with `strict` / `stripUnknown`** (zod `.strict()`,
  Joi `allowUnknown: false`, class-validator `whitelist: true,
  forbidNonWhitelisted: true`).
- **Read-only fields enforced at the model layer** too (ORM column
  `updatable: false`, DB trigger, or service-layer guard) — the DTO is the
  first wall, not the only one.
- **Deep-filter nested payloads** or reject unknown nested keys; a shallow
  allowlist does not protect nested writes.
- Sensitive transitions (role change, plan change, payout) become
  **dedicated endpoints** with their own authorization, not fields on a
  generic update.

After fixing one endpoint, audit every other consumer of the same model or
helper — mass assignment is a pattern-level bug and recurs per endpoint.
