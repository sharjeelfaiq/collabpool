export type Role = 'presenter' | 'audience';

export type VotingMode = 'single' | 'weighted';

export type PollStatus = 'draft' | 'active' | 'closed';

export type RoomStatus = 'waiting' | 'active' | 'closed';

export type Room = {
  id: string;
  code: string;
  status: RoomStatus;
  presenterId?: string | null;
  activePollId?: string | null;
  createdAt?: string | null;
};

export type PollOption = {
  optionId: string;
  text: string;
  voteCount?: number;
};

export type Poll = {
  id: string;
  roomId: string;
  question: string;
  options: PollOption[];
  votingMode: VotingMode;
  totalPoints: number;
  status: PollStatus;
  closedAt?: string | null;
  createdAt?: string | null;
};

export type ResultOption = {
  optionId: string;
  text: string;
  voteCount: number;
};

export type ResultsPayload = {
  pollId: string;
  votingMode?: VotingMode;
  totalVoters: number;
  results: ResultOption[];
};

export type RoomJoinedPayload = {
  room: Room;
  activePoll: Poll | null;
};

export type PollPayload = {
  poll: Poll;
  room?: Room;
};

export type PollClosedPayload = ResultsPayload & {
  poll: Poll;
  room?: Room;
};

export type RoomUpdatePayload = {
  room: Room;
  activePoll?: Poll | null;
};

export type CreatePollInput = {
  question?: string;
  options?: string[];
  votingMode?: VotingMode;
  totalPoints?: number;
  previousPollId?: string;
  topN?: number;
};

export type VoteInput = {
  selectedOption: string | null;
  allocations: { optionId: string; points: number }[];
};
