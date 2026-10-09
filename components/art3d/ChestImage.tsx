'use client';

import { useEffect, useState } from 'react';
import type { ChestKey } from '@/lib/rewards';
import { chestPicture } from './pictures';

/**
 * A chest picture, shut or open. There is no vector chest, so the space stays
 * empty (same size, nothing moves) until the picture is drawn, and stays empty
 * without WebGL.
 */
export function ChestImage({ chest, open = false, size = 92 }: { chest: ChestKey; open?: boolean; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void chestPicture(chest, { open, size }).then((u) => {
      if (live && u) setUrl(u);
    });
    return () => {
      live = false;
    };
  }, [chest, open, size]);
  return (
    <span className="wt-chestimg" style={{ width: size, height: size }} aria-hidden="true">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} width={size} height={size} alt="" draggable={false} />
      )}
    </span>
  );
}
