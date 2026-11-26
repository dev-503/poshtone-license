import crypto from 'node:crypto';

const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export function b64u(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf;
  return b.toString('base64url');
}

export function b64uDecode(s: string): Buffer | null {
  try {
    return Buffer.from(s, 'base64url');
  } catch {
    return null;
  }
}

/**
 * Generates a libsodium-compatible Ed25519 keypair:
 * - privateKey: base64 of 64 bytes (32-byte seed || 32-byte public key)
 * - publicKey: base64 of 32 bytes
 */
export function generateEd25519Keypair(): { privateKey: string; publicKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const spki = publicKey.export({ format: 'der', type: 'spki' }) as Buffer;
  const pkcs8 = privateKey.export({ format: 'der', type: 'pkcs8' }) as Buffer;

  const rawPub = spki.subarray(spki.length - 32);
  const rawSeed = pkcs8.subarray(pkcs8.length - 32);
  const sodiumSecret = Buffer.concat([rawSeed, rawPub]);

  return {
    privateKey: sodiumSecret.toString('base64'),
    publicKey: rawPub.toString('base64'),
  };
}

function parsePrivateKey(b64: string): crypto.KeyObject {
  const raw = Buffer.from(b64.trim(), 'base64');
  if (raw.length !== 64 && raw.length !== 32) {
    throw new Error('LICENSE_PRIVATE_KEY is missing or invalid (expected 32 or 64 bytes base64). Run: npm run keys:generate');
  }
  const seed = raw.subarray(0, 32);
  return crypto.createPrivateKey({
    key: Buffer.concat([PKCS8_PREFIX, seed]),
    format: 'der',
    type: 'pkcs8',
  });
}

function parsePublicKey(b64: string): crypto.KeyObject {
  const raw = Buffer.from(b64.trim(), 'base64');
  if (raw.length !== 32) {
    throw new Error('LICENSE_PUBLIC_KEY is missing or invalid (expected 32 bytes base64).');
  }
  return crypto.createPublicKey({
    key: Buffer.concat([SPKI_PREFIX, raw]),
    format: 'der',
    type: 'spki',
  });
}

export class LicenseSigner {
  private privateKeyB64: string;
  private publicKeyB64: string;

  constructor(
    privateKeyB64 = process.env.LICENSE_PRIVATE_KEY ?? '',
    publicKeyB64 = process.env.LICENSE_PUBLIC_KEY ?? '',
  ) {
    this.privateKeyB64 = privateKeyB64;
    this.publicKeyB64 = publicKeyB64;
  }

  sign(payload: Record<string, unknown>): string {
    const json = JSON.stringify(payload);
    return `${b64u(json)}.${this.signRaw(json)}`;
  }

  signRaw(message: string): string {
    if (!this.privateKeyB64) {
      throw new Error('LICENSE_PRIVATE_KEY is not configured. Run: npm run keys:generate');
    }
    const keyObj = parsePrivateKey(this.privateKeyB64);
    const sig = crypto.sign(null, Buffer.from(message, 'utf8'), keyObj);
    return b64u(sig);
  }

  verify(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const jsonBuf = b64uDecode(parts[0]);
    const sigBuf = b64uDecode(parts[1]);
    if (!jsonBuf || !sigBuf || sigBuf.length !== 64 || !this.publicKeyB64) {
      return null;
    }

    try {
      const pubObj = parsePublicKey(this.publicKeyB64);
      const ok = crypto.verify(null, jsonBuf, pubObj, sigBuf);
      if (!ok) return null;

      const parsed = JSON.parse(jsonBuf.toString('utf8'));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
}

export const defaultSigner = () =>
  new LicenseSigner(process.env.LICENSE_PRIVATE_KEY ?? '', process.env.LICENSE_PUBLIC_KEY ?? '');
