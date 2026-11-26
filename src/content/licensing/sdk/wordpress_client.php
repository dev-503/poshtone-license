<?php
/**
 * License + update client for a WordPress plugin.
 *
 * Usage (in your main plugin file):
 *   require_once __DIR__ . '/class-hub-license-client.php';
 *   Hub_License_Client::boot( __FILE__, '1.0.0' );     // plugin file + current version
 *   if ( ! Hub_License_Client::is_licensed() ) { ... disable premium features / show admin notice ... }
 *
 * Requires WordPress 5.2+ (sodium_compat is bundled). Network calls use short timeouts and never block pages.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

final class Hub_License_Client {

	const BASE_URL   = '__BASE_URL__/api/v1';
	const PRODUCT    = '__PRODUCT_SLUG__';
	const PUBLIC_KEY = '__PUBLIC_KEY__'; // base64, 32 bytes

	private static $file;
	private static $version;

	public static function boot( string $plugin_file, string $version ): void {
		self::$file    = $plugin_file;
		self::$version = $version;

		add_action( 'hub_license_daily', [ __CLASS__, 'validate' ] );
		if ( ! wp_next_scheduled( 'hub_license_daily' ) ) {
			wp_schedule_event( time() + 300, 'daily', 'hub_license_daily' );
		}
		add_filter( 'pre_set_site_transient_update_plugins', [ __CLASS__, 'inject_update' ] );
		add_filter( 'upgrader_pre_download', [ __CLASS__, 'verify_package' ], 10, 3 );
	}

	/* ---------- device id ---------- */
	public static function device_id(): string {
		$uuid = get_option( 'hub_site_uuid' );
		if ( ! $uuid ) {
			$uuid = wp_generate_uuid4();
			add_option( 'hub_site_uuid', $uuid, '', 'no' );
		}
		return hash( 'sha256', self::PRODUCT . '|' . $uuid );
	}

	/* ---------- offline verification ---------- */
	private static function b64u( string $s ): string {
		return (string) base64_decode( strtr( $s, '-_', '+/' ) . str_repeat( '=', ( 4 - strlen( $s ) % 4 ) % 4 ), true );
	}

	public static function verify_token( string $token ): ?array {
		$parts = explode( '.', $token );
		if ( count( $parts ) !== 2 ) { return null; }
		$payload = self::b64u( $parts[0] );
		$sig     = self::b64u( $parts[1] );
		$pub     = base64_decode( self::PUBLIC_KEY, true );
		if ( ! $payload || strlen( $sig ) !== SODIUM_CRYPTO_SIGN_BYTES || ! $pub ) { return null; }
		if ( ! sodium_crypto_sign_verify_detached( $sig, $payload, $pub ) ) { return null; }
		$data = json_decode( $payload, true );
		return is_array( $data ) ? $data : null;
	}

	/** @return string valid | needs_check | invalid:<reason> */
	public static function state(): string {
		$token = get_option( 'hub_license_token' );
		if ( ! $token ) { return 'invalid:no_token'; }
		$c = self::verify_token( $token );
		if ( ! $c ) { return 'invalid:bad_signature'; }
		$now = time();
		if ( ( $c['product'] ?? '' ) !== self::PRODUCT ) { return 'invalid:wrong_product'; }
		if ( ( $c['dev'] ?? '' ) !== self::device_id() ) { return 'invalid:wrong_device'; }
		if ( isset( $c['exp'] ) && $now >= (int) $c['exp'] ) { return 'invalid:expired'; }
		$seen = (int) get_option( 'hub_license_seen', 0 );
		if ( $now >= (int) $c['refresh_by'] || $now + DAY_IN_SECONDS < $seen ) { return 'needs_check'; }
		return 'valid';
	}

	/** Gate premium features with this. needs_check is tolerated briefly so a server outage never breaks sites. */
	public static function is_licensed(): bool {
		return in_array( self::state(), [ 'valid', 'needs_check' ], true );
	}

	/* ---------- API ---------- */
	private static function body( string $key ): array {
		return [
			'license_key' => strtoupper( trim( $key ) ),
			'product'     => self::PRODUCT,
			'device_id'   => self::device_id(),
			'device_name' => wp_parse_url( home_url(), PHP_URL_HOST ),
			'app_version' => self::$version,
			'os'          => 'WordPress ' . get_bloginfo( 'version' ),
		];
	}

	/** @return array|WP_Error  decoded JSON on ok; WP_Error code = server error.code or 'network' */
	private static function post( string $path, array $body ) {
		$res = wp_remote_post( self::BASE_URL . '/' . $path, [
			'timeout' => 10,
			'headers' => [ 'Content-Type' => 'application/json', 'Accept' => 'application/json' ],
			'body'    => wp_json_encode( $body ),
		] );
		if ( is_wp_error( $res ) ) { return new WP_Error( 'network', $res->get_error_message() ); }
		$code = wp_remote_retrieve_response_code( $res );
		if ( $code >= 500 || 429 === $code ) { return new WP_Error( 'network', 'HTTP ' . $code ); }
		$j = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( empty( $j['ok'] ) ) {
			return new WP_Error( $j['error']['code'] ?? 'unknown', $j['error']['message'] ?? '' );
		}
		return $j;
	}

	private static function store( string $key, array $j ) {
		if ( ! self::verify_token( $j['token'] ?? '' ) ) {
			return new WP_Error( 'bad_signature', 'Server token failed verification' );
		}
		update_option( 'hub_license_key', strtoupper( trim( $key ) ), false );
		update_option( 'hub_license_token', $j['token'], false );
		update_option( 'hub_license_seen', max( (int) get_option( 'hub_license_seen', 0 ), time() ), false );
		update_option( 'hub_license_info', $j['license'] ?? [], false );
		return true;
	}

	public static function activate( string $key ) {
		$j = self::post( 'licenses/activate', self::body( $key ) );
		return is_wp_error( $j ) ? $j : self::store( $key, $j );
	}

	public static function validate() {
		$key = get_option( 'hub_license_key' );
		if ( ! $key ) { return false; }
		$j = self::post( 'licenses/validate', self::body( $key ) );
		if ( is_wp_error( $j ) ) {
			// network problems keep the current token; real license errors drop it
			if ( 'network' !== $j->get_error_code() ) { delete_option( 'hub_license_token' ); }
			return $j;
		}
		return self::store( $key, $j );
	}

	/** Free trial for this site (no key needed). */
	public static function start_trial() {
		$j = self::post( 'licenses/trial', self::body( '' ) );
		if ( is_wp_error( $j ) ) { return $j; }
		$c = self::verify_token( $j['token'] ?? '' );
		if ( ! $c ) { return new WP_Error( 'bad_signature', 'Server token failed verification' ); }
		return self::store( $c['lic'], $j );
	}

	/** Offline activation: contents of a .lic file given by support. */
	public static function import_license_file( string $text ) {
		$token = trim( $text );
		$c     = self::verify_token( $token );
		if ( ! $c ) { return new WP_Error( 'bad_signature', 'Invalid license file' ); }
		if ( ( $c['product'] ?? '' ) !== self::PRODUCT ) { return new WP_Error( 'wrong_product', 'License file is for another product' ); }
		if ( ( $c['dev'] ?? '' ) !== self::device_id() ) { return new WP_Error( 'wrong_device', 'License file is for another site' ); }
		return self::store( $c['lic'], [ 'token' => $token ] );
	}

	/** Feature gate based on the verified token only. */
	public static function has_feature( string $name ): bool {
		if ( ! self::is_licensed() ) { return false; }
		$c = self::verify_token( (string) get_option( 'hub_license_token' ) );
		return $c && in_array( $name, (array) ( $c['features'] ?? [] ), true );
	}

	public static function deactivate() {
		$key = get_option( 'hub_license_key' );
		if ( $key ) { self::post( 'licenses/deactivate', self::body( $key ) ); }
		delete_option( 'hub_license_token' );
		delete_option( 'hub_license_key' );
	}

	/* ---------- updates ---------- */
	public static function inject_update( $transient ) {
		if ( empty( $transient->checked ) ) { return $transient; }
		$res = wp_remote_get( add_query_arg( [
			'product' => self::PRODUCT, 'version' => self::$version, 'channel' => 'stable', 'device_id' => self::device_id(),
		], self::BASE_URL . '/updates/check' ), [ 'timeout' => 8 ] );
		if ( is_wp_error( $res ) ) { return $transient; }
		$u = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( empty( $u['update_available'] ) ) { return $transient; }

		$package = $u['download_url'];
		if ( ! empty( $u['requires_license'] ) ) {
			if ( ! self::is_licensed() ) { return $transient; } // no valid license => no one-click update
			$package = add_query_arg( [ 'license_key' => get_option( 'hub_license_key' ), 'device_id' => self::device_id() ], $package );
		}
		// remember what to verify once WordPress has downloaded the package
		set_transient( 'hub_update_meta', [ 'sha256' => $u['sha256'], 'signature' => $u['signature'], 'version' => $u['version'] ], DAY_IN_SECONDS );

		$basename = plugin_basename( self::$file );
		$transient->response[ $basename ] = (object) [
			'id' => $basename, 'slug' => dirname( $basename ), 'plugin' => $basename,
			'new_version' => $u['version'], 'package' => $package, 'url' => '',
		];
		return $transient;
	}

	/** Runs before install: SHA-256 and Ed25519 signature must match, otherwise the update is aborted. */
	public static function verify_package( $reply, $package, $upgrader ) {
		if ( false !== $reply || 0 !== strpos( (string) $package, self::BASE_URL . '/updates/download/' ) ) { return $reply; }
		$meta = get_transient( 'hub_update_meta' );
		if ( ! $meta ) { return new WP_Error( 'hub_no_meta', 'Missing update metadata.' ); }

		$file = download_url( $package, 300 );
		if ( is_wp_error( $file ) ) { return $file; }

		$hash_ok = hash_equals( strtolower( $meta['sha256'] ), hash_file( 'sha256', $file ) );
		$msg     = self::PRODUCT . '|' . $meta['version'] . '|' . strtolower( $meta['sha256'] );
		$sig_ok  = sodium_crypto_sign_verify_detached( self::b64u( $meta['signature'] ), $msg, base64_decode( self::PUBLIC_KEY ) );
		if ( ! $hash_ok || ! $sig_ok ) {
			@unlink( $file );
			return new WP_Error( 'hub_bad_package', 'Update failed integrity verification.' );
		}
		return $file;
	}

	/* ---------- telemetry (never blocks the page) ---------- */
	public static function event( string $name, array $meta = [] ): void {
		wp_remote_post( self::BASE_URL . '/telemetry', [
			'timeout' => 1, 'blocking' => false,
			'headers' => [ 'Content-Type' => 'application/json' ],
			'body'    => wp_json_encode( [
				'product' => self::PRODUCT, 'device_id' => self::device_id(), 'app_version' => self::$version,
				'os' => 'WordPress ' . get_bloginfo( 'version' ),
				'events' => [ [ 'name' => $name, 'meta' => $meta ?: null ] ],
			] ),
		] );
	}
}
