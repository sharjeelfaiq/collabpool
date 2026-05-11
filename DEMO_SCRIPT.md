# CollabPoll Demo Script

## 1. Introduction

"This is CollabPoll, a real-time polling app for collaborative sessions. A presenter can create a room, run live polls, collect audience votes, watch results update instantly, and then turn the strongest results into a follow-up poll."

"The backend is Express, Socket.IO, and MongoDB. The frontend is React and Vite. Socket.IO handles the live room updates, while MongoDB stores rooms, polls, and each participant's latest vote."

## 2. Create a Room

"I'll start as the presenter by entering my name and creating a room."

"The app creates a new backend room and returns a short room code. It also gives this presenter session a private token, so only this presenter can create, start, or close polls for the room."

"The room code is what I share with the audience."

## 3. Audience Joins

"Now I'll join from a second window as an audience member."

"The audience only needs the room code and a display name. Once they join, they are subscribed to the same Socket.IO room, so poll starts, vote updates, and poll closes are pushed live."

## 4. First Poll

"I'll create a first poll as a single-choice question."

"The poll starts as a draft, which lets the presenter prepare it before the audience sees it. When I click Start, the backend marks it active and broadcasts the poll to everyone in the room."

"On the audience side, the poll appears without refreshing. I'll choose an option and submit my vote."

"The presenter view now shows live results. Those results are calculated from stored votes, so the displayed totals are based on backend state rather than client-side counters."

## 5. Real-Time Vote Update

"I'll change my vote from the same audience window and submit again."

"Notice the voter count stays at one, but the option totals change. That is intentional: votes are upserted by poll and voter, so each participant has one current ballot per poll."

## 6. Weighted Voting

"Next I'll close this poll and create a weighted poll."

"Weighted voting gives each participant a fixed point budget. In this example, the voter must allocate exactly ten points across the options."

"If the allocation does not match the required total, the UI blocks submission and the backend also validates the vote. Once the points add up correctly, the vote is accepted."

"The live results now represent points allocated to each option, not just a count of selected choices."

## 7. Poll Chaining

"After closing the weighted poll, I can create a follow-up poll from the top results."

"I'll choose how many top options to carry forward and create the follow-up. The backend reads the previous results, keeps the highest-scoring options, and creates a new draft poll with the same voting mode."

"Now I can start that follow-up poll and run a focused second round with the audience."

## 8. Closing Summary

"That is the full CollabPoll flow: room creation, presenter-controlled polling, audience voting, live results, weighted allocation, vote updates, and chained follow-up polls."

"The key design choices are room-scoped socket events, server-generated presenter authorization, vote-based aggregation for consistency, and a simple React interface that supports both presenter and audience workflows."
