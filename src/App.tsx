import React, { useState, useEffect } from "react";
import Home from "./components/Home";
import AdminPanel from "./components/AdminPanel";
import ParticipantPanel from "./components/ParticipantPanel";
import MasterPanel from "./components/MasterPanel";
import { Room } from "./types";
import { apiFetch } from "./lib/api";
import { 
  firebaseCreateRoom, 
  firebaseJoinRoom, 
  firebaseAddPrize, 
  firebaseRemovePrize, 
  firebaseDrawPrize, 
  firebaseResetDraw, 
  firebaseSubscribeRoom,
  firebaseStartCountdown,
  firebaseClearCountdown
} from "./lib/firebase";
import CountdownAnimator from "./components/CountdownAnimator";
import { RefreshCw, ArrowLeft, AlertCircle, Sun, Moon, Wifi, WifiOff } from "lucide-react";
import { safeStorage, safeSessionStorage } from "./lib/safeStorage";

export default function App() {
  const [page, setPage] = useState<"home" | "room" | "master">("home");
  const [roomId, setRoomId] = useState<string>("");
  const [role, setRole] = useState<"admin" | "participant">("participant");
  
  const [roomState, setRoomState] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string>("");

  // Dark/Light Theme management
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (safeStorage.getItem("theme") as "dark" | "light") || "dark";
  });

  // Browser offline/online network status tracker
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    safeStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Manual update / refresh helper
  const handleForceRefresh = () => {
    setLoading(true);
    // If it's a PWA, we can also try to update service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.update();
        }
      });
    }
    // Simple window reload is the most reliable "update" for the user
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Dev Server URL - AI Studio proxies port 3000 to this domain
  // We guarantee it points to a publicly accessible host (like Cloud Run) when accessed inside sandboxes or on localhost, so that QR Code scans from phones never get blocked.
  const getAppUrl = () => {
    return "https://vouganhei.netlify.app";
  };
  const appUrl = getAppUrl();

  // Initialize client routing & player state
  useEffect(() => {
    // 1. Generate or retrieve an immutable player ID for this user session
    let id = safeStorage.getItem("raffle_player_id");
    if (!id) {
      id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      safeStorage.setItem("raffle_player_id", id);
    }
    setPlayerId(id);

    // 2. Simple URL path parser
    const parseUrl = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/room\/([A-Z0-9]{6})$/i);
      
      if (match) {
        const parsedRoomId = match[1].toUpperCase();
        setRoomId(parsedRoomId);
        setPage("room");
        
        // Define users credentials (creator vs regular player)
        const urlParams = new URLSearchParams(window.location.search);
        const forceParticipant = urlParams.get("role") === "participant";
        const isCreator = safeStorage.getItem(`raffle_room_${parsedRoomId}_creator`) === "true" && !forceParticipant;
        
        // Admin role is only allowed if they are the creator OR if they have the master password
        const hasMasterPower = safeSessionStorage.getItem("master_password") === "7777";
        const isAdminQuery = urlParams.get("role") === "admin" && hasMasterPower;
        
        setRole(isCreator || isAdminQuery ? "admin" : "participant");
        setError(null);
      } else if (path === "/master" || path.startsWith("/master")) {
        setPage("master");
        setRoomId("");
        setRoomState(null);
        setError(null);
      } else {
        setPage("home");
        setRoomId("");
        setRoomState(null);
        setError(null);
      }
    };

    parseUrl();
    window.addEventListener("popstate", parseUrl);
    return () => window.removeEventListener("popstate", parseUrl);
  }, []);

  // Sync Room real-time subscription
  useEffect(() => {
    if (page !== "room" || !roomId) return;

    const unsubscribe = firebaseSubscribeRoom(
      roomId, 
      (room) => {
        if (room) {
          setRoomState(room);
          setError(null);
          
          // Guard into recently joined rooms for single-click rejoin
          try {
            const recentsStr = safeStorage.getItem("raffle_recent_rooms");
            let recents = recentsStr ? JSON.parse(recentsStr) : [];
            if (!Array.isArray(recents)) recents = [];
            recents = recents.filter((r: any) => r.id !== room.id);
            recents.unshift({
              id: room.id,
              name: room.name,
              joinedAt: Date.now()
            });
            recents = recents.slice(0, 8); // Store up to 8 rooms
            safeStorage.setItem("raffle_recent_rooms", JSON.stringify(recents));
          } catch (e) {
            console.error("Erro ao atualizar histórico de salas:", e);
          }
        } else {
          setError("Sala de sorteio não encontrada. Ela pode ter expirado ou sido encerrada.");
        }
      },
      (err) => {
        console.error("Erro na inscrição em tempo real:", err);
        setError(`Erro de conexão com o banco em tempo real: ${err.message || String(err)}`);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [page, roomId]);

  // Client-side lightweight router helper
  const navigateTo = (path: string) => {
    window.history.pushState(null, "", path);
    window.dispatchEvent(new Event("popstate"));
  };

  const handleCreateRoom = async (roomName: string, isOpenRoom?: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const newRoom = await firebaseCreateRoom(roomName, playerId, isOpenRoom);
      
      // Store Creator ownership flags in browser to avoid logins
      safeStorage.setItem(`raffle_room_${newRoom.id}_creator`, "true");
      setRoomState(newRoom);
      
      navigateTo(`/room/${newRoom.id}`);
    } catch (err: any) {
      setError(err.message || "Falha ao criar sala.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = (code: string) => {
    navigateTo(`/room/${code.toUpperCase()}`);
  };

  const handleJoinParticipant = async (name: string, phone?: string, cpf?: string, playerIdSuffix?: string) => {
    setError(null);
    try {
      const targetPlayerId = playerIdSuffix ? playerId + playerIdSuffix : playerId;
      await firebaseJoinRoom(roomId, name, targetPlayerId, phone, cpf);
    } catch (err: any) {
      throw new Error(err.message || "Não foi possível participar do sorteio.");
    }
  };

  const handleAddPrize = async (name: string) => {
    try {
      await firebaseAddPrize(roomId, name);
    } catch (err) {
      console.error("Erro ao adicionar prêmio", err);
    }
  };

  const handleRemovePrize = async (prizeId: string) => {
    try {
      await firebaseRemovePrize(roomId, prizeId);
    } catch (err) {
      console.error("Erro ao remover prêmio", err);
    }
  };

  const handleDrawPrize = async (prizeId: string) => {
    try {
      await firebaseDrawPrize(roomId, prizeId);
    } catch (err) {
      console.error("Erro ao realizar sorteio", err);
    }
  };

  const handleStartCountdown = async (prizeId: string, durationMs: number) => {
    try {
      await firebaseStartCountdown(roomId, durationMs, prizeId);
    } catch (err) {
      console.error("Erro ao iniciar contagem regressiva", err);
    }
  };

  const handleClearCountdown = async () => {
    try {
      await firebaseClearCountdown(roomId);
    } catch (err) {
      console.error("Erro ao limpar contagem regressiva", err);
    }
  };

  const handleResetDrawState = async () => {
    try {
      await firebaseResetDraw(roomId);
    } catch (err) {
      console.error("Erro ao restaurar estado", err);
    }
  };

  const handleLeaveRoom = () => {
    navigateTo("/");
  };

  const handleSwitchRole = (newRole: "admin" | "participant") => {
    if (!roomState) return;
    const currentUrl = new URL(window.location.href);
    if (newRole === "participant") {
      currentUrl.searchParams.set("role", "participant");
    } else {
      currentUrl.searchParams.set("role", "admin");
    }
    window.history.pushState({}, "", currentUrl.toString());
    setRole(newRole);
  };

  // Error overlay block
  const renderContent = () => {
    let canSwitchRole = false;
    if (roomState) {
      const isCreator = safeStorage.getItem(`raffle_room_${roomState.id}_creator`) === "true";
      const hasMasterPower = safeSessionStorage.getItem("master_password") === "7777";
      canSwitchRole = isCreator || hasMasterPower;
    }

    if (error) {
      return (
        <div className="min-h-screen bg-[#0F1115] text-[#E2E8F0] flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#161920] border border-white/5 p-8 rounded-2xl text-center shadow-xl">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold text-white mb-2">Ops! Algo deu errado</h3>
            <p className="text-slate-400 text-sm font-sans mb-6 leading-relaxed">
              {error}
            </p>
            <button
              onClick={handleLeaveRoom}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer uppercase tracking-wider font-mono shadow-blue-500/20"
            >
              Voltar para o Início
            </button>
          </div>
        </div>
      );
    }

    if (page === "room") {
      if (!roomState) {
        return (
          <div className="min-h-screen bg-[#0F1115] text-[#E2E8F0] flex flex-col items-center justify-center">
            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-sm font-sans text-slate-450">Carregando sala de sorteio...</p>
          </div>
        );
      }

      if (role === "admin") {
        return (
          <AdminPanel
            room={roomState}
            playerId={playerId}
            onAddPrize={handleAddPrize}
            onRemovePrize={handleRemovePrize}
            onDrawPrize={handleDrawPrize}
            onStartCountdown={handleStartCountdown}
            onResetDrawState={handleResetDrawState}
            onLeaveRoom={handleLeaveRoom}
            appUrl={appUrl}
            canSwitchRole={canSwitchRole}
            onSwitchRole={() => handleSwitchRole("participant")}
          />
        );
      }

      return (
        <ParticipantPanel
          room={roomState}
          playerId={playerId}
          onJoin={handleJoinParticipant}
          onLeaveRoom={handleLeaveRoom}
          canSwitchRole={canSwitchRole}
          onSwitchRole={() => handleSwitchRole("admin")}
        />
      );
    }

    if (page === "master") {
      return (
        <MasterPanel
          onBack={handleLeaveRoom}
          onSelectAdminRoom={(selectedRoomId) => {
            setRoomId(selectedRoomId);
            setRole("admin");
            setPage("room");
            navigateTo(`/room/${selectedRoomId}?role=admin`);
          }}
        />
      );
    }

    return (
      <Home
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinByCode}
        isLoading={loading}
        onGoToMaster={() => navigateTo("/master")}
      />
    );
  };

  return (
    <div className="min-h-screen relative">
      {/* Floating Network & Theme Utilities Layer */}
      <div className="fixed top-4 right-4 z-[9999] flex items-center gap-2">
        {/* Network connection HUD */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161920]/85 backdrop-blur-md border border-white/5 shadow-xl select-none">
          <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
          <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-slate-400">
            {isOnline ? "Online" : "Sem Rede"}
          </span>
        </div>

        {/* Manual Refresh Action */}
        <button
          onClick={handleForceRefresh}
          className="p-2.5 bg-[#161920]/85 hover:bg-[#161920] border border-white/5 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-blue-400 hover:rotate-180 shadow-xl flex items-center justify-center backdrop-blur-md active:scale-95"
          title="Verificar Atualizações / Recarregar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {/* Sun/Moon Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 bg-[#161920]/85 hover:bg-[#161920] border border-white/5 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-amber-400 hover:scale-105 shadow-xl flex items-center justify-center backdrop-blur-md"
          title={theme === "dark" ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>

      {renderContent()}
      
      {/* Global Countdown Animator */}
      {roomState && roomState.countdownEndsAt && roomState.countdownEndsAt > Date.now() && (
        <CountdownAnimator
          countdownEndsAt={roomState.countdownEndsAt}
          isAdmin={role === "admin"}
          onFinish={() => {
            if (roomState.countdownPrizeId && role === "admin") {
              handleDrawPrize(roomState.countdownPrizeId);
              handleClearCountdown();
            }
          }}
          onCancel={() => {
            if (role === "admin") {
              handleClearCountdown();
            }
          }}
        />
      )}
    </div>
  );
}
