const mongoose = require('mongoose');

const { Schema } = mongoose;

const voteAllocationSchema = new Schema(
  {
    optionId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const voteSchema = new Schema(
  {
    pollId: {
      type: Schema.Types.ObjectId,
      ref: 'Poll',
      required: true,
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    voterId: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: '',
    },
    selectedOption: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    allocations: {
      type: [voteAllocationSchema],
      default: [],
    },
  },
  {
    timestamps: {
      createdAt: false,
      updatedAt: true,
    },
  },
);

voteSchema.index({ pollId: 1, voterId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
