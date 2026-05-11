const mongoose = require('mongoose');

const { Poll, Vote } = require('../models');
const { ServiceError } = require('./serviceError');

function toObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ServiceError('INVALID_INPUT', `${fieldName} is invalid.`);
  }

  return new mongoose.Types.ObjectId(value);
}

function serializeOption(option) {
  return {
    optionId: option._id.toString(),
    text: option.text,
    voteCount: 0,
  };
}

async function getPollResults(pollId) {
  const pollObjectId = toObjectId(pollId, 'pollId');
  const poll = await Poll.findById(pollObjectId).lean();

  if (!poll) {
    throw new ServiceError('POLL_NOT_FOUND', 'Poll was not found.');
  }

  const resultsByOption = new Map();
  const optionTotalsPipeline =
    poll.votingMode === 'weighted'
      ? [
          { $unwind: '$allocations' },
          {
            $group: {
              _id: '$allocations.optionId',
              voteCount: { $sum: '$allocations.points' },
            },
          },
        ]
      : [
          { $match: { selectedOption: { $ne: null } } },
          {
            $group: {
              _id: '$selectedOption',
              voteCount: { $sum: 1 },
            },
          },
        ];

  const [aggregate] = await Vote.aggregate([
    { $match: { pollId: pollObjectId } },
    {
      $facet: {
        optionTotals: optionTotalsPipeline,
        voterTotals: [{ $count: 'totalVoters' }],
      },
    },
  ]);

  const aggregateRows = (aggregate && aggregate.optionTotals) || [];
  const totalVoters =
    aggregate && aggregate.voterTotals && aggregate.voterTotals[0]
      ? aggregate.voterTotals[0].totalVoters
      : 0;

  aggregateRows.forEach((row) => {
    resultsByOption.set(row._id.toString(), row.voteCount);
  });

  const results = poll.options.map((option) => {
    const serialized = serializeOption(option);
    serialized.voteCount = resultsByOption.get(serialized.optionId) || 0;
    return serialized;
  });

  return {
    pollId: poll._id.toString(),
    votingMode: poll.votingMode,
    totalVoters,
    results,
  };
}

module.exports = {
  getPollResults,
};
