/**
 * Semantic / dotted version comparison compatible with PHP's version_compare().
 * Returns -1 if a < b, 0 if a == b, 1 if a > b.
 */
export function compareVersions(a: string, b: string): number {
  const normalize = (v: string) => {
    const [main, pre] = v.trim().split(/[-+]/, 2);
    const nums = main.split('.').map((p) => Number.parseInt(p, 10) || 0);
    return { nums, pre: pre ?? '' };
  };

  const va = normalize(a);
  const vb = normalize(b);
  const len = Math.max(va.nums.length, vb.nums.length);

  for (let i = 0; i < len; i++) {
    const na = va.nums[i] ?? 0;
    const nb = vb.nums[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }

  // No pre-release > has pre-release (1.0.0 > 1.0.0-beta.1)
  if (va.pre === '' && vb.pre !== '') return 1;
  if (va.pre !== '' && vb.pre === '') return -1;
  if (va.pre === vb.pre) return 0;
  return va.pre > vb.pre ? 1 : -1;
}

/** Standard IEEE 802.3 CRC32 (matches PHP's crc32() unsigned) for deterministic staged rollouts. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(str: string): number {
  const buf = Buffer.from(str, 'utf8');
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function isDeviceEligibleForRollout(releaseId: number, rolloutPercent: number, deviceId?: string | null): boolean {
  if (rolloutPercent >= 100) return true;
  if (rolloutPercent <= 0 || !deviceId) return false;
  return (crc32(`${releaseId}|${deviceId}`) % 100) < rolloutPercent;
}
