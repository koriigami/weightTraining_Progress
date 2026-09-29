import type { ReactNode } from 'react';
import { Card, CardHead } from '@/components/ui/Card';

/** The plain card the placeholder screens use to say what is coming. */
export function ComingCard({ title = 'Coming next', children }: { title?: string; children: ReactNode }) {
  return (
    <Card tone="dashed">
      <CardHead title={title} />
      <p style={{ margin: 0, color: 'var(--muted)' }}>{children}</p>
    </Card>
  );
}
