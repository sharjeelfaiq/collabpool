import { useEffect, useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { AudienceView } from './pages/AudienceView';
import { JoinRoom } from './pages/JoinRoom';
import { PresenterDashboard } from './pages/PresenterDashboard';
import type {
  CreatePollInput,
  Poll,
  PollClosedPayload,
  PollPayload,
  ResultsPayload,
  Role,
  Room,
  RoomJoinedPayload,
  VoteInput,
} from './types';

type CreatePollAck = {
  poll: Poll;
};

type VoteAck = {
  results: ResultsPayload;
};

function createVoterId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `voter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function App() {
  const { emit, on } = useSocket();
  const [voterId] = useState(createVoterId);
  const [role, setRole] = useState<Role>('audience');
  const [displayName, setDisplayName] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<ResultsPayload | null>(null);

  useEffect(() => {
    const cleanupRoomJoined = on<RoomJoinedPayload>('room:joined', (payload) => {
      setRoom((existingRoom) => {
        if (existingRoom && existingRoom.id !== payload.room.id) {
          return existingRoom;
        }

        return payload.room;
      });

      setCurrentPoll((existingPoll) => payload.activePoll || existingPoll);
    });

    const cleanupPollStarted = on<PollPayload>('poll:started', ({ poll }) => {
      setCurrentPoll(poll);
      setResults(null);
    });

    const cleanupResultsUpdate = on<ResultsPayload>('results:update', (payload) => {
      setResults(payload);
    });

    const cleanupPollClosed = on<PollClosedPayload>('poll:closed', (payload) => {
      setCurrentPoll(payload.poll);
      setResults({
        pollId: payload.pollId,
        votingMode: payload.votingMode,
        totalVoters: payload.totalVoters,
        results: payload.results,
      });
    });

    return () => {
      cleanupRoomJoined();
      cleanupPollStarted();
      cleanupResultsUpdate();
      cleanupPollClosed();
    };
  }, [on]);

  const joinRoom = async (input: { code: string; displayName: string; role: Role }) => {
    const joined = await emit<RoomJoinedPayload>('room:join', {
      code: input.code.trim(),
      voterId,
      displayName: input.displayName.trim(),
    });

    setRole(input.role);
    setDisplayName(input.displayName.trim());
    setRoom(joined.room);
    setCurrentPoll(joined.activePoll);
    setResults(null);
  };

  const createPoll = async (input: CreatePollInput) => {
    if (!room) {
      throw new Error('Join a room before creating a poll.');
    }

    const created = await emit<CreatePollAck>('poll:create', {
      roomId: room.id,
      question: input.question,
      options: input.options,
      votingMode: input.votingMode,
      totalPoints: input.totalPoints,
    });

    setCurrentPoll(created.poll);
    setResults(null);
  };

  const startPoll = async (pollId: string) => {
    if (!room) {
      throw new Error('Join a room before starting a poll.');
    }

    const started = await emit<PollPayload>('poll:start', {
      roomId: room.id,
      pollId,
    });

    setCurrentPoll(started.poll);
    setResults(null);
  };

  const closePoll = async (pollId: string) => {
    if (!room) {
      throw new Error('Join a room before closing a poll.');
    }

    const closed = await emit<PollClosedPayload>('poll:close', {
      roomId: room.id,
      pollId,
    });

    setCurrentPoll(closed.poll);
    setResults({
      pollId: closed.pollId,
      votingMode: closed.votingMode,
      totalVoters: closed.totalVoters,
      results: closed.results,
    });
  };

  const submitVote = async (vote: VoteInput) => {
    if (!room || !currentPoll) {
      throw new Error('No active poll is available.');
    }

    const submitted = await emit<VoteAck>('vote:submit', {
      roomId: room.id,
      pollId: currentPoll.id,
      voterId,
      displayName,
      selectedOption: vote.selectedOption,
      allocations: vote.allocations,
    });

    setResults(submitted.results);
  };

  if (!room) {
    return <JoinRoom onJoin={joinRoom} />;
  }

  if (role === 'presenter') {
    return (
      <PresenterDashboard
        room={room}
        poll={currentPoll}
        results={results}
        onCreatePoll={createPoll}
        onStartPoll={startPoll}
        onClosePoll={closePoll}
      />
    );
  }

  return <AudienceView room={room} poll={currentPoll} results={results} onVote={submitVote} />;
}

export default App;
