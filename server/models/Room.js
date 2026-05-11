const mongoose = require('mongoose');

const { Schema } = mongoose;

const roomSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 6,
      maxlength: 6,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'active', 'closed'],
      default: 'waiting',
      index: true,
    },
    presenterId: {
      type: String,
      trim: true,
    },
    presenterToken: {
      type: String,
      required: true,
      trim: true,
      select: false,
    },
    activePollId: {
      type: Schema.Types.ObjectId,
      ref: 'Poll',
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

module.exports = mongoose.model('Room', roomSchema);
