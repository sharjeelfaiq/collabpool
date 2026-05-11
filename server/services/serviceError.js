class ServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}

function isServiceError(error) {
  return error instanceof ServiceError;
}

module.exports = {
  ServiceError,
  isServiceError,
};
