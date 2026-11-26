// License client for Android apps (Kotlin).
//
// build.gradle (app):
//   implementation("com.squareup.okhttp3:okhttp:4.12.0")
//   implementation("org.bouncycastle:bcprov-jdk18on:1.78.1")          // Ed25519 verification
//   implementation("androidx.security:security-crypto:1.1.0-alpha06") // EncryptedSharedPreferences
//
// All network functions are BLOCKING: call them from a coroutine on Dispatchers.IO / a worker thread.

package app.license

import android.content.Context
import android.provider.Settings
import android.util.Base64
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.bouncycastle.crypto.params.Ed25519PublicKeyParameters
import org.bouncycastle.crypto.signers.Ed25519Signer
import org.json.JSONObject
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

private const val BASE_URL = "__BASE_URL__/api/v1"
private const val PRODUCT = "__PRODUCT_SLUG__"
private const val PUBLIC_KEY_B64 = "__PUBLIC_KEY__"

sealed class LicenseState {
    data class Valid(val claims: JSONObject) : LicenseState()
    data class NeedsOnlineCheck(val claims: JSONObject) : LicenseState()
    data class Invalid(val reason: String) : LicenseState()
}

/** [license] = server rejected the license (lock app). [network] = transient, keep current token. */
class ApiException(val code: String, message: String, val network: Boolean = false) : Exception(message)

class LicenseClient(private val ctx: Context, private val appVersion: String) {

    private val http = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS).readTimeout(10, TimeUnit.SECONDS).build()
    private val json = "application/json".toMediaType()

    private val prefs by lazy {
        val key = MasterKey.Builder(ctx).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
        EncryptedSharedPreferences.create(
            ctx, "license_store", key,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    // ---------- device id ----------
    fun deviceId(): String {
        val androidId = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ANDROID_ID) ?: ""
        return sha256Hex("$PRODUCT|$androidId|${ctx.packageName}")
    }

    private fun sha256Hex(s: String) =
        MessageDigest.getInstance("SHA-256").digest(s.toByteArray()).joinToString("") { "%02x".format(it) }

    private fun b64u(s: String): ByteArray =
        Base64.decode(s, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)

    // ---------- storage ----------
    fun savedToken(): String? = prefs.getString("token", null)
    fun savedKey(): String? = prefs.getString("key", null)
    private fun save(key: String, token: String) {
        val seen = maxOf(prefs.getLong("seen", 0), System.currentTimeMillis() / 1000)
        prefs.edit().putString("key", key).putString("token", token).putLong("seen", seen).apply()
    }
    fun clear() = prefs.edit().clear().apply()

    // ---------- offline verification ----------
    fun verifyToken(token: String): JSONObject? = try {
        val (p, s) = token.split(".", limit = 2)
        val payload = b64u(p)
        val signer = Ed25519Signer().apply {
            init(false, Ed25519PublicKeyParameters(Base64.decode(PUBLIC_KEY_B64, Base64.DEFAULT), 0))
            update(payload, 0, payload.size)
        }
        if (signer.verifySignature(b64u(s))) JSONObject(String(payload)) else null
    } catch (e: Exception) { null }

    fun checkLocal(): LicenseState {
        val token = savedToken() ?: return LicenseState.Invalid("no_token")
        val c = verifyToken(token) ?: return LicenseState.Invalid("bad_signature")
        val now = System.currentTimeMillis() / 1000
        if (c.getString("product") != PRODUCT) return LicenseState.Invalid("wrong_product")
        if (c.getString("dev") != deviceId()) return LicenseState.Invalid("wrong_device")
        if (!c.isNull("exp") && now >= c.getLong("exp")) return LicenseState.Invalid("expired")
        val seen = prefs.getLong("seen", 0)
        if (now >= c.getLong("refresh_by") || now + 86_400 < seen) return LicenseState.NeedsOnlineCheck(c)
        return LicenseState.Valid(c)
    }

    // ---------- API ----------
    private fun body(key: String) = JSONObject()
        .put("license_key", key.trim().uppercase()).put("product", PRODUCT).put("device_id", deviceId())
        .put("device_name", android.os.Build.MODEL).put("app_version", appVersion)
        .put("os", "Android ${android.os.Build.VERSION.RELEASE}")

    private fun post(path: String, payload: JSONObject): JSONObject {
        val req = Request.Builder().url("$BASE_URL/$path").post(payload.toString().toRequestBody(json)).build()
        val res = try { http.newCall(req).execute() } catch (e: Exception) {
            throw ApiException("network", e.message ?: "network error", network = true)
        }
        res.use {
            if (it.code >= 500 || it.code == 429) throw ApiException("network", "HTTP ${it.code}", network = true)
            val j = JSONObject(it.body?.string() ?: "{}")
            if (!j.optBoolean("ok")) {
                val e = j.optJSONObject("error")
                throw ApiException(e?.optString("code") ?: "unknown", e?.optString("message") ?: "")
            }
            return j
        }
    }

    /** Activates, verifies the returned token, stores it. Throws ApiException on failure. */
    fun activate(key: String): LicenseState = store(key, post("licenses/activate", body(key)).getString("token"))

    /** Periodic online check (on app start when online, then ~daily). */
    fun validate(): LicenseState {
        val key = savedKey() ?: return LicenseState.Invalid("no_key")
        return store(key, post("licenses/validate", body(key)).getString("token"))
    }

    /** Free trial for this device (no key needed). Throws ApiException (trial_already_used, trial_unavailable…). */
    fun startTrial(): LicenseState {
        val p = JSONObject().put("product", PRODUCT).put("device_id", deviceId())
            .put("device_name", android.os.Build.MODEL).put("app_version", appVersion)
            .put("os", "Android ${android.os.Build.VERSION.RELEASE}")
        val token = post("licenses/trial", p).getString("token")
        val c = verifyToken(token) ?: throw ApiException("bad_signature", "Server token failed verification")
        save(c.getString("lic"), token)
        return checkLocal()
    }

    /** Offline activation: text of a .lic file given by support. Rejects files made for another device. */
    fun importLicenseFile(text: String): LicenseState {
        val token = text.trim()
        val c = verifyToken(token) ?: return LicenseState.Invalid("bad_signature")
        if (c.getString("product") != PRODUCT) return LicenseState.Invalid("wrong_product")
        if (c.getString("dev") != deviceId()) return LicenseState.Invalid("wrong_device")
        save(c.getString("lic"), token)
        return checkLocal()
    }

    /** Feature gate based on the verified token only. */
    fun hasFeature(name: String): Boolean {
        val c = (checkLocal() as? LicenseState.Valid)?.claims ?: return false
        val a = c.optJSONArray("features") ?: return false
        for (i in 0 until a.length()) if (a.getString(i) == name) return true
        return false
    }

    fun deactivate() {
        val key = savedKey() ?: return
        post("licenses/deactivate", body(key)); clear()
    }

    private fun store(key: String, token: String): LicenseState {
        if (verifyToken(token) == null) throw ApiException("bad_signature", "Server token failed verification")
        save(key, token)
        return checkLocal()
    }

    // ---------- updates ----------
    data class Update(val version: String, val mandatory: Boolean, val notes: String?, val url: String,
                      val requiresLicense: Boolean, val sha256: String, val signature: String)

    fun checkUpdate(): Update? {
        val req = Request.Builder().url("$BASE_URL/updates/check?product=$PRODUCT&version=$appVersion&channel=stable&device_id=${deviceId()}").build()
        val j = try { http.newCall(req).execute().use { JSONObject(it.body?.string() ?: "{}") } } catch (e: Exception) { return null }
        if (!j.optBoolean("update_available")) return null
        return Update(j.getString("version"), j.optBoolean("mandatory"), j.optString("notes"), j.getString("download_url"),
            j.optBoolean("requires_license"), j.getString("sha256"), j.getString("signature"))
    }

    /** Downloads, then verifies SHA-256 + Ed25519 release signature. Returns bytes only if both pass. */
    fun downloadUpdate(u: Update): ByteArray? {
        var url = u.url
        if (u.requiresLicense) url += "?license_key=${savedKey()}&device_id=${deviceId()}"
        val bytes = http.newCall(Request.Builder().url(url).build()).execute().use { it.body?.bytes() } ?: return null

        val hash = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
        if (hash != u.sha256.lowercase()) return null

        val msg = "$PRODUCT|${u.version}|${u.sha256.lowercase()}".toByteArray()
        val signer = Ed25519Signer().apply {
            init(false, Ed25519PublicKeyParameters(Base64.decode(PUBLIC_KEY_B64, Base64.DEFAULT), 0))
            update(msg, 0, msg.size)
        }
        return if (signer.verifySignature(b64u(u.signature))) bytes else null
    }

    // ---------- telemetry (fire and forget; never throws) ----------
    fun event(name: String, meta: JSONObject? = null) {
        try {
            val e = JSONObject().put("name", name).apply { if (meta != null) put("meta", meta) }
            val p = JSONObject().put("product", PRODUCT).put("device_id", deviceId()).put("app_version", appVersion)
                .put("os", "Android ${android.os.Build.VERSION.RELEASE}")
                .put("events", org.json.JSONArray().put(e))
            val req = Request.Builder().url("$BASE_URL/telemetry").post(p.toString().toRequestBody(json)).build()
            http.newBuilder().callTimeout(4, TimeUnit.SECONDS).build().newCall(req).execute().close()
        } catch (_: Exception) { }
    }
}
