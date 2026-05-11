const cors = require('cors');
const crypto = require('crypto');
const express = require('express');

const { expressCorsOptions } = require('./config/cors');
const { Room } = require('./models');

const app = express();
const MAX_ROOM_CODE_ATTEMPTS = 8;

app.use(cors(expressCorsOptions));
app.use(express.json());

function createRoomCode() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  for (let index = 0; index < 6; index += 1) {
    code += alphabet[crypto.randomInt(alphabet.length)];
  }

  return code;
}

app.post('/room/create', async (_request, response) => {
  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
    const presenterToken = crypto.randomBytes(32).toString('base64url');

    try {
      const room = await Room.create({
        code: createRoomCode(),
        presenterToken,
        status: 'waiting',
        activePollId: null,
      });

      return response.status(201).json({
        roomCode: room.code,
        presenterToken,
        role: 'presenter',
      });
    } catch (error) {
      if (error && error.code === 11000 && attempt < MAX_ROOM_CODE_ATTEMPTS - 1) {
        continue;
      }

      console.error('Failed to create room:', error);
      return response.status(500).json({
        error: {
          code: 'ROOM_CREATE_FAILED',
          message: 'Could not create a room.',
        },
      });
    }
  }

  return response.status(500).json({
    error: {
      code: 'ROOM_CREATE_FAILED',
      message: 'Could not create a unique room code.',
    },
  });
});

module.exports = app;
