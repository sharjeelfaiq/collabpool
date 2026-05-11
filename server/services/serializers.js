function plain(document) {
  if (!document) {
    return null;
  }

  if (typeof document.toObject === 'function') {
    return document.toObject();
  }

  return document;
}

function serializeId(value) {
  return value ? value.toString() : null;
}

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : value || null;
}

function serializeRoom(room) {
  const source = plain(room);

  if (!source) {
    return null;
  }

  return {
    id: serializeId(source._id),
    code: source.code,
    status: source.status,
    presenterId: source.presenterId,
    activePollId: serializeId(source.activePollId),
    createdAt: serializeDate(source.createdAt),
  };
}

function serializePollOption(option) {
  const source = plain(option);

  return {
    optionId: serializeId(source._id),
    text: source.text,
    voteCount: source.voteCount || 0,
  };
}

function serializePoll(poll) {
  const source = plain(poll);

  if (!source) {
    return null;
  }

  return {
    id: serializeId(source._id),
    roomId: serializeId(source.roomId),
    question: source.question,
    options: (source.options || []).map(serializePollOption),
    votingMode: source.votingMode,
    totalPoints: source.totalPoints,
    status: source.status,
    closedAt: serializeDate(source.closedAt),
    createdAt: serializeDate(source.createdAt),
  };
}

function serializeVoteAllocation(allocation) {
  const source = plain(allocation);

  return {
    optionId: serializeId(source.optionId),
    points: source.points,
  };
}

function serializeVote(vote) {
  const source = plain(vote);

  if (!source) {
    return null;
  }

  return {
    id: serializeId(source._id),
    pollId: serializeId(source.pollId),
    roomId: serializeId(source.roomId),
    voterId: source.voterId,
    displayName: source.displayName || '',
    selectedOption: serializeId(source.selectedOption),
    allocations: (source.allocations || []).map(serializeVoteAllocation),
    updatedAt: serializeDate(source.updatedAt),
  };
}

module.exports = {
  serializePoll,
  serializeRoom,
  serializeVote,
};
