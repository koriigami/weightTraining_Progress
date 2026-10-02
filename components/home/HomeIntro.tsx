'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCelebrating } from '@/components/celebrate/CelebrationProvider';
import { NewsModal } from '@/components/news/NewsModal';
import { useProgress } from '@/components/ProgressProvider';
import { useWorkoutSession } from '@/components/WorkoutSessionProvider';
import { introToShow } from '@/lib/guide';
import { latestPages, newestUnseenId, unseenPages } from '@/lib/news';
import type { NewsCardPage } from '@/lib/news';

// Set once Home has shown the guide or What's new, so one app open shows one thing. It
// lives in memory only: the next time Levl is opened it starts false again.
let shownThisLoad = false;

// What is on screen. `markId` is the update a close marks as seen: null for the preview.
type Showing = { kind: 'news'; pages: NewsCardPage[]; markId: string | null } | { kind: 'guide' };

// Resolves when the picture has loaded or failed, or after `ms`, whichever is first, so
// the card opens with its picture in place and never waits long for it.
function pictureReady(src: string, ms = 1500): Promise<void> {
  return new Promise((resolve) => {
    const done = () => resolve();
    const img = new Image();
    img.onload = done;
    img.onerror = done;
    img.src = src;
    window.setTimeout(done, ms);
  });
}

/**
 * What Home shows when it opens: the first-run guide, or What's new, never both in one
 * app open. introToShow (lib/guide.ts) decides. It waits until the state and the stored
 * workout are read and no level-up or badge moment is on screen, so it never covers
 * one, and it never shows during a workout.
 *
 * `/?news=1` is a preview: it opens every page of the newest update whatever the person
 * has seen, remembers nothing, and does not count as this load's one thing. It is for
 * seeing an update before a release.
 */
export function HomeIntro() {
  const { state, loading, prefs, markNewsSeen, showToast } = useProgress();
  const { session, ready } = useWorkoutSession();
  const celebrating = useCelebrating();
  const preview = useSearchParams()?.get('news') === '1';
  const [showing, setShowing] = useState<Showing | null>(null);
  const decided = useRef(false); // this visit to Home has already chosen
  const alive = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const settled = !loading && ready && !celebrating;
  const sessionActive = session !== null;

  useEffect(() => {
    if (!settled || decided.current) return;

    if (preview) {
      decided.current = true;
      const pages = latestPages();
      void pictureReady(pages[0].image).then(() => {
        if (alive.current) setShowing({ kind: 'news', pages, markId: null });
      });
      return;
    }

    const pages = unseenPages(state.newsSeen);
    const kind = introToShow({ guideDone: state.guideDone, onboarded: prefs.onboarded, unseenCount: pages.length, sessionActive, shownThisLoad });
    if (kind === null) return;
    decided.current = true;

    if (kind === 'guide') {
      shownThisLoad = true;
      setShowing({ kind: 'guide' });
      return;
    }
    const markId = newestUnseenId(state.newsSeen);
    void pictureReady(pages[0].image).then(() => {
      if (!alive.current) return;
      shownThisLoad = true;
      setShowing({ kind: 'news', pages, markId });
    });
  }, [settled, preview, sessionActive, state.newsSeen, state.guideDone, prefs.onboarded]);

  if (!showing) return null;

  // Stage 3 plugs the first-run guide in here: render <GuideTour onClose={...} /> and call
  // finishGuide() from useProgress() when it ends in any way. Nothing is shown until then.
  if (showing.kind === 'guide') return null;

  const markId = showing.markId;
  function close() {
    setShowing(null);
    if (markId) void markNewsSeen(markId).then((error) => error && showToast(error));
  }
  return <NewsModal pages={showing.pages} onClose={close} />;
}
