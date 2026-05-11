const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:3000'];

function parseOrigins(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = Array.from(
  new Set([...DEFAULT_ALLOWED_ORIGINS, ...parseOrigins(process.env.CLIENT_ORIGIN)])
);

const expressCorsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

const socketCorsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true,
};

module.exports = {
  allowedOrigins,
  expressCorsOptions,
  socketCorsOptions,
};
