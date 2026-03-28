export interface Player {
  id: number;
  name: string;
  color: string;
  score: number;
}

export interface CardData {
  id: number;
  serviceId: string;
  name: string;
  description: string;
  icon: string;
  imageUrl: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export type GameScreen = 'home' | 'config' | 'game' | 'result';

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  cards: CardData[];
  flippedCards: number[];
  matchesFound: number;
  attempts: number;
  startTime: number | null;
  endTime: number | null;
  isProcessing: boolean;
  mismatchCards: number[];
  feedbackText: { text: string; type: 'match' | 'mismatch' } | null;
  combo: number;
}
