import assert from 'node:assert/strict';
import { generateEd25519Keypair, LicenseSigner } from '../src/lib/crypto/signer';
import { compareVersions, isDeviceEligibleForRollout } from '../src/lib/version';
import { contactMatchesLicense } from '../src/lib/portal-auth';

// 1. Ed25519 sign & verify roundtrip
const kp = generateEd25519Keypair();
const signer = new LicenseSigner(kp.privateKey, kp.publicKey);

const payload = {
  v: 1,
  lic: 'DEI-ABCD-EFGH-JKLM-NPQR',
  product: 'trade-accounting',
  type: 'subscription',
  features: ['pdf_export', 'multi_user'],
  dev: 'device-1234567890abcdef',
  iat: 1700000000,
  exp: 1731536000,
  refresh_by: 1701209600,
  max_devices: 2,
};

const token = signer.sign(payload);
const verified = signer.verify(token);
assert.ok(verified, 'Token should verify');
assert.equal(verified.lic, payload.lic);
assert.deepEqual(verified.features, payload.features);

// Tampered token must fail
const [p, s] = token.split('.');
assert.equal(signer.verify(`${p}x.${s}`), null, 'Tampered payload must fail');
assert.equal(signer.verify(`${p}.${s}x`), null, 'Tampered sig must fail');

// 2. Version comparison
assert.equal(compareVersions('1.2.0', '1.1.9'), 1);
assert.equal(compareVersions('1.2.0', '1.2.0'), 0);
assert.equal(compareVersions('1.2.0-beta.1', '1.2.0'), -1);

// 3. Staged rollout determinism
const eligible = isDeviceEligibleForRollout(42, 50, 'device-abc-123');
assert.equal(eligible, isDeviceEligibleForRollout(42, 50, 'device-abc-123'), 'Rollout must be deterministic');
assert.equal(isDeviceEligibleForRollout(42, 100, null), true);
assert.equal(isDeviceEligibleForRollout(42, 0, 'device-abc-123'), false);

// 4. Portal contact matching (email case-insensitive + Iranian phone last 10 digits + Persian digits)
assert.equal(
  contactMatchesLicense({ customer_email: 'Ali@Example.com', customer_phone: '09123456789' }, 'ali@example.com'),
  true,
);
assert.equal(
  contactMatchesLicense({ customer_email: null, customer_phone: '09123456789' }, '+989123456789'),
  true,
);
assert.equal(
  contactMatchesLicense({ customer_email: null, customer_phone: '09123456789' }, '۰۹۱۲۳۴۵۶۷۸۹'),
  true,
);
assert.equal(
  contactMatchesLicense({ customer_email: null, customer_phone: '09123456789' }, '09120000000'),
  false,
);

console.log('All crypto, version, rollout, and portal contact tests passed!');
