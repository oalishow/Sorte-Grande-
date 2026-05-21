import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { Room, Participant, Prize } from "./src/types";

const app = express();
const PORT = 3000;

// Persistent Database helper
const DB_FILE = path.join(process.cwd(), "rooms_db.json");

let rooms: Record<string, Room> = {};
let deletedRooms: Record<string, Room & { deletedAt: number }> = {};

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const dbContent = fs.readFileSync(DB_FILE, "utf-8");
      if (dbContent.trim()) {
        const parsed = JSON.parse(dbContent);
        rooms = parsed.rooms || {};
        deletedRooms = parsed.deletedRooms || {};
        console.log(`[Database] Carregou ${Object.keys(rooms).length} salas e ${Object.keys(deletedRooms).length} salas na lixeira.`);
      }
    } else {
      rooms = {};
      deletedRooms = {};
      saveDB();
    }
  } catch (err) {
    console.error("[Database] Erro ao carregar arquivo de persistência:", err);
    rooms = {};
    deletedRooms = {};
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify({ rooms, deletedRooms }, null, 2), "utf-8");
  } catch (err) {
    console.error("[Database] Erro ao gravar banco de dados de persistência:", err);
  }
}

// Initialize persistence
loadDB();

// Setup CORS to allow cross-origin requests from netlify and localhost
app.use(cors({
  origin: '*'
}));

app.use(express.json());

// Auto-persist middleware for successful mutations
app.use((req, res, next) => {
  res.on("finish", () => {
    if (["POST", "PUT", "DELETE"].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
      saveDB();
    }
  });
  next();
});

// API: Health probe
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API: Create new room
app.post("/api/rooms", (req, res) => {
  const { roomName, creatorId, isOpenRoom } = req.body;
  if (!roomName) {
    res.status(400).json({ error: "O nome da sala é obrigatório." });
    return;
  }
  if (!creatorId) {
    res.status(400).json({ error: "ID do criador é obrigatório." });
    return;
  }

  // Generate a random 6-character room ID (e.g. SR62A1)
  const generateRoomId = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  let roomId = generateRoomId();
  // Ensure uniqueness
  while (rooms[roomId]) {
    roomId = generateRoomId();
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

  rooms[roomId] = newRoom;
  res.status(201).json(newRoom);
});

// API: List open rooms publicly
app.get("/api/open-rooms", (req, res) => {
  const openRoomsList = Object.values(rooms)
    .filter((r) => r.isOpenRoom === true)
    .map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      participantsCount: r.participants.length,
      prizesCount: r.prizes.length,
    }));
  res.json({ rooms: openRoomsList });
});

// API: Get room status
app.get("/api/rooms/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = rooms[roomId.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: "Sua sala de sorteio não foi encontrada." });
    return;
  }
  res.json(room);
});

// API: Update room configuration/settings or reset classic draws
app.post("/api/rooms/:roomId/settings", (req, res) => {
  const { roomId } = req.params;
  const { drawMode, classicMin, classicMax, classicNoRepeat, qrcodeNoRepeat, clearHistory, isOpenRoom } = req.body;

  const room = rooms[roomId.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: "Sala de sorteio não encontrada." });
    return;
  }

  if (drawMode !== undefined) {
    room.drawMode = drawMode;
  }
  if (isOpenRoom !== undefined) {
    room.isOpenRoom = !!isOpenRoom;
  }
  if (qrcodeNoRepeat !== undefined) {
    room.qrcodeNoRepeat = !!qrcodeNoRepeat;
  }
  if (classicMin !== undefined) {
    room.classicMin = Number(classicMin) !== undefined ? Number(classicMin) : 1;
  }
  if (classicMax !== undefined) {
    room.classicMax = Number(classicMax) !== undefined ? Number(classicMax) : 100;
  }
  if (classicNoRepeat !== undefined) {
    room.classicNoRepeat = !!classicNoRepeat;
  }
  if (clearHistory) {
    room.classicDrawnNumbers = [];
    room.drawHistory = [];
    room.prizes.forEach(p => {
      p.winner = null;
      p.drawnAt = null;
    });
    room.status = "waiting";
    room.activePrizeId = null;
    room.currentWinner = null;
    room.currentWinningNumber = null;
    room.drawingStartedAt = null;
  }

  res.json(room);
});


// API: Join a room
app.post("/api/rooms/:roomId/join", (req, res) => {
  const { roomId } = req.params;
  const { name, playerId, requesterPlayerId, masterPassword } = req.body;
  
  if (!name || name.trim() === "") {
    res.status(400).json({ error: "O nome do participante é obrigatório." });
    return;
  }
  if (!playerId) {
    res.status(400).json({ error: "ID do jogador é obrigatório." });
    return;
  }

  const room = rooms[roomId.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: "Sala de sorteio não encontrada." });
    return;
  }

  // Check permission if adding someone else (manual entry from admin panel)
  const isAddingManual = playerId.startsWith("manual_") || (requesterPlayerId && requesterPlayerId !== playerId);
  if (isAddingManual) {
    const isCreator = requesterPlayerId && requesterPlayerId === room.creatorId;
    const isMaster = masterPassword === "7777";
    if (!isCreator && !isMaster) {
      res.status(403).json({ error: "Apenas o criador da sala ou o administrador mestre pode adicionar outros participantes." });
      return;
    }
  }

  // Check if player is already in this room
  const existingParticipant = room.participants.find((p) => p.id === playerId);
  if (existingParticipant) {
    res.json(existingParticipant);
    return;
  }

  // Calculate ticket number sequentially starting at 101 for nice 3-digit spinner
  const nextTicketNumber = 101 + room.participants.length;

  const newParticipant: Participant = {
    id: playerId,
    name: name.trim(),
    ticketNumber: nextTicketNumber,
    joinedAt: Date.now(),
  };

  room.participants.push(newParticipant);
  res.status(201).json(newParticipant);
});

// API: Add a prize to the room
app.post("/api/rooms/:roomId/prizes", (req, res) => {
  const { roomId } = req.params;
  const { name, playerId, masterPassword } = req.body;

  if (!name || name.trim() === "") {
    res.status(400).json({ error: "O nome do prêmio é obrigatório." });
    return;
  }

  const room = rooms[roomId.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: "Sala de sorteio não encontrada." });
    return;
  }

  // Only the creator or master administrator can create prizes
  const isCreator = playerId && playerId === room.creatorId;
  const isMaster = masterPassword === "7777";
  if (!isCreator && !isMaster) {
    res.status(403).json({ error: "Apenas o criador da sala ou o administrador mestre pode gerenciar prêmios." });
    return;
  }

  const newPrize: Prize = {
    id: `prize_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: name.trim(),
    winner: null,
    drawnAt: null,
  };

  room.prizes.push(newPrize);
  res.status(201).json(newPrize);
});

// API: Delete a prize
app.delete("/api/rooms/:roomId/prizes/:prizeId", (req, res) => {
  const { roomId, prizeId } = req.params;
  const playerId = (req.query.playerId as string) || req.body.playerId;
  const masterPassword = (req.query.masterPassword as string) || req.body.masterPassword;

  const room = rooms[roomId.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: "Sala de sorteio não encontrada." });
    return;
  }

  // Only the creator or master administrator can delete prizes
  const isCreator = playerId && playerId === room.creatorId;
  const isMaster = masterPassword === "7777";
  if (!isCreator && !isMaster) {
    res.status(403).json({ error: "Apenas o criador da sala ou o administrador mestre pode gerenciar prêmios." });
    return;
  }

  const prizeIndex = room.prizes.findIndex((p) => p.id === prizeId);
  if (prizeIndex === -1) {
    res.status(404).json({ error: "Prêmio não encontrado." });
    return;
  }

  if (room.prizes[prizeIndex].winner) {
    res.status(400).json({ error: "Não é possível apagar um prêmio já sorteado." });
    return;
  }

  room.prizes.splice(prizeIndex, 1);
  res.json({ success: true, message: "Prêmio removido com sucesso." });
});

// API: Draw a winner for a prize
app.post("/api/rooms/:roomId/draw", (req, res) => {
  const { roomId } = req.params;
  const { prizeId } = req.body;

  const room = rooms[roomId.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: "Sala de sorteio não encontrada." });
    return;
  }

  const isClassicMode = room.drawMode === "classic";

  if (isClassicMode) {
    const min = room.classicMin !== undefined ? room.classicMin : 1;
    const max = room.classicMax !== undefined ? room.classicMax : 100;

    if (max < min) {
      res.status(400).json({ error: "O número máximo não pode ser menor do que o mínimo." });
      return;
    }

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
        res.status(400).json({ error: "Todos os números deste intervalo já foram sorteados!" });
        return;
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

    if (!room.classicDrawnNumbers) {
      room.classicDrawnNumbers = [];
    }
    if (!room.classicDrawnNumbers.includes(winnerNum)) {
      room.classicDrawnNumbers.push(winnerNum);
    }

    if (prizeId === "quick_draw") {
      room.status = "drawing";
      room.activePrizeId = "quick_draw";
      room.currentWinner = winner;
      room.currentWinningNumber = winnerNum;
      room.drawingStartedAt = Date.now();
    } else {
      const prizeIndex = room.prizes.findIndex((p) => p.id === prizeId);
      if (prizeIndex === -1) {
        res.status(400).json({ error: "Prêmio não encontrado." });
        return;
      }
      room.prizes[prizeIndex].winner = winner;
      room.prizes[prizeIndex].drawnAt = Date.now();

      room.status = "drawing";
      room.activePrizeId = prizeId;
      room.currentWinner = winner;
      room.currentWinningNumber = winnerNum;
      room.drawingStartedAt = Date.now();
    }

    let pName = "Sorteio Rápido 🎲";
    if (prizeId !== "quick_draw") {
      const pIdx = room.prizes.findIndex((p) => p.id === prizeId);
      if (pIdx !== -1) {
        pName = room.prizes[pIdx].name;
      }
    }
    const historyEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      prizeName: pName,
      winnerName: winner.name,
      ticketNumber: winner.ticketNumber,
      drawMode: "classic" as const,
      drawnAt: Date.now(),
    };
    if (!room.drawHistory) room.drawHistory = [];
    room.drawHistory.push(historyEntry);

    res.json(room);
    return;
  }

  // QR Code / Online Lobby Mode
  if (room.participants.length === 0) {
    res.status(400).json({ error: "Ainda não existem participantes nesta sala para o sorteio." });
    return;
  }

  const prizeIndex = room.prizes.findIndex((p) => p.id === prizeId);
  if (prizeIndex === -1) {
    res.status(400).json({ error: "Prêmio não encontrado." });
    return;
  }

  // Filter participants who haven't won a prize yet (if qrcodeNoRepeat is true)
  let availableParticipants = room.participants;
  if (room.qrcodeNoRepeat !== false) {
    const educatorsWhoWon = room.prizes.filter(p => p.id !== prizeId && p.winner).map(p => p.winner!.id);
    availableParticipants = room.participants.filter(p => !educatorsWhoWon.includes(p.id));
  
    // Fallback: If everyone won once, draw from everyone so nobody is excluded
    if (availableParticipants.length === 0) {
      availableParticipants = room.participants;
    }
  }

  const winner = availableParticipants[Math.floor(Math.random() * availableParticipants.length)];

  // Update original prize model with winner and draw date
  room.prizes[prizeIndex].winner = winner;
  room.prizes[prizeIndex].drawnAt = Date.now();

  // Set drawing state for real-time synchronization
  room.status = "drawing";
  room.activePrizeId = prizeId;
  room.currentWinner = winner;
  room.currentWinningNumber = winner.ticketNumber;
  room.drawingStartedAt = Date.now();

  const historyEntry = {
    id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    prizeName: room.prizes[prizeIndex].name,
    winnerName: winner.name,
    ticketNumber: winner.ticketNumber,
    drawMode: "qrcode" as const,
    drawnAt: Date.now(),
  };
  if (!room.drawHistory) room.drawHistory = [];
  room.drawHistory.push(historyEntry);

  res.json(room);
});

// API: Reset room state back to waiting (Done with draw/Return to lobby)
app.post("/api/rooms/:roomId/reset", (req, res) => {
  const { roomId } = req.params;
  const room = rooms[roomId.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: "Sala de sorteio não encontrada." });
    return;
  }

  room.status = "waiting";
  room.activePrizeId = null;
  room.currentWinner = null;
  room.currentWinningNumber = null;
  room.drawingStartedAt = null;

  res.json(room);
});

// API: Finish a room (Close/End raffle)
app.post("/api/rooms/:roomId/finish", (req, res) => {
  const { roomId } = req.params;
  const { playerId, masterPassword } = req.body;
  const room = rooms[roomId.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: "Sala de sorteio não encontrada." });
    return;
  }
  const isCreator = playerId && playerId === room.creatorId;
  const isMaster = masterPassword === "7777";
  if (!isCreator && !isMaster) {
    res.status(403).json({ error: "Apenas o criador da sala ou o administrador mestre pode encerrar o sorteio." });
    return;
  }
  room.status = "finished";
  room.activePrizeId = null;
  room.currentWinner = null;
  room.currentWinningNumber = null;
  room.drawingStartedAt = null;
  res.json(room);
});

// API: Reopen a finished room
app.post("/api/rooms/:roomId/reopen", (req, res) => {
  const { roomId } = req.params;
  const { playerId, masterPassword } = req.body;
  const room = rooms[roomId.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: "Sala de sorteio não encontrada." });
    return;
  }
  const isCreator = playerId && playerId === room.creatorId;
  const isMaster = masterPassword === "7777";
  if (!isCreator && !isMaster) {
    res.status(403).json({ error: "Apenas o criador da sala ou o administrador mestre pode reabrir o sorteio." });
    return;
  }
  room.status = "waiting";
  room.activePrizeId = null;
  room.currentWinner = null;
  room.currentWinningNumber = null;
  room.drawingStartedAt = null;
  res.json(room);
});

// API: Admin: List all active rooms (Requires master password 7777)
app.post("/api/admin/rooms", (req, res) => {
  const { password } = req.body;
  if (password !== "7777") {
    res.status(403).json({ error: "Senha mestre inválida." });
    return;
  }
  res.json({ rooms: Object.values(rooms) });
});

// API: Admin: Create a pre-configured room in "Test Mode"
app.post("/api/admin/rooms/create-test", (req, res) => {
  const { password, roomName, creatorId } = req.body;
  if (password !== "7777") {
    res.status(403).json({ error: "Senha mestre inválida." });
    return;
  }

  const generateRoomId = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  let roomId = generateRoomId();
  while (rooms[roomId]) {
    roomId = generateRoomId();
  }

  const mockParticipants: Participant[] = [
    { id: "p_1", name: "Ricardo Costa 🧪", ticketNumber: 101, joinedAt: Date.now() - 50000 },
    { id: "p_2", name: "Ana Luiza 🌸", ticketNumber: 102, joinedAt: Date.now() - 45000 },
    { id: "p_3", name: "Marcos Tulio 🖥️", ticketNumber: 103, joinedAt: Date.now() - 40000 },
    { id: "p_4", name: "Fabio Silva 🎩", ticketNumber: 104, joinedAt: Date.now() - 35000 },
    { id: "p_5", name: "Carolina Souza ✨", ticketNumber: 105, joinedAt: Date.now() - 30000 },
    { id: "p_6", name: "Rafael Santos 🚀", ticketNumber: 106, joinedAt: Date.now() - 25000 },
    { id: "p_7", name: "Beatriz M. 🎨", ticketNumber: 107, joinedAt: Date.now() - 20000 },
    { id: "p_8", name: "Thiago Rocha ⚡", ticketNumber: 108, joinedAt: Date.now() - 15000 },
  ];

  const mockPrizes: Prize[] = [
    { id: "m_prize_1", name: "MacBook Pro M3 Max 💻", winner: null, drawnAt: null },
    { id: "m_prize_2", name: "iPhone 15 Pro Max 📱", winner: null, drawnAt: null },
    { id: "m_prize_3", name: "PlayStation 5 Slim 🎮", winner: null, drawnAt: null },
    { id: "m_prize_4", name: "Copo Stanley VIP 🥤", winner: null, drawnAt: null },
    { id: "m_prize_5", name: "Caixa de Trufas Gourmet 🍫", winner: null, drawnAt: null },
  ];

  const newRoom: Room = {
    id: roomId,
    name: roomName || "Sorteio de Teste Completo",
    creatorId: creatorId || "admin_test",
    participants: mockParticipants,
    prizes: mockPrizes,
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
  };

  rooms[roomId] = newRoom;
  res.status(201).json(newRoom);
});

// API: Admin: Delete any room (move to trash)
app.post("/api/admin/rooms/delete", (req, res) => {
  const { password, roomId } = req.body;
  if (password !== "7777") {
    res.status(403).json({ error: "Senha mestre inválida." });
    return;
  }

  const targetId = (roomId || "").toUpperCase();
  const room = rooms[targetId];
  if (!room) {
    res.status(404).json({ error: "Sala não encontrada." });
    return;
  }

  // Check if room has prizes and any prize has a null winner (meaning some prizes are not drawn yet)
  const hasUndrawnPrizes = room.prizes && room.prizes.length > 0 && room.prizes.some(p => p.winner === null);
  if (hasUndrawnPrizes) {
    res.status(400).json({ error: "Não é possível enviar esta sala para a lixeira enquanto houver prêmios pendentes de sorteio. Realize todos os sorteios primeiro!" });
    return;
  }

  // Move to trash
  const trashedRoom = {
    ...room,
    deletedAt: Date.now()
  };
  deletedRooms[targetId] = trashedRoom;
  delete rooms[targetId];

  res.json({ success: true, message: `Sala ${targetId} enviada para a lixeira com sucesso.` });
});

// API: Admin: Get trashed rooms list
app.post("/api/admin/rooms/trash", (req, res) => {
  const { password } = req.body;
  if (password !== "7777") {
    res.status(403).json({ error: "Senha mestre inválida." });
    return;
  }
  const trashList = Object.values(deletedRooms).sort((a, b) => b.deletedAt - a.deletedAt);
  res.json({ rooms: trashList });
});

// API: Admin: Restore room from trash
app.post("/api/admin/rooms/restore", (req, res) => {
  const { password, roomId } = req.body;
  if (password !== "7777") {
    res.status(403).json({ error: "Senha mestre inválida." });
    return;
  }

  const targetId = (roomId || "").toUpperCase();
  const room = deletedRooms[targetId];
  if (!room) {
    res.status(404).json({ error: "Sala não encontrada na lixeira." });
    return;
  }

  // Restore to active list
  const { deletedAt, ...restoredRoom } = room;
  rooms[targetId] = restoredRoom;
  delete deletedRooms[targetId];

  res.json({ success: true, message: `Sala ${targetId} restaurada de volta às salas ativas.` });
});

// API: Admin: Delete room permanently
app.post("/api/admin/rooms/delete-permanently", (req, res) => {
  const { password, roomId } = req.body;
  if (password !== "7777") {
    res.status(403).json({ error: "Senha mestre inválida." });
    return;
  }

  const targetId = (roomId || "").toUpperCase();
  if (!deletedRooms[targetId]) {
    res.status(404).json({ error: "Sala não encontrada na lixeira de exclusões." });
    return;
  }

  delete deletedRooms[targetId];
  res.json({ success: true, message: `Sala ${targetId} foi excluída permanentemente com sucesso.` });
});

// API: Admin: Empty trash
app.post("/api/admin/rooms/empty-trash", (req, res) => {
  const { password } = req.body;
  if (password !== "7777") {
    res.status(403).json({ error: "Senha mestre inválida." });
    return;
  }

  for (const tid in deletedRooms) {
    delete deletedRooms[tid];
  }

  res.json({ success: true, message: "Lixeira foi esvaziada por completo." });
});

// Vite + Static Serving Pipeline
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
