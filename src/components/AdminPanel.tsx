import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Room, Prize, Participant } from "../types";
import { Gift, Users, Plus, Trash2, Copy, Check, Megaphone, ArrowLeft, RefreshCw, Sparkles, Ticket, Settings } from "lucide-react";
import DrawAnimator from "./DrawAnimator";
import VouGanheiLogo from "./VouGanheiLogo";

interface AdminPanelProps {
  room: Room;
  onAddPrize: (prizeName: string) => Promise<void>;
  onRemovePrize: (prizeId: string) => Promise<void>;
  onDrawPrize: (prizeId: string) => Promise<void>;
  onResetDrawState: () => Promise<void>;
  onLeaveRoom: () => void;
  appUrl: string;
}

export default function AdminPanel({
  room,
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
    clearHistory?: boolean;
  }) => {
    try {
      await fetch(`/api/rooms/${room.id}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
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
      const joinres = await fetch(`/api/rooms/${room.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: manualName.trim(), playerId: manualPlayerId }),
      });

      if (!joinres.ok) {
        const data = await joinres.json();
        throw new Error(data.error || "Falha ao registrar participante.");
      }
      
      setManualName("");
    } catch (err: any) {
      setManualError(err.message || "Erro ao sortear.");
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

        {/* Mode Selector Tab Container */}
        <div className="flex bg-[#161920]/80 p-1 rounded-xl border border-white/5 w-fit mb-6 select-none shadow-md">
          <button
            onClick={() => handleUpdateSettings({ drawMode: "qrcode" })}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-sans tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
              room.drawMode !== "classic"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
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
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            Sorteio Clássico (Faixa de Números)
          </button>
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
                    if (confirm("Deseja apagar o histórico de números sorteados e prêmios entregues nesta sala para reiniciar?")) {
                      handleUpdateSettings({ clearHistory: true });
                    }
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
                <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-4 py-1 px-3 bg-blue-500/10 border border-blue-500/20 rounded-full inline-flex items-center gap-1.5 animate-pulse font-mono">
                  <Megaphone className="w-3 h-3 text-blue-450" /> ESCANEIE PARA PARTICIPAR
                </span>

                {/* QR frame */}
                <div className="w-fit p-4 bg-white rounded-2xl shadow-xl shadow-slate-950/45 border-none mb-4 mx-auto select-none">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-48 h-48 select-none"
                    draggable={false}
                  />
                </div>

                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed font-sans mt-2">
                  Aponte a câmera do celular para este código para entrar na sala, inserir seu nome e pegar seu número da sorte!
                </p>
              </div>

              <div className="w-full mt-6 pt-5 border-t border-white/5 flex flex-col items-center shrink-0">
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
                    const cannotDraw = room.status === "drawing" || (room.drawMode !== "classic" && room.participants.length === 0);
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
                          {!p.winner && (
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
                              disabled={cannotDraw}
                              className="w-full py-1 text-[10px] bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-450 font-bold tracking-wider rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase disabled:opacity-40 disabled:cursor-not-allowed border outline-none"
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
                            disabled={cannotDraw}
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
      </div>

      {/* FOOTER CREDITS */}
      <footer className="w-full text-center mt-12 py-6 border-t border-white/5 max-w-7xl mx-auto shrink-0">
        <p className="text-[10px] text-slate-500 font-medium font-sans">
          Criado em 2026 por Alison Fernando Rodrigues dos Santos - VouGanhei!
        </p>
        <div className="flex items-center justify-center gap-3 mt-1.5 text-[9px] text-slate-650 font-mono">
          <span>Versão: 0.11 (Beta)</span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-500 font-bold uppercase">Sincronizado ao Vivo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
