import { useState, type FormEvent } from 'react';
import type { Role } from '../types';

type JoinRoomProps = {
  onJoin: (input: { code: string; displayName: string; role: Role }) => Promise<void>;
};

export function JoinRoom({ onJoin }: JoinRoomProps) {
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<Role>('audience');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      setIsJoining(true);
      await onJoin({ code, displayName, role });
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : 'Could not join room.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl items-center px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full rounded-lg border border-slate-200 bg-white p-6 text-left shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">CollabPoll</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Join a room</h1>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Room code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
              placeholder="ABC123"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Display name</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
              placeholder="Your name"
              required
            />
          </label>

          <div>
            <span className="text-sm font-medium text-slate-700">Role</span>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1">
              {(['audience', 'presenter'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRole(option)}
                  className={`rounded px-3 py-2 text-sm font-medium capitalize ${
                    role === option ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isJoining}
          className="mt-6 w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isJoining ? 'Joining...' : 'Join room'}
        </button>
      </form>
    </main>
  );
}
