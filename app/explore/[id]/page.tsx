import { STARTER_ROUTINES } from '@/lib/routines';
import { StarterPreviewScreen } from '@/components/routines/PreviewScreens';

// The ready-made routines are known at build time, so each preview is a static page.
export function generateStaticParams() {
  return STARTER_ROUTINES.map((r) => ({ id: r.id }));
}

export default function StarterPreviewPage() {
  return <StarterPreviewScreen />;
}
