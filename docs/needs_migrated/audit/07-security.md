# 07 – Security (headers, cookies, secrets)

Status: Reviewed cookie handling, headers, and secret exposure; no behavior changes.

## Cookies

- Supabase server helpers use Next `cookies()` with `setAll` forwarding in `libs/supabase/server.js` and `libs/supabase/middleware.js`.
- Cookie options are delegated to Supabase client; no direct `Set-Cookie` header construction in app code.
- Middleware wires `updateSession` early; no additional mutation in between (correct per guidance).

## Headers & CSP

- `next.config.js` sets security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- `images.contentSecurityPolicy` is set for image optimization responses. A global CSP is not configured; adding one must be carefully tested to avoid blocking current assets (documented only).

## Secrets in client code

- Only public env vars referenced in code: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (expected for Supabase browser usage). No private secrets detected in client bundles.

## Opportunities (documented, not applied)

- Consider global CSP via `headers()` including `script-src`, `connect-src` for Supabase domains, ensuring no breakage.
- Confirm cookie flags (`HttpOnly`, `Secure`, `SameSite`) applied by Supabase auth cookies in production; adjust via Supabase config if needed.

## Manual QA note

- No changes made; documentation only. Further hardening requires careful end-to-end validation and is out of scope for review-only changes.
