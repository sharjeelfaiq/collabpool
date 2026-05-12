import { useState, type FormEvent } from 'react';
import { LiveResults } from '../components/LiveResults';
import type { CreatePollInput, Poll, ResultsPayload, Room, VotingMode } from '../types';

type PresenterDashboardProps = {
  room: Room;
  displayName: string;
  poll: Poll | null;
  results: ResultsPayload | null;
  onCreatePoll: (input: CreatePollInput) => Promise<void>;
  onStartPoll: (pollId: string) => Promise<void>;
  onClosePoll: (pollId: string) => Promise<void>;
};

export function PresenterDashboard({
  room,
  displayName,
  poll,
  results,
  onCreatePoll,
  onStartPoll,
  onClosePoll,
}: PresenterDashboardProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [votingMode, setVotingMode] = useState<VotingMode>('single');
  const [totalPoints, setTotalPoints] = useState(10);
  const [topN, setTopN] = useState(3);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const updateOption = (index: number, value: string) => {
    setOptions((current) => current.map((option, optionIndex) => (optionIndex === index ? value : option)));
  };

  const addOption = () => {
    setOptions((current) => (current.length < 6 ? [...current, ''] : current));
  };

  const removeOption = (index: number) => {
    setOptions((current) => (current.length > 2 ? current.filter((_, optionIndex) => optionIndex !== index) : current));
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const trimmedOptions = options.map((option) => option.trim()).filter(Boolean);

    if (trimmedOptions.length < 2) {
      setError('Add at least two options.');
      return;
    }

    try {
      setIsBusy(true);
      await onCreatePoll({
        question: question.trim(),
        options: trimmedOptions,
        votingMode,
        totalPoints,
      });
      setQuestion('');
      setOptions(['', '']);
      setVotingMode('single');
      setTotalPoints(10);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Poll could not be created.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateChainedPoll = async () => {
    if (!poll) {
      return;
    }

    await runPollAction(async () => {
      await onCreatePoll({
        previousPollId: poll.id,
        topN,
      });
    });
  };

  const runPollAction = async (action: () => Promise<void>) => {
    setError('');

    try {
      setIsBusy(true);
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Poll action failed.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 text-left">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Presenter</p>
          <h1 className="text-3xl font-semibold text-slate-950">Room {room.code}</h1>
          <p className="mt-1 text-sm font-medium text-slate-600">{displayName}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{room.status}</span>
      </header>

      {error ? <div className="mb-5 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-950">Create poll</h2>
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Question</span>
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
                required
              />
            </label>

            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Options</span>
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={option}
                    onChange={(event) => updateOption(index, event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
                    placeholder={`Option ${index + 1}`}
                    required={index < 2}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    disabled={options.length <= 2}
                    className="rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addOption}
                disabled={options.length >= 6}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add option
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Voting mode</span>
                <select
                  value={votingMode}
                  onChange={(event) => setVotingMode(event.target.value as VotingMode)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
                >
                  <option value="single">Single choice</option>
                  <option value="weighted">Weighted</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Total points</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={totalPoints}
                  disabled={votingMode !== 'weighted'}
                  onChange={(event) => setTotalPoints(Number.parseInt(event.target.value || '10', 10))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 disabled:bg-slate-100"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isBusy ? 'Creating...' : 'Create draft poll'}
            </button>
          </form>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">Current poll</h2>
            {poll ? (
              <div className="mt-3 space-y-4">
                <div>
                  <p className="font-medium text-slate-900">{poll.question}</p>
                  <p className="mt-1 text-sm capitalize text-slate-500">
                    {poll.status} · {poll.votingMode}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isBusy || poll.status !== 'draft'}
                    onClick={() => runPollAction(() => onStartPoll(poll.id))}
                    className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Start
                  </button>
                  <button
                    type="button"
                    disabled={isBusy || poll.status !== 'active'}
                    onClick={() => runPollAction(() => onClosePoll(poll.id))}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No poll has been created or started yet.</p>
            )}
          </section>

          {poll && poll.status === 'closed' ? (
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-950">Follow-up poll</h2>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Top options</span>
                  <select
                    value={topN}
                    onChange={(event) => setTopN(Number.parseInt(event.target.value, 10))}
                    className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-slate-950"
                  >
                    {[2, 3, 4, 5, 6].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleCreateChainedPoll}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Create follow-up
                </button>
              </div>
            </section>
          ) : null}

          <LiveResults results={results} />
        </aside>
      </div>
    </main>
  );
}
