import { useMemo, useState, type FormEvent } from 'react';
import type { Poll, VoteInput } from '../types';

type VotingInterfaceProps = {
  poll: Poll;
  disabled?: boolean;
  onSubmit: (vote: VoteInput) => Promise<void>;
};

export function VotingInterface({ poll, disabled = false, onSubmit }: VotingInterfaceProps) {
  const [selectedOption, setSelectedOption] = useState('');
  const [allocations, setAllocations] = useState<Record<string, number>>(() =>
    Object.fromEntries(poll.options.map((option) => [option.optionId, 0])),
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allocatedTotal = useMemo(
    () => poll.options.reduce((sum, option) => sum + (allocations[option.optionId] || 0), 0),
    [allocations, poll.options],
  );

  const handleAllocationChange = (optionId: string, value: string) => {
    const points = Math.max(0, Number.parseInt(value || '0', 10));
    setAllocations((current) => ({ ...current, [optionId]: Number.isNaN(points) ? 0 : points }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (disabled || poll.status !== 'active') {
      setError('Voting is closed for this poll.');
      return;
    }

    if (poll.votingMode === 'single' && !selectedOption) {
      setError('Choose an option before submitting.');
      return;
    }

    if (poll.votingMode === 'weighted' && allocatedTotal !== poll.totalPoints) {
      setError(`Allocate exactly ${poll.totalPoints} points before submitting.`);
      return;
    }

    const vote =
      poll.votingMode === 'weighted'
        ? {
            selectedOption: null,
            allocations: poll.options.map((option) => ({
              optionId: option.optionId,
              points: allocations[option.optionId] || 0,
            })),
          }
        : {
            selectedOption,
            allocations: [],
          };

    try {
      setIsSubmitting(true);
      await onSubmit(vote);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Vote could not be submitted.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-5">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          {poll.votingMode === 'weighted' ? `${poll.totalPoints} point allocation` : 'Single choice'}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">{poll.question}</h2>
      </div>

      {poll.votingMode === 'single' ? (
        <div className="space-y-3">
          {poll.options.map((option) => (
            <label
              key={option.optionId}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 p-3 text-left"
            >
              <input
                type="radio"
                name="selectedOption"
                value={option.optionId}
                checked={selectedOption === option.optionId}
                disabled={disabled || isSubmitting}
                onChange={(event) => setSelectedOption(event.target.value)}
                className="h-4 w-4"
              />
              <span className="text-slate-800">{option.text}</span>
            </label>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {poll.options.map((option) => (
            <label
              key={option.optionId}
              className="grid grid-cols-[1fr_6rem] items-center gap-3 rounded-md border border-slate-200 p-3 text-left"
            >
              <span className="text-slate-800">{option.text}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={allocations[option.optionId] || 0}
                disabled={disabled || isSubmitting}
                onChange={(event) => handleAllocationChange(option.optionId, event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-right text-slate-950"
              />
            </label>
          ))}
          <div className="flex items-center justify-between text-sm">
            <span className={allocatedTotal === poll.totalPoints ? 'text-slate-600' : 'text-rose-600'}>
              Allocated {allocatedTotal} of {poll.totalPoints}
            </span>
          </div>
        </div>
      )}

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      <button
        type="submit"
        disabled={disabled || isSubmitting || poll.status !== 'active'}
        className="mt-5 w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSubmitting ? 'Submitting...' : 'Submit vote'}
      </button>
    </form>
  );
}
