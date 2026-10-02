import { Card, CardHead } from '@/components/ui/Card';
import { formatDay } from '@/lib/date';
import { agoLabel, personSummary } from '@/lib/insights';
import type { PersonRow } from '@/lib/insights';

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Who({ row }: { row: PersonRow }) {
  return (
    <span className="wt-ppl-who">
      <b>{row.name || <span className="wt-ppl-none">No name</span>}</b>
      {!row.setUp && <span className="wt-tag">Not set up</span>}
    </span>
  );
}

/**
 * Who is using Levl, for the owner only: a table on desktop and a stacked list on a
 * phone. Rows arrive sorted, most recent workout first. Emails are plain text so they
 * can be selected and copied. Nothing here shows a set, a weight or a note.
 */
export function PeopleCard({ rows, invited }: { rows: PersonRow[]; invited: string[] }) {
  return (
    <Card className="wt-ins-wide">
      <CardHead title="People" right={<small>only you can see this</small>} />
      {rows.length === 0 ? (
        <p className="wt-ppl-empty">Nobody has signed in yet.</p>
      ) : (
        <>
          <table className="wt-ppl-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Level</th>
                <th scope="col">Last workout</th>
                <th scope="col">Last 7 days</th>
                <th scope="col">Last 30 days</th>
                <th scope="col">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.email}|${i}`}>
                  <td>
                    <Who row={r} />
                  </td>
                  <td className="wt-ppl-email">{r.email}</td>
                  <td>
                    <b>{r.level}</b> <small>{r.rank} rank</small>
                  </td>
                  <td>
                    {r.lastWorkout === null ? (
                      <span className="wt-ppl-none">{agoLabel(null)}</span>
                    ) : (
                      <>
                        {agoLabel(r.daysSince)}
                        <small>{formatDay(r.lastWorkout)}</small>
                      </>
                    )}
                  </td>
                  <td className={r.trainingDays7 === 0 ? 'wt-ppl-none' : undefined}>{count(r.trainingDays7, 'training day', 'training days')}</td>
                  <td className={r.workouts30 === 0 ? 'wt-ppl-none' : undefined}>{count(r.workouts30, 'workout', 'workouts')}</td>
                  <td>{formatDay(r.joined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="wt-ppl-list">
            {rows.map((r, i) => (
              <li key={`${r.email}|${i}`}>
                <Who row={r} />
                <span className="wt-ppl-email">{r.email}</span>
                <span className="wt-ppl-line">{personSummary(r)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {invited.length > 0 && (
        <div className="wt-ppl-invited">
          <b>Invited, not signed in yet ({invited.length})</b>
          <ul>
            {invited.map((e) => (
              <li key={e} className="wt-ppl-email">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
