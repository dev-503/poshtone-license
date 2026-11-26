# Licensing & Update Integration Guide — {{PRODUCT_NAME}}

> You are an AI coding assistant. Implement license activation, license verification, update checking
> and (optional) anonymous telemetry in the application described below, **exactly** following this
> protocol. Do not invent endpoints, fields or crypto. If something here conflicts with the app's
> existing code, keep this protocol and adapt the app's code.

## 0. Project constants

| Constant | Value |
|---|---|
| API base URL | `{{BASE_URL}}/api/v1` |
| Product slug (`product`) | `{{PRODUCT_SLUG}}` |
| Platform | `{{PLATFORM}}` |
| Public key (Ed25519, base64, 32 bytes) | `{{PUBLIC_KEY}}` |
| Offline grace (server-defined) | {{OFFLINE_GRACE_DAYS}} days |
| Downloads require license | {{REQUIRES_LICENSE}} |
| Free trial | {{TRIAL_DAYS}} |
| Feature keys (entitlements) | {{FEATURES}} |

The public key is **public** and must be embedded in the app. The matching private key exists only on
the server. **Never** ask for, generate, or embed a private key.

## 1. Model

- A **license key** looks like `DEI-ABCD-EFGH-JKLM-NPQR` (case-insensitive, send uppercase).
- License types: `subscription` (has expiry) and `perpetual` (no expiry).
- A license allows N **devices**. A device is identified by `device_id` (see §3).
- On success the server returns a signed **token**. The app stores the token and verifies it
  **locally** on every start (no network needed), and re-validates online periodically.

## 2. Endpoints

All requests/responses are JSON (`Content-Type: application/json`, `Accept: application/json`).
Success: `{"ok": true, ...}`. Failure: `{"ok": false, "error": {"code": "...", "message": "..."}}`
with an HTTP 4xx status. Always branch on `error.code`, never on `message` text.

### 2.1 `POST /licenses/activate`
Binds the license to this device (consumes one device slot; idempotent for the same device).
```json
{ "license_key": "DEI-ABCD-EFGH-JKLM-NPQR", "product": "{{PRODUCT_SLUG}}", "device_id": "<64 hex>",
  "device_name": "OFFICE-PC", "app_version": "1.4.2", "os": "Windows 11" }
```
Response:
```json
{ "ok": true, "token": "<payload_b64url>.<signature_b64url>",
  "license": { "key": "...", "type": "subscription", "status": "active", "customer_name": "...", "expires_at": "2027-11-20T20:29:59+00:00" },
  "server_time": 1790000000 }
```
`device_name`, `app_version`, `os` are optional but strongly recommended (they power analytics).

### 2.2 `POST /licenses/validate`
Same request body as activate. Requires the device to be already activated. Returns a **fresh token**
(resets the offline grace window). Call it on app start when online, then every 24 hours while running.

### 2.2a `POST /licenses/trial`
Starts (or resumes) the free trial for this device, no license key needed. Body: `product`, `device_id`, optional
`device_name`, `app_version`, `os`. Returns the same shape as `activate` (a token with `type: "trial"` and an `exp`).
One trial per device and product: after it ends the server answers `trial_already_used`. `trial_unavailable`
means the product has no trial. Use it for a "Try free" button on the activation screen.

### 2.3 `POST /licenses/deactivate`
Same body. Frees this device's slot (use for "Move license to another computer"). Delete the local token afterwards.

### 2.4 `GET /updates/check?product={{PRODUCT_SLUG}}&version=<current>&channel=stable&device_id=<device_id>`
No license needed. `device_id` is required for staged rollouts (a release at 25% is offered to 25% of devices, always the same ones). Response when nothing new: `{"ok":true,"update_available":false,"latest_version":"1.4.2"}`.
When an update exists:
```json
{ "ok": true, "update_available": true, "version": "1.5.0", "channel": "stable", "mandatory": false,
  "notes": "release notes text", "published_at": "...", "download_url": "https://.../api/v1/updates/download/12",
  "requires_license": true, "size": 48123456, "sha256": "<64 hex>", "signature": "<b64url>" }
```
If `mandatory` is true, block normal use until the update is installed.

### 2.5 `GET <download_url>[?license_key=...&device_id=...]`
When `requires_license` is true you **must** append `license_key` and `device_id` as query parameters.
The server may answer with an **HTTP 302 redirect** to a short-lived signed storage URL (object storage).
The HTTP client **must follow redirects** (reqwest, OkHttp and WordPress `download_url()` do by default) and
must not send the license headers/params to any other host. Do not cache that signed URL; request it again
for every download. Response body is the file. Errors are JSON as above.

### 2.6 `POST /telemetry` (optional, anonymous)
```json
{ "product": "{{PRODUCT_SLUG}}", "device_id": "<64 hex>", "app_version": "1.4.2", "os": "Windows 11",
  "license_key": "optional", "events": [ { "name": "app_start" }, { "name": "feature_used", "meta": { "feature": "invoice_print" } } ] }
```
Rules: max 50 events per request; event `name` matches `[A-Za-z0-9_.:-]+` (max 64 chars); `meta` is a small
flat object (< 2 KB). **Never** put personal data (names, phone numbers, file paths, invoice contents) in
events. Send `app_start` once per launch, plus a few meaningful feature events. Send in the background
with a short timeout; failures must be silent and must never block the UI.

## 3. Device ID

`device_id = lowercase_hex( SHA-256( "{{PRODUCT_SLUG}}|" + machine_identifier ) )` → always 64 hex chars.

| Platform | `machine_identifier` |
|---|---|
| Windows | Registry `HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid` (64-bit view) |
| Android | `Settings.Secure.ANDROID_ID` + `"|" + applicationId` |
| WordPress | A UUID generated once with `wp_generate_uuid4()` and kept in an option (`hub_site_uuid`) |

Never send the raw identifier. Never use values that change often (IP, hostname-only, uptime).

## 4. Token format and local verification (MUST be implemented)

`token = base64url(payload_json) + "." + base64url(signature)` (base64url = RFC 4648 §5, **no padding**).
`signature` = Ed25519 detached signature over the **exact payload_json bytes** as received (do not
re-serialize). Verify with the embedded public key **before** trusting anything in the payload.

Payload fields:
```json
{ "v":1, "lic":"DEI-...", "product":"{{PRODUCT_SLUG}}", "type":"subscription|perpetual|trial", "plan":"Pro|null",
  "features":["pdf_export","multi_user"], "dev":"<device_id>", "iat":1790000000,
  "exp":1822000000 /* null for perpetual */, "refresh_by":1791209600, "max_devices":1 }
```

Local check, in this order (any failure ⇒ app is **unlicensed**):
1. Token well-formed and signature valid for the embedded public key.
2. `payload.product == "{{PRODUCT_SLUG}}"`.
3. `payload.dev == current device_id` (token copied from another machine must fail).
4. If `exp != null` and `now >= exp` ⇒ expired (offer renewal; do not delete data).
5. If `now >= refresh_by` ⇒ **needs online check**: try `validate`; if it succeeds store the new token; if the
   network is unavailable, allow a short read-only/limited mode (or lock) per product policy; if the server
   answers with a license error (§5), the app is unlicensed.
6. Clock tampering: remember the largest `now` ever seen (monotonic high-water mark, stored with the token).
   If the system clock is earlier than that mark minus 1 day, treat as needs-online-check.

### 4.1 Features (entitlements)
`features` is the list of enabled feature keys, signed inside the token. Gate premium functions with a single helper
`has_feature("pdf_export")` that reads the **verified** token (never a plain setting the user can edit). Unknown or
missing keys mean "disabled". When the vendor changes a license's features they reach the app at the next successful
`validate`, so call `validate` on start when online.

### 4.2 Offline license file (no internet at all)
If the customer cannot reach the server, support generates a `.lic` file bound to the customer's `device_id`.
Implement an **"Import license file"** button: read the file text, trim it, run the exact same local verification as
§4 (signature, product, device, exp, refresh_by), and on success store it like a normal token. The license key is
`payload.lic`. The activation screen must show the device id (with a copy button) so the customer can send it to support.
The offline window is set when the file is made (often 180–365 days); after `refresh_by` a new file or an online
`validate` is needed.

## 5. Error codes

| `error.code` | HTTP | Meaning / what the app should do |
|---|---|---|
| `license_not_found` | 404 | Wrong key or key belongs to another product. Ask the user to re-enter. |
| `license_revoked` | 403 | Permanently cancelled. Drop the token, show locked screen. |
| `license_suspended` | 403 | Temporarily suspended. Drop token, tell user to contact support. |
| `license_expired` | 403 | Subscription ended. Show renewal prompt. |
| `device_limit_reached` | 403 | All device slots used. Tell the user to free a device (support panel or "deactivate" on the old PC). |
| `device_not_activated` | 403 | Token exists but this device isn't activated (e.g. released by admin). Re-run activate. |
| `product_inactive` / `product_not_found` | 403/404 | Misconfiguration. Show a generic error and log it. |
| `trial_unavailable` / `trial_already_used` | 403 | No trial for this product / this device already used it. Show the purchase screen. |
| `invalid_request` | 422 | Bug in the client request (missing/invalid field). Fix the code. |
| `release_not_found`, `file_missing` | 404 | Update file unavailable. Retry later. |
| HTTP 429 | 429 | Rate limited. Back off for ≥ 60 s. |
| Network error / timeout / 5xx | — | **Not** a license failure. Keep the current valid local token and retry later. |

Only the error codes above that mean "license invalid" may lock the app. Network problems must never lock a
user who has a valid, unexpired token inside its grace window.

## 6. Update flow (MUST verify before installing)

### 6.1 Protocol (all platforms)
1. On start and then **once every 24 hours** (persist the time of the last check so restarts do not trigger extra checks; run on a worker thread) call `updates/check` with the current version,
   `channel` and `device_id`. Network failure = silently skip; never block the app because the check failed.
2. If `update_available` is false, do nothing. If true, **re-check on the client** that `version` is strictly
   greater than the running version (numeric per dot segment, `1.10.0 > 1.9.0`). Never accept an equal or
   lower version (downgrade protection).
3. Show the release `notes` and "Update now" / "Later". If `mandatory` is true, only "Update now" is offered
   and normal use is blocked until installed (still let the user export/back up their data first).
4. Download from `download_url`. When `requires_license` is true append `license_key` and `device_id`.
   The server may answer with a 302 redirect to a short-lived storage URL (10 min): follow redirects, and
   request a fresh `download_url` each attempt instead of caching it. Show progress; allow cancel/resume-by-retry.
5. Compute SHA-256 of the downloaded bytes; it **must equal** `sha256` from the check response.
6. Verify `signature` (Ed25519, embedded public key) over the UTF-8 string
   `"{{PRODUCT_SLUG}}|<version>|<sha256>"`. On any mismatch delete the file and show a generic error.
7. Only after steps 5 and 6 pass, install (platform rules below). Keep the previous version for rollback.
8. Send the telemetry event `update_installed` (meta: `from`, `to`) after the new version starts successfully.

### 6.2 Staged rollout and channels
- The server decides who sees a release (percentage rollout is stable per `device_id`). The client must always
  send `device_id`; do not implement your own rollout logic.
- Default channel is `stable`. Offer `beta` only as an explicit opt-in setting; persist the choice.
- A release can have a `min_supported_version`: if the running version is lower, the response has
  `mandatory: true`. Treat it exactly like any mandatory update.

### 6.3 Platform specifics
- **Windows (Rust):** a running `.exe` cannot overwrite itself. Download the installer/new exe to a temp
  folder, verify, then start it (`launch_installer`) and exit the app. Prefer an installer that supports
  silent mode (e.g. `/S` or `/VERYSILENT`) and relaunches the app. Never run an update with elevated rights
  unless the installer itself asks for it. Back up the user database before migrating its schema.
- **Android (Kotlin):** download to app-private storage, verify, then hand the APK to the system package
  installer (`ACTION_VIEW` with a `FileProvider` URI; needs `REQUEST_INSTALL_PACKAGES` permission). The APK
  must be signed with the same key as the installed app or Android rejects it. If the app is distributed
  through a store, only show "update available" and open the store page; do not self-install.
- **WordPress (PHP):** hook `pre_set_site_transient_update_plugins` to inject the update (package URL =
  `download_url` with the license query args) so the normal WordPress "Update" button works. Verify SHA-256 and
  signature in the `upgrader_pre_download` filter and return a `WP_Error` on failure.

Versions are compared numerically per dot-separated segment, never as strings.

## 7. Security rules for the implementation

- Verify token signatures locally with the embedded public key. A plain `if response.ok` is **not** enough.
- Store the token in a protected location (Windows: per-user app data, optionally DPAPI; Android:
  EncryptedSharedPreferences/Keystore; WordPress: an option with `autoload=no`).
- Use HTTPS only. Do not disable certificate validation. Set timeouts (≤ 10 s) on every request.
- Do not log license keys or tokens in full (mask all but the last 4 characters).
- Do not hardcode the license check in a single `if` that can be patched trivially: perform the check in a
  few places (start-up, before premium features, periodically) through one shared function.
- No private key, admin credential or database detail may appear anywhere in the client.
- **Windows hardening (Rust):**
  - Persist state only through `save_state` / `load_state` / `clear_state` (DPAPI-protected, per-user).
  - Do not keep a global `IS_LICENSED` bool. Call a shared verification function from several independent
    places (start-up, before each premium feature, periodic timer) and let each consumer react differently.
  - When the license is invalid, degrade (read-only / limited mode) instead of crashing, and never delete
    or lock the user's own data.
  - Keep error strings generic and never log keys or tokens. No anti-debug tricks.
  - Release profile: `opt-level=3, lto="fat", codegen-units=1, panic="abort", strip="symbols", debug=false`.
  - Do not add packers/obfuscators by default: they cause antivirus false positives for small vendors.
  - Be honest in comments/docs: a determined attacker can still patch the binary; this raises the cost only.
- **Make cracking expensive (all platforms):**
  - Use a "proof" value instead of a boolean: `check_local` returns the verified claims; premium code takes
    those claims (or a `Licensed` token type created only by the shared function) as a parameter, so deleting
    the check breaks the build/flow instead of just flipping a flag.
  - Use values from the verified claims in real logic (e.g. `max_devices`, `exp`, feature list as the
    allowed-feature set, license id in the file header of exports) so patching one comparison is not enough.
  - Do not react at the check site. Record the failure and degrade later and at a different place
    (e.g. after a random delay, or on the next save/export), so the cause is hard to trace in a debugger.
  - Re-verify periodically in the background and when a premium feature is first used in a session.
  - Check the clock: pass the highest timestamp ever seen into `check_local` and persist it, so rolling the
    system date back does not extend a subscription.
- The app UI language must follow the app's existing language; user-facing license messages should be
  friendly and actionable (what happened + what to do).

## 8. UX requirements

- First run without a token: show an "Activate" screen (license key input, paste-friendly, trims spaces,
  auto-uppercases, shows server error in plain language).
- A "License" page showing: customer name, type, expiry date, status, last online check, and buttons
  "Check now" and "Deactivate this device".
- Subscription: warn 14, 7 and 1 days before `exp`.
- Offline-friendly: the app must start instantly using local verification; online calls happen in the background.

## 9. Acceptance checklist (run these before saying "done")

1. Fresh install → activation with a valid key succeeds and persists across restarts (offline too).
2. Wrong key → `license_not_found` shown; app stays locked.
3. Copy the token file to another machine/profile → app rejects it (device mismatch).
4. Edit one character of the token → rejected (bad signature).
5. Second device on a 1-device license → `device_limit_reached`.
6. Deactivate → slot freed; token deleted; another device can activate.
7. Server unreachable with a fresh token → app works; after `refresh_by` it asks for an online check.
8. Update check shows a newer version; tampered download (changed byte) is rejected.
9. Telemetry failure (offline/timeout) never blocks or slows the UI.
10. (If trial is enabled) "Try free" starts a trial; a second trial on the same device is refused; the app locks when it ends.
11. A feature missing from the token's `features` stays disabled; enabling it on the server reaches the app after `validate`.
12. Importing a `.lic` file made for another device is rejected; the file for this device works without internet.

When finished, summarise which files you changed and how each checklist item was verified.
