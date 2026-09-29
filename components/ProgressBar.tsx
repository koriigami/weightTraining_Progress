import { XpBar } from '@/components/ui/XpBar';

/** A thin XP-style bar for `current` out of `total`. */
export function ProgressBar({ current, total }: { current: number; total: number }) {
  return <XpBar thin current={current} max={total} />;
}
