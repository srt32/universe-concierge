export class UniverseConciergeError extends Error {
  constructor(message, { code = "UNIVERSE_CONCIERGE_ERROR", cause } = {}) {
    super(message, { cause });
    this.name = "UniverseConciergeError";
    this.code = code;
  }
}

export class SourceUnavailableError extends UniverseConciergeError {
  constructor(source, message, options = {}) {
    super(`${source}: ${message}`, {
      ...options,
      code: "SOURCE_UNAVAILABLE",
    });
    this.name = "SourceUnavailableError";
    this.source = source;
  }
}

export class SessionNotFoundError extends UniverseConciergeError {
  constructor(id) {
    super(`No GitHub Universe session was found for canonical ID "${id}".`, {
      code: "SESSION_NOT_FOUND",
    });
    this.name = "SessionNotFoundError";
    this.sessionId = id;
  }
}
