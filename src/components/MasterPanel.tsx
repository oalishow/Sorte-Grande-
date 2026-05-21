import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  LockKeyhole, 
  ArrowLeft, 
  Trash2, 
  ExternalLink, 
  Sparkles, 
  Users, 
  Gift, 
  Eye, 
  Database,
  RefreshCw,
  Undo,
  RotateCcw
} from "lucide-react";
import { Room } from "../types";
import CustomModal from "./CustomModal";

interface MasterPanelProps {
  onBack: () => void;
  onSelectAdminRoom: (roomId: string) => void;
}

export default function MasterPanel({ onBack, onSelectAdminRoom }: MasterPanelProps) {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [trashedRooms, setTrashedRooms] = useState<Room[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [isLoading, setIsLoading] = useState(false);
  const [testRoomName, setTestRoomName] = useState("");

  // Custom Modal States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteRoomId, setPendingDeleteRoomId] = useState<string | null>(null);

  const [deletePermanentConfirmOpen, setDeletePermanentConfirmOpen] = useState(false);
  const [pendingPermanentDeleteId, setPendingPermanentDeleteId] = useState<string | null>(null);

  // Check session storage if already authenticated in this browser tab
  useEffect(() => {
    const savedPass = sessionStorage.getItem("master_password");
    if (savedPass === "7777") {
      setPassword("7777");
      fetchRoomsList("7777");
    }
  }, []);

  const fetchTrashedRoomsList = async (pass: string) => {
    try {
      const res = await fetch("/api/admin/rooms/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass }),
      });
      if (res.ok) {
        const data = await res.json();
        setTrashedRooms(data.rooms || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRoomsList = async (pass: string) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Acesso negado.");
      }

      const data = await res.json();
      setRooms(data.rooms || []);
      setIsUnlocked(true);
      sessionStorage.setItem("master_password", pass);

      await fetchTrashedRoomsList(pass);
    } catch (err: any) {
      setErrorMsg(err.message || "Senha incorreta ou erro no servidor.");
      setIsUnlocked(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg("Insira a senha mestre.");
      return;
    }
    fetchRoomsList(password);
  };

  const handleCreateTestRoom = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/rooms/create-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          password: "7777", 
          roomName: testRoomName || undefined 
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar sala de teste.");
      }

      const newTestRoom: Room = await res.json();
      // Add local storage admin authorization flag for this room
      localStorage.setItem(`raffle_room_${newTestRoom.id}_creator`, "true");
      
      // Select and redirect to admin panel for this room instantly!
      onSelectAdminRoom(newTestRoom.id);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
      setTestRoomName("");
    }
  };

  const handleDeleteRoom = (roomId: string) => {
    setPendingDeleteRoomId(roomId);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteRoom = async (roomId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/rooms/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "7777", roomId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao excluir.");
      }

      // Refresh the list immediately
      await fetchRoomsList("7777");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
      setPendingDeleteRoomId(null);
    }
  };

  const handleRestoreRoom = async (roomId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/rooms/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "7777", roomId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao restaurar a sala.");
      }

      await fetchRoomsList("7777");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoomPermanentlyModal = (roomId: string) => {
    setPendingPermanentDeleteId(roomId);
    setDeletePermanentConfirmOpen(true);
  };

  const executeDeleteRoomPermanently = async (roomId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/rooms/delete-permanently", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "7777", roomId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao excluir permanentemente.");
      }

      await fetchRoomsList("7777");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
      setPendingPermanentDeleteId(null);
    }
  };

  const handleEmptyTrash = async () => {
    const confirmChoice = window.confirm("Você tem certeza de que deseja esvaziar a lixeira? Todas as salas nela serão apagadas definitivamente.");
    if (!confirmChoice) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/rooms/empty-trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "7777" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao limpar.");
      }

      await fetchRoomsList("7777");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAuth = () => {
    sessionStorage.removeItem("master_password");
    setIsUnlocked(false);
    setPassword("");
  };

  // 1. Password Protection View
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#0F1115] text-[#E2E8F0] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-sans">
        {/* Background glow flares */}
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px]" />

        <div className="relative z-10 w-full max-w-md bg-[#161920] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl text-center">
          <button 
            onClick={onBack}
            className="absolute left-6 top-6 p-2 text-slate-400 hover:text-white bg-[#0F1115] border border-white/5 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center border border-blue-500/20 mx-auto mb-4 mt-4">
            <LockKeyhole className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">Acesso de Configuração Master</h2>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
            Digite a senha mestre de integridade do sistema para monitorar salas ativas e rodar o modo de teste.
          </p>

          <form onSubmit={handleUnlock} className="mt-8 space-y-4">
            {errorMsg && (
              <div className="text-xs font-semibold text-rose-450 bg-rose-500/10 border border-rose-550/20 py-2.5 px-3 rounded-lg text-left">
                ⚠️ {errorMsg}
              </div>
            )}

            <div className="text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Senha de Acesso Máster
              </label>
              <input 
                type="password"
                maxLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                className="w-full bg-[#0F1115] border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3 px-4 text-center text-2xl font-mono tracking-widest text-[#E2E8F0] outline-none transition-all placeholder:text-slate-700"
                autoFocus
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all uppercase tracking-wider font-mono shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Validando..." : "Desbloquear Painel 🔓"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Unlocked Control Center Panel
  const totalParticipantsInSystem = rooms.reduce((acc, current) => acc + (current.participants?.length || 0), 0);
  const totalPrizesInSystem = rooms.reduce((acc, current) => acc + (current.prizes?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E2E8F0] p-4 md:p-8 font-sans relative overflow-x-hidden select-none">
      {/* Background glow flares */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Header toolbar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2.5 bg-[#161920] border border-white/5 hover:border-white/10 hover:text-white rounded-xl transition-all cursor-pointer"
              title="Voltar ao início"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl md:text-3xl font-black text-white tracking-tight">
                  Painel de Controle Máster
                </h1>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded uppercase tracking-wider font-mono">
                  SESSÃO AUTORIZADA
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Monitoramento global de sorteios criados e simulações para teste.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchRoomsList("7777")}
              disabled={isLoading}
              className="p-2.5 bg-[#161920] border border-white/5 hover:bg-[#1a1d25] rounded-xl text-slate-450 transition-all cursor-pointer"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin text-blue-500" : ""}`} />
            </button>

            <button
              onClick={handleClearAuth}
              className="px-4 py-2 bg-rose-500/10 border border-rose-550/20 hover:bg-rose-500/20 text-rose-400 font-semibold rounded-xl text-xs md:text-sm transition-all cursor-pointer"
            >
              Bloquear Painel 🔒
            </button>
          </div>
        </div>

        {/* System Overview Dashboard Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#161920] rounded-2xl p-5 border border-white/5 shadow-xl flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20 shrink-0">
              <Database className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8] block">Salas Ativas</span>
              <span className="text-xl md:text-2xl font-black text-white block mt-0.5">{rooms.length}</span>
            </div>
          </div>

          <div className="bg-[#161920] rounded-2xl p-5 border border-white/5 shadow-xl flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8] block">Participantes</span>
              <span className="text-xl md:text-2xl font-black text-white block mt-0.5">{totalParticipantsInSystem}</span>
            </div>
          </div>

          <div className="bg-[#161920] rounded-2xl p-5 border border-white/5 shadow-xl flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20 shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8] block">Prêmios</span>
              <span className="text-xl md:text-2xl font-black text-white block mt-0.5">{totalPrizesInSystem}</span>
            </div>
          </div>

          <div className="bg-[#161920] rounded-2xl p-5 border border-white/5 shadow-xl flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8] block">Modo de Teste</span>
              <span className="text-xs md:text-sm font-bold text-emerald-400 block mt-1">DISPONÍVEL</span>
            </div>
          </div>
        </div>

        {/* Main Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Test Mode Trigger & Preset Creator */}
          <div className="lg:col-span-4 bg-[#161920] border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-450" />
              <h2 className="text-lg font-bold text-white tracking-tight">Ativar Modo Teste</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              O Modo Teste permite simular instantaneamente as funcionalidades do sorteio. 
              Gera uma sala de sorteio preenchida com <span className="text-white font-bold">8 nomes fakes</span> e <span className="text-white font-bold">5 prêmios</span> para brincar e testar.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Nome Personalizado da Sala (Opcional)
                </label>
                <input
                  type="text"
                  value={testRoomName}
                  onChange={(e) => setTestRoomName(e.target.value)}
                  placeholder="Ex: Sorteio Demo Gala Tech"
                  className="w-full bg-[#0F1115] border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3 px-4 text-xs md:text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              <button
                type="button"
                onClick={handleCreateTestRoom}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold py-3.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider font-mono shadow-blue-500/20"
              >
                <Sparkles className="w-4 h-4 text-white shrink-0 animate-spin" />
                Criar Sala de Teste ✦
              </button>
            </div>

            <div className="mt-6 pt-5 border-t border-white/5 text-[11px] text-slate-500">
              💡 Ao clicar acima, a sala é gerada em background e você será automaticamente redirecionado como o 
              Administrador dela. Daí você já pode simular os giros!
            </div>
          </div>

          {/* RIGHT COLUMN: Active Rooms & Trashed Rooms Toggle Segment */}
          <div className="lg:col-span-8 bg-[#161920] border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col min-h-[460px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 mb-4 gap-4">
              <div className="flex items-center gap-2 bg-[#0F1115] p-1 rounded-xl border border-white/5 select-none shrink-0">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'active'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Salas Ativas ({rooms.length})
                </button>
                <button
                  onClick={() => setActiveTab('trash')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'trash'
                      ? 'bg-rose-500/20 text-rose-450 border border-rose-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/5'
                  }`}
                >
                  Lixeira ({trashedRooms.length})
                </button>
              </div>

              {activeTab === 'trash' && trashedRooms.length > 0 && (
                <button
                  onClick={handleEmptyTrash}
                  className="px-3.5 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-[#f43f5e] font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 border border-rose-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Esvaziar Lixeira 🗑️
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="mb-4 text-xs font-semibold text-rose-450 bg-rose-500/10 border border-rose-550/20 py-2.5 px-3 rounded-lg">
                ⚠️ {errorMsg}
              </div>
            )}

            {activeTab === 'active' ? (
              rooms.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                  <div className="text-3xl mb-3">📭</div>
                  <h4 className="text-sm font-bold text-slate-400">Nenhuma sala criada no momento</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Abra a tela inicial e crie um sorteio ou use o Modo Teste na coluna ao lado.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {rooms.map((room) => {
                    const dateStr = room.createdAt ? new Date(room.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    }) : "Horário desconhecido";
                    
                    return (
                      <div 
                        key={room.id}
                        className="p-4 bg-[#0F1115] hover:bg-opacity-80 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 shrink-0">
                              #{room.id}
                            </span>
                            <h3 className="font-sans font-extrabold text-sm text-slate-200 truncate max-w-[240px]">
                              {room.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-600" />
                              {room.participants?.length || 0} Participantes
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Gift className="w-3.5 h-3.5 text-slate-600" />
                              {room.prizes?.length || 0} Prêmios
                            </span>
                            <span>•</span>
                            <span>Criada às {dateStr}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0">
                          {/* Go to Admin panel button */}
                          <button
                            onClick={() => onSelectAdminRoom(room.id)}
                            className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/30 text-blue-400 font-bold rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
                            title="Gerenciar como Administrador"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Gerenciar
                          </button>

                          {/* Destructive delete tool */}
                          <button
                            onClick={() => handleDeleteRoom(room.id)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-550/20 text-rose-450 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
                            title="Mover para a Lixeira"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              trashedRooms.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20 select-none">
                  <div className="text-3xl mb-3">🗑️</div>
                  <h4 className="text-sm font-bold text-slate-450">Lixeira vazia</h4>
                  <p className="text-xs text-slate-550 mt-1 max-w-xs">
                    As salas que você excluir ficarão na lixeira para que possa restaurá-las caso precise.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {trashedRooms.map((room) => {
                    const dateStr = room.deletedAt ? new Date(room.deletedAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    }) : "Horário desconhecido";
                    
                    return (
                      <div 
                        key={room.id}
                        className="p-4 bg-[#0F1115]/50 hover:bg-opacity-80 rounded-2xl border border-dashed border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="font-mono text-xs font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 shrink-0 line-through">
                              #{room.id}
                            </span>
                            <h3 className="font-sans font-extrabold text-sm text-slate-400 truncate max-w-[240px]">
                              {room.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-650" />
                              {room.participants?.length || 0} Participantes
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Gift className="w-3.5 h-3.5 text-slate-650" />
                              {room.prizes?.length || 0} Prêmios
                            </span>
                            <span>•</span>
                            <span className="text-rose-500/85 bg-rose-500/5 px-1.5 py-0.5 rounded text-[10px]">Excluída às {dateStr}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0">
                          {/* Restore Button */}
                          <button
                            onClick={() => handleRestoreRoom(room.id)}
                            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
                            title="Restaurar de volta às salas ativas"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restaurar
                          </button>

                          {/* Permanently delete Button */}
                          <button
                            onClick={() => handleDeleteRoomPermanentlyModal(room.id)}
                            className="p-1.5 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-[#ef4444] rounded-xl transition-all cursor-pointer"
                            title="Apagar Definitivamente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation custom modal */}
      <CustomModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setPendingDeleteRoomId(null);
        }}
        onConfirm={() => {
          if (pendingDeleteRoomId) {
            executeDeleteRoom(pendingDeleteRoomId);
          }
        }}
        title="Mover para a Lixeira?"
        message={`Esta ação moverá a sala #${pendingDeleteRoomId} para a lixeira de salas excluídas. A sala poderá ser restaurada a qualquer momento a partir da aba Lixeira.\n\nDeseja prosseguir?`}
        type="confirm"
        confirmText="Sim, Mover"
        cancelText="Voltar"
      />

      {/* Delete permanently confirmation custom modal */}
      <CustomModal
        isOpen={deletePermanentConfirmOpen}
        onClose={() => {
          setDeletePermanentConfirmOpen(false);
          setPendingPermanentDeleteId(null);
        }}
        onConfirm={() => {
          if (pendingPermanentDeleteId) {
            executeDeleteRoomPermanently(pendingPermanentDeleteId);
          }
        }}
        title="Excluir Permanentemente?"
        message={`Esta ação irá esvaziar/excluir tudo sobre a sala #${pendingPermanentDeleteId} de forma DEFINITIVA do servidor. Todos os cadastros, prêmios e sorteios serão limpos para sempre.\n\nEsta operação NÃO tem volta! Confirma a exclusão definitiva?`}
        type="confirm"
        confirmText="Sim, Apagar para Sempre"
        cancelText="Voltar"
      />
    </div>
  );
}
