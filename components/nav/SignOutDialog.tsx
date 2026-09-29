'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { GameModal } from '@/components/ui/GameModal';

/** The Sign out confirmation: a strict game dialog with the solid destructive button. */
export function SignOutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <GameModal
      open={open}
      strict
      tone="red"
      icon={<LogOut size={30} aria-hidden="true" />}
      title="Sign out?"
      cancelLabel="Cancel"
      confirmLabel="Sign out"
      confirmVariant="solid-destructive"
      confirmLoading={busy}
      onCancel={onClose}
      onConfirm={() => {
        setBusy(true);
        signOut({ callbackUrl: '/' }).catch(() => setBusy(false));
      }}
    >
      Your progress stays saved. Sign in with Google to come back.
    </GameModal>
  );
}
