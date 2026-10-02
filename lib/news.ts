// What's new: the list of updates people see once, newest first. Pure data and
// a few helpers, no React and no browser access.
//
// To add an update: put a new entry at the top of NEWS, with its pictures in
// public/news/. A page with `rules: true` is about the XP rules: it gets the "XP
// rules changed" tag, and closing it also clears the Home rules notes waiting for
// the person (see setNewsSeen in routineActions.ts).

export type NewsPage = {
  title: string;
  text: string;
  image: string; // a path under public/, such as /news/2026-10-laps.jpg
  rules?: boolean; // the XP rules changed
};

export type NewsEntry = {
  id: string; // what a person's `newsSeen` holds, such as 2026-10
  date: string; // YYYY-MM-DD, the release day
  label: string; // "October 2026"
  pages: NewsPage[];
};

// A page with the entry it belongs to, for a card that mixes several updates.
export type NewsCardPage = NewsPage & { entryId: string; label: string };

// One card never shows more than this many pages, however much is unseen.
export const MAX_NEWS_PAGES = 5;

export const NEWS: NewsEntry[] = [
  {
    id: '2026-10',
    date: '2026-10-02',
    label: 'October 2026',
    pages: [
      {
        title: 'Laps for runners',
        text: 'Tap Lap as you run. Levl marks your fastest lap and shows every lap on the workout page.',
        image: '/news/2026-10-laps.jpg',
      },
      {
        title: 'Log a workout you already did',
        text: 'Trained without the app? Tap Log workout on Home, pick the day and time, and the XP lands on that day.',
        image: '/news/2026-10-log.jpg',
      },
      {
        title: 'How did it feel?',
        text: 'After a workout, tap a face and add your effort if you like. Profile shows how the last 30 days felt. It earns no XP.',
        image: '/news/2026-10-felt.jpg',
      },
      {
        title: 'Your goal bonus grows',
        text: 'Reach your weekly goal week after week: +50, then +10 more each week in a row, up to +100. Your XP was worked out again with this rule.',
        image: '/news/2026-10-goal.jpg',
        rules: true,
      },
    ],
  },
];

// The id of the newest update. A new person starts with this as `newsSeen`, so
// nothing from before they joined is shown to them.
export function latestNewsId(news: NewsEntry[] = NEWS): string {
  return news[0].id;
}

// The updates newer than `newsSeen`, newest first. A missing or unknown id means
// nothing has been seen, so every update counts.
export function unseenEntries(newsSeen: string | undefined, news: NewsEntry[] = NEWS): NewsEntry[] {
  const at = news.findIndex((e) => e.id === newsSeen);
  return at === -1 ? news : news.slice(0, at);
}

// The pages of the unseen updates, newest update first and each update's pages in
// order, at most MAX_NEWS_PAGES.
export function unseenPages(newsSeen: string | undefined, news: NewsEntry[] = NEWS): NewsCardPage[] {
  return unseenEntries(newsSeen, news)
    .flatMap((e) => e.pages.map((p) => ({ ...p, entryId: e.id, label: e.label })))
    .slice(0, MAX_NEWS_PAGES);
}

// What `newsSeen` becomes when update `id` is closed: the newer of the two, so an
// old id never brings back an update that was already seen.
export function advanceNewsSeen(newsSeen: string | undefined, id: string, news: NewsEntry[] = NEWS): string {
  const seen = news.findIndex((e) => e.id === newsSeen);
  const closed = news.findIndex((e) => e.id === id);
  return newsSeen !== undefined && seen !== -1 && seen < closed ? newsSeen : id;
}

// Whether closing update `id` puts an XP rules change in front of the person: any
// update that becomes seen with it (`id` and every older one still unseen) has a
// rules page.
export function closesRulesUpdate(newsSeen: string | undefined, id: string, news: NewsEntry[] = NEWS): boolean {
  const at = news.findIndex((e) => e.id === id);
  if (at === -1) return false;
  return unseenEntries(newsSeen, news).some((e) => news.indexOf(e) >= at && e.pages.some((p) => p.rules === true));
}
