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

export interface DrawHistoryEntry {
  id: string;
  prizeName: string;
  winnerName: string;
  ticketNumber: number;
  drawMode: 'qrcode' | 'classic';
  drawnAt: number;
}

export interface Room {
  id: string;
  name: string;
  creatorId: string;
  participants: Participant[];
  prizes: Prize[];
  status: 'waiting' | 'drawing' | 'drawn' | 'finished';
  activePrizeId: string | null;
  currentWinner: Participant | null;
  currentWinningNumber: number | null;
  drawingStartedAt: number | null;
  createdAt: number;
  deletedAt?: number; // Optional timestamp when moved to trash
  drawMode?: 'qrcode' | 'classic';
  classicMin?: number;
  classicMax?: number;
  classicNoRepeat?: boolean;
  qrcodeNoRepeat?: boolean;
  classicDrawnNumbers?: number[];
  isOpenRoom?: boolean;
  drawHistory?: DrawHistoryEntry[];
}
