const mongoose = require('mongoose');

const { Poll, Room } = require('../models');
const { getPollResults } = require('./analyticsService');
const { ServiceError } = require('./serviceError');

function toObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ServiceError('INVALID_INPUT', `${fieldName} is invalid.`);
  }

  return new mongoose.Types.ObjectId(value);
}

function requireString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ServiceError('INVALID_INPUT', `${fieldName} is required.`);
  }

  return value.trim();
}

function normalizeOptions(options) {
  if (!Array.isArray(options) || options.length < 2) {
    throw new ServiceError('INVALID_INPUT', 'At least two options are required.');
  }

  const normalized = options.map((option) => requireString(option, 'option')).map((text) => ({ text }));

  return normalized;
}

function normalizeVotingMode(votingMode) {
  if (votingMode === undefined || votingMode === null || votingMode === '') {
    return 'single';
  }

  if (!['single', 'weighted'].includes(votingMode)) {
    throw new ServiceError('INVALID_INPUT', 'votingMode must be single or weighted.');
  }

  return votingMode;
}

function normalizeTotalPoints(votingMode, totalPoints) {
  if (votingMode !== 'weighted' && (totalPoints === undefined || totalPoints === null)) {
    return 10;
  }

  if (totalPoints === undefined || totalPoints === null) {
    return 10;
  }

  if (!Number.isInteger(totalPoints) || totalPoints <= 0) {
    throw new ServiceError('INVALID_INPUT', 'totalPoints must be a positive integer.');
  }

  return totalPoints;
}

async function getRoom(roomId) {
  const room = await Room.findById(toObjectId(roomId, 'roomId'));

  if (!room) {
    throw new ServiceError('ROOM_NOT_FOUND', 'Room was not found.');
  }

  return room;
}

function assertPresenter(room, presenterId) {
  if (presenterId && room.presenterId !== presenterId) {
    throw new ServiceError('FORBIDDEN', 'presenterId does not match this room.');
  }
}

async function createPoll(payload) {
  const room = await getRoom(payload && payload.roomId);
  assertPresenter(room, payload && payload.presenterId);

  const votingMode = normalizeVotingMode(payload && payload.votingMode);
  const poll = await Poll.create({
    roomId: room._id,
    question: requireString(payload && payload.question, 'question'),
    options: normalizeOptions(payload && payload.options),
    votingMode,
    totalPoints: normalizeTotalPoints(votingMode, payload && payload.totalPoints),
    status: 'draft',
  });

  return poll;
}

async function startPoll(payload) {
  const room = await getRoom(payload && payload.roomId);
  assertPresenter(room, payload && payload.presenterId);

  const pollId = toObjectId(payload && payload.pollId, 'pollId');
  const poll = await Poll.findById(pollId);

  if (!poll) {
    throw new ServiceError('POLL_NOT_FOUND', 'Poll was not found.');
  }

  if (poll.roomId.toString() !== room._id.toString()) {
    throw new ServiceError('INVALID_INPUT', 'Poll does not belong to the specified room.');
  }

  if (poll.status === 'closed') {
    throw new ServiceError('POLL_CLOSED', 'Closed polls cannot be started.');
  }

  if (room.activePollId && room.activePollId.toString() !== poll._id.toString()) {
    throw new ServiceError('ACTIVE_POLL_EXISTS', 'This room already has an active poll.');
  }

  if (poll.status === 'active') {
    const activeRoom = room.activePollId
      ? room
      : await Room.findOneAndUpdate(
          {
            _id: room._id,
            $or: [{ activePollId: null }, { activePollId: { $exists: false } }, { activePollId: poll._id }],
          },
          { $set: { status: 'active', activePollId: poll._id } },
          { new: true, runValidators: true },
        );

    if (!activeRoom) {
      throw new ServiceError('ACTIVE_POLL_EXISTS', 'This room already has an active poll.');
    }

    return { poll, room: activeRoom, transitioned: false };
  }

  const claimedRoom = await Room.findOneAndUpdate(
    {
      _id: room._id,
      $or: [{ activePollId: null }, { activePollId: { $exists: false } }, { activePollId: poll._id }],
    },
    { $set: { status: 'active', activePollId: poll._id } },
    { new: true, runValidators: true },
  );

  if (!claimedRoom) {
    throw new ServiceError('ACTIVE_POLL_EXISTS', 'This room already has an active poll.');
  }

  try {
    const activatedPoll = await Poll.findOneAndUpdate(
      { _id: poll._id, roomId: room._id, status: 'draft' },
      { $set: { status: 'active' } },
      { new: true, runValidators: true },
    );

    if (activatedPoll) {
      return { poll: activatedPoll, room: claimedRoom, transitioned: true };
    }
  } catch (error) {
    if (error && error.code === 11000) {
      await Room.updateOne(
        { _id: room._id, activePollId: poll._id },
        { $set: { status: 'waiting' }, $unset: { activePollId: '' } },
      );
      throw new ServiceError('ACTIVE_POLL_EXISTS', 'This room already has an active poll.');
    }

    throw error;
  }

  const currentPoll = await Poll.findById(poll._id);

  if (currentPoll && currentPoll.status === 'active') {
    return { poll: currentPoll, room: claimedRoom, transitioned: false };
  }

  await Room.updateOne(
    { _id: room._id, activePollId: poll._id },
    { $set: { status: 'waiting' }, $unset: { activePollId: '' } },
  );

  if (currentPoll && currentPoll.status === 'closed') {
    throw new ServiceError('POLL_CLOSED', 'Closed polls cannot be started.');
  }

  throw new ServiceError('POLL_NOT_FOUND', 'Poll was not found.');
}

async function closePoll(payload) {
  const room = await getRoom(payload && payload.roomId);
  assertPresenter(room, payload && payload.presenterId);

  const pollId = toObjectId(payload && payload.pollId, 'pollId');
  const poll = await Poll.findById(pollId);

  if (!poll) {
    throw new ServiceError('POLL_NOT_FOUND', 'Poll was not found.');
  }

  if (poll.roomId.toString() !== room._id.toString()) {
    throw new ServiceError('INVALID_INPUT', 'Poll does not belong to the specified room.');
  }

  if (poll.status === 'closed') {
    return { poll, room, transitioned: false };
  }

  if (poll.status !== 'active') {
    throw new ServiceError('POLL_NOT_ACTIVE', 'Only active polls can be closed.');
  }

  const closedPoll = await Poll.findOneAndUpdate(
    { _id: poll._id, roomId: room._id, status: 'active' },
    { $set: { status: 'closed', closedAt: new Date() } },
    { new: true, runValidators: true },
  );

  if (!closedPoll) {
    const currentPoll = await Poll.findById(poll._id);

    if (currentPoll && currentPoll.status === 'closed') {
      return { poll: currentPoll, room, transitioned: false };
    }

    throw new ServiceError('POLL_NOT_ACTIVE', 'Only active polls can be closed.');
  }

  const updatedRoom = await Room.findOneAndUpdate(
    { _id: room._id, activePollId: poll._id },
    { $set: { status: 'waiting' }, $unset: { activePollId: '' } },
    { new: true, runValidators: true },
  );

  return { poll: closedPoll, room: updatedRoom || room, transitioned: true };
}

async function createChainedPoll(previousPollId, topN = 3, presenterId) {
  const previousPoll = await Poll.findById(toObjectId(previousPollId, 'previousPollId'));

  if (!previousPoll) {
    throw new ServiceError('POLL_NOT_FOUND', 'Previous poll was not found.');
  }

  if (previousPoll.status === 'draft') {
    throw new ServiceError('POLL_NOT_READY', 'Previous poll must have results before chaining.');
  }

  const room = await getRoom(previousPoll.roomId);
  assertPresenter(room, presenterId);

  const limit = Number.isInteger(topN) ? topN : Number.parseInt(topN, 10);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new ServiceError('INVALID_INPUT', 'topN must be a positive integer.');
  }

  const aggregate = await getPollResults(previousPoll._id);
  const sortedResults = [...aggregate.results].sort((a, b) => {
    if (b.voteCount !== a.voteCount) {
      return b.voteCount - a.voteCount;
    }

    return previousPoll.options.findIndex((option) => option._id.toString() === a.optionId) -
      previousPoll.options.findIndex((option) => option._id.toString() === b.optionId);
  });
  const selectedOptions = sortedResults.slice(0, Math.min(limit, sortedResults.length));

  if (selectedOptions.length < 2) {
    throw new ServiceError('INVALID_INPUT', 'A chained poll requires at least two available options.');
  }

  return Poll.create({
    roomId: previousPoll.roomId,
    question: `Follow-up: ${previousPoll.question}`,
    options: selectedOptions.map((option) => ({ text: option.text })),
    votingMode: previousPoll.votingMode,
    totalPoints: previousPoll.totalPoints,
    status: 'draft',
  });
}

module.exports = {
  createPoll,
  startPoll,
  closePoll,
  createChainedPoll,
};
