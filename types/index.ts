export type PlayerFundamentals = {
  serve: number;
  passing: number;
  setting: number;
  attacking: number;
  blocking: number;
};

export type Player = {
  id: string;
  name: string;
  active: boolean;
  weight: 1 | 2 | 3;
  photoUri?: string;
  fundamentals?: PlayerFundamentals;
};

export type Team = {
  players: Player[];
  total: number;
  fundamentals: PlayerFundamentals;
};

// A single pairing rule now has a unique ID
export type PlayerPairing = {
  id: string;
  player1Id: string | null;
  player2Id: string | null;
  type: 'together' | 'apart';
};

export type Screen = 'edit' | 'draw' | 'players' | 'settings' | 'history';

export type TeamSize = number;

export type Match = {
  id: string;
  date: string;
  teams: Team[];
  winnerTeamIndex: number;
  scores: [number, number];
  teamNames?: [string, string];
};

export type SortMode = 'alphabetical' | 'level' | 'winrate' | 'session';
