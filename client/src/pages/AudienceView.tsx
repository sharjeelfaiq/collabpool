import { LiveResults } from '../components/LiveResults';
import { VotingInterface } from '../components/VotingInterface';
import type { Poll, ResultsPayload, Room, VoteInput } from '../types';

type AudienceViewProps = {
  room: Room;
  displayName: string;
  poll: Poll | null;
  results: ResultsPayload | null;
  onVote: (vote: VoteInput) => Promise<void>;
};

export function AudienceView({ room, displayName, poll, results, onVote }: AudienceViewProps) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 text-left">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Audience</p>
          <h1 className="text-3xl font-semibold text-slate-950">Room {room.code}</h1>
          <p className="mt-1 text-sm font-medium text-slate-600">{displayName}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{room.status}</span>
      </header>

      <div className="space-y-5">
        {!poll ? (
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-slate-950">Waiting for a poll</h2>
            <p className="mt-2 text-slate-500">The active poll will appear here when the presenter starts it.</p>
          </section>
        ) : poll.status === 'closed' ? (
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-slate-950">{poll.question}</h2>
            <p className="mt-2 text-slate-500">This poll is closed.</p>
          </section>
        ) : (
          <VotingInterface poll={poll} disabled={poll.status !== 'active'} onSubmit={onVote} />
        )}

        <LiveResults results={results} />
      </div>
    </main>
  );
}
