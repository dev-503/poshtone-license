/** Lightweight placeholders shown by loading.tsx while a page's data is fetched (instant navigation feedback). */
export function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export function PageSkeleton({ stats = 0, rows = 6 }: { stats?: number; rows?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <Bar className="h-7 w-48" />
      {stats > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: stats }).map((_, i) => (
            <div key={i} className="bg-elevated rounded-2xl border border-subtle p-5 space-y-3">
              <Bar className="h-3 w-24" />
              <Bar className="h-7 w-16" />
            </div>
          ))}
        </div>
      )}
      <div className="bg-elevated rounded-2xl border border-subtle p-5 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Bar key={i} className="h-9 w-full" />
        ))}
      </div>
      <span className="sr-only">در حال بارگذاری…</span>
    </div>
  );
}
