import { Icon, type IconName } from '@/components/Icon';
import { faStatus } from '@/lib/fa';

const META: Record<string, { icon: IconName; cls: string }> = {
  active: { icon: 'ok', cls: 'bg-pesteh-500/15 text-pesteh-700 dark:text-pesteh-300 border-pesteh-500/30' },
  resolved: { icon: 'ok', cls: 'bg-pesteh-500/15 text-pesteh-700 dark:text-pesteh-300 border-pesteh-500/30' },
  suspended: { icon: 'pause', cls: 'bg-zafaran-500/15 text-zafaran-700 dark:text-zafaran-300 border-zafaran-500/30' },
  pending: { icon: 'pending', cls: 'bg-zafaran-500/15 text-zafaran-700 dark:text-zafaran-300 border-zafaran-500/30' },
  trial: { icon: 'trial', cls: 'bg-firoozeh-500/15 text-firoozeh-700 dark:text-firoozeh-300 border-firoozeh-500/30' },
  open: { icon: 'mail', cls: 'bg-lajvard-500/15 text-lajvard-700 dark:text-lajvard-300 border-lajvard-500/30' },
  revoked: { icon: 'ban', cls: 'bg-anar-500/15 text-anar-700 dark:text-anar-300 border-anar-500/30' },
  expired: { icon: 'pending', cls: 'bg-anar-500/15 text-anar-700 dark:text-anar-300 border-anar-500/30' },
  urgent: { icon: 'fire', cls: 'bg-anar-500/15 text-anar-700 dark:text-anar-300 border-anar-500/30' },
  high: { icon: 'bolt', cls: 'bg-zafaran-500/15 text-zafaran-700 dark:text-zafaran-300 border-zafaran-500/30' },
  closed: { icon: 'secret', cls: 'bg-shab-500/15 text-shab-600 dark:text-shab-300 border-shab-500/30' },
  perpetual: { icon: 'forever', cls: 'bg-lajvard-500/15 text-lajvard-700 dark:text-lajvard-300 border-lajvard-500/30' },
  subscription: { icon: 'calendar', cls: 'bg-firoozeh-500/15 text-firoozeh-700 dark:text-firoozeh-300 border-firoozeh-500/30' },
  normal: { icon: 'dot', cls: 'bg-shab-500/10 text-secondary border-subtle' },
  low: { icon: 'dot', cls: 'bg-shab-500/10 text-tertiary border-subtle' },
  stable: { icon: 'dotFill', cls: 'bg-pesteh-500/15 text-pesteh-700 dark:text-pesteh-300 border-pesteh-500/30' },
  beta: { icon: 'dotFill', cls: 'bg-zafaran-500/15 text-zafaran-700 dark:text-zafaran-300 border-zafaran-500/30' },
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span>—</span>;
  const m = META[value] ?? { icon: 'tag', cls: 'bg-muted text-secondary border-subtle' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${m.cls}`}>
      <Icon name={m.icon} />
      <span>{faStatus(value)}</span>
    </span>
  );
}
