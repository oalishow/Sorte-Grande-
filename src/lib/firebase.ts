import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, 
  deleteDoc, collection, getDocs, onSnapshot, 
  writeBatch, query, where, orderBy, limit
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Room, Participant, Prize, DrawHistoryEntry } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function firebaseCreateRoom(roomName: string, creatorId: string, isOpenRoom?: boolean): Promise<Room> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let roomId = "";
  for (let i = 0; i < 6; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const newRoom: Room = {
    id: roomId,
    name: roomName,
    creatorId,
    participants: [],
    prizes: [],
    status: "waiting",
    activePrizeId: null,
    currentWinner: null,
    currentWinningNumber: null,
    drawingStartedAt: null,
    createdAt: Date.now(),
    drawMode: "qrcode",
    classicMin: 1,
    classicMax: 100,
    classicNoRepeat: true,
    qrcodeNoRepeat: true,
    classicDrawnNumbers: [],
    isOpenRoom: !!isOpenRoom,
    drawHistory: [],
  };

  try {
    const docRef = doc(db, 'rooms', roomId);
    await setDoc(docRef, newRoom);
    return newRoom;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${roomId}`);
  }
}

export async function firebaseGetRoom(roomId: string): Promise<Room> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Sala não encontrada.");
    }
    return snap.data() as Room;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `rooms/${upperCode}`);
  }
}

export async function firebaseJoinRoom(roomId: string, name: string, playerId: string): Promise<Participant> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Sala de sorteio não encontrada.");
    }
    const room = snap.data() as Room;

    const existingParticipant = room.participants.find((p) => p.id === playerId);
    if (existingParticipant) {
      return existingParticipant;
    }

    const nextTicketNumber = 101 + room.participants.length;
    const newParticipant: Participant = {
      id: playerId,
      name: name.trim(),
      ticketNumber: nextTicketNumber,
      joinedAt: Date.now(),
    };

    const updatedParticipants = [...room.participants, newParticipant];
    await updateDoc(docRef, { participants: updatedParticipants });
    return newParticipant;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${upperCode}`);
  }
}

export async function firebaseImportParticipants(roomId: string, names: string[]): Promise<Participant[]> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Sala de sorteio não encontrada.");
    }
    const room = snap.data() as Room;

    let startTicket = 101 + room.participants.length;
    const newParticipants: Participant[] = [];

    names.forEach((name, idx) => {
      if (!name.trim()) return;
      const manualPlayerId = `manual_import_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
      newParticipants.push({
        id: manualPlayerId,
        name: name.trim(),
        ticketNumber: startTicket++,
        joinedAt: Date.now() + idx,
      });
    });

    if (newParticipants.length === 0) return [];

    const updatedParticipants = [...room.participants, ...newParticipants];
    await updateDoc(docRef, { participants: updatedParticipants });
    return newParticipants;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${upperCode}`);
    throw err;
  }
}

export async function firebaseAddPrize(roomId: string, name: string): Promise<Room> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Sala não encontrada.");
    const room = snap.data() as Room;

    const prizeId = `prize_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newPrize: Prize = {
      id: prizeId,
      name: name.trim(),
      winner: null,
      drawnAt: null,
    };

    const updatedPrizes = [...room.prizes, newPrize];
    await updateDoc(docRef, { prizes: updatedPrizes });
    return { ...room, prizes: updatedPrizes };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${upperCode}`);
  }
}

export async function firebaseRemovePrize(roomId: string, prizeId: string): Promise<Room> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Sala não encontrada.");
    const room = snap.data() as Room;

    const updatedPrizes = room.prizes.filter((p) => p.id !== prizeId);
    await updateDoc(docRef, { prizes: updatedPrizes });
    return { ...room, prizes: updatedPrizes };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${upperCode}`);
  }
}

export async function firebaseUpdateSettings(roomId: string, updates: Partial<Room>): Promise<Room> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Sala não encontrada.");
    const room = snap.data() as Room;

    const updatedFields: Partial<Room> = {};
    if (updates.drawMode !== undefined) updatedFields.drawMode = updates.drawMode;
    if (updates.classicMin !== undefined) updatedFields.classicMin = Number(updates.classicMin);
    if (updates.classicMax !== undefined) updatedFields.classicMax = Number(updates.classicMax);
    if (updates.classicNoRepeat !== undefined) updatedFields.classicNoRepeat = updates.classicNoRepeat;
    if (updates.qrcodeNoRepeat !== undefined) updatedFields.qrcodeNoRepeat = updates.qrcodeNoRepeat;
    if (updates.isOpenRoom !== undefined) updatedFields.isOpenRoom = updates.isOpenRoom;
    
    if ((updates as any).clearHistory) {
      updatedFields.classicDrawnNumbers = [];
      updatedFields.drawHistory = [];
      updatedFields.prizes = room.prizes.map(p => ({ ...p, winner: null, drawnAt: null }));
    }

    await updateDoc(docRef, updatedFields);
    return { ...room, ...updatedFields };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${upperCode}`);
  }
}

export async function firebaseDrawPrize(roomId: string, prizeId: string): Promise<Room> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Sala não encontrada.");
    const room = snap.data() as Room;

    const isClassicMode = room.drawMode === "classic";

    if (isClassicMode) {
      const min = room.classicMin !== undefined ? room.classicMin : 1;
      const max = room.classicMax !== undefined ? room.classicMax : 100;

      if (max < min) throw new Error("O número máximo não pode ser menor do que o mínimo.");

      let winnerNum: number;
      const noRepeat = room.classicNoRepeat !== false;

      if (noRepeat) {
        const reservedNumbers = new Set<number>();
        if (room.classicDrawnNumbers) {
          room.classicDrawnNumbers.forEach(n => reservedNumbers.add(n));
        }
        room.prizes.forEach(p => {
          if (p.id !== prizeId && p.winner) {
            reservedNumbers.add(p.winner.ticketNumber);
          }
        });

        const available: number[] = [];
        for (let i = min; i <= max; i++) {
          if (!reservedNumbers.has(i)) {
            available.push(i);
          }
        }

        if (available.length === 0) {
          throw new Error("Todos os números deste intervalo já foram sorteados!");
        }

        winnerNum = available[Math.floor(Math.random() * available.length)];
      } else {
        winnerNum = Math.floor(Math.random() * (max - min + 1)) + min;
      }

      const winner: Participant = {
        id: `classic_${winnerNum}`,
        name: `Número ${winnerNum}`,
        ticketNumber: winnerNum,
        joinedAt: Date.now()
      };

      const classicDrawnNumbers = room.classicDrawnNumbers || [];
      if (!classicDrawnNumbers.includes(winnerNum)) {
        classicDrawnNumbers.push(winnerNum);
      }

      const prizes = [...room.prizes];
      let pName = "Sorteio Rápido 🎲";

      if (prizeId !== "quick_draw") {
        const prizeIndex = prizes.findIndex((p) => p.id === prizeId);
        if (prizeIndex === -1) throw new Error("Prêmio não encontrado.");
        prizes[prizeIndex] = {
          ...prizes[prizeIndex],
          winner,
          drawnAt: Date.now()
        };
        pName = prizes[prizeIndex].name;
      }

      const historyEntry: DrawHistoryEntry = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        prizeName: pName,
        winnerName: winner.name,
        ticketNumber: winner.ticketNumber,
        drawMode: "classic",
        drawnAt: Date.now(),
      };

      const drawHistory = room.drawHistory || [];
      drawHistory.push(historyEntry);

      const updatedFields = {
        status: "drawing" as const,
        activePrizeId: prizeId,
        currentWinner: winner,
        currentWinningNumber: winnerNum,
        drawingStartedAt: Date.now(),
        classicDrawnNumbers,
        prizes,
        drawHistory
      };

      await updateDoc(docRef, updatedFields);
      return { ...room, ...updatedFields };
    }

    if (room.participants.length === 0) {
      throw new Error("Ainda não existem participantes nesta sala para o sorteio.");
    }

    const prizes = [...room.prizes];
    const prizeIndex = prizes.findIndex((p) => p.id === prizeId);
    if (prizeIndex === -1) throw new Error("Prêmio não encontrado.");

    let availableParticipants = room.participants;
    if (room.qrcodeNoRepeat !== false) {
      const educatorsWhoWon = prizes.filter(p => p.id !== prizeId && p.winner).map(p => p.winner!.id);
      availableParticipants = room.participants.filter(p => !educatorsWhoWon.includes(p.id));

      if (availableParticipants.length === 0) {
        availableParticipants = room.participants;
      }
    }

    const winner = availableParticipants[Math.floor(Math.random() * availableParticipants.length)];

    prizes[prizeIndex] = {
      ...prizes[prizeIndex],
      winner,
      drawnAt: Date.now()
    };

    const historyEntry: DrawHistoryEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      prizeName: prizes[prizeIndex].name,
      winnerName: winner.name,
      ticketNumber: winner.ticketNumber,
      drawMode: "qrcode",
      drawnAt: Date.now(),
    };

    const drawHistory = room.drawHistory || [];
    drawHistory.push(historyEntry);

    const updatedFields = {
      prizes,
      status: "drawing" as const,
      activePrizeId: prizeId,
      currentWinner: winner,
      currentWinningNumber: winner.ticketNumber,
      drawingStartedAt: Date.now(),
      drawHistory
    };

    await updateDoc(docRef, updatedFields);
    return { ...room, ...updatedFields };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${upperCode}`);
  }
}

export async function firebaseResetDraw(roomId: string): Promise<Room> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const updatedFields = {
      status: "waiting" as const,
      activePrizeId: null,
      currentWinner: null,
      currentWinningNumber: null,
      drawingStartedAt: null,
    };
    await updateDoc(docRef, updatedFields);
    return await firebaseGetRoom(upperCode);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${upperCode}`);
  }
}

export async function firebaseFinishRoom(roomId: string): Promise<void> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    await updateDoc(docRef, { status: 'finished' });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${upperCode}`);
  }
}

export async function firebaseReopenRoom(roomId: string): Promise<void> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    await updateDoc(docRef, { status: 'waiting' });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${upperCode}`);
  }
}

export function firebaseSubscribeAllRooms(callback: (rooms: Room[]) => void) {
  try {
    const q = query(
      collection(db, 'rooms'),
      where('deletedAt', '==', null),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    return onSnapshot(q, (snap) => {
      const rooms: Room[] = [];
      snap.forEach(d => rooms.push(d.data() as Room));
      callback(rooms);
    }, (err) => {
      // Fallback if index not ready
      const qAll = collection(db, 'rooms');
      return onSnapshot(qAll, (snap2) => {
        const rooms2: Room[] = [];
        snap2.forEach(d => {
          const r = d.data() as Room;
          if (!r.deletedAt) rooms2.push(r);
        });
        callback(rooms2.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'rooms');
  }
}

export function firebaseSubscribeTrashedRooms(callback: (rooms: Room[]) => void) {
  try {
    const q = query(
      collection(db, 'rooms'),
      where('deletedAt', '>', 0),
      limit(50)
    );
    return onSnapshot(q, (snap) => {
      const rooms: Room[] = [];
      snap.forEach(d => rooms.push(d.data() as Room));
      callback(rooms);
    }, (err) => {
      const qAll = collection(db, 'rooms');
      return onSnapshot(qAll, (snap2) => {
        const rooms2: Room[] = [];
        snap2.forEach(d => {
          const r = d.data() as Room;
          if (r.deletedAt) rooms2.push(r);
        });
        callback(rooms2);
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'rooms');
  }
}

export async function firebaseTrashRoom(roomId: string): Promise<void> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    await updateDoc(docRef, { deletedAt: Date.now() });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${upperCode}`);
  }
}

export async function firebaseRestoreRoom(roomId: string): Promise<void> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const room = snap.data() as Room;
    const updated = { ...room };
    delete updated.deletedAt;
    await setDoc(docRef, updated);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${upperCode}`);
  }
}

export async function firebaseDeleteRoomPermanently(roomId: string): Promise<void> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `rooms/${upperCode}`);
  }
}

export async function firebaseEmptyTrash(): Promise<void> {
  try {
    const allSnap = await getDocs(collection(db, 'rooms'));
    const batch = writeBatch(db);
    let count = 0;
    allSnap.forEach(d => {
      const room = d.data() as Room;
      if (room.deletedAt) {
        batch.delete(d.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'rooms');
  }
}

export async function firebaseGetOpenRooms(): Promise<Room[]> {
  try {
    const allSnap = await getDocs(collection(db, 'rooms'));
    const openRooms: Room[] = [];
    allSnap.forEach(d => {
      const r = d.data() as Room;
      if (r.isOpenRoom && !r.deletedAt) {
        openRooms.push(r);
      }
    });
    return openRooms;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'rooms');
  }
}

export function firebaseSubscribeOpenRooms(callback: (rooms: Room[]) => void) {
  try {
    const q = query(
      collection(db, 'rooms'),
      where('isOpenRoom', '==', true),
      where('deletedAt', '==', null)
    );
    return onSnapshot(q, (snap) => {
      const openRooms: Room[] = [];
      snap.forEach(d => {
        openRooms.push(d.data() as Room);
      });
      callback(openRooms);
    }, (err) => {
      // Fallback if index not ready
      const qAll = collection(db, 'rooms');
      return onSnapshot(qAll, (snap2) => {
        const openRooms: Room[] = [];
        snap2.forEach(d => {
          const r = d.data() as Room;
          if (r.isOpenRoom && !r.deletedAt) openRooms.push(r);
        });
        callback(openRooms);
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'rooms');
  }
}

export function firebaseSubscribeRoom(roomId: string, callback: (room: Room | null) => void) {
  const upperCode = roomId.trim().toUpperCase();
  const docRef = doc(db, 'rooms', upperCode);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as Room);
    } else {
      callback(null);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, `rooms/${upperCode}`);
  });
}
