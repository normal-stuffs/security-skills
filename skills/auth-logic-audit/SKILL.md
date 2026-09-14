---
name: auth-logic-audit
description: Audit authentication and session logic for flaws — password reset token weaknesses, session fixation, JWT misconfiguration, missing rate limits, and account enumeration — and apply fixes. Use when reviewing login, logout, registration, password reset, token issuance/refresh, or session management code.
---

# Authentication Logic Audit

## Scope

Flaws in *how* identity is established and maintained — not crypto review,
but the logic around credentials, tokens, and sessions.

## Audit procedure

### 1. Password reset
- Token generation: `Math.random()`, timestamps, short hashes, or the
  user's email/id as the token → finding. Require CSPRNG ≥128 bits.
- Expiry: missing or >1 hour → finding.
- Single-use: token not invalidated after use, or not invalidated when a
  newer reset is requested → finding.
- Binding: reset accepted with a token for user A plus a body/email for
  user B → account takeover.
- Delivery leak: token reflected in the response body, logs, or a
  redirect URL instead of only the email.

### 2. Session management
- Session ID rotated on login? Missing rotation → session fixation.
- Logout invalidates server-side session, or only clears the client
  cookie → finding.
- Cookie flags: `HttpOnly`, `Secure`, `SameSite` present.
- Concurrent-session policy: old sessions surviving password change or
  "log out everywhere".

### 3. JWT
- Signature actually verified (no `alg: none` path, no decode-without-verify).
- Algorithm pinned — not read from the token header (RS256→HS256 confusion
  with the public key as HMAC secret is the classic).
- `exp` enforced; `iss`/`aud` validated where multi-tenant.
- Secret: hardcoded, short, or in the repo → finding.
- Sensitive claims (role) trusted without re-validation on privilege change.

### 4. Rate limiting & enumeration
- Login/reset/OTP endpoints without throttling or lockout → brute force.
- Distinct responses for "user not found" vs "wrong password" (status,
  body, or **timing**) → account enumeration. Reset endpoints that confirm
  whether an email exists are the usual leak.
- OTP: length ≥6, expiry ≤10 min, attempt cap, no response echo.

### 5. Registration & invite
- Role/plan taken from the request body (see mass-assignment skill).
- Email verification enforced before the account can act.

## Findings format

```
[auth-logic] <severity> <file:line> <flow>
  flaw:    <what is wrong>
  exploit: <concrete attack>
```

Severity guide: Critical = account takeover (reset/OTP/JWT forgery);
High = session hijack or brute-force-able credential endpoint;
Medium = enumeration or missing hardening with no direct takeover.

## Fix patterns

- **CSPRNG tokens** (`crypto.randomBytes(32)`), hashed at rest, ≤1h expiry,
  single-use, bound to the account, newest-invalidates-older.
- **Rotate session ID** at every privilege change; invalidate server-side
  on logout and password change.
- **Pin JWT algorithm and verifier**; verify before reading claims.
- **Uniform responses and timing** for unknown user vs wrong password —
  same status, same body, constant-time path.
- **Throttle by account *and* IP** with backoff; alert on lockout bursts.
