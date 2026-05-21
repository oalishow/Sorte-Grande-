export interface Participant {
  id: string;
  name: string;
  ticketNumber: number;
  joinedAt: number;
}

export interface Prize {
  id: string;
  name: string;
  winner: Participant | null;
  drawnAt: number | null;
}

export interface Room {
  id: string;
  name: string;
  creatorId: string;
  participants: Participant[];
  prizes: Prize[];
  status: 'waiting' | 'drawing' | 'drawn';
  activePrizeId: string | null;
  currentWinner: Participant | null;
  currentWinningNumber: number | null;
  drawingStartedAt: number | null;
  createdAt: number;
  drawMode?: 'qrcode' | 'classic';
  classicMin?: number;
  classicMax?: number;
  classicNoRepeat?: boolean;
  classicDrawnNumbers?: number[];
  isOpenRoom?: boolean;
}
