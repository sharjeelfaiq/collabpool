const { Server } = require('socket.io');

const { socketCorsOptions } = require('../config/cors');
const { Poll, Room } = require('../models');
const { getPollResults } = require('../services/analyticsService');
const {
  closePoll,
  createChainedPoll,
  createPoll,
  startPoll,
} = require('../services/pollService');
const { isServiceError } = require('../services/serviceError');
const {
  serializePoll,
  serializeRoom,
  serializeVote,
} = require('../services/serializers');
const { submitVote } = require('../services/voteService');

const CLIENT_EVENTS = Object.freeze({
  ROOM_JOIN: 'room:join',
  POLL_CREATE: 'poll:create',
  POLL_START: 'poll:start',
  POLL_CLOSE: 'poll:close',
  VOTE_SUBMIT: 'vote:submit',
});

const SERVER_EVENTS = Object.freeze({
  ROOM_JOINED: 'room:joined',
  POLL_STARTED: 'poll:started',
  RESULTS_UPDATE: 'results:update',
  POLL_CLOSED: 'poll:closed',
});

const SOCKET_EVENT_CONTRACT = Object.freeze({
  clientToServer: {
    [CLIENT_EVENTS.ROOM_JOIN]: {
      code: 'string',
      voterId: 'string',
      displayName: 'string',
    },
    [CLIENT_EVENTS.POLL_CREATE]: {
      roomId: 'string',
      presenterToken: 'string',
      question: 'string',
      options: ['string'],
      votingMode: 'single | weighted',
      totalPoints: 'number',
      previousPollId: 'string | undefined',
      topN: 'number | undefined',
    },
    [CLIENT_EVENTS.POLL_START]: {
      roomId: 'string',
      pollId: 'string',
      presenterToken: 'string',
    },
    [CLIENT_EVENTS.POLL_CLOSE]: {
      roomId: 'string',
      pollId: 'string',
      presenterToken: 'string',
    },
    [CLIENT_EVENTS.VOTE_SUBMIT]: {
      roomId: 'string',
      pollId: 'string',
      voterId: 'string',
      displayName: 'string',
      selectedOption: 'string | null',
      allocations: [{ optionId: 'string', points: 'number' }],
    },
  },
  serverToClient: {
    [SERVER_EVENTS.ROOM_JOINED]: {
      room: 'Room',
      activePoll: 'Poll | null',
    },
    [SERVER_EVENTS.POLL_STARTED]: {
      poll: 'Poll',
    },
    [SERVER_EVENTS.RESULTS_UPDATE]: {
      pollId: 'string',
      totalVoters: 'number',
      results: [{ optionId: 'string', text: 'string', voteCount: 'number' }],
    },
    [SERVER_EVENTS.POLL_CLOSED]: {
      poll: 'Poll',
      totalVoters: 'number',
      results: [{ optionId: 'string', text: 'string', voteCount: 'number' }],
    },
  },
});

let initializedIo = null;

function ok(data) {
  return { success: true, data, error: null };
}

function fail(error) {
  if (isServiceError(error)) {
    return {
      success: false,
      data: null,
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }

  return {
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    },
  };
}

function ack(callback, payload) {
  if (typeof callback === 'function') {
    callback(payload);
  }
}

function requireString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    const error = new Error(`${fieldName} is required.`);
    error.code = 'INVALID_INPUT';
    throw error;
  }

  return value.trim();
}

function normalizeRoomCode(code) {
  return requireString(code, 'code').toUpperCase();
}

function socketError(error) {
  if (error && error.code) {
    return {
      success: false,
      data: null,
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }

  return fail(error);
}

async function getRoomCode(roomId) {
  const room = await Room.findById(roomId).lean();
  return room && room.code;
}

function initializeSocket(server) {
  if (initializedIo) {
    return initializedIo;
  }

  console.log('Socket.IO CORS config:', socketCorsOptions);

  const io = new Server(server, {
    cors: socketCorsOptions,
  });

  io.on('connection', (socket) => {
    console.log('Socket connection attempt:', {
      id: socket.id,
      origin: socket.handshake.headers.origin,
      transport: socket.conn.transport.name,
    });

    socket.on(CLIENT_EVENTS.ROOM_JOIN, async (payload, callback) => {
      try {
        const roomCode = normalizeRoomCode(payload && payload.code);
        requireString(payload && payload.voterId, 'voterId');
        requireString(payload && payload.displayName, 'displayName');

        const room = await Room.findOne({ code: roomCode }).lean();

        if (!room) {
          return ack(callback, {
            success: false,
            data: null,
            error: {
              code: 'ROOM_NOT_FOUND',
              message: 'Room was not found.',
            },
          });
        }

        const activePoll = room.activePollId ? await Poll.findById(room.activePollId).lean() : null;
        const data = {
          room: serializeRoom(room),
          activePoll: serializePoll(activePoll),
        };
        const canonicalRoomCode = room.code;
        const alreadyJoined = socket.rooms.has(canonicalRoomCode);

        if (!alreadyJoined) {
          socket.join(canonicalRoomCode);
          io.to(canonicalRoomCode).emit(SERVER_EVENTS.ROOM_JOINED, data);
        }

        return ack(callback, ok(data));
      } catch (error) {
        return ack(callback, socketError(error));
      }
    });

    socket.on(CLIENT_EVENTS.POLL_CREATE, async (payload, callback) => {
      try {
        const poll =
          payload && payload.previousPollId
            ? await createChainedPoll(payload.previousPollId, payload.topN, payload.presenterToken)
            : await createPoll(payload);

        return ack(callback, ok({ poll: serializePoll(poll) }));
      } catch (error) {
        return ack(callback, fail(error));
      }
    });

    socket.on(CLIENT_EVENTS.POLL_START, async (payload, callback) => {
      try {
        const { poll, room, transitioned } = await startPoll(payload);
        const data = { poll: serializePoll(poll) };

        if (transitioned) {
          io.to(room.code).emit(SERVER_EVENTS.POLL_STARTED, data);
        }

        return ack(callback, ok(data));
      } catch (error) {
        return ack(callback, fail(error));
      }
    });

    socket.on(CLIENT_EVENTS.VOTE_SUBMIT, async (payload, callback) => {
      try {
        const vote = await submitVote(payload);
        const [resultsPayload, roomCode] = await Promise.all([
          getPollResults(vote.pollId),
          getRoomCode(vote.roomId),
        ]);

        if (roomCode) {
          io.to(roomCode).emit(SERVER_EVENTS.RESULTS_UPDATE, resultsPayload);
        }

        return ack(callback, ok({ vote: serializeVote(vote), results: resultsPayload }));
      } catch (error) {
        return ack(callback, fail(error));
      }
    });

    socket.on(CLIENT_EVENTS.POLL_CLOSE, async (payload, callback) => {
      try {
        const { poll, room, transitioned } = await closePoll(payload);
        const resultsPayload = await getPollResults(poll._id);
        const closedPayload = {
          ...resultsPayload,
          poll: serializePoll(poll),
        };

        if (transitioned) {
          io.to(room.code).emit(SERVER_EVENTS.POLL_CLOSED, closedPayload);
        }

        return ack(callback, ok(closedPayload));
      } catch (error) {
        return ack(callback, fail(error));
      }
    });
  });

  initializedIo = io;
  return initializedIo;
}

module.exports = initializeSocket;
module.exports.CLIENT_EVENTS = CLIENT_EVENTS;
module.exports.SERVER_EVENTS = SERVER_EVENTS;
module.exports.SOCKET_EVENT_CONTRACT = SOCKET_EVENT_CONTRACT;
module.exports._ack = { ok, fail };
