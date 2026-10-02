'use client';

import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

// The first-run flow. The app shell sends anyone who has not finished it here, and
// Settings > Setup questions opens it again. It has no sidebar or tab bar.
export default function OnboardingPage() {
  return <OnboardingFlow />;
}
