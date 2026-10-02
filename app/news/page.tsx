import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { NEWS, newsDate } from '@/lib/news';

export const metadata: Metadata = { title: "What's new" };

// Every update, newest first, each page with its picture and words. Reached from Settings.
export default function NewsPage() {
  return (
    <Screen header={<PageHeader title="What's new" back="/settings" narrow />} narrow>
      <div className="wt-newslist">
        {NEWS.map((entry) => (
          <Card as="section" key={entry.id} aria-labelledby={`news-${entry.id}`}>
            <div className="wt-newshead">
              <h2 id={`news-${entry.id}`}>{entry.label}</h2>
              <time dateTime={entry.date}>{newsDate(entry.date)}</time>
            </div>
            {entry.pages.map((page) => (
              <article key={page.title} className="wt-newspage">
                <div className="wt-news-pic">
                  {page.rules && <span className="wt-news-tag">XP rules changed</span>}
                  <img src={page.image} alt={page.title} />
                </div>
                <div className="wt-newstext">
                  <h3>{page.title}</h3>
                  <p>{page.text}</p>
                </div>
              </article>
            ))}
          </Card>
        ))}
      </div>
    </Screen>
  );
}
