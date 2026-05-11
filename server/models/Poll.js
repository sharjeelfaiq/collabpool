const mongoose = require('mongoose');

const { Schema } = mongoose;

const pollOptionSchema = new Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  voteCount: {
    type: Number,
    default: 0,
  },
});

const pollSchema = new Schema(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [pollOptionSchema],
      required: true,
    },
    votingMode: {
      type: String,
      enum: ['single', 'weighted'],
      default: 'single',
    },
    totalPoints: {
      type: Number,
      default: 10,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'closed'],
      default: 'draft',
      index: true,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

pollSchema.index(
  { roomId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
  },
);

module.exports = mongoose.model('Poll', pollSchema);
