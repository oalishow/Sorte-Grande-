import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Room, Participant, Prize } from "../types";
import { Gift, Ticket, User, Users, Sparkles, LogOut, ArrowLeft, Heart, CheckCircle, Radio } from "lucide-react";
import DrawAnimator from "./DrawAnimator";
import VouGanheiLogo from "./VouGanheiLogo";
import TicketRevealAnimation from "./TicketRevealAnimation";

interface ParticipantPanelProps {
  room: Room;
  playerId: string;
  onJoin: (name: string) => Promise<void>;
  onLeaveRoom: () => void;
}

export default function ParticipantPanel({
  room,
  playerId,
  onJoin,
  onLeaveRoom,
}: ParticipantPanelProps) {
  const [nameInput, setNameInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [drawFinished, setDrawFinished] = useState(false);
  const [showJoinReveal, setShowJoinReveal] = useState(false);
  const [hasShownReveal, setHasShownReveal] = useState(() => {
    return sessionStorage.getItem(`revealed_${playerId}`) === 'true';
  });

  useEffect(() => {
    const me = room.participants.find((p) => p.id === playerId);
    if (me && !hasShownReveal) {
      setShowJoinReveal(true);
      setHasShownReveal(true);
      sessionStorage.setItem(`revealed_${playerId}`, 'true');
    }
  }, [room.participants, hasShownReveal, playerId]);

  useEffect(() => {
    // Reset drawFinished when status changes to drawing or when the winning number/prize changes
    if (room.status === "drawing") {
      setDrawFinished(false);
    }
  }, [room.status, room.currentWinningNumber, room.activePrizeId]);

  // Determine if this room is in Classic Sorteio mode
  const isClassicSpectator = room.drawMode === "classic";

  const displayedDrawnNumbers = (room.classicDrawnNumbers || []).filter((num) => {
    if (room.status === "drawing" && room.currentWinningNumber !== null && num === room.currentWinningNumber) {
      return false;
    }
    return true;
  });

  const me = room.participants.find((p) => p.id === playerId);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!nameInput.trim()) {
      setErrorMsg("Por favor, digite seu nome.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onJoin(nameInput.trim());
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao entrar no sorteio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePrize = room.activePrizeId === "quick_draw"
    ? { id: "quick_draw", name: "Sorteio Rápido de Números 🎲", winner: room.currentWinner, drawnAt: Date.now() }
    : room.prizes.find((p) => p.id === room.activePrizeId);
  const isMeWinner = room.currentWinner && room.currentWinner.id === playerId;
  const isLastPrize = room.prizes.length > 0 && room.prizes.every((p) => p.winner !== null);
  // Adjusted to exactly 3 seconds as requested for the spin ("uns 3 segundos")
  const drawDuration = 3200;

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E2E8F0] flex flex-col p-4 md:p-6 font-sans relative overflow-x-hidden">
      {/* Join Reveal Animation Overlay */}
      <AnimatePresence>
        {showJoinReveal && me && (
          <TicketRevealAnimation
            ticketNumber={me.ticketNumber}
            name={me.name}
            onComplete={() => setShowJoinReveal(false)}
          />
        )}
      </AnimatePresence>

      {/* Background glow flares */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Embedded Event Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between py-4 border-b border-white/10 mb-6 shrink-0">
        <button
          onClick={onLeaveRoom}
          className="p-2 text-[#E2E8F0] hover:text-white bg-[#161920] border border-white/5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Sair
        </button>
        <div className="text-right">
          <span className="font-display font-black text-sm text-white tracking-tight truncate block max-w-[155px]">
            {room.name}
          </span>
          <span className="font-mono text-[10px] text-blue-400 font-bold block">
            SALA: #{room.id}
          </span>
        </div>
      </header>

      {/* Main Container Section */}
      <main className="flex-1 max-w-sm w-full mx-auto flex flex-col justify-center py-2">
        <AnimatePresence mode="wait">
          {!me && !isClassicSpectator ? (
            /* LAYER A: Participant registration form */
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-[#161920] border border-white/5 p-6 rounded-2xl shadow-xl w-full"
            >
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <VouGanheiLogo size="sm" />
                </div>
                <h3 className="font-display text-lg font-bold text-white uppercase tracking-tight">
                  Entrar no Sorteio!
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Digite seu nome abaixo para se cadastrar e receber seu número da sorte gerado automaticamente.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 text-[11px] font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 py-2.5 px-3 rounded-lg">
                  ⚠ {errorMsg}
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Seu Nome Completo
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Ex: João Silva"
                      className="w-full bg-[#0F1115] border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-700"
                    />
                    <div className="absolute right-3.5 top-3.5 text-slate-600">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl text-xs sm:text-sm shadow-md transition-all enabled:hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider font-mono shadow-blue-500/20"
                >
                  {isSubmitting ? "Gerando Bilhete..." : "Pegar Meu Bilhete →"}
                </button>
              </form>
            </motion.div>
          ) : (
            /* LAYER B: Active user views */
            <motion.div
              key="lobby"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col gap-6"
            >
              {room.status === "drawing" && activePrize && room.currentWinner ? (
                /* Subview 1: Drawing Animation active screen */
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-black text-rose-500 tracking-widest text-center flex items-center justify-center gap-1.5 uppercase blink py-1 px-3 bg-rose-500/10 border border-rose-500/20 rounded-full w-fit mx-auto animate-pulse">
                    <Radio className="w-3.5 h-3.5" /> Sorteio em andamento ao vivo!
                  </span>

                  <DrawAnimator
                    winningNumber={room.currentWinningNumber || 0}
                    winnerName={room.currentWinner.name}
                    prizeName={activePrize.name}
                    duration={drawDuration}
                    onComplete={() => setDrawFinished(true)}
                  />

                  {/* Immediate alerts on user ends if active draw belongs to them */}
                  {isMeWinner && drawFinished && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-5 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-2xl border border-blue-500/30 text-white text-center shadow-xl shadow-blue-500/20"
                    >
                      <Sparkles className="w-10 h-10 mx-auto mb-2 text-white animate-spin" />
                      <h3 className="font-display font-extrabold text-2xl tracking-tight leading-tight">
                        VOCÊ GANHOU! 🎉
                      </h3>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-100 mt-1 font-mono">
                        Prêmio: {activePrize.name}
                      </p>
                      <p className="text-[11px] text-slate-200 mt-2 font-medium">
                        Mostre a tela do seu celular para o apresentador para resgatar!
                      </p>
                    </motion.div>
                  )}
                </div>
              ) : (
                /* Subview 2: Standard Lobby with customized Ticket Stub card */
                <div className="flex flex-col gap-6">
                  {isClassicSpectator ? (
                    <div className="relative bg-gradient-to-b from-[#1A1D25] to-[#12141A] rounded-3xl border border-white/5 shadow-xl overflow-hidden p-6 text-center">
                      <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-600 absolute top-0 inset-x-0" />
                      <span className="text-[10px] font-black tracking-widest text-amber-500 uppercase block mb-3 font-mono animate-pulse">
                        🏆 MODO DE SORTEIO CLÁSSICO
                      </span>
                      <h4 className="font-display font-black text-white text-lg">
                        Acompanhe os Sorteios!
                      </h4>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Os organizadores estão sorteando números entre <strong className="text-amber-400 font-extrabold">{room.classicMin ?? 1}</strong> e <strong className="text-[#FBBF24] font-extrabold">{room.classicMax ?? 100}</strong> ao vivo!
                      </p>
                      <div className="mt-5 py-3 px-4 bg-[#0F1115] border border-white/5 rounded-2xl flex flex-col items-center">
                        <span className="text-[9px] font-semibold text-slate-550 uppercase tracking-widest block mb-1 font-mono">
                          NÚMEROS SORTEADOS ATÉ AGORA
                        </span>
                        <div className="font-mono font-bold text-amber-500 text-lg">
                          {displayedDrawnNumbers.length} número(s)
                        </div>
                      </div>
                    </div>
                  ) : me ? (
                    /* Decorative Ticket stub design */
                    <div className="relative bg-gradient-to-b from-[#1A1D25] to-[#12141A] rounded-3xl border border-white/5 shadow-xl overflow-hidden shadow-slate-950/40">
                      {/* Top yellow tag styling */}
                      <div className="h-2 bg-gradient-to-r from-blue-550 to-indigo-550" />

                      {/* Left and Right hole cutters representing real stub notches */}
                      <div className="absolute top-1/2 -mt-3.5 -left-3.5 w-7 h-7 bg-[#0F1115] rounded-full border border-white/5 z-10" />
                      <div className="absolute top-1/2 -mt-3.5 -right-3.5 w-7 h-7 bg-[#0F1115] rounded-full border border-white/5 z-10" />

                      <div className="p-6 pb-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase mb-3">
                          BILHETE OFICIAL DA SORTE
                        </span>

                        <div className="py-2.5 px-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-wider select-none mb-4 flex items-center gap-1.5 animate-pulse font-mono">
                          <CheckCircle className="w-3.5 h-3.5 text-blue-400" /> Você está na sala!
                        </div>

                        <h4 className="font-display font-black text-white text-lg truncate max-w-[200px]">
                          {me.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Participante</p>
                      </div>

                      {/* Dotted cutting separator line */}
                      <div className="border-t-2 border-dashed border-white/5 my-2 mx-6" />

                      {/* Stub code details */}
                      <div className="p-6 pt-4 text-center flex flex-col items-center">
                        <span className="text-[9px] font-bold tracking-widest text-[#94A3B8] uppercase mb-1">
                          NÚMERO DO SORTEIO
                        </span>
                        <div className="font-display font-black text-white text-5xl md:text-6xl tracking-tight select-none pb-2 neon-glow">
                          #{me.ticketNumber}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 max-w-[200px]">
                          Guarde este número. Ele será exibido na tela central se seu bilhete for sorteado!
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Prizes check grid */}
                  <div className="bg-[#161920] rounded-2xl p-4 border border-white/5">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2 mb-3 select-none">
                      📦 Lista de Prêmios ({room.prizes.length})
                    </h4>
                    {room.prizes.length === 0 ? (
                      <p className="text-center text-slate-500 text-[11px] font-sans py-4">
                        Nenhum prêmio cadastrado nesta sala ainda.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {room.prizes.map((p) => (
                          <div
                            key={p.id}
                            className="text-xs py-2 px-2.5 bg-[#0F1115] rounded-lg border border-white/5 flex items-center justify-between"
                          >
                            <span className="font-medium text-slate-200 truncate pr-2">
                              {p.name}
                            </span>
                            {p.winner && !(room.status === "drawing" && room.activePrizeId === p.id) ? (
                              <span className="text-[9px] font-bold text-emerald-400 uppercase py-0.5 px-2 bg-emerald-500/10 rounded">
                                Ganhador: {p.winner.name}
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-blue-400 uppercase py-0.5 px-2 bg-blue-500/10 rounded">
                                {room.status === "drawing" && room.activePrizeId === p.id ? "Sorteando..." : "Livre"}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active Participants list with subtle pulsing and glowing animations */}
                  <div className="bg-[#161920] rounded-2xl p-4 border border-white/5 shadow-lg shadow-slate-950/10">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3 select-none">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        Participantes na Sala ({room.participants.length})
                      </h4>
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-wider">ONLINE</span>
                      </div>
                    </div>

                    {room.participants.length === 0 ? (
                      <p className="text-center text-slate-500 text-[11px] font-sans py-4">
                        Nenhum participante conectado ainda.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {room.participants.map((p) => {
                          const isCurrentUser = p.id === playerId;
                          return (
                            <div
                              key={p.id}
                              className={`text-xs py-2 px-2.5 rounded-lg border flex items-center justify-between transition-all duration-300 ${
                                isCurrentUser
                                  ? "bg-blue-950/20 border-blue-550/30 shadow-[0_0_12px_rgba(59,130,246,0.15)] animate-[pulse_3s_infinite]"
                                  : "bg-[#0F1115] border-white/5 hover:border-blue-500/10 hover:shadow-[0_0_10px_rgba(59,130,246,0.05)]"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="relative flex h-1.5 w-1.5 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                                </span>
                                <span className={`font-semibold truncate max-w-[160px] ${isCurrentUser ? "text-blue-300" : "text-slate-200"}`}>
                                  {p.name} {isCurrentUser && <span className="text-[10px] text-blue-500 font-normal font-mono">(Você)</span>}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] font-bold text-slate-500 bg-[#161920] border border-white/5 px-2 py-0.5 rounded">
                                #{p.ticketNumber}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Embedded footer signature */}
      <footer className="py-6 text-center mt-auto shrink-0 border-t border-white/5">
        <p className="text-[10px] text-slate-500 font-medium font-sans">
          Criado em 2026 por Alison Fernando Rodrigues dos Santos - VouGanhei!
        </p>
        <div className="flex items-center justify-center gap-3 mt-1.5 text-[9px] text-slate-600 font-mono">
          <span>Versão: 0.15 (Beta)</span>
          <span>•</span>
          <span>Build: 2026-05-21</span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-bold uppercase">Sincronizado ao Vivo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
