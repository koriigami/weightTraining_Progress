export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.min(100, Math.max(0, (current / total) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
      <div className="h-full rounded-full bg-neutral-900 dark:bg-neutral-100" style={{ width: `${pct}%` }} />
    </div>
  );
}
