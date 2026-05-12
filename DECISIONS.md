# CollabPoll Decisions

## Data Model

CollabPoll keeps the real-time workflow centered on three persisted models:

- `Room` owns the public six-character room code, room status, presenter credential, and the current active poll pointer.
- `Poll` owns the question, options, voting mode, points budget, and lifecycle status.
- `Vote` owns each participant's latest submitted choice or weighted allocation for a poll.

This shape keeps audience identity lightweight and avoids a participant table for the MVP. A room can host many polls, but only one poll should be active at a time. Votes are separate documents so results can be recomputed from source data, and a unique `pollId + voterId` index lets a voter replace their own ballot without duplicating their influence.

## Real-Time Updates

Socket.IO clients join the room named by the canonical room code. Poll lifecycle events and result updates are emitted only to that room, so unrelated rooms do not receive each other's activity. Socket acknowledgements keep the same `{ success, data, error }` envelope for direct command results.

The server treats Socket.IO as the command and broadcast layer: presenters create, start, and close polls through socket events; audience members submit votes through socket events; after each successful vote the server re-aggregates results and emits `results:update` to the room. This keeps the browser state reactive without making clients responsible for result math.

Room creation returns an opaque server-generated `presenterToken`. Presenter-only actions must include that token for the room, while audience joins and votes remain unauthenticated so joining a poll stays low-friction.

## Weighted Voting

Weighted votes are stored as an array of `{ optionId, points }` allocations on the `Vote`. Before saving, the server validates that every option exists on the poll, option IDs are not duplicated, points are non-negative integers, and the submitted points sum exactly to the poll's `totalPoints`.

Results are aggregated from `Vote` records rather than trusting denormalized client state, which favors consistency and replayability over the cheapest possible read path. Edge cases considered include changing a vote, submitting after a poll closes, sending allocations for unknown options, duplicate option allocations, partial budgets, negative points, and non-integer points.

## Tradeoffs

If I had more time, I would add automated integration tests around the socket workflow because most important behavior crosses HTTP, Socket.IO, MongoDB, and client state.

One thing intentionally kept simple is audience identity. The app uses a client-provided voter ID and display name instead of accounts or sessions, which is appropriate for a fast demo flow and keeps room entry friction low.

Aggregating from votes costs more than maintaining only counters, but it avoids drift and supports replacing a voter's submission cleanly. Active poll uniqueness is enforced with room state and a partial unique index on active polls. Chained polls reuse the top results from a previous poll to create a draft follow-up, keeping the feature explicit and presenter-controlled.
