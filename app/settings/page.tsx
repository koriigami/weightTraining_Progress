'use client';

import { LogOut } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ComingCard } from '@/components/ComingCard';
import { useShell } from '@/components/nav/ShellContext';
import { Button } from '@/components/ui/Button';
import { Card, CardHead } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';

export default function SettingsPage() {
  const { data: auth } = useSession();
  const { askSignOut } = useShell();
  return (
    <Screen header={<PageHeader title="Settings" back="/profile" narrow />} narrow>
      <Card>
        <CardHead title="Account" />
        <p style={{ margin: 0 }}>
          <b>{auth?.user?.name}</b>
          <br />
          <span style={{ color: 'var(--muted)' }}>{auth?.user?.email}</span>
        </p>
      </Card>
      <ComingCard>Units, equipment, things to avoid, weekly goal, sounds and haptics arrive here.</ComingCard>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
        <Button variant="soft-destructive" icon={<LogOut size={18} aria-hidden="true" />} onClick={askSignOut}>
          Sign out
        </Button>
      </div>
    </Screen>
  );
}
