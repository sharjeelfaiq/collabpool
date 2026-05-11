require('dotenv').config();

const http = require('http');

const app = require('./app');
const { allowedOrigins } = require('./config/cors');
const connectDatabase = require('./config/database');
const initializeSocket = require('./sockets');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = initializeSocket(server);

app.set('io', io);

connectDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`CollabPoll server listening on port ${PORT}`);
      console.log('Allowed CORS origins:', allowedOrigins);
    });
  })
  .catch((error) => {
    console.error('Failed to start CollabPoll server:', error);
    process.exit(1);
  });
