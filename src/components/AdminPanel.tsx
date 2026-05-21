import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Room, Prize, Participant } from "../types";
import { Gift, Users, Plus, Trash2, Copy, Check, Megaphone, ArrowLeft, RefreshCw, Sparkles, Ticket, Settings, Shield, Radio, Printer, Trophy } from "lucide-react";
import DrawAnimator from "./DrawAnimator";
import VouGanheiLogo from "./VouGanheiLogo";
import CustomModal from "./CustomModal";
import { firebaseUpdateSettings, firebaseJoinRoom } from "../lib/firebase";

interface AdminPanelProps {
  room: Room;
  playerId: string;
  onAddPrize: (prizeName: string) => Promise<void>;
  onRemovePrize: (prizeId: string) => Promise<void>;
  onDrawPrize: (prizeId: string) => Promise<void>;
  onResetDrawState: () => Promise<void>;
  onLeaveRoom: () => void;
  appUrl: string;
}

export default function AdminPanel({
  room,
  playerId,
  onAddPrize,
  onRemovePrize,
  onDrawPrize,
  onResetDrawState,
  onLeaveRoom,
  appUrl,
}: AdminPanelProps) {
  const [newPrizeName, setNewPrizeName] = useState("");
  const [copied, setCopied] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // New features state
  const [isQrExpanded, setIsQrExpanded] = useState(false);
  const [isEventFinished, setIsEventFinished] = useState(false);

  // Print results reporting tool
  const handlePrintResults = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor, permita popups para poder imprimir os resultados.");
      return;
    }
    const prizesHtml = room.prizes.map(p => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; font-size: 13px;">${p.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 13px;">
          ${p.winner ? `<span style="color: #2563eb; font-weight: bold;">${p.winner.name}</span>` : `<span style="color: #ef4444; font-style: italic;">Não sorteado</span>`}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 13px;">
          ${p.winner ? `#${p.winner.ticketNumber}` : '-'}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; color: #666;">
          ${p.drawnAt ? new Date(p.drawnAt).toLocaleString("pt-BR") : '-'}
        </td>
      </tr>
    `).join("");

    const historyHtml = room.drawHistory && room.drawHistory.length > 0 ? room.drawHistory.map(entry => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #666;">${new Date(entry.drawnAt).toLocaleTimeString("pt-BR")}</td>
        <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold; font-size: 12px;">${entry.prizeName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 12px;">${entry.winnerName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-family: monospace; font-size: 12px; font-weight: bold; color: #ef4444;">#${entry.ticketNumber}</td>
      </tr>
    `).join("") : '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #999; font-size: 13px;">Nenhum sorteio registrado</td></tr>';

    printWindow.document.write(`
      <html>
        <head>
          <title>Resultados do Sorteio - ${room.name}</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, Helvetica, sans-serif; margin: 40px; color: #1e293b; background: #fff; }
            h1 { margin-bottom: 5px; color: #1e3a8a; font-size: 26px; font-weight: 800; }
            h2 { color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 35px; font-size: 18px; font-weight: 700; }
            .meta { margin-bottom: 25px; font-size: 14px; color: #475569; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f8fafc; padding: 12px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; font-size: 13px; color: #64748b; }
            @media print {
              button { display: none !important; }
              body { margin: 20px; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px;">
            <div>
              <h1>Sorteio: ${room.name}</h1>
              <div class="meta">
                <strong>Código da Sala:</strong> #${room.id}<br/>
                <strong>Emitido em:</strong> ${new Date().toLocaleString("pt-BR")}<br/>
                <strong>Total de Participantes:</strong> ${room.participants?.length || 0}
              </div>
            </div>
            <button onclick="window.print()" style="padding: 12px 24px; background-color: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37,99,235,0.2);">Imprimir Relatório 🖨️</button>
          </div>

          <h2>Lista de Prêmios & Ganhadores</h2>
          <table>
            <thead>
              <tr>
                <th>Prêmio</th>
                <th>Ganhador</th>
                <th>Nº do Bilhete</th>
                <th>Horário do Sorteio</th>
              </tr>
            </thead>
            <tbody>
              ${prizesHtml}
            </tbody>
          </table>

          <h2>Linha do Tempo dos Sorteios (Histórico)</h2>
          <table>
            <thead>
              <tr>
                <th>Horário</th>
                <th>Prêmio</th>
                <th>Ganhador</th>
                <th>Bilhete</th>
              </tr>
            </thead>
            <tbody>
              ${historyHtml}
            </tbody>
          </table>

          <div style="margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dotted #cbd5e1; padding-top: 15px;">
            Gerado automaticamente por VouGanhei! Sorteador Técnico de Alta Performance.
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Check creator/master permission
  const isCreator = localStorage.getItem(`raffle_room_${room.id}_creator`) === "true" || playerId === room.creatorId;
  const isMaster = sessionStorage.getItem("master_password") === "7777";
  const hasPermission = isCreator || isMaster;

  // Custom Confirmation Modal details
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Classic mode states & updates handler
  const [minInput, setMinInput] = useState(String(room.classicMin ?? 1));
  const [maxInput, setMaxInput] = useState(String(room.classicMax ?? 100));

  React.useEffect(() => {
    setMinInput(String(room.classicMin ?? 1));
    setMaxInput(String(room.classicMax ?? 100));
  }, [room.classicMin, room.classicMax]);

  const handleUpdateSettings = async (updates: {
    drawMode?: 'qrcode' | 'classic';
    classicMin?: number;
    classicMax?: number;
    classicNoRepeat?: boolean;
    qrcodeNoRepeat?: boolean;
    clearHistory?: boolean;
    isOpenRoom?: boolean;
  }) => {
    try {
      await firebaseUpdateSettings(room.id, updates);
    } catch (err) {
      console.error("Erro ao salvar opções de sorteio clássico:", err);
    }
  };

  // States for manual participant additions
  const [manualName, setManualName] = useState("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualError, setManualError] = useState("");

  const handleAddManualParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    setIsSubmittingManual(true);
    setManualError("");
    try {
      const manualPlayerId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await firebaseJoinRoom(room.id, manualName.trim(), manualPlayerId);
      setManualName("");
    } catch (err: any) {
      setManualError(err.message || "Falha ao registrar participante.");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Derive join URL
  const joinUrl = `${appUrl}/room/${room.id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=0-0-0&bgcolor=255-255-255&qzone=2&data=${encodeURIComponent(
    joinUrl
  )}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddPrizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrizeName.trim()) return;
    setIsAdding(true);
    await onAddPrize(newPrizeName.trim());
    setNewPrizeName("");
    setIsAdding(false);
  };

  const activePrize = room.activePrizeId === "quick_draw"
    ? { id: "quick_draw", name: "Sorteio Rápido de Números 🎲", winner: room.currentWinner, drawnAt: Date.now() }
    : room.prizes.find((p) => p.id === room.activePrizeId);
  const isLastPrize = room.prizes.length > 0 && room.prizes.every((p) => p.winner !== null);
  const drawDuration = isLastPrize ? 11000 : 7050;

  const displayedDrawnNumbers = (room.classicDrawnNumbers || []).filter((num) => {
    if (room.status === "drawing" && room.currentWinningNumber !== null && num === room.currentWinningNumber) {
      return false;
    }
    return true;
  });

  const handleNextDrawRound = async () => {
    const currentActiveId = room.activePrizeId;
    await onResetDrawState();
    
    // Find first unsorted prize that is not currently drawing
    const nextPrize = room.prizes.find((p) => p.winner === null && p.id !== currentActiveId);
    if (nextPrize) {
      setTimeout(() => {
        onDrawPrize(nextPrize.id);
      }, 500);
    } else if (room.drawMode === "classic") {
      setTimeout(() => {
        onDrawPrize("quick_draw");
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E2E8F0] p-4 md:p-8 font-sans select-none relative overflow-x-hidden">
      {/* Background radial effects */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onLeaveRoom}
            className="p-2.5 bg-[#161920] border border-white/5 hover:border-white/10 hover:text-white rounded-xl transition-all cursor-pointer mr-2"
            title="Sair da Sala"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <VouGanheiLogo size="sm" />
          
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl md:text-3xl font-extrabold text-white tracking-tight">
                {room.name}
              </h2>
              <span className="px-2.5 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-md uppercase tracking-wider font-mono">
                Painel
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Código de Acesso: <span className="font-mono font-bold text-blue-450">{room.id}</span>
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 bg-[#161920] border border-white/5 hover:bg-opacity-80 hover:border-white/10 text-[#E2E8F0] font-semibold rounded-xl text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-blue-450 font-bold" />}
            {copied ? "Link Copiado!" : "Copiar Link"}
          </button>

          <button
            onClick={handlePrintResults}
            className="px-4 py-2 bg-[#161920] border border-white/5 hover:bg-opacity-80 hover:border-white/10 text-[#E2E8F0] font-semibold rounded-xl text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer"
            title="Imprimir boletim de resultados e ganhadores"
          >
            <Printer className="w-4 h-4 text-indigo-400 font-bold" />
            Imprimir 🖨️
          </button>

          <button
            onClick={() => setIsEventFinished(true)}
            className={`px-4 py-2 text-white font-extrabold rounded-xl text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer select-none ${
              isLastPrize 
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 shadow-lg shadow-emerald-500/20 animate-pulse border border-emerald-400/30" 
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
            title="Finalizar e mostrar tela final com ganhadores"
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            Finalizar Evento 🏁
          </button>

          <button
            onClick={onResetDrawState}
            disabled={room.status === "waiting"}
            className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 text-blue-400 font-semibold rounded-xl text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed uppercase font-mono tracking-wider"
          >
            <RefreshCw className="w-4 h-4" />
            Voltar para Lobby
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Active drawing stage layer */}
          {room.status === "drawing" && activePrize && room.currentWinner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <DrawAnimator
                winningNumber={room.currentWinningNumber || 0}
                winnerName={room.currentWinner.name}
                prizeName={activePrize.name}
                isAdmin={true}
                onResetDrawState={handleNextDrawRound}
                duration={drawDuration}
                onRedraw={() => onDrawPrize(activePrize.id)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode & Room Privacy Selector Container */}
        <div className="flex flex-wrap gap-4 items-center mb-6 select-none">
          <div className="flex bg-[#161920]/80 p-1 rounded-xl border border-white/5 w-fit shadow-md">
            <button
              onClick={() => handleUpdateSettings({ drawMode: "qrcode" })}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-sans tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
                room.drawMode !== "classic"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/15 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Sorteio Virtual (QR Code)
            </button>
            <button
              onClick={() => handleUpdateSettings({ drawMode: "classic" })}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-sans tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
                room.drawMode === "classic"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/15 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              Sorteio Clássico (Faixa de Números)
            </button>
          </div>

          <div className="flex bg-[#161920]/80 p-1 rounded-xl border border-white/5 w-fit shadow-md">
            <button
              onClick={() => handleUpdateSettings({ isOpenRoom: false })}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-sans tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
                !room.isOpenRoom
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/15 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Apenas usuários com o código direto de 6 dígitos podem entrar."
            >
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              Sala Fechada
            </button>
            <button
              onClick={() => handleUpdateSettings({ isOpenRoom: true })}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-sans tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
                room.isOpenRoom
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/15 font-bold animate-[pulse_3s_infinite]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="A sala ficará visível e listada na tela de todos os celulares conectados para entrada instantânea!"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Sala Aberta (Pública)
            </button>
          </div>
        </div>

        {/* Dashboard Bento grids - shown always or scaled */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {room.drawMode === "classic" ? (
            /* =========================================================
               CLASSIC DRAW COLUMN 1: Configuração de Faixa Sorteio Clássico
               ========================================================= */
            <div className="bg-[#161920] rounded-2xl p-6 border border-white/5 lg:col-span-4 shadow-xl flex flex-col justify-between h-[520px]">
              <div>
                <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-4 select-none">
                  <Settings className="w-5 h-5 text-amber-500" />
                  <h3 className="font-display font-bold text-white text-base md:text-lg">
                    Opções do Sorteio
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                      Número Mínimo (De)
                    </label>
                    <input
                      type="number"
                      value={minInput}
                      onChange={(e) => setMinInput(e.target.value)}
                      onBlur={() => handleUpdateSettings({ classicMin: Number(minInput) || 1 })}
                      className="w-full bg-[#0F1115] border border-white/10 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 outline-none transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                      Número Máximo (Até)
                    </label>
                    <input
                      type="number"
                      value={maxInput}
                      onChange={(e) => setMaxInput(e.target.value)}
                      onBlur={() => handleUpdateSettings({ classicMax: Number(maxInput) || 100 })}
                      className="w-full bg-[#0F1115] border border-white/10 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 outline-none transition-all font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 px-4 bg-[#0F1115]/50 border border-white/5 rounded-xl mt-4 select-none">
                    <div className="flex flex-col pr-2">
                      <span className="text-xs font-bold text-slate-200">Não Repetir Números</span>
                      <span className="text-[10px] text-slate-500 leading-normal mt-0.5">Impede empates</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!room.classicNoRepeat}
                      onChange={(e) => handleUpdateSettings({ classicNoRepeat: e.target.checked })}
                      className="w-4.5 h-4.5 bg-[#0F1115] border-white/10 rounded-md text-blue-600 focus:ring-1 focus:ring-blue-500 cursor-pointer scale-110"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-white/5 mt-6">
                <button
                  onClick={() => {
                    setConfirmResetOpen(true);
                  }}
                  className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 font-semibold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center uppercase font-mono tracking-wider border border-rose-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Reiniciar Sorteios
                </button>
              </div>
            </div>
          ) : (
            /* =========================================================
               STANDARD QR CODE COLUMN 1: QR Code Room Entrance Card
               ========================================================= */
            <div className="bg-[#161920] rounded-2xl p-6 border border-white/5 lg:col-span-4 shadow-xl flex flex-col items-center text-center h-[520px] justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#3b82f6] uppercase mb-4 py-1 px-3 bg-blue-500/10 border border-blue-500/20 rounded-full inline-flex items-center gap-1.5 animate-pulse font-mono">
                  <Megaphone className="w-3 h-3 text-blue-450" /> ESCANEIE PARA PARTICIPAR
                </span>

                {/* QR frame */}
                <div 
                  onClick={() => setIsQrExpanded(true)}
                  className="w-fit p-4 bg-white rounded-2xl shadow-xl shadow-slate-950/45 border-none mb-4 mx-auto select-none cursor-pointer group hover:scale-[1.03] active:scale-95 transition-all relative"
                  title="Clique para ampliar o QR Code"
                >
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-48 h-48 select-none"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                    <span className="bg-blue-600 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1">
                      Ampliar 🔍
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed font-sans mt-2">
                  Aponte a câmera do celular para este código para entrar na sala, colocar seu nome e obter seu bilhete premiado!
                </p>

                <button
                  onClick={() => setIsQrExpanded(true)}
                  className="mt-3.5 px-4 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/25 text-blue-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto"
                >
                  Ampliar QR Code 🔍
                </button>
              </div>

              {/* Opção para não repetir ganhadores no sorteio QRCode */}
              <div className="w-full mb-2">
                <div className="flex items-center justify-between p-2.5 px-3 bg-[#0F1115]/50 border border-white/5 rounded-xl select-none">
                  <div className="flex flex-col pr-2 text-left">
                    <span className="text-[11px] font-bold text-slate-200">Não Repetir Ganhador</span>
                    <span className="text-[9px] text-slate-500 leading-normal mt-0.5">Participante só ganha 1 prêmio</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={room.qrcodeNoRepeat !== false}
                    onChange={(e) => handleUpdateSettings({ qrcodeNoRepeat: e.target.checked })}
                    className="w-4 h-4 bg-[#0F1115] border-white/10 rounded text-blue-600 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="w-full mt-2 pt-4 border-t border-white/5 flex flex-col items-center shrink-0">
                <span className="text-[10px] font-semibold text-slate-550 uppercase tracking-widest block mb-2">
                  CÓDIGO MANUAL DA SALA
                </span>
                <div className="font-mono text-xl md:text-2xl font-black text-white bg-[#0F1115] px-4 py-2 rounded-xl border border-white/10 tracking-wider">
                  {room.id}
                </div>
              </div>
            </div>
          )}

          {room.drawMode === "classic" ? (
            /* =========================================================
               CLASSIC DRAW COLUMN 2: Histórico de Números Sorteados
               ========================================================= */
            <div className="bg-[#161920] rounded-2xl p-6 border border-white/5 lg:col-span-4 shadow-xl flex flex-col h-[520px]">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 select-none">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-amber-500" />
                  <h3 className="font-display font-bold text-white text-base md:text-lg">
                    Histórico ({displayedDrawnNumbers.length})
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/25 py-0.5 px-2 rounded-md font-mono">
                  Ativo
                </span>
              </div>

              {/* Quick instructions banner */}
              <div className="mb-4 text-slate-400 text-xs py-2 px-3 bg-[#0F1115]/50 border border-white/5 rounded-xl leading-normal font-sans shrink-0">
                Sorteando números aleatórios na faixa configurada. Cada prêmio terá o seu próprio número de bilhete correspondente!
              </div>

              {displayedDrawnNumbers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
                  <p className="text-slate-500 text-sm font-sans">
                    Nenhum número sorteado ainda.
                  </p>
                  <p className="text-[11px] text-slate-605 mt-1 max-w-[200px] leading-normal font-sans">
                    Arraste prêmios ou clique no Sorteio Rápido abaixo para começar!
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-4 gap-2">
                    {displayedDrawnNumbers.map((num, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-[#0F1115] border border-white/5 rounded-xl font-mono text-center relative flex flex-col items-center justify-center"
                      >
                        <span className="text-[9px] text-slate-500 font-bold block leading-none mb-1">
                          #{idx + 1}
                        </span>
                        <span className="text-sm font-black text-amber-500">
                          {num}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* =========================================================
               STANDARD COLUMN 2: Live Participants list with Ticket details
               ========================================================= */
            <div className="bg-[#161920] rounded-2xl p-6 border border-white/5 lg:col-span-4 shadow-xl flex flex-col h-[520px]">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 select-none">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-450" />
                  <h3 className="font-display font-bold text-white text-base md:text-lg">
                    Participantes ({room.participants.length})
                  </h3>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {/* Adicionar Participante Manual (Sem celular) */}
              {!hasPermission ? (
                <div className="mb-4 p-3 bg-red-500/5 rounded-xl border border-red-500/10 flex items-center gap-2 select-none shrink-0 text-left">
                  <Shield className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    Apenas o <strong className="text-slate-300 font-semibold">criador da sala</strong> ou <strong className="text-slate-300 font-semibold">administrador mestre</strong> pode cadastrar participantes de forma manual.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAddManualParticipant} className="mb-4 bg-[#0F1115]/60 p-2 rounded-xl border border-white/5 flex gap-2 items-center shrink-0">
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Cadastro Manual (Ex: Alison)..."
                    disabled={isSubmittingManual}
                    className="flex-1 min-w-0 bg-transparent text-xs text-slate-200 placeholder-slate-500 font-sans px-2.5 py-1.5 focus:outline-none border-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingManual || !manualName.trim()}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase font-sans tracking-wide transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed shrink-0 border border-blue-500/20"
                  >
                    {isSubmittingManual ? "Salvando..." : "Adicionar 👤"}
                  </button>
                </form>
              )}

              {manualError && (
                <span className="text-[10px] text-red-400 font-medium font-sans mb-3 px-2 block shrink-0 animate-pulse">
                  ⚠️ {manualError}
                </span>
              )}

              {room.participants.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
                  <p className="text-slate-500 text-sm font-sans">
                    Ainda não há ninguém na sala.
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1 max-w-[180px] leading-normal font-sans">
                    Compartilhe o QR Code ou carregue o código da sala para iniciar!
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  <AnimatePresence mode="popLayout">
                    {room.participants
                      .slice()
                      .reverse()
                      .map((p, idx) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, x: -10, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                          className="p-3 bg-[#0F1115] rounded-xl border border-white/5 flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="mx-auto w-7 h-7 bg-[#161920] text-slate-400 rounded-full flex items-center justify-center border border-white/5 font-mono text-xs select-none">
                              {room.participants.length - idx}
                            </div>
                            <span className="font-sans font-semibold text-slate-200 text-sm truncate">
                              {p.name}
                            </span>
                          </div>
                          <div className="font-mono text-xs font-bold text-blue-400 bg-[#161920] border border-blue-500/20 py-1 px-2.5 rounded-lg shrink-0">
                            #{p.ticketNumber}
                          </div>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* Right Block: Prize Manager & Draw Engine */}
          <div className="bg-[#161920] rounded-2xl p-6 border border-white/5 lg:col-span-4 shadow-xl flex flex-col h-[520px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 select-none">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-blue-450" />
                <h3 className="font-display font-bold text-white text-base md:text-lg">
                  Gestão de Prêmios ({room.prizes.length})
                </h3>
              </div>
              <Sparkles className="w-4 h-4 text-slate-500" />
            </div>

            {/* Sorteio Rápido de Números (sem prêmio fixo) no modo clássico */}
            {room.drawMode === "classic" && (
              <button
                onClick={() => {
                  onDrawPrize("quick_draw");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={room.status === "drawing"}
                className="mb-4 w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold tracking-wider rounded-xl shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 uppercase shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Sorteio Rápido 🎲
              </button>
            )}

            {/* Quick Add Prize form */}
            {!hasPermission ? (
              <div className="mb-4 p-3 bg-red-500/5 rounded-xl border border-red-500/10 flex items-center gap-2 select-none shrink-0 text-left">
                <Gift className="w-4 h-4 text-red-100 shrink-0" />
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Apenas o <strong className="text-slate-300 font-semibold">criador da sala</strong> ou <strong className="text-slate-300 font-semibold">administrador mestre</strong> pode cadastrar novos prêmios.
                </p>
              </div>
            ) : (
              <form onSubmit={handleAddPrizeSubmit} className="flex gap-2 mb-4 select-none">
                <input
                  type="text"
                  disabled={isAdding}
                  value={newPrizeName}
                  onChange={(e) => setNewPrizeName(e.target.value)}
                  placeholder="Ex: Caixa de Bombom 🍫"
                  className="flex-1 bg-[#0F1115] border border-white/10 focus:border-blue-500 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-200 outline-none transition-all placeholder:text-slate-650"
                />
                <button
                  type="submit"
                  disabled={isAdding || !newPrizeName.trim()}
                  className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-all flex items-center justify-center font-bold"
                >
                  <Plus className="w-4.5 h-4.5" />
                </button>
              </form>
            )}

            {room.prizes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
                <p className="text-slate-500 text-sm font-sans">
                  Nenhum prêmio cadastrado.
                </p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-[150px] leading-normal font-sans">
                  Escreva um prêmio acima e clique em + para adicioná-lo!
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                <AnimatePresence mode="popLayout">
                  {room.prizes.map((p) => {
                    const isRecycleDraw = p.winner !== null;
                    const cannotDraw = room.status === "drawing" && !isRecycleDraw;
                    const noParticipants = room.drawMode !== "classic" && room.participants.length === 0;
                    
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`p-3.5 rounded-xl border ${
                          p.winner
                            ? "bg-[#0F1115]/40 border-white/5 opacity-60"
                            : "bg-[#0F1115] border-white/5 hover:border-white/10"
                        } flex flex-col gap-2.5 transition-all`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-sans font-bold text-white text-sm truncate">
                            {p.name}
                          </span>
                          {!p.winner && hasPermission && (
                            <button
                              onClick={() => onRemovePrize(p.id)}
                              className="text-slate-500 hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer shrink-0"
                              title="Remover Prêmio"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Draw button or Winner banner detail */}
                        {p.winner ? (
                          <div className="flex flex-col gap-2 pt-2 border-t border-white/5 font-sans">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-emerald-400 font-bold tracking-wider uppercase">
                                🎉 SORTEADO!
                              </span>
                              <span className="text-xs text-slate-300 font-medium truncate max-w-[150px]">
                                {p.winner.name} (#{p.winner.ticketNumber})
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                onDrawPrize(p.id);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              disabled={room.status === "drawing" && room.activePrizeId === p.id}
                              className="w-full py-1 text-[10px] bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-450 font-bold tracking-wider rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase border outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Caso a pessoa não esteja presente, clique aqui para sortear novamente"
                            >
                              <RefreshCw className="w-3 h-3 text-rose-450 animate-spin" style={{ animationDuration: "15s" }} />
                              Sortear Novamente (Ausente) ♻️
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              onDrawPrize(p.id);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            disabled={cannotDraw || noParticipants}
                            className="w-full py-1.5 bg-[#2563EB] text-white text-xs font-bold tracking-wider rounded-lg shadow-md transition-all hover:bg-[#1D4ED8] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 uppercase outline-none"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Sortear Prêmio 🎲
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Draw History Section */}
        {room.drawHistory && room.drawHistory.length > 0 && (
          <div className="mt-8 bg-[#161920] rounded-2xl p-6 border border-white/5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 select-none">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-400" />
                <h3 className="font-display font-bold text-white text-base md:text-lg">
                  Histórico de Sorteios da Sala ({room.drawHistory.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                LOGS DE SORTEIOS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[300px] overflow-y-auto pr-1">
              {room.drawHistory.slice().reverse().map((entry) => {
                const drawTime = entry.drawnAt ? new Date(entry.drawnAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit"
                }) : "Horário indisponível";

                return (
                  <div
                    key={entry.id}
                    className="p-3.5 bg-[#0F1115] hover:bg-opacity-80 rounded-xl border border-white/5 flex flex-col gap-2 transition-all relative overflow-hidden group select-none"
                  >
                    <div className="absolute right-2 top-2 text-[9px] font-mono text-slate-500">
                      {drawTime}
                    </div>
                    <div className="space-y-0.5 pr-12 min-w-0 text-left">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block font-bold leading-normal">
                        Prêmio sorteado:
                      </span>
                      <h4 className="text-xs font-bold text-white truncate max-w-full">
                        {entry.prizeName}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1.5 pt-2 border-t border-white/5">
                      <div className="space-y-0.5 text-left">
                        <span className="text-[9px] font-mono text-slate-550 block uppercase">Contemplado</span>
                        <span className="text-xs font-extrabold text-[#38bdf8] truncate max-w-[140px] block">
                          {entry.winnerName}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] font-black text-rose-450 bg-rose-500/5 border border-rose-500/10 py-1 px-2 rounded-md">
                        #{entry.ticketNumber}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER CREDITS */}
      <footer className="w-full text-center mt-12 py-6 border-t border-white/5 max-w-7xl mx-auto shrink-0">
        <p className="text-[10px] text-slate-500 font-medium font-sans">
          Criado em 2026 por Alison Fernando Rodrigues dos Santos - VouGanhei!
        </p>
        <div className="flex items-center justify-center gap-3 mt-1.5 text-[9px] text-slate-650 font-mono">
          <span>Versão: 0.14 (Beta)</span>
          <span>•</span>
          <span>Build: 2026-05-21</span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-500 font-bold uppercase">Sincronizado ao Vivo</span>
          </div>
        </div>
      </footer>

      {/* CUSTOM CONFIRMATION MODAL TO SUPPRESS BROWSER POPUPS */}
      <CustomModal
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          handleUpdateSettings({ clearHistory: true });
        }}
        title="Reiniciar Sorteios?"
        message="Isto apagará permanentemente todo o histórico de números sorteados nesta rodada clássica e reativará os prêmios anteriores. Tem certeza que deseja zerar a sala?"
        type="confirm"
        confirmText="Sim, Reiniciar"
        cancelText="Voltar"
      />

      {/* EXPANDED QR CODE OVERLAY */}
      <AnimatePresence>
        {isQrExpanded && (
          <div className="fixed inset-0 z-[999998] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQrExpanded(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-[#161920] border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col items-center text-center max-h-[95vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsQrExpanded(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                ✕
              </button>

              <span className="text-[10px] font-bold tracking-widest text-[#10B981] uppercase mb-4 py-1 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full inline-flex items-center gap-1.5 animate-pulse font-mono">
                🎥 ESCANEIE PARA PARTICIPAR
              </span>

              <h3 className="font-display font-black text-white text-xl md:text-2xl mb-4 select-none">
                QR Code de Entrada Ampliado 🔍
              </h3>

              <div className="p-6 bg-white rounded-3xl shadow-2xl border-none mb-6">
                <img
                  src={qrCodeUrl}
                  alt="QR Code Entrada Ampliado"
                  className="w-72 h-72 sm:w-96 sm:h-96 select-none"
                  draggable={false}
                />
              </div>

              <div className="w-full flex flex-col items-center">
                <span className="text-[10px] font-semibold text-slate-550 uppercase tracking-widest block mb-2">
                  CÓDIGO MANUAL DA SALA
                </span>
                <div className="font-mono text-2xl md:text-4xl font-extrabold text-white bg-[#0F1115] px-6 py-3 rounded-2xl border border-white/10 tracking-widest select-all select-none">
                  {room.id}
                </div>
              </div>

              <p className="text-xs text-slate-400 max-w-sm mt-4 leading-relaxed font-sans">
                Aponte a câmera do celular para o código acima para participar instantaneamente!
              </p>

              <button
                onClick={() => setIsQrExpanded(false)}
                className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all cursor-pointer"
              >
                Fechar Janela
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FINAL EVENT THANK YOU & CELEBRATION MODAL */}
      <AnimatePresence>
        {isEventFinished && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
            {/* Dark glass backdrop with high blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEventFinished(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            />

            {/* Content card */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-2xl bg-[#0F1115] border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden max-h-[90vh] flex flex-col items-center text-center"
            >
              {/* Celebration background sparks */}
              <div className="absolute top-0 left-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-4 right-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button top-right */}
              <button
                onClick={() => setIsEventFinished(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer z-10"
              >
                ✕
              </button>

              <div className="flex flex-col items-center w-full z-10 overflow-y-auto pr-1">
                {/* Floating Trophy Icon with bounce */}
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4 text-3xl animate-bounce">
                  🏆
                </div>

                <h2 className="font-display font-black text-2xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400 mb-2 leading-tight">
                  Sorteio Concluído com Sucesso! 🌟
                </h2>
                <p className="text-sm text-slate-300 max-w-md mx-auto mb-6 font-sans">
                  Agradecemos imensamente a participação de todos os presentes neste incrível evento! Abaixo está a galeria dos nossos grandes vencedores:
                </p>

                {/* Winners Gallery List */}
                <div className="w-full bg-[#161920]/80 rounded-2xl border border-white/5 mt-2 mb-6 p-4 md:p-5 max-h-[50vh] overflow-y-auto text-left space-y-3">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-[#a855f7] pb-2 border-b border-white/5 font-mono">
                    Histórico Oficial de Premiados ({room.prizes.filter(p => p.winner).length})
                  </div>

                  {room.prizes.filter(p => p.winner).length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 italic">
                      Nenhum prêmio foi sorteado nesta sala ainda.
                    </div>
                  ) : (
                    room.prizes.filter(p => p.winner).map((p) => (
                      <div 
                        key={p.id}
                        className="flex items-center justify-between gap-4 py-2.5 px-3 bg-[#0F1115]/80 hover:bg-[#0F1115] border border-white/5 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🎁</span>
                          <div>
                            <span className="block text-xs font-bold text-white truncate max-w-[200px]">
                              {p.name}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block text-xs font-black text-[#10B981]">
                            {p.winner?.name}
                          </span>
                          <span className="block text-[10px] font-mono text-slate-500">
                            Bilhete #{p.winner?.ticketNumber}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Print button, Action options */}
                <div className="flex flex-wrap gap-3 items-center justify-center w-full mt-2">
                  <button
                    onClick={handlePrintResults}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg outline-none cursor-pointer font-sans"
                  >
                    <Printer className="w-4 h-4 text-white" />
                    Imprimir Resultados
                  </button>

                  <button
                    onClick={() => setIsEventFinished(false)}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold rounded-xl text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer outline-none cursor-pointer font-sans"
                  >
                    Continuar Visualizando
                  </button>
                </div>

                {/* Creative footer */}
                <div className="mt-8 text-[11px] text-slate-500 italic font-sans">
                  💖 Obrigado a todos pela participação, energia e cooperação! Parabéns aos nobres vencedores!
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
