# CollabPoll Frontend

CollabPoll's frontend is a React + Vite application for running live collaborative polls. It supports a presenter view for creating and managing polls and an audience view for joining a room, voting, and watching results update in real time.

## Stack

- React with TypeScript
- Vite development server and build pipeline
- Socket.IO client for real-time events
- Tailwind CSS for styling

## UI Structure

The app starts at the join screen:

- **Create room**: creates a backend room, stores the returned presenter token in app state, and enters the presenter dashboard.
- **Join room**: joins an existing room as either audience or presenter using the room code. Audience joins do not require credentials.

After joining, the UI branches by role:

- **Presenter view**: create draft polls, start polls, close polls, view live results, and create follow-up polls from closed poll results.
- **Audience view**: wait for the presenter, submit single-choice or weighted votes, and watch live result updates.

## Main Files

- `src/App.tsx`: top-level state, room creation, room joining, socket events, and presenter/audience routing.
- `src/pages/JoinRoom.tsx`: room code entry, display name entry, role selector, and create-room control.
- `src/pages/PresenterDashboard.tsx`: poll creation form, start/close controls, live results, and chained-poll control.
- `src/pages/AudienceView.tsx`: audience room shell, voting state, and results display.
- `src/components/VotingInterface.tsx`: single-choice and weighted voting form.
- `src/components/LiveResults.tsx`: live result bars and voter count.
- `src/hooks/useSocket.ts`: shared Socket.IO client, ack handling, and event subscription helpers.
- `src/types.ts`: shared frontend payload and model types.

## Socket Integration

The frontend connects to Socket.IO with:

```ts
import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
```

Command events are emitted through `useSocket().emit`, which expects the backend acknowledgement envelope and rejects failed requests as JavaScript errors.

The app listens for:

- `room:joined`
- `poll:started`
- `results:update`
- `poll:closed`

The app emits:

- `room:join`
- `poll:create`
- `poll:start`
- `poll:close`
- `vote:submit`

Presenter-only emits include the `presenterToken` returned by `POST /room/create`.

## Backend Dependency

The frontend expects the backend to be running and reachable for:

- `POST /room/create` through `VITE_API_URL` or `http://localhost:5000`
- Socket.IO through `VITE_SOCKET_URL` or `http://localhost:5000`

Create a room from the frontend first, then use the displayed room code to join from another tab or browser as an audience participant.

## Environment Variables

Optional `client/.env` values:

```bash
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## Run Locally

```bash
cd client
npm install
npm start
```

Vite will print the local browser URL, typically `http://localhost:5173`.

For a production build:

```bash
npm run build
```
