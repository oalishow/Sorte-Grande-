import React, { useState } from "react";
import { motion } from "motion/react";
import { Gift, Sparkles, Send, Shield, Radio, Settings, KeyRound } from "lucide-react";

interface HomeProps {
  onCreateRoom: (roomName: string) => void;
  onJoinRoom: (roomCode: string) => void;
  isLoading: boolean;
  onGoToMaster?: () => void;
}

export default function Home({ onCreateRoom, onJoinRoom, isLoading, onGoToMaster }: HomeProps) {
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [errorMsg, setErrorMsg] = useState("");

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!roomName.trim()) {
      setErrorMsg("Por favor, digite um nome para a sua sala.");
      return;
    }
    onCreateRoom(roomName.trim());
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!roomCode.trim()) {
      setErrorMsg("Por favor, introduza o código de 6 dígitos.");
      return;
    }
    if (roomCode.trim().length !== 6) {
      setErrorMsg("O código da sala deve conter exatamente 6 caracteres.");
      return;
    }
    onJoinRoom(roomCode.trim().toUpperCase());
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E2E8F0] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      {/* Absolute elegant glowing backgrounds */}
      <div className="absolute top-12 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] glow-pulse" />
      <div className="absolute bottom-12 right-1/4 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[120px] glow-pulse" />

      {/* Grid structure for subtle patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#161920_1px,transparent_1px),linear-gradient(to_bottom,#161920_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />

      <div className="relative z-10 max-w-xl w-full flex flex-col items-center text-center">
        {/* Animated Main Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-[#0F1115] flex items-center justify-center shadow-xl shadow-amber-500/20 mb-6 border border-amber-300/30 overflow-visible"
        >
          {/* Subtle outer glowing rings */}
          <div className="absolute inset-0 rounded-3xl bg-amber-500/10 scale-125 blur-md animate-pulse pointer-events-none" />
          <Gift className="w-11 h-11 text-[#0F1115] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)] animate-bounce animate-pulse" style={{ animationDuration: "3s" }} />
          <Sparkles className="absolute -top-1.5 -right-1.5 w-6 h-6 text-amber-100 animate-pulse" />
          <Sparkles className="absolute -bottom-1 -left-1 w-4 h-4 text-amber-200 animate-pulse delay-500" />
        </motion.div>

        {/* Catchy head titles */}
        <motion.h1
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="font-display text-4xl md:text-5xl font-extrabold text-white tracking-tight"
        >
          Sorte grande
        </motion.h1>

        <motion.p
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-3 text-slate-400 font-sans text-sm md:text-base max-w-md"
        >
          Crie uma sala de sorteio interativa. Seus convidados escaneiam o QR Code, geram seu próprio pin e assistem à rotação de números ao vivo!
        </motion.p>

        {/* Tab selection */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full mt-10 bg-[#161920] p-1 rounded-xl border border-white/5 flex items-center gap-1 shadow-inner max-w-sm"
        >
          <button
            onClick={() => { setActiveTab("create"); setErrorMsg(""); }}
            className={`flex-1 py-2.5 rounded-lg text-xs md:text-sm font-semibold tracking-wide transition-all ${
              activeTab === "create"
                ? "bg-[#0F1115] border border-white/5 text-white shadow-md font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Criar Sala Virtual
          </button>
          <button
            onClick={() => { setActiveTab("join"); setErrorMsg(""); }}
            className={`flex-1 py-2.5 rounded-lg text-xs md:text-sm font-semibold tracking-wide transition-all ${
              activeTab === "join"
                ? "bg-[#0F1115] border border-white/5 text-white shadow-md font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Entrar com Código
          </button>
        </motion.div>

        {/* Core panel interface */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full mt-6 bg-[#161920] backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/5 shadow-2xl"
        >
          {errorMsg && (
            <div className="mb-4 text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 py-2.5 px-3 rounded-lg text-left">
              ⚠ {errorMsg}
            </div>
          )}

          {activeTab === "create" ? (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Nome do Sorteio / Evento
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Ex: Festa da Empresa 2026, Sorteio de Natal"
                    className="w-full bg-[#0F1115] border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600"
                  />
                  <div className="absolute right-3.5 top-3.5 text-slate-600">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-blue-500/15 hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
              >
                {isLoading ? "Criando Sala..." : "Iniciar Painel de Sorteio ✦"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div className="text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Código da Sala (6 Dígitos)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="Ex: SR62A1"
                    className="w-full bg-[#0F1115] border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3 px-4 text-center text-xl font-mono font-bold tracking-widest text-blue-400 outline-none transition-all placeholder:text-slate-600"
                  />
                  <div className="absolute right-3.5 top-3.5 text-slate-600">
                    <KeyRound className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white hover:bg-slate-100 text-[#0F1115] font-bold py-3.5 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
              >
                {isLoading ? "Entrando..." : "Entrar no Sorteio →"}
              </button>
            </form>
          )}
        </motion.div>

        {/* Feature grid tags */}
        <div className="grid grid-cols-2 gap-4 w-full mt-12 text-left">
          <div className="bg-[#161920]/60 border border-white/5 p-4 rounded-xl flex items-start gap-3">
            <Radio className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-white">Sincronização ao Vivo</h4>
              <p className="text-slate-500 text-xs mt-1">Todos assistem o spinner de números girar ao mesmo tempo.</p>
            </div>
          </div>
          <div className="bg-[#161920]/60 border border-white/5 p-4 rounded-xl flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-white">Prêmios Ilimitados</h4>
              <p className="text-slate-500 text-xs mt-1">Configure todos os prêmios da sua festa e controle os sorteios.</p>
            </div>
          </div>
        </div>

        {/* Sleek Master Panel Access Config Gear */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex items-center justify-center w-full"
        >
          <button
            onClick={onGoToMaster}
            className="p-3 bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/25 rounded-full transition-all cursor-pointer text-slate-500 hover:text-blue-400 shadow-md group"
            title="Configurações Master"
          >
            <Settings className="w-5 h-5 animate-[spin_10s_linear_infinite] group-hover:text-blue-400" />
          </button>
        </motion.div>

        {/* Footnote credits and signature */}
        <div className="w-full text-center mt-12 pt-6 border-t border-white/5 opacity-80 shrink-0">
          <p className="text-[10px] text-slate-500 font-medium font-sans">
            Criado em 2026 por Alison Fernando Rodrigues dos Santos - Sorte Grande
          </p>
          <p className="text-[9px] text-slate-600 font-mono mt-1">
            Versão: 0.10 (Beta)
          </p>
        </div>
      </div>
    </div>
  );
}
