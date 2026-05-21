import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Gift, Sparkles, Send, Shield, Radio, Settings, KeyRound, Trophy, Award, Download, Smartphone, Share2, Plus, Monitor } from "lucide-react";
import VouGanheiLogo from "./VouGanheiLogo";
import CustomModal from "./CustomModal";

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
              Novidades da Versão 0.11
            </h3>
            <span className="ml-auto text-[9px] font-mono font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
              PWA ATIVO
            </span>
          </div>
          <div className="space-y-2.5 text-xs text-slate-400">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">•</span>
              <p>
                <strong className="text-slate-200">Próximo Prêmio Rápido:</strong> Ao clicar em "Próximo Prêmio", o sorteio do próximo item inicia na sequência automaticamente, poupando caminhos.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold mt-0.5">•</span>
              <p>
                <strong className="text-slate-200">Instalação PWA:</strong> Adicione o <strong className="text-blue-400">VouGanhei!</strong> diretamente na sua tela inicial para acesso offline e fluido.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold mt-0.5">•</span>
              <p>
                <strong className="text-slate-200">Rede & Conexão:</strong> Status ativos no rodapé para garantir o seu sincronismo dinâmico nos sorteios ao vivo.
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

          {/* Consistent Cross-Platform Logo Visual (Android App == Windows App == Web App) */}
          <div className="mb-4 bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4 justify-around">
            <div className="flex flex-col items-center text-center">
              <span className="text-[10px] text-slate-400 font-mono font-bold mb-1 uppercase flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-emerald-500" /> App Android
              </span>
              <div className="p-3 bg-[#0F1115] rounded-2xl border border-white/5 shadow-inner">
                <VouGanheiLogo size="sm" animate={false} />
              </div>
              <span className="text-[9px] text-slate-500 mt-1 font-sans">VouGanhei.apk</span>
            </div>

            <div className="text-xl text-blue-500/30 font-bold hidden sm:block">＝</div>

            <div className="flex flex-col items-center text-center">
              <span className="text-[10px] text-slate-400 font-mono font-bold mb-1 uppercase flex items-center gap-1">
                <Monitor className="w-3 h-3 text-blue-400" /> App Windows
              </span>
              <div className="p-3 bg-[#0F1115] rounded-2xl border border-white/5 shadow-inner">
                <VouGanheiLogo size="sm" animate={false} />
              </div>
              <span className="text-[9px] text-slate-500 mt-1 font-sans">VouGanhei.exe</span>
            </div>

            <div className="text-xl text-blue-500/30 font-bold hidden sm:block">＝</div>

            <div className="flex flex-col items-center text-center">
              <span className="text-[10px] text-slate-400 font-mono font-bold mb-1 uppercase flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-500 animate-spin" style={{ animationDuration: "12s" }} /> Versão Web
              </span>
              <div className="p-3 bg-[#0F1115] rounded-2xl border border-white/5 shadow-inner">
                <VouGanheiLogo size="sm" animate={false} />
              </div>
              <span className="text-[9px] text-slate-500 mt-1 font-sans">Navegador PWA</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans font-semibold text-center py-1 border-b border-white/5 mb-3">
            ✨ Uma única marca unificada! A mesma logo oficial está presente em todas as plataformas!
          </p>

          {isStandalone ? (
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Você já está jogando na versão instalada do <strong className="text-blue-400 font-bold">VouGanhei!</strong>. Desfrute da tela cheia, sem barras do navegador, com máxima imersão!
            </p>
          ) : (
            <div className="space-y-3 font-sans">
              <p className="text-xs text-slate-400 leading-relaxed">
                Adicione o <strong className="text-blue-400 font-bold">VouGanhei!</strong> na sua tela de início para acompanhar os sorteio em tempo real com animações fluidas e suporte offline.
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

        {/* Footnote credits and signature */}
        <div className="w-full text-center mt-8 pt-6 border-t border-white/5 opacity-80 shrink-0">
          <p className="text-[10px] text-slate-500 font-medium font-sans">
            Criado em 2026 por Alison Fernando Rodrigues dos Santos - VouGanhei!
          </p>
          <div className="flex items-center justify-center gap-3 mt-1.5 text-[9px] text-slate-600 font-mono">
            <span>Versão: 0.11 (Beta)</span>
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
