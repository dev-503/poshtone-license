// License client for Windows apps written in Rust.
//
// Cargo.toml:
//   reqwest   = { version = "0.12", features = ["blocking", "json"] }
//   serde     = { version = "1", features = ["derive"] }
//   serde_json = "1"
//   ed25519-dalek = "2"
//   base64    = "0.22"
//   sha2      = "0.10"
//   winreg    = "0.52"        # Windows only
//   windows-sys = { version = "0.59", features = ["Win32_Foundation", "Win32_Security_Cryptography", "Win32_System_Memory"] }  # Windows only (DPAPI)
//
// Recommended release profile (harder to reverse-engineer, smaller exe):
//   [profile.release]
//   opt-level = 3
//   lto = "fat"
//   codegen-units = 1
//   panic = "abort"
//   strip = "symbols"
//   debug = false
//
// All calls here are BLOCKING: run them on a worker thread, never on the UI thread.

use base64::{
    engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD},
    Engine,
};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const BASE_URL: &str = "__BASE_URL__/api/v1";
const PRODUCT: &str = "__PRODUCT_SLUG__";
const PUBLIC_KEY_B64: &str = "__PUBLIC_KEY__";
const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Deserialize, Debug, Clone)]
pub struct Claims {
    pub lic: String,
    pub product: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub dev: String,
    pub iat: i64,
    pub exp: Option<i64>,
    pub refresh_by: i64,
    pub max_devices: u32,
    #[serde(default)]
    pub plan: Option<String>,
    /// Enabled feature keys; gate premium functions with `has_feature`.
    #[serde(default)]
    pub features: Vec<String>,
}

#[derive(Debug)]
pub enum LicenseState {
    /// Token is valid and inside its offline grace window.
    Valid(Claims),
    /// Token is authentic but must be re-validated online (grace window over / clock suspicious).
    NeedsOnlineCheck(Claims),
    /// Not licensed. The string is a short machine reason.
    Invalid(&'static str),
}

#[derive(Debug)]
pub enum ApiError {
    /// Server answered with a license error code (lock the app for revoked/suspended/expired).
    License { code: String, message: String },
    /// Network/timeout/5xx. NOT a license failure: keep the current token.
    Network(String),
}

fn now() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

// ---------- device id ----------

#[cfg(windows)]
fn machine_identifier() -> String {
    use winreg::{enums::*, RegKey};
    RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey_with_flags("SOFTWARE\\Microsoft\\Cryptography", KEY_READ | KEY_WOW64_64KEY)
        .ok()
        .and_then(|k| k.get_value::<String, _>("MachineGuid").ok())
        .unwrap_or_default()
}

#[cfg(not(windows))]
fn machine_identifier() -> String {
    std::fs::read_to_string("/etc/machine-id").unwrap_or_default().trim().to_string()
}

pub fn device_id() -> String {
    hex(&Sha256::digest(format!("{}|{}", PRODUCT, machine_identifier()).as_bytes()))
}

// ---------- local storage (Windows DPAPI) ----------
// The token is already bound to this device by the server signature; DPAPI additionally stops a copied
// file from being read/edited on another PC or by another Windows user. It is a speed bump, not a vault.
// NOTE: verify the windows-sys paths (CryptProtectData, LocalFree) against the version you pin.

#[cfg(windows)]
fn os_protect(data: &[u8], unprotect: bool) -> Option<Vec<u8>> {
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{
        CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };
    let entropy = concat!("__PRODUCT_SLUG__", "|license-store|v1").as_bytes();
    unsafe {
        let input = CRYPT_INTEGER_BLOB { cbData: data.len() as u32, pbData: data.as_ptr() as *mut u8 };
        let ent = CRYPT_INTEGER_BLOB { cbData: entropy.len() as u32, pbData: entropy.as_ptr() as *mut u8 };
        let mut out = CRYPT_INTEGER_BLOB { cbData: 0, pbData: std::ptr::null_mut() };
        let ok = if unprotect {
            CryptUnprotectData(&input, std::ptr::null_mut(), &ent, std::ptr::null(), std::ptr::null(), CRYPTPROTECT_UI_FORBIDDEN, &mut out)
        } else {
            CryptProtectData(&input, std::ptr::null(), &ent, std::ptr::null(), std::ptr::null(), CRYPTPROTECT_UI_FORBIDDEN, &mut out)
        };
        if ok == 0 || out.pbData.is_null() {
            return None;
        }
        let v = std::slice::from_raw_parts(out.pbData, out.cbData as usize).to_vec();
        LocalFree(out.pbData as _);
        Some(v)
    }
}

#[cfg(not(windows))]
fn os_protect(_data: &[u8], _unprotect: bool) -> Option<Vec<u8>> {
    None
}

/// First byte: 1 = DPAPI-protected, 0 = plain (fallback when DPAPI is unavailable).
fn protect_bytes(data: &[u8]) -> Vec<u8> {
    match os_protect(data, false) {
        Some(mut v) => { v.insert(0, 1); v }
        None => { let mut v = vec![0u8]; v.extend_from_slice(data); v }
    }
}

fn unprotect_bytes(raw: &[u8]) -> Option<Vec<u8>> {
    match raw.split_first() {
        Some((1, rest)) => os_protect(rest, true),
        Some((0, rest)) => Some(rest.to_vec()),
        _ => None,
    }
}

fn store_path() -> std::path::PathBuf {
    let base = std::env::var_os("LOCALAPPDATA")
        .or_else(|| std::env::var_os("HOME"))
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    base.join(PRODUCT).join("license.bin")
}

#[derive(Debug, Clone, Default)]
pub struct SavedState {
    pub key: String,
    pub token: String,
    /// Highest "now" ever observed (clock-rollback protection input for `check_local`).
    pub seen: i64,
}

pub fn save_state(key: &str, token: &str, highest_seen: i64) -> std::io::Result<()> {
    let json = json!({ "key": key, "token": token, "seen": highest_seen }).to_string();
    let path = store_path();
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    std::fs::write(path, protect_bytes(json.as_bytes()))
}

pub fn load_state() -> Option<SavedState> {
    let raw = std::fs::read(store_path()).ok()?;
    let v: Value = serde_json::from_slice(&unprotect_bytes(&raw)?).ok()?;
    Some(SavedState {
        key: v["key"].as_str()?.to_string(),
        token: v["token"].as_str()?.to_string(),
        seen: v["seen"].as_i64().unwrap_or(0),
    })
}

pub fn clear_state() {
    let _ = std::fs::remove_file(store_path());
}

// ---------- token verification (offline) ----------

pub fn verify_token(token: &str) -> Result<Claims, &'static str> {
    let (p, s) = token.split_once('.').ok_or("malformed")?;
    let payload = URL_SAFE_NO_PAD.decode(p).map_err(|_| "malformed")?;
    let sig_bytes = URL_SAFE_NO_PAD.decode(s).map_err(|_| "malformed")?;

    let key_bytes: [u8; 32] = STANDARD
        .decode(PUBLIC_KEY_B64)
        .map_err(|_| "bad_public_key")?
        .try_into()
        .map_err(|_| "bad_public_key")?;
    let key = VerifyingKey::from_bytes(&key_bytes).map_err(|_| "bad_public_key")?;
    let sig = Signature::from_slice(&sig_bytes).map_err(|_| "malformed")?;

    // The signature covers the exact payload bytes; never re-serialize before verifying.
    key.verify(&payload, &sig).map_err(|_| "bad_signature")?;
    serde_json::from_slice(&payload).map_err(|_| "malformed")
}

/// `highest_seen`: largest unix time ever observed by the app (persist it next to the token).
pub fn check_local(token: &str, highest_seen: i64) -> LicenseState {
    let claims = match verify_token(token) {
        Ok(c) => c,
        Err(e) => return LicenseState::Invalid(e),
    };
    let t = now();
    if claims.product != PRODUCT {
        return LicenseState::Invalid("wrong_product");
    }
    if claims.dev != device_id() {
        return LicenseState::Invalid("wrong_device");
    }
    if let Some(exp) = claims.exp {
        if t >= exp {
            return LicenseState::Invalid("expired");
        }
    }
    if t >= claims.refresh_by || t + 86_400 < highest_seen {
        return LicenseState::NeedsOnlineCheck(claims);
    }
    LicenseState::Valid(claims)
}

// ---------- API ----------

fn http() -> reqwest::blocking::Client {
    reqwest::blocking::Client::builder().timeout(Duration::from_secs(10)).build().expect("http client")
}

fn license_body(key: &str) -> Value {
    json!({
        "license_key": key.trim().to_uppercase(),
        "product": PRODUCT,
        "device_id": device_id(),
        "device_name": std::env::var("COMPUTERNAME").unwrap_or_default(),
        "app_version": APP_VERSION,
        "os": "Windows",
    })
}

fn post(path: &str, body: &Value) -> Result<Value, ApiError> {
    let resp = http()
        .post(format!("{}/{}", BASE_URL, path))
        .json(body)
        .send()
        .map_err(|e| ApiError::Network(e.to_string()))?;
    let status = resp.status();
    if status.is_server_error() || status.as_u16() == 429 {
        return Err(ApiError::Network(format!("HTTP {}", status)));
    }
    let v: Value = resp.json().map_err(|e| ApiError::Network(e.to_string()))?;
    if v["ok"].as_bool() == Some(true) {
        Ok(v)
    } else {
        Err(ApiError::License {
            code: v["error"]["code"].as_str().unwrap_or("unknown").to_string(),
            message: v["error"]["message"].as_str().unwrap_or("").to_string(),
        })
    }
}

/// Returns the signed token. Verify it with `check_local` and persist it.
pub fn activate(key: &str) -> Result<String, ApiError> {
    let v = post("licenses/activate", &license_body(key))?;
    Ok(v["token"].as_str().unwrap_or_default().to_string())
}

/// Periodic online check; returns a fresh token (replace the stored one).
pub fn validate(key: &str) -> Result<String, ApiError> {
    let v = post("licenses/validate", &license_body(key))?;
    Ok(v["token"].as_str().unwrap_or_default().to_string())
}

/// Free trial for this device (no key needed). Verify the returned token with `check_local` and persist it.
pub fn start_trial() -> Result<String, ApiError> {
    let v = post("licenses/trial", &license_body(""))?;
    Ok(v["token"].as_str().unwrap_or_default().to_string())
}

/// Offline activation: import the text of a `.lic` file. On Valid, persist `text.trim()` as the token and
/// `claims.lic` as the license key. Rejects files made for another device (wrong_device).
pub fn import_license_file(text: &str, highest_seen: i64) -> LicenseState {
    check_local(text.trim(), highest_seen)
}

/// Feature gate: only trust claims that came out of `check_local` (verified token).
pub fn has_feature(claims: &Claims, name: &str) -> bool {
    claims.features.iter().any(|f| f == name)
}

pub fn deactivate(key: &str) -> Result<(), ApiError> {
    post("licenses/deactivate", &license_body(key)).map(|_| ())
}

// ---------- updates ----------

#[derive(Debug, Deserialize)]
pub struct UpdateInfo {
    pub version: String,
    pub mandatory: bool,
    pub notes: Option<String>,
    pub download_url: String,
    pub requires_license: bool,
    pub sha256: String,
    pub signature: String,
}

/// Numeric per-segment comparison ("1.10.0" > "1.9.0"). Non-numeric parts count as 0.
pub fn version_gt(a: &str, b: &str) -> bool {
    let parse = |s: &str| -> Vec<u64> { s.trim_start_matches('v').split('.').map(|p| p.trim().parse().unwrap_or(0)).collect() };
    let (x, y) = (parse(a), parse(b));
    for i in 0..x.len().max(y.len()) {
        let (p, q) = (x.get(i).copied().unwrap_or(0), y.get(i).copied().unwrap_or(0));
        if p != q {
            return p > q;
        }
    }
    false
}

/// Start the downloaded (and already verified) installer, then the caller should exit the app.
pub fn launch_installer(path: &std::path::Path, args: &[&str]) -> std::io::Result<()> {
    std::process::Command::new(path).args(args).spawn().map(|_| ())
}

pub fn check_update() -> Result<Option<UpdateInfo>, ApiError> {
    let url = format!("{}/updates/check?product={}&version={}&channel=stable&device_id={}", BASE_URL, PRODUCT, APP_VERSION, device_id());
    let v: Value = http().get(url).send().and_then(|r| r.json()).map_err(|e| ApiError::Network(e.to_string()))?;
    if v["update_available"].as_bool() != Some(true) {
        return Ok(None);
    }
    let info: UpdateInfo = serde_json::from_value(v).map_err(|e| ApiError::Network(e.to_string()))?;
    // downgrade protection: never accept a version that is not strictly newer
    if !version_gt(&info.version, APP_VERSION) {
        return Ok(None);
    }
    Ok(Some(info))
}

/// Download to `dest`, then verify SHA-256 AND the Ed25519 signature. Deletes the file on failure.
pub fn download_update(info: &UpdateInfo, license_key: &str, dest: &std::path::Path) -> Result<(), String> {
    let mut url = info.download_url.clone();
    if info.requires_license {
        url = format!("{}?license_key={}&device_id={}", url, license_key.trim().to_uppercase(), device_id());
    }
    let bytes = http().get(url).send().map_err(|e| e.to_string())?.bytes().map_err(|e| e.to_string())?;

    if hex(&Sha256::digest(&bytes)) != info.sha256.to_lowercase() {
        return Err("sha256 mismatch".into());
    }
    let message = format!("{}|{}|{}", PRODUCT, info.version, info.sha256.to_lowercase());
    let key_bytes: [u8; 32] = STANDARD.decode(PUBLIC_KEY_B64).map_err(|e| e.to_string())?.try_into().map_err(|_| "bad key")?;
    let key = VerifyingKey::from_bytes(&key_bytes).map_err(|e| e.to_string())?;
    let sig = Signature::from_slice(&URL_SAFE_NO_PAD.decode(&info.signature).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    key.verify(message.as_bytes(), &sig).map_err(|_| "bad release signature".to_string())?;

    std::fs::write(dest, &bytes).map_err(|e| e.to_string())
}

// ---------- telemetry (fire and forget) ----------

pub fn send_event(name: &str, meta: Value) {
    let body = json!({
        "product": PRODUCT, "device_id": device_id(), "app_version": APP_VERSION, "os": "Windows",
        "events": [{ "name": name, "meta": meta }],
    });
    let _ = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(4))
        .build()
        .and_then(|c| c.post(format!("{}/telemetry", BASE_URL)).json(&body).send());
}
