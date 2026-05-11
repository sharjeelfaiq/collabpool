const mongoose = require('mongoose');

const { Poll, Vote } = require('../models');
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

function getOptionIds(poll) {
  return poll.options.map((option) => option._id.toString());
}

function normalizeSingleChoice(poll, payload) {
  const selectedOption = requireString(payload.selectedOption, 'selectedOption');
  const optionIds = new Set(getOptionIds(poll));

  if (!optionIds.has(selectedOption)) {
    throw new ServiceError('INVALID_VOTE', 'selectedOption must match a poll option.');
  }

  return {
    selectedOption: toObjectId(selectedOption, 'selectedOption'),
    allocations: [],
  };
}

function normalizeWeighted(poll, payload) {
  if (!Array.isArray(payload.allocations) || payload.allocations.length === 0) {
    throw new ServiceError('INVALID_VOTE', 'allocations are required for weighted voting.');
  }

  const pollOptionIds = getOptionIds(poll);
  const optionIdSet = new Set(pollOptionIds);
  const seen = new Set();
  let total = 0;

  const allocationsByOption = new Map();

  payload.allocations.forEach((allocation) => {
    const optionId = requireString(allocation && allocation.optionId, 'allocation.optionId');
    const points = allocation && allocation.points;

    if (!optionIdSet.has(optionId)) {
      throw new ServiceError('INVALID_VOTE', 'Allocation optionId must match a poll option.');
    }

    if (seen.has(optionId)) {
      throw new ServiceError('INVALID_VOTE', 'Duplicate allocation optionIds are not allowed.');
    }

    if (!Number.isInteger(points) || points < 0) {
      throw new ServiceError('INVALID_VOTE', 'Allocation points must be non-negative integers.');
    }

    seen.add(optionId);
    total += points;
    allocationsByOption.set(optionId, {
      optionId: toObjectId(optionId, 'allocation.optionId'),
      points,
    });
  });

  if (total !== poll.totalPoints) {
    throw new ServiceError('INVALID_VOTE', `Allocation points must sum to ${poll.totalPoints}.`);
  }

  return {
    selectedOption: null,
    allocations: pollOptionIds
      .filter((optionId) => allocationsByOption.has(optionId))
      .map((optionId) => allocationsByOption.get(optionId)),
  };
}

async function submitVote(payload) {
  const pollId = toObjectId(payload && payload.pollId, 'pollId');
  const roomId = toObjectId(payload && payload.roomId, 'roomId');
  const voterId = requireString(payload && payload.voterId, 'voterId');
  const displayName =
    typeof (payload && payload.displayName) === 'string' ? payload.displayName.trim() : '';

  const poll = await Poll.findById(pollId);

  if (!poll) {
    throw new ServiceError('POLL_NOT_FOUND', 'Poll was not found.');
  }

  if (poll.roomId.toString() !== roomId.toString()) {
    throw new ServiceError('INVALID_INPUT', 'Poll does not belong to the specified room.');
  }

  if (poll.status !== 'active') {
    throw new ServiceError('POLL_NOT_ACTIVE', 'Voting is only allowed on active polls.');
  }

  const normalizedVote =
    poll.votingMode === 'weighted'
      ? normalizeWeighted(poll, payload)
      : normalizeSingleChoice(poll, payload);

  const activePoll = await Poll.findOne({ _id: poll._id, roomId, status: 'active' });

  if (!activePoll) {
    throw new ServiceError('POLL_NOT_ACTIVE', 'Voting is only allowed on active polls.');
  }

  const update = {
    $set: {
      pollId: poll._id,
      roomId: poll.roomId,
      voterId,
      displayName,
      selectedOption: normalizedVote.selectedOption,
      allocations: normalizedVote.allocations,
    },
  };

  try {
    return await Vote.findOneAndUpdate({ pollId: poll._id, voterId }, update, {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    });
  } catch (error) {
    if (!error || error.code !== 11000) {
      throw error;
    }

    const stillActive = await Poll.exists({ _id: poll._id, roomId, status: 'active' });

    if (!stillActive) {
      throw new ServiceError('POLL_NOT_ACTIVE', 'Voting is only allowed on active polls.');
    }

    const vote = await Vote.findOneAndUpdate({ pollId: poll._id, voterId }, update, {
      new: true,
      runValidators: true,
    });

    if (!vote) {
      throw new ServiceError('VOTE_CONFLICT', 'Vote could not be saved.');
    }

    return vote;
  }
}

module.exports = {
  submitVote,
};
