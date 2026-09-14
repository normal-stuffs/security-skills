---
name: broken-access-control
description: Audit code for Broken Access Control (OWASP A01) — missing authorization checks on state-changing operations, tenant-isolation gaps, and role-check bypasses — and apply fixes. Use when reviewing API routes, handlers, resolvers, controllers, or service-layer functions that mutate data or return protected resources.
---

# Broken Access Control Audit

## Scope

Authorization logic bugs where code performs privileged operations without
verifying the caller's rights. Distinct from authentication — the caller may be
logged in but must not be allowed the action.

## Audit procedure

1. **Enumerate entry points.** List every route handler, GraphQL resolver,
   RPC method, message consumer, and CLI command that reads or mutates
   protected data. Build the list from the router/framework wiring, not from
   where checks happen to exist.
2. **Map each entry point to its required privilege.** For each one, answer:
   who is allowed (role, tenant, ownership) and what is the worst case if a
   lower-privilege caller reaches it?
3. **Trace the authorization decision.** For every entry point, locate where
   the allow/deny decision is actually made:
   - Middleware/decorator (e.g. `@Roles("admin")`, `requireScope`)
   - Inline check in the handler
   - Service-layer check
   - **None** → this is a finding.
4. **Hunt the common bypass shapes:**
   - Handler registered *outside* the middleware group that enforces authz
     (e.g. router mounted without `authMiddleware`, new route file that never
     got the guard).
   - Check performed on a *client-supplied* value (`req.body.role`,
     `req.query.orgId`, JWT claim that the client can influence) instead of a
     server-side principal.
   - Fail-open patterns: `try { authorize() } catch { /* continue */ }`,
     `if (!user) return next()` followed by privileged work.
   - Checks that compare with coercion (`==` on role, substring matching,
     case-sensitive mismatch like `"Admin" !== "admin"`).
   - Tenant filter applied to list endpoints but missing on
     get/update/delete of individual objects.
   - Server-side rendering or redirect that hides a resource but leaves the
     underlying API callable (security through UI).
5. **Verify at the data layer.** Even when middleware exists, confirm the
   query itself is scoped (`WHERE tenant_id = ?`). Middleware-only checks are
   routinely bypassed via a second code path to the same service function.

## Findings format

```
[bac] <severity> <file:line> <entry point>
  required: <who should be allowed>
  actual:   <what is enforced — usually "nothing" or "client-controlled X">
  exploit:  <one-line request a lower-privilege caller can make>
```

Severity guide: Critical = unauthenticated or cross-tenant mutation;
High = authenticated privilege jump or cross-tenant read; Medium = missing
defense-in-depth where an outer check currently exists.

## Fix patterns

- **Deny by default.** Route registration requires an explicit authz policy;
  absence of policy is a build error, not an implicit allow.
- **Server-side principal only.** Derive role/tenant from the authenticated
  session or a signed, verified token — never from request body, query, or
  headers the client controls.
- **Check at the service/data layer, not only the edge.** Scope the query:
  `findOne({ id, tenantId: caller.tenantId })`, not `findOne({ id })`.
- **Fail closed.** Authorization errors and missing principals must reject.
- **Exact, typed comparison** against a canonical role enum; no coercion.

After fixing, re-run the audit on sibling entry points — the same bypass
shape usually repeats.
