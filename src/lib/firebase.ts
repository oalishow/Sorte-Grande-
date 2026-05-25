import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, doc, getDoc, setDoc, updateDoc, 
  deleteDoc, collection, getDocs, onSnapshot, 
  writeBatch, query, where, orderBy, limit,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Room, Participant, Prize, DrawHistoryEntry } from '../types';

const app = initializeApp(firebaseConfig);

// Live binding export let for dynamic self-healing fallback
export let db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false // More robust for sandbox iframes and restrictive proxies
} as any, firebaseConfig.firestoreDatabaseId || undefined);

// Self-healing database connection test
async function verifyDatabaseConnection() {
  const customDbId = firebaseConfig.firestoreDatabaseId;
  if (!customDbId) return;
  
  try {
    // Attempt a fast, server-only document fetch on dummy path to test connection and database existence
    await getDocFromServer(doc(db, '_connection_test_', 'check'));
    console.log(`[Firestore] Connected to database: ${customDbId}`);
  } catch (err: any) {
    const errorStr = String(err?.message || err).toLowerCase();
    
    // Fall back to the default database if custom is missing or throws permissions/not-found/invalid/resource errors
    if (
      errorStr.includes("not found") || 
      errorStr.includes("not_found") || 
      errorStr.includes("does not exist") || 
      errorStr.includes("invalid") ||
      errorStr.includes("failed to get document") ||
      errorStr.includes("permission-denied") ||
      errorStr.includes("insufficient permissions")
    ) {
      console.warn(`[Firestore] Custom database '${customDbId}' connection failed. Falling back to (default) database. Query error:`, errorStr);
      try {
        db = initializeFirestore(app, {
          experimentalForceLongPolling: true,
          useFetchStreams: false
        } as any);
        console.log("[Firestore] Switched to (default) database successfully.");
      } catch (fallbackErr) {
        console.error("[Firestore] Sorteio fallback initialization failed:", fallbackErr);
      }
    }
  }
}

verifyDatabaseConnection();

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
    ticketStartNumber: 100,
    requirePhone: false,
    requireCpf: false,
    allowMultipleTickets: false,
    ticketAssignmentMode: "consecutive",
    drawHistory: [],
    removedParticipantIds: [],
  };

  try {
    const docRef = doc(db, 'rooms', roomId);
    await setDoc(docRef, newRoom);
    return newRoom;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${roomId}`);
  }
}

export async function firebaseCreateTestRoom(roomName: string): Promise<Room> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let roomId = "";
  for (let i = 0; i < 6; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const fakeNames = [
    "Ana Souza",
    "Bruno Lima",
    "Carla Diaz",
    "Daniel Rocha",
    "Eduarda Melo",
    "Felipe Santos",
    "Gabriela Abreu",
    "Hugo Oliveira"
  ];

  const participants: Participant[] = fakeNames.map((name, idx) => ({
    id: `fake_participant_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    ticketNumber: 100 + idx,
    joinedAt: Date.now() - (10 - idx) * 1000,
    phone: `(11) 99999-000${idx}`,
    cpf: `123.456.789-0${idx}`
  }));

  const fakePrizes = [
    "Kit Caneca e Chocolate 🍫☕",
    "Garrafa Térmica Premium 🥤",
    "Fone de Ouvido Bluetooth 🎧",
    "Carregador Portátil Rápido 🔋",
    "Caixa de Som Inteligente 🔊"
  ];

  const prizes: Prize[] = fakePrizes.map((name, idx) => ({
    id: `prize_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    winner: null,
    drawnAt: null
  }));

  const newRoom: Room = {
    id: roomId,
    name: roomName,
    creatorId: "master_test_id",
    participants,
    prizes,
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
    isOpenRoom: true,
    ticketStartNumber: 100,
    requirePhone: false,
    requireCpf: false,
    allowMultipleTickets: false,
    ticketAssignmentMode: "consecutive",
    drawHistory: [],
    removedParticipantIds: [],
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

export async function firebaseJoinRoom(
  roomId: string, 
  name: string, 
  playerId: string,
  phone?: string,
  cpf?: string
): Promise<Participant> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Sala de sorteio não encontrada.");
    }
    const room = snap.data() as Room;

    if (room.removedParticipantIds && room.removedParticipantIds.includes(playerId)) {
      throw new Error("Você foi removido desta sala pelo administrador e não pode reentrar.");
    }

    const allowMultiple = room.allowMultipleTickets === true;

    if (!allowMultiple) {
      if (room.requireCpf && cpf) {
        const cleanedCpf = cpf.replace(/\D/g, "");
        const cpfExists = room.participants.some(
          p => p.cpf && p.cpf.replace(/\D/g, "") === cleanedCpf && p.id !== playerId
        );
        if (cpfExists) {
          throw new Error("Este CPF já está cadastrado nesta sala.");
        }
      }
      if (room.requirePhone && phone) {
        const cleanedPhone = phone.replace(/\D/g, "");
        const phoneExists = room.participants.some(
          p => p.phone && p.phone.replace(/\D/g, "") === cleanedPhone && p.id !== playerId
        );
        if (phoneExists) {
          throw new Error("Este telefone já está cadastrado nesta sala.");
        }
      }

      const existingParticipant = room.participants.find((p) => p.id === playerId);
      if (existingParticipant) {
        return existingParticipant;
      }
    }

    // Determine Ticket Number
    let nextTicketNumber: number;
    if (room.ticketAssignmentMode === 'random') {
      const start = room.ticketStartNumber ?? 100;
      const end = 999;
      const usedTickets = new Set(room.participants.map(p => p.ticketNumber));
      const availableTickets: number[] = [];
      for (let i = start; i <= end; i++) {
        if (!usedTickets.has(i)) {
          availableTickets.push(i);
        }
      }
      if (availableTickets.length === 0) {
        throw new Error(`Não há números de bilhete livres na faixa de ${start} a 999.`);
      }
      const randIdx = Math.floor(Math.random() * availableTickets.length);
      nextTicketNumber = availableTickets[randIdx];
    } else {
      nextTicketNumber = (room.ticketStartNumber ?? 100) + room.participants.length;
      if (nextTicketNumber > 999) {
        throw new Error("Limite de bilhetes (999) atingido para esta faixa.");
      }
    }

    const newParticipant: Participant = {
      id: playerId,
      name: name.trim(),
      ticketNumber: nextTicketNumber,
      joinedAt: Date.now(),
      ...(phone ? { phone: phone.trim() } : {}),
      ...(cpf ? { cpf: cpf.trim() } : {})
    };

    const updatedParticipants = [...room.participants, newParticipant];
    await updateDoc(docRef, { participants: updatedParticipants });
    return newParticipant;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${upperCode}`);
    throw err;
  }
}

export async function firebaseRemoveParticipant(roomId: string, participantId: string): Promise<Room> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Sala não encontrada.");
    }
    const room = snap.data() as Room;

    const updatedParticipants = room.participants.filter(p => p.id !== participantId);
    const removedParticipantIds = room.removedParticipantIds || [];
    if (!removedParticipantIds.includes(participantId)) {
      removedParticipantIds.push(participantId);
    }

    await updateDoc(docRef, {
      participants: updatedParticipants,
      removedParticipantIds
    });

    return {
      ...room,
      participants: updatedParticipants,
      removedParticipantIds
    };
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

    let startTicket = (room.ticketStartNumber ?? 100) + room.participants.length;
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
    if (updates.ticketStartNumber !== undefined) updatedFields.ticketStartNumber = Number(updates.ticketStartNumber);
    if (updates.requirePhone !== undefined) updatedFields.requirePhone = updates.requirePhone;
    if (updates.requireCpf !== undefined) updatedFields.requireCpf = updates.requireCpf;
    if (updates.allowMultipleTickets !== undefined) updatedFields.allowMultipleTickets = updates.allowMultipleTickets;
    if (updates.ticketAssignmentMode !== undefined) updatedFields.ticketAssignmentMode = updates.ticketAssignmentMode;
    
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

export async function firebaseStartCountdown(roomId: string, durationMs: number, prizeId: string): Promise<void> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Sala não encontrada.");
    
    await updateDoc(docRef, {
      countdownEndsAt: Date.now() + durationMs,
      countdownPrizeId: prizeId,
    });
  } catch (error) {
    console.error("Erro ao iniciar contagem regressiva:", error);
    throw error;
  }
}

export async function firebaseClearCountdown(roomId: string): Promise<void> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Sala não encontrada.");
    
    await updateDoc(docRef, {
      countdownEndsAt: null,
      countdownPrizeId: null,
    });
  } catch (error) {
    console.error("Erro ao cancelar contagem regressiva:", error);
    throw error;
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
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    return onSnapshot(q, (snap) => {
      const rooms: Room[] = [];
      snap.forEach(d => {
        const r = d.data() as Room;
        if (!r.deletedAt) rooms.push(r);
      });
      callback(rooms);
    }, (err) => {
      // Fallback if index not ready
      console.warn("Primary subscribe failed, attempting fallback:", err);
      const qAll = collection(db, 'rooms');
      return onSnapshot(qAll, (snap2) => {
        const rooms2: Room[] = [];
        snap2.forEach(d => {
          const r = d.data() as Room;
          if (!r.deletedAt) rooms2.push(r);
        });
        callback(rooms2.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      }, (fallbackErr) => {
        console.error("Fallback subscribe failed:", fallbackErr);
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
      console.warn("Primary trash subscribe failed, attempting fallback:", err);
      const qAll = collection(db, 'rooms');
      return onSnapshot(qAll, (snap2) => {
        const rooms2: Room[] = [];
        snap2.forEach(d => {
          const r = d.data() as Room;
          if (r.deletedAt) rooms2.push(r);
        });
        callback(rooms2);
      }, (fallbackErr) => {
        console.error("Fallback trash subscribe failed:", fallbackErr);
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
      where('isOpenRoom', '==', true)
    );
    return onSnapshot(q, (snap) => {
      const openRooms: Room[] = [];
      snap.forEach(d => {
        const r = d.data() as Room;
        if (!r.deletedAt) openRooms.push(r);
      });
      callback(openRooms);
    }, (err) => {
      // Fallback if index not ready
      console.warn("Primary open rooms subscribe failed, attempting fallback:", err);
      const qAll = collection(db, 'rooms');
      return onSnapshot(qAll, (snap2) => {
        const openRooms: Room[] = [];
        snap2.forEach(d => {
          const r = d.data() as Room;
          if (r.isOpenRoom && !r.deletedAt) openRooms.push(r);
        });
        callback(openRooms);
      }, (fallbackErr) => {
        console.error("Fallback open rooms subscribe failed:", fallbackErr);
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'rooms');
  }
}

export function firebaseSubscribeRoom(roomId: string, callback: (room: Room | null) => void, onError?: (err: any) => void) {
  const upperCode = roomId.trim().toUpperCase();
  const docRef = doc(db, 'rooms', upperCode);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as Room);
    } else {
      callback(null);
    }
  }, (err) => {
    if (onError) {
      onError(err);
    } else {
      handleFirestoreError(err, OperationType.GET, `rooms/${upperCode}`);
    }
  });
}

export async function firebaseSendChatMessage(
  roomId: string,
  senderId: string,
  senderName: string,
  text: string,
  isAdmin = false
): Promise<void> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Sala não encontrada.");
    const room = snap.data() as Room;

    if (!isAdmin && room.mutedUserIds?.includes(senderId)) {
      throw new Error("Você está silenciado(a) neste sorteio.");
    }

    const messages = room.messages || [];
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId,
      senderName,
      text: text.trim().substring(0, 250), // Cap length
      timestamp: Date.now(),
      isAdmin,
    };

    // Keep only last 65 messages
    const updatedMessages = [...messages, newMessage].slice(-65);
    await updateDoc(docRef, { messages: updatedMessages });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${upperCode}/messages`);
  }
}

export async function firebaseMuteUser(
  roomId: string,
  userIdToMute: string,
  shouldMute: boolean
): Promise<void> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Sala não encontrada.");
    const room = snap.data() as Room;

    let mutedUserIds = room.mutedUserIds || [];
    if (shouldMute) {
      if (!mutedUserIds.includes(userIdToMute)) {
        mutedUserIds = [...mutedUserIds, userIdToMute];
      }
    } else {
      mutedUserIds = mutedUserIds.filter(id => id !== userIdToMute);
    }

    await updateDoc(docRef, { mutedUserIds });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${upperCode}/mutedUserIds`);
  }
}

export async function firebaseRemoveUserMessages(
  roomId: string,
  userIdToRemove: string
): Promise<void> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Sala não encontrada.");
    const room = snap.data() as Room;

    const messages = room.messages || [];
    const updatedMessages = messages.filter(msg => msg.senderId !== userIdToRemove);

    await updateDoc(docRef, { messages: updatedMessages });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${upperCode}/messages`);
  }
}

export async function firebaseUpdateTypingStatus(
  roomId: string,
  userId: string,
  userName: string,
  isTyping: boolean
): Promise<void> {
  const upperCode = roomId.trim().toUpperCase();
  try {
    const docRef = doc(db, 'rooms', upperCode);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const room = snap.data() as Room;

    const typingUsers = { ...(room.typingUsers || {}) };

    if (isTyping) {
      typingUsers[userId] = {
        name: userName,
        timestamp: Date.now()
      };
    } else {
      delete typingUsers[userId];
    }

    // Clean up stale indicators (older than 10 seconds)
    const now = Date.now();
    Object.keys(typingUsers).forEach(uid => {
      if (now - typingUsers[uid].timestamp > 10000) {
        delete typingUsers[uid];
      }
    });

    await updateDoc(docRef, { typingUsers });
  } catch (err) {
    // Fail silently
    console.warn("Erro ao atualizar estado 'digitando...':", err);
  }
}
