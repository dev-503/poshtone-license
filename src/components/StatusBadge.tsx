import { faStatus } from '@/lib/fa';

const META: Record<string, { emoji: string; cls: string }> = {
  active: { emoji: '✅', cls: 'bg-pesteh-500/15 text-pesteh-700 dark:text-pesteh-300 border-pesteh-500/30' },
  resolved: { emoji: '✅', cls: 'bg-pesteh-500/15 text-pesteh-700 dark:text-pesteh-300 border-pesteh-500/30' },
  suspended: { emoji: '⏸️', cls: 'bg-zafaran-500/15 text-zafaran-700 dark:text-zafaran-300 border-zafaran-500/30' },
  pending: { emoji: '⏳', cls: 'bg-zafaran-500/15 text-zafaran-700 dark:text-zafaran-300 border-zafaran-500/30' },
  trial: { emoji: '🧪', cls: 'bg-firoozeh-500/15 text-firoozeh-700 dark:text-firoozeh-300 border-firoozeh-500/30' },
  open: { emoji: '📬', cls: 'bg-lajvard-500/15 text-lajvard-700 dark:text-lajvard-300 border-lajvard-500/30' },
  revoked: { emoji: '🚫', cls: 'bg-anar-500/15 text-anar-700 dark:text-anar-300 border-anar-500/30' },
  expired: { emoji: '⌛', cls: 'bg-anar-500/15 text-anar-700 dark:text-anar-300 border-anar-500/30' },
  urgent: { emoji: '🔥', cls: 'bg-anar-500/15 text-anar-700 dark:text-anar-300 border-anar-500/30' },
  high: { emoji: '⚡', cls: 'bg-zafaran-500/15 text-zafaran-700 dark:text-zafaran-300 border-zafaran-500/30' },
  closed: { emoji: '🔒', cls: 'bg-shab-500/15 text-shab-600 dark:text-shab-300 border-shab-500/30' },
  perpetual: { emoji: '♾️', cls: 'bg-lajvard-500/15 text-lajvard-700 dark:text-lajvard-300 border-lajvard-500/30' },
  subscription: { emoji: '📅', cls: 'bg-firoozeh-500/15 text-firoozeh-700 dark:text-firoozeh-300 border-firoozeh-500/30' },
  normal: { emoji: '🔹', cls: 'bg-shab-500/10 text-secondary border-subtle' },
  low: { emoji: '▫️', cls: 'bg-shab-500/10 text-tertiary border-subtle' },
  stable: { emoji: '🟢', cls: 'bg-pesteh-500/15 text-pesteh-700 dark:text-pesteh-300 border-pesteh-500/30' },
  beta: { emoji: '🟠', cls: 'bg-zafaran-500/15 text-zafaran-700 dark:text-zafaran-300 border-zafaran-500/30' },
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span>—</span>;
  const m = META[value] ?? { emoji: '🏷️', cls: 'bg-muted text-secondary border-subtle' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${m.cls}`}>
      <span>{m.emoji}</span>
      <span>{faStatus(value)}</span>
    </span>
  );
}
