import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gift, Sparkles, Send, Shield, Radio, Settings, KeyRound, Trophy, Award, Download, Smartphone, Share2, Plus, Monitor, Heart } from "lucide-react";
import VouGanheiLogo from "./VouGanheiLogo";
import CustomModal from "./CustomModal";
import { apiFetch } from "../lib/api";
import { firebaseGetOpenRooms } from "../lib/firebase";

interface HomeProps {
  onCreateRoom: (roomName: string, isOpenRoom?: boolean) => void;
  onJoinRoom: (roomCode: string) => void;
  isLoading: boolean;
  onGoToMaster?: () => void;
}

export default function Home({ onCreateRoom, onJoinRoom, isLoading, onGoToMaster }: HomeProps) {
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [isOpenRoom, setIsOpenRoom] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [openRooms, setOpenRooms] = useState<Array<{ id: string; name: string; status: string; participantsCount: number; prizesCount: number }>>([]);

  // Fetch open rooms dynamically
  useEffect(() => {
    const fetchOpenRooms = async () => {
      try {
        const rooms = await firebaseGetOpenRooms();
        
        // Filter out rooms where all prizes have been drawn
        const activeRooms = rooms.filter(r => {
          if (r.prizes.length === 0) return true;
          const allPrizesDrawn = r.prizes.every(p => p.winner !== null);
          // Only hide if all prizes are drawn AND the room isn't currently in a drawing animation
          return !allPrizesDrawn || r.status === "drawing";
        });

        const formatted = activeRooms.map(r => ({
          id: r.id,
          name: r.name,
          status: r.status,
          participantsCount: r.participants.length,
          prizesCount: r.prizes.length
        }));
        setOpenRooms(formatted);
      } catch (err) {
        // ignore fetch errors silently
      }
    };
    fetchOpenRooms();
    const interval = setInterval(fetchOpenRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  // Custom Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    type: "info" | "confirm" | "success";
  }>({ title: "", message: "", type: "info" });

  // PWA Prompt & Standalone States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const checkStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    setIsStandalone(!!checkStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setModalConfig({
        title: "Instale em Qualquer Dispositivo",
        message: "Para instalar nas configurações do seu navegador, procure a opção 'Instalar' ou 'Adicionar à tela de início' nas configurações (geralmente nos três pontinhos no canto do navegador).\n\nO aplicativo roda de forma rápida e idêntica em computadores Windows e celulares Android!",
        type: "info",
      });
      setModalOpen(true);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };


  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!roomName.trim()) {
      setErrorMsg("Por favor, digite um nome para a sua sala.");
      return;
    }
    onCreateRoom(roomName.trim(), isOpenRoom);
  };

  const [isJoining, setIsJoining] = useState(false);

  const startJoinAnimation = (roomCodeStr: string) => {
    setIsJoining(true);
    setTimeout(() => {
      onJoinRoom(roomCodeStr);
      setIsJoining(false);
    }, 1500); // 1.5s delay for animation
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
    startJoinAnimation(roomCode.trim().toUpperCase());
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E2E8F0] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      {/* Absolute elegant glowing backgrounds */}
      <div className="absolute top-12 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] glow-pulse" />
      <div className="absolute bottom-12 right-1/4 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[120px] glow-pulse" />

      {/* Full-screen Loading Animation Overlay */}
      <AnimatePresence>
        {(isLoading || isJoining) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F1115]/90 backdrop-blur-sm"
          >
            <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-blue-500/20 rounded-full blur-[80px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-500/20 rounded-full blur-[80px] animate-pulse" />
            
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="relative w-20 h-20 mb-6"
            >
              <div className="absolute inset-0 rounded-full border-t-4 border-b-4 border-blue-500 opacity-70" />
              <div className="absolute inset-2 rounded-full border-l-4 border-r-4 border-indigo-500 opacity-70" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
              </div>
            </motion.div>
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold font-display text-white tracking-wide"
            >
              {activeTab === "create" ? "Preparando Sala Mágica..." : "Acessando Sorteio..."}
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-2 text-sm text-slate-400 font-sans max-w-xs text-center"
            >
              Sincronizando banco de dados em tempo real para a melhor experiência participativa.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid structure for subtle patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#161920_1px,transparent_1px),linear-gradient(to_bottom,#161920_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />

      <div className="relative z-10 max-w-xl w-full flex flex-col items-center text-center">
        {/* Animated Main Logo (VouGanhei! Theme) */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <VouGanheiLogo size="lg" />
        </motion.div>

        {/* Catchy head titles */}
        <motion.h1
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="font-display text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 tracking-tight"
        >
          VouGanhei!
        </motion.h1>

        <motion.p
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-4 text-slate-400 font-sans text-sm md:text-base max-w-lg leading-relaxed"
        >
          O sistema de sorteios virtuais em tempo real mais dinâmico e inovador. Crie salas interativas em segundos, distribua bilhetes através de QR Code na tela e proporcione uma experiência vibrante e 100% automatizada direto no dispositivo dos participantes!
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
            Entrar nos Sorteios
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
            <form onSubmit={handleCreateSubmit} className="space-y-5">
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

              {/* Open vs Closed room configuration option */}
              <div className="text-left space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Acessibilidade da Sala
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpenRoom(false)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      !isOpenRoom
                        ? "bg-[#0F1115] border-blue-500 text-white shadow-xl"
                        : "bg-[#0F1115]/40 border-white/5 text-slate-400 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide">
                      <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Sala Fechada</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 font-sans leading-relaxed">
                      Privada. Os participantes precisam digitar o código correspondente de 6 dígitos para entrar no lobby.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpenRoom(true)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isOpenRoom
                        ? "bg-[#0F1115] border-emerald-500 text-white shadow-xl"
                        : "bg-[#0F1115]/40 border-white/5 text-slate-400 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide">
                      <Radio className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                      <span>Sala Aberta</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 font-sans leading-relaxed">
                      Pública. Sua sala aparecerá listada na tela de todos os participantes conectados sem necessidade de senha!
                    </p>
                  </button>
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
            <div className="space-y-6">
              {/* Active Open Rooms Listing */}
              {openRooms.length > 0 && (
                <div className="text-left space-y-3 pb-5 border-b border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Salas Abertas Disponíveis
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                      {openRooms.length} ativas
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-sans leading-normal">
                    Toque em uma sala pública abaixo para entrar instantaneamente, sem precisar de senha ou código!
                  </p>
                  
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {openRooms.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => startJoinAnimation(r.id)}
                        className="w-full bg-[#0F1115] hover:bg-emerald-500/5 hover:border-emerald-500/35 border border-white/5 p-3 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group"
                      >
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {r.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span>Código: #{r.id}</span>
                            <span>•</span>
                            <span>{r.participantsCount} participantes</span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold px-2.5 py-1 rounded-lg group-hover:scale-105 transition-all">
                          Entrar ✦
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <div className="text-left">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Código da Sala (6 Dígitos)
                    </label>
                    {openRooms.length > 0 && (
                      <span className="text-[10px] text-slate-500 italic">Ou selecione uma sala aberta acima</span>
                    )}
                  </div>
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
            </div>
          )}
        </motion.div>

        {/* Quick standout feature cards */}
        <div className="w-full mt-12 text-left space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <h3 className="font-display text-xs font-black uppercase tracking-widest text-slate-400">
              Recursos em Destaque
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="bg-[#161920] border border-white/5 p-4.5 rounded-2xl flex items-start gap-3.5 shadow-lg relative overflow-hidden group hover:border-blue-500/20"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/10 transition-all" />
              <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/15">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">Sincronismo Ultra Rápido</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">Transmissão em tempo real sem delay. Os smartphones vibram e giram em sincronicidade contínua.</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="bg-[#161920] border border-white/5 p-4.5 rounded-2xl flex items-start gap-3.5 shadow-lg relative overflow-hidden group hover:border-amber-500/20"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />
              <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/15">
                <Gift className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">Múltiplos Prêmios & Rodadas</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">Gerencie uma fila de prêmios com descrições ricas, resolvendo um após o outro de forma limpa.</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="bg-[#161920] border border-white/5 p-4.5 rounded-2xl flex items-start gap-3.5 shadow-lg relative overflow-hidden group hover:border-emerald-500/20"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/15">
                <Send className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">Acesso QR Code Instantâneo</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">Sem downloads pesados ou cadastros. Escaneie na tela do projetor e entre na sala instantaneamente.</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="bg-[#161920] border border-white/5 p-4.5 rounded-2xl flex items-start gap-3.5 shadow-lg relative overflow-hidden group hover:border-indigo-500/20"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-indigo-500/10 transition-all" />
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/15">
                <Monitor className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">Suporte PWA Multiplataforma</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">Roda de forma idêntica no navegador, aplicativo instalado no Android (APK) ou Windows (EXE).</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Novidades e Atualizações Panel */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="w-full mt-6 bg-[#161920]/80 backdrop-blur-md rounded-2xl p-5 border border-white/5 shadow-xl text-left"
        >
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <h3 className="font-display text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Novidades da Versão 0.15
            </h3>
            <span className="ml-auto text-[9px] font-mono font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
              PWA ATIVO
            </span>
          </div>
          <div className="space-y-2.5 text-xs text-slate-400">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold mt-0.5">•</span>
              <p>
                <strong className="text-slate-200">Salas Abertas vs. Fechadas:</strong> Crie salas públicas que aparecem listadas automaticamente para entrada rápida de qualquer smartphone conectado, ou opte pela segurança tradicional com código.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">•</span>
              <p>
                <strong className="text-slate-200">Suporte Modo Claro de Cores:</strong> Correções visuais meticulosas no painel de sorteio, tickets neon e modal do ganhador para garantir legibilidade ideal sob ambientes ensolarados.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold mt-0.5">•</span>
              <p>
                <strong className="text-slate-200">Build Oficial Realizado em 21/05/2026:</strong> Versão consolidada com correções completas, desempenho refinado de carregamento e design card de destaques no painel inicial.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-400 font-bold mt-0.5">•</span>
              <p>
                <strong className="text-slate-200">Nova Logo 3D:</strong> Identidade reformulada com um troféu reluzente de alta definição para celebrar cada vitória!
              </p>
            </div>
          </div>
        </motion.div>

        {/* PWA Installation Panel */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.48 }}
          className="w-full mt-6 bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent backdrop-blur-md rounded-2xl p-5 border border-blue-500/20 shadow-xl text-left relative overflow-hidden animate-[pulse_6s_infinite]"
        >
          {/* subtle glow border indicator */}
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-indigo-600" />
          
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-5 h-5 text-blue-400 animate-bounce" />
            <h3 className="font-display text-sm font-extrabold text-white">
              Sorteios na sua Tela Inicial (Android & Windows)
            </h3>
            {isStandalone ? (
              <span className="ml-auto text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                INSTALADO 🚀
              </span>
            ) : (
              <span className="ml-auto text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                DISPONÍVEL
              </span>
            )}
          </div>

          {isStandalone ? (
            <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
              Você já está jogando na versão instalada do <strong className="text-blue-400 font-bold">VouGanhei!</strong>. Desfrute da tela cheia, sem barras do navegador, com máxima imersão!
            </p>
          ) : (
            <div className="space-y-3 font-sans mt-2">
              <p className="text-xs text-slate-400 leading-relaxed">
                Adicione o <strong className="text-blue-400 font-bold">VouGanhei!</strong> na sua tela de início para acompanhar os sorteios em tempo real com animações fluidas e suporte offline.
              </p>

              {isIOS ? (
                /* iOS Safari installation guidelines */
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs space-y-2 mt-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Share2 className="w-3.5 h-3.5 text-blue-400" /> Como Instalar no iPhone/iPad:
                  </div>
                  <ol className="list-decimal list-inside text-slate-400 space-y-1 text-[11px] leading-relaxed">
                    <li>Toque no ícone de <strong className="text-blue-400 font-bold">Compartilhar</strong> (<Share2 className="w-3 h-3 inline text-blue-450" /> na barra inferior do Safari).</li>
                    <li>Role para baixo e selecione <strong className="text-slate-200">Adicionar à Tela de Início</strong> (<Plus className="w-3 h-3 inline text-slate-200" />).</li>
                    <li>Clique em adicionar para desfrutar como aplicativo de loteria!</li>
                  </ol>
                </div>
              ) : (
                /* Android / Chrome standard trigger */
                <div className="flex flex-col gap-2 mt-2">
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Instalar Aplicativo VouGanhei!
                  </button>
                  <p className="text-[10px] text-slate-500 text-center leading-normal">
                    Se o instalador não abrir, toque em <strong className="text-slate-400 font-bold">Instalar aplicativo</strong> ou <strong className="text-slate-400 font-bold">Adicionar para a Tela Inicial</strong> nas preferências de seu navegador.
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Sleek Master Panel Access Config Gear */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center justify-center w-full"
        >
          <button
            onClick={onGoToMaster}
            className="p-3 bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/25 rounded-full transition-all cursor-pointer text-slate-500 hover:text-blue-400 shadow-md group"
            title="Configurações Master"
          >
            <Settings className="w-5 h-5 animate-[spin_10s_linear_infinite] group-hover:text-blue-400" />
          </button>
        </motion.div>

        {/* Donation Panel */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.52 }}
          className="w-full mt-6 bg-[#161920]/80 backdrop-blur-md rounded-2xl p-5 border border-white/5 shadow-xl text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-rose-500 animate-pulse" />
            <h3 className="font-display text-sm font-extrabold text-white">Contribua com o Projeto</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed font-sans max-w-sm mx-auto">
            Ajude o seminarista a produzir mais soluções tecnológicas para a Igreja, toda ajuda é bem vinda para cobrir os custos.
          </p>
          <div className="flex flex-col items-center justify-center bg-white/5 py-4 rounded-xl border border-white/5 group hover:border-emerald-500/20 transition-all">
            <form action="https://www.paypal.com/donate" method="post" target="_top">
              <input type="hidden" name="business" value="NSDVMFFLK95U6" />
              <input type="hidden" name="no_recurring" value="0" />
              <input type="hidden" name="item_name" value="Ajude o seminarista a produzir mais soluções tecnológicas para a Igreja, toda ajuda é bem vinda para cobrir os custos." />
              <input type="hidden" name="currency_code" value="BRL" />
              <input type="image" src="https://www.paypalobjects.com/pt_BR/BR/i/btn/btn_donateCC_LG.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Faça doações com o botão do PayPal" className="hover:scale-105 transition-transform" />
              <img alt="" border="0" src="https://www.paypal.com/pt_BR/i/scr/pixel.gif" width="1" height="1" />
            </form>
          </div>
        </motion.div>

        {/* Footnote credits and signature */}
        <div className="w-full text-center mt-8 pt-6 border-t border-white/5 opacity-80 shrink-0">
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
              <span className="text-emerald-400 font-bold uppercase">Conectado (PWA)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reusable elegant modal for custom browser dialogue suppression */}
      <CustomModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </div>
  );
}
