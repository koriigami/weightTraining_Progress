'use client';

import { useEffect, useState } from 'react';
import { BadgeArt } from '@/components/rank/BadgeArt';
import type { BadgeArt as Art } from '@/lib/badgeCards';
import { medalKey, medalModel } from '@/lib/badgeModel';
import { badgePicture, pictureSize } from './pictures';

/**
 * A badge medal. It shows the vector medal first and swaps in the 3D picture
 * once it is drawn, at the same size, so nothing moves. With no WebGL the
 * vector medal stays. A locked badge is drawn in stone.
 */
export function BadgeImage({ art, size = 64, decorative, locked = false }: { art: Art; size?: number; decorative?: boolean; locked?: boolean }) {
  const key = medalKey(medalModel(art, locked), pictureSize(size));
  const [shown, setShown] = useState<{ key: string; url: string } | null>(null);

  useEffect(() => {
    let live = true;
    void badgePicture(art, size, locked).then((url) => {
      if (live && url) setShown({ key, url });
    });
    return () => {
      live = false;
    };
    // The key stands for art, size and locked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (shown?.key !== key) return <BadgeArt art={art} size={size} decorative={decorative} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="wt-badge-img"
      src={shown.url}
      width={size}
      height={size}
      alt={decorative ? '' : art.label}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img' })}
      draggable={false}
    />
  );
}
