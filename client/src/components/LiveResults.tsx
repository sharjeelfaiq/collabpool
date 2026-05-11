import type { ResultsPayload } from '../types';

type LiveResultsProps = {
  results: ResultsPayload | null;
};

export function LiveResults({ results }: LiveResultsProps) {
  if (!results) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">
        Results will appear after votes are submitted.
      </div>
    );
  }

  const maxValue = Math.max(...results.results.map((option) => option.voteCount), 1);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-950">Live results</h2>
        <span className="text-sm text-slate-500">{results.totalVoters} voters</span>
      </div>

      <div className="space-y-3">
        {results.results.map((option) => (
          <div key={option.optionId} className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-slate-800">{option.text}</span>
              <span className="tabular-nums text-slate-600">{option.voteCount}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-slate-900"
                style={{ width: `${(option.voteCount / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
