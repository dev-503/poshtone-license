import { faStatus } from '@/lib/fa';

const STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  trial: 'bg-sky-50 text-sky-700 border-sky-200',
  open: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  revoked: 'bg-rose-50 text-rose-700 border-rose-200',
  expired: 'bg-rose-50 text-rose-700 border-rose-200',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
  perpetual: 'bg-violet-50 text-violet-700 border-violet-200',
  subscription: 'bg-blue-50 text-blue-700 border-blue-200',
  normal: 'bg-slate-100 text-slate-700 border-slate-200',
  low: 'bg-slate-50 text-slate-500 border-slate-200',
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span>—</span>;
  const cls = STYLES[value] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {faStatus(value)}
    </span>
  );
}
