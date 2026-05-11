# CollabPoll Decisions

## Core Model

CollabPoll keeps the real-time workflow centered on three persisted models:

- `Room` owns the public six-character room code, room status, presenter credential, and the current active poll pointer.
- `Poll` owns the question, options, voting mode, points budget, and lifecycle status.
- `Vote` owns each participant's latest submitted choice or weighted allocation for a poll.

This keeps audience identity lightweight and avoids a participant table for the MVP.

## Room-Scoped Socket Events

Socket.IO clients join the room named by the canonical room code. Poll lifecycle events and result updates are emitted only to that room, so unrelated rooms do not receive each other's activity. Socket acknowledgements keep the same `{ success, data, error }` envelope for direct command results.

## Presenter Authorization

Room creation returns an opaque server-generated `presenterToken`. Presenter-only actions must include that token for the room. Audience joins and votes remain unauthenticated so joining a poll stays low-friction.

## Weighted Votes And Results

Weighted votes are validated against the poll's options and configured point budget before storage. Results are aggregated from `Vote` records rather than trusting denormalized client state, which favors consistency and replayability over the cheapest possible read path.

## Tradeoffs

Aggregating from votes costs more than maintaining only counters, but it avoids drift and supports replacing a voter's submission cleanly. Vote upserts mean each voter has one current ballot per poll. Active poll uniqueness is enforced with room state and a partial unique index on active polls. Chained polls reuse the top results from a previous poll to create a draft follow-up, keeping the feature explicit and presenter-controlled.
