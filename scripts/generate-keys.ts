import { generateEd25519Keypair } from '../src/lib/crypto/signer';

const { privateKey, publicKey } = generateEd25519Keypair();

console.log('\n=== Ed25519 Keypair Generated (libsodium-compatible) ===\n');
console.log(`LICENSE_PRIVATE_KEY=${privateKey}`);
console.log(`LICENSE_PUBLIC_KEY=${publicKey}`);
console.log('\nAdd these to your .env.local and Vercel Environment Variables.');
console.log('WARNING: Keep LICENSE_PRIVATE_KEY secret and back it up safely!\n');
