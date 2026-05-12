# CollabPoll Demo Instructions

Use this guide to record a clean end-to-end CollabPoll demo with one presenter window and at least one audience window.

## 1. Start the App

Start MongoDB first, then run the backend:

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

In a second terminal, run the frontend:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## 2. Create a Room

1. In the first browser window, enter a presenter display name.
2. Click **Create room**.
3. Confirm the presenter dashboard opens and shows a six-character room code.
4. Keep this window as the presenter view.

## 3. Join as Audience

1. Open a second browser window, private window, or another browser.
2. Enter the room code from the presenter dashboard.
3. Enter an audience display name.
4. Keep the role set to **Audience**.
5. Click **Join room**.
6. Confirm the audience view shows the same room and waits for a poll.

For stronger real-time footage, open a third audience window and join with another name.

## 4. Run the First Poll

In the presenter window:

1. Add a clear question, such as `Which feature should we prioritize next?`.
2. Add 3-4 options.
3. Keep voting mode as **Single choice**.
4. Click **Create draft poll**.
5. Click **Start**.

In the audience window:

1. Confirm the poll appears without refreshing.gg
2. Select an option.
3. Click **Submit vote**.

Show the presenter window updating live results.

## 5. Show Vote Updates

Use the same audience window:

1. Select a different option.
2. Submit again.
3. Point out that the voter count stays the same while the result totals move.

This demonstrates vote upsert behavior: each voter has one current ballot per poll.

## 6. Demonstrate Weighted Voting

In the presenter window:

1. Close the first poll.
2. Create a new poll.
3. Set **Voting mode** to **Weighted**.
4. Use the default `10` total points or set another small number.
5. Start the poll.

In the audience window:

1. Allocate points across the options.
2. Try submitting with too few or too many points if you want to show validation.
3. Adjust the allocation so it totals exactly the configured point budget.
4. Submit the vote.

Show that results count allocated points, not just voters.

## 7. Demonstrate Poll Chaining

In the presenter window:

1. Close the weighted poll.
2. In **Follow-up poll**, choose how many top options to keep.
3. Click **Create follow-up**.
4. Confirm a new draft poll appears with `Follow-up:` in the question.
5. Click **Start** to show the follow-up poll to the audience.

Explain that chaining uses the previous poll's highest-scoring options to create a focused next round.

## 8. Edge Cases to Show

- **Real-time sync**: start a poll from the presenter window and show it appearing in the audience window without refresh.
- **Vote update**: submit twice from the same audience window and show results change without increasing voter count.
- **Weighted validation**: try submitting a weighted vote before the allocation total matches the required points.
- **Closed poll state**: close a poll and show that voting is disabled.

## Recording Checklist

- MongoDB is running.
- Backend is running on the expected port.
- Frontend is running and connected to the backend.
- Presenter window is ready and readable.
- At least one audience window is joined.
- Browser zoom is comfortable for recording.
- Demo data is short and easy to read.
- First poll, weighted poll, and follow-up poll are all rehearsed.
- No terminal errors are visible before recording.
