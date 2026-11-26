'use client';

import { useState } from 'react';

export function CopyButton({
  text,
  label = 'کپی',
  className = '',
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-subtle bg-elevated hover:bg-muted text-primary transition cursor-pointer ${className}`}
    >
      <span>{copied ? '✅' : '📋'}</span>
      <span>{copied ? 'کپی شد' : label}</span>
    </button>
  );
}
