import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Room, Participant, Prize } from "./src/types";

const app = express();
const PORT = 3000;

// In-memory room storage
const rooms: Record<string, Room> = {};

app.use(express.json());

// API: Health probe
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API: Create new room
app.post("/api/rooms", (req, res) => {
  const { roomName, creatorId } = req.body;
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
  };

  rooms[roomId] = newRoom;
  res.status(201).json(newRoom);
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

// API: Join a room
app.post("/api/rooms/:roomId/join", (req, res) => {
  const { roomId } = req.params;
  const { name, playerId } = req.body;
  
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
  const { name } = req.body;

  if (!name || name.trim() === "") {
    res.status(400).json({ error: "O nome do prêmio é obrigatório." });
    return;
  }

  const room = rooms[roomId.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: "Sala de sorteio não encontrada." });
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

  const room = rooms[roomId.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: "Sala de sorteio não encontrada." });
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

  if (room.participants.length === 0) {
    res.status(400).json({ error: "Ainda não existem participantes nesta sala para o sorteio." });
    return;
  }

  const prizeIndex = room.prizes.findIndex((p) => p.id === prizeId);
  if (prizeIndex === -1) {
    res.status(400).json({ error: "Prêmio não encontrado." });
    return;
  }

  // Filter participants who haven't won a prize yet (excluding current prize under redraw)
  const educatorsWhoWon = room.prizes.filter(p => p.id !== prizeId && p.winner).map(p => p.winner!.id);
  let availableParticipants = room.participants.filter(p => !educatorsWhoWon.includes(p.id));

  // Fallback: If everyone won once, draw from everyone so nobody is excluded
  if (availableParticipants.length === 0) {
    availableParticipants = room.participants;
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
  };

  rooms[roomId] = newRoom;
  res.status(201).json(newRoom);
});

// API: Admin: Delete any room
app.post("/api/admin/rooms/delete", (req, res) => {
  const { password, roomId } = req.body;
  if (password !== "7777") {
    res.status(403).json({ error: "Senha mestre inválida." });
    return;
  }

  const targetId = (roomId || "").toUpperCase();
  if (!rooms[targetId]) {
    res.status(404).json({ error: "Sala não encontrada." });
    return;
  }

  delete rooms[targetId];
  res.json({ success: true, message: `Sala ${targetId} excluída com sucesso.` });
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
