# CollabPoll Backend

CollabPoll's backend provides room creation, poll lifecycle control, vote submission, and live result updates for collaborative polling sessions. It exposes a small Express API for creating rooms and uses Socket.IO for the real-time presenter and audience workflow.

## Architecture

- **Express** handles HTTP middleware, CORS, JSON parsing, and `POST /room/create`.
- **Socket.IO** handles room joins, presenter commands, vote submissions, and room-scoped broadcasts.
- **MongoDB + Mongoose** persist rooms, polls, and votes.
- **Service modules** hold validation and domain behavior so socket handlers stay thin.

Runtime entry point:

- `server.js` loads environment variables, connects MongoDB, creates the HTTP server, initializes Socket.IO, and starts listening.
- `app.js` defines the Express app and room-creation route.
- `sockets/index.js` registers Socket.IO event handlers.

## Core Modules

### Models

- `models/Room.js`: stores the six-character room code, room status, active poll pointer, and private `presenterToken`.
- `models/Poll.js`: stores the question, options, voting mode, point budget, lifecycle status, and a partial unique index that prevents more than one active poll per room.
- `models/Vote.js`: stores each voter's current ballot for a poll. A unique index on `pollId + voterId` lets a later vote replace the same voter's earlier vote.

### Services

- `services/pollService.js`: creates polls, starts polls, closes polls, validates presenter tokens, and creates chained follow-up polls from prior results.
- `services/voteService.js`: validates single-choice and weighted votes, enforces active-poll voting, and upserts votes.
- `services/analyticsService.js`: aggregates live results from stored `Vote` records.
- `services/serializers.js`: converts Mongoose documents into client-facing payloads.
- `services/serviceError.js`: standardizes domain errors for socket acknowledgements.

### Sockets

Socket handlers use a consistent acknowledgement envelope:

```json
{ "success": true, "data": {}, "error": null }
```

Errors use:

```json
{ "success": false, "data": null, "error": { "code": "ERROR_CODE", "message": "Message" } }
```

## Socket Events

### Client to Server

- `room:join`: joins a room by code with `voterId` and `displayName`.
- `poll:create`: creates a draft poll, or creates a chained poll when `previousPollId` and `topN` are provided. Requires `presenterToken`.
- `poll:start`: starts a draft poll. Requires `presenterToken`.
- `poll:close`: closes an active poll and returns final results. Requires `presenterToken`.
- `vote:submit`: submits or updates a vote for the active poll.

### Server to Client

- `room:joined`: broadcasts room state and active poll to clients in the room.
- `poll:started`: broadcasts the active poll when the presenter starts it.
- `results:update`: broadcasts recalculated live results after each vote.
- `poll:closed`: broadcasts the closed poll and final results.

## HTTP API

### `POST /room/create`

Creates a new presenter-owned room.

Response:

```json
{
  "roomCode": "ABC123",
  "presenterToken": "opaque-token",
  "role": "presenter"
}
```

The presenter token is a server-generated credential. It is required for presenter-only socket actions and is not returned in serialized room data.

## Environment Variables

Create `server/.env` from `server/.env.example`.

| Name | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | No | `5000` | Backend HTTP and Socket.IO port. |
| `MONGODB_URI` | Yes | None | MongoDB connection string. |
| `CLIENT_ORIGIN` | No | None | Additional comma-separated allowed browser origins. |

Default allowed origins also include `http://localhost:5173` and `http://localhost:3000`.

## Run Locally

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

For a non-watch process:

```bash
npm start
```

MongoDB must be reachable at `MONGODB_URI` before the server starts.

## Design Decisions

- Rooms are addressed by short public codes, while presenter privileges use a private `presenterToken`.
- Audience joins and votes are intentionally unauthenticated for a low-friction demo flow.
- Results are aggregated from `Vote` documents instead of trusting client counters.
- Weighted votes must allocate exactly the poll's configured point budget.
- Poll chaining creates a new draft from the top results of a previous non-draft poll, keeping the presenter in control.
