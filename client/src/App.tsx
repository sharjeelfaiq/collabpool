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
  RoomUpdatePayload,
  VoteInput,
} from './types';

type CreatePollAck = {
  poll: Poll;
};

type VoteAck = {
  results: ResultsPayload;
};

type CreateRoomResponse = {
  roomCode: string;
  presenterToken: string;
  role: 'presenter';
};

const DISPLAY_NAME_STORAGE_KEY = 'collabpoll.displayName';

function createVoterId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `voter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStoredDisplayName() {
  try {
    return sessionStorage.getItem(DISPLAY_NAME_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function storeDisplayName(name: string) {
  try {
    sessionStorage.setItem(DISPLAY_NAME_STORAGE_KEY, name);
  } catch {
    // Ignore storage failures; the in-memory display name still works.
  }
}

function App() {
  const { emit, on } = useSocket();
  const [voterId] = useState(createVoterId);
  const [role, setRole] = useState<Role>('audience');
  const [displayName, setDisplayName] = useState(getStoredDisplayName);
  const [presenterToken, setPresenterToken] = useState<string | null>(null);
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

    const cleanupRoomUpdate = on<RoomUpdatePayload>('room:update', (payload) => {
      setRoom(payload.room);
      setCurrentPoll((existingPoll) => payload.activePoll ?? existingPoll);
    });

    const cleanupPollStarted = on<PollPayload>('poll:started', ({ poll, room: updatedRoom }) => {
      setCurrentPoll(poll);
      if (updatedRoom) {
        setRoom(updatedRoom);
      }
      setResults(null);
    });

    const cleanupResultsUpdate = on<ResultsPayload>('results:update', (payload) => {
      setResults(payload);
    });

    const cleanupPollClosed = on<PollClosedPayload>('poll:closed', (payload) => {
      setCurrentPoll(payload.poll);
      if (payload.room) {
        setRoom(payload.room);
      }
      setResults({
        pollId: payload.pollId,
        votingMode: payload.votingMode,
        totalVoters: payload.totalVoters,
        results: payload.results,
      });
    });

    return () => {
      cleanupRoomJoined();
      cleanupRoomUpdate();
      cleanupPollStarted();
      cleanupResultsUpdate();
      cleanupPollClosed();
    };
  }, [on]);

  const joinRoom = async (input: { code: string; displayName: string; role: Role; presenterToken?: string | null }) => {
    const trimmedDisplayName = input.displayName.trim();
    const joined = await emit<RoomJoinedPayload>('room:join', {
      code: input.code.trim(),
      voterId,
      displayName: trimmedDisplayName,
    });

    setRole(input.role);
    setDisplayName(trimmedDisplayName);
    storeDisplayName(trimmedDisplayName);
    setPresenterToken(input.role === 'presenter' ? input.presenterToken || null : null);
    setRoom(joined.room);
    setCurrentPoll(joined.activePoll);
    setResults(null);
  };

  const createRoom = async (displayNameInput: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/room/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Could not create room.');
    }

    const created = (await response.json()) as CreateRoomResponse;
    await joinRoom({
      code: created.roomCode,
      displayName: displayNameInput,
      role: created.role,
      presenterToken: created.presenterToken,
    });
  };

  const createPoll = async (input: CreatePollInput) => {
    if (!room) {
      throw new Error('Join a room before creating a poll.');
    }

    if (!presenterToken) {
      throw new Error('Presenter token is missing for this room.');
    }

    const created = await emit<CreatePollAck>('poll:create', {
      roomId: room.id,
      question: input.question,
      options: input.options,
      votingMode: input.votingMode,
      totalPoints: input.totalPoints,
      previousPollId: input.previousPollId,
      topN: input.topN,
      presenterToken,
    });

    setCurrentPoll(created.poll);
    setResults(null);
  };

  const startPoll = async (pollId: string) => {
    if (!room) {
      throw new Error('Join a room before starting a poll.');
    }

    if (!presenterToken) {
      throw new Error('Presenter token is missing for this room.');
    }

    const started = await emit<PollPayload>('poll:start', {
      roomId: room.id,
      pollId,
      presenterToken,
    });

    setCurrentPoll(started.poll);
    if (started.room) {
      setRoom(started.room);
    }
    setResults(null);
  };

  const closePoll = async (pollId: string) => {
    if (!room) {
      throw new Error('Join a room before closing a poll.');
    }

    if (!presenterToken) {
      throw new Error('Presenter token is missing for this room.');
    }

    const closed = await emit<PollClosedPayload>('poll:close', {
      roomId: room.id,
      pollId,
      presenterToken,
    });

    setCurrentPoll(closed.poll);
    if (closed.room) {
      setRoom(closed.room);
    }
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
    return <JoinRoom onCreateRoom={createRoom} onJoin={joinRoom} />;
  }

  if (role === 'presenter') {
    return (
      <PresenterDashboard
        room={room}
        displayName={displayName}
        poll={currentPoll}
        results={results}
        onCreatePoll={createPoll}
        onStartPoll={startPoll}
        onClosePoll={closePoll}
      />
    );
  }

  return <AudienceView room={room} displayName={displayName} poll={currentPoll} results={results} onVote={submitVote} />;
}

export default App;
