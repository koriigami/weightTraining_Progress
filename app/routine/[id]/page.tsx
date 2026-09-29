import { RoutineScreen } from '@/components/RoutineScreen';

// Routines are per user and read on the client, so no ids are known at build
// time. An empty list lets Next prerender the page shell once, on first use.
export function generateStaticParams() {
  return [];
}

export default function RoutinePage() {
  return <RoutineScreen />;
}
