import { SavedPreviewScreen } from '@/components/routines/PreviewScreens';

// Routines are per user and read on the client, so no ids are known at build time.
export function generateStaticParams() {
  return [];
}

export default function RoutinePreviewPage() {
  return <SavedPreviewScreen />;
}
