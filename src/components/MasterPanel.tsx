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
  RefreshCw 
} from "lucide-react";
import { Room } from "../types";

interface MasterPanelProps {
  onBack: () => void;
  onSelectAdminRoom: (roomId: string) => void;
}

export default function MasterPanel({ onBack, onSelectAdminRoom }: MasterPanelProps) {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testRoomName, setTestRoomName] = useState("");

  // Check session storage if already authenticated in this browser tab
  useEffect(() => {
    const savedPass = sessionStorage.getItem("master_password");
    if (savedPass === "7777") {
      setPassword("7777");
      fetchRoomsList("7777");
    }
  }, []);

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

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm(`Tem certeza que deseja excluir permanentemente a sala #${roomId}?`)) {
      return;
    }

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
                Senha de Acesso Máster (Dica: 7777)
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

          {/* RIGHT COLUMN: Active Rooms Management Table */}
          <div className="lg:col-span-8 bg-[#161920] border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white tracking-tight">Lista de Salas Criadas</h2>
              <span className="text-[10px] font-mono text-slate-550">
                Total de salas em execução: {rooms.length}
              </span>
            </div>

            {errorMsg && (
              <div className="mb-4 text-xs font-semibold text-rose-450 bg-rose-500/10 border border-rose-550/20 py-2.5 px-3 rounded-lg">
                ⚠️ {errorMsg}
              </div>
            )}

            {rooms.length === 0 ? (
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
                          title="Excluir Sala do Servidor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
