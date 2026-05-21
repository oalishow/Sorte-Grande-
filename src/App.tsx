import React, { useState, useEffect } from "react";
import Home from "./components/Home";
import AdminPanel from "./components/AdminPanel";
import ParticipantPanel from "./components/ParticipantPanel";
import MasterPanel from "./components/MasterPanel";
import { Room } from "./types";
import { apiFetch } from "./lib/api";
import { RefreshCw, ArrowLeft, AlertCircle, Sun, Moon, Wifi, WifiOff } from "lucide-react";

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
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });

  // Browser offline/online network status tracker
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
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

  // Dev Server URL - AI Studio proxies port 3000 to this domain
  const appUrl = window.location.origin;

  // Initialize client routing & player state
  useEffect(() => {
    // 1. Generate or retrieve an immutable player ID for this user session
    let id = localStorage.getItem("raffle_player_id");
    if (!id) {
      id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("raffle_player_id", id);
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
        const isCreator = localStorage.getItem(`raffle_room_${parsedRoomId}_creator`) === "true";
        const urlParams = new URLSearchParams(window.location.search);
        const isAdminQuery = urlParams.get("role") === "admin";
        
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

  // Sync Room polling interval
  useEffect(() => {
    if (page !== "room" || !roomId) return;

    let isSubscribed = true;
    
    const fetchRoom = async () => {
      try {
        const res = await apiFetch(`/api/rooms/${roomId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Sala de sorteio não encontrada. Ela pode ter expirado ou sido encerrada.");
          }
          throw new Error("Erro de comunicação com o servidor.");
        }
        const data: Room = await res.json();
        if (isSubscribed) {
          setRoomState(data);
          setError(null);
        }
      } catch (err: any) {
        if (isSubscribed) {
          setError(err.message || "Erro de conexão.");
        }
      }
    };

    // Initial load
    fetchRoom();

    // Poll every 1200ms
    const interval = setInterval(fetchRoom, 1200);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
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
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, creatorId: playerId, isOpenRoom }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao criar sala.");
      }
      const newRoom: Room = await res.json();
      
      // Store Creator ownership flags in browser to avoid logins
      localStorage.setItem(`raffle_room_${newRoom.id}_creator`, "true");
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

  const handleJoinParticipant = async (name: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/join`, {
        method: "POST", // mapped through root or api rules
      });
      // Try posting directly to room join
      const joinres = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, playerId }),
      });

      if (!joinres.ok) {
        const data = await joinres.json();
        throw new Error(data.error || "Falha ao registrar participante.");
      }
      
      // Immediate pull update
      const updatedRes = await fetch(`/api/rooms/${roomId}`);
      if (updatedRes.ok) {
        const updatedData = await updatedRes.json();
        setRoomState(updatedData);
      }
    } catch (err: any) {
      throw new Error(err.message || "Não foi possível participar do sorteio.");
    }
  };

  const handleAddPrize = async (name: string) => {
    try {
      const masterPassword = sessionStorage.getItem("master_password") || "";
      const res = await fetch(`/api/rooms/${roomId}/prizes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, playerId, masterPassword }),
      });
      
      if (res.ok) {
        const updatedRes = await fetch(`/api/rooms/${roomId}`);
        if (updatedRes.ok) {
          setRoomState(await updatedRes.json());
        }
      }
    } catch (err) {
      console.error("Erro ao adicionar prêmio", err);
    }
  };

  const handleRemovePrize = async (prizeId: string) => {
    try {
      const masterPassword = sessionStorage.getItem("master_password") || "";
      const params = new URLSearchParams({
        playerId,
        masterPassword,
      });
      const res = await fetch(`/api/rooms/${roomId}/prizes/${prizeId}?${params.toString()}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        const updatedRes = await fetch(`/api/rooms/${roomId}`);
        if (updatedRes.ok) {
          setRoomState(await updatedRes.json());
        }
      }
    } catch (err) {
      console.error("Erro ao remover prêmio", err);
    }
  };

  const handleDrawPrize = async (prizeId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prizeId }),
      });
      
      if (res.ok) {
        const updatedRes = await fetch(`/api/rooms/${roomId}`);
        if (updatedRes.ok) {
          setRoomState(await updatedRes.json());
        }
      }
    } catch (err) {
      console.error("Erro ao realizar sorteio", err);
    }
  };

  const handleResetDrawState = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/reset`, {
        method: "POST",
      });
      
      if (res.ok) {
        const updatedRes = await fetch(`/api/rooms/${roomId}`);
        if (updatedRes.ok) {
          setRoomState(await updatedRes.json());
        }
      }
    } catch (err) {
      console.error("Erro ao restaurar estado", err);
    }
  };

  const handleLeaveRoom = () => {
    navigateTo("/");
  };

  // Error overlay block
  const renderContent = () => {
    if (error && page === "room") {
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
            onResetDrawState={handleResetDrawState}
            onLeaveRoom={handleLeaveRoom}
            appUrl={appUrl}
          />
        );
      }

      return (
        <ParticipantPanel
          room={roomState}
          playerId={playerId}
          onJoin={handleJoinParticipant}
          onLeaveRoom={handleLeaveRoom}
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
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161920]/85 backdrop-blur-md border border-white/5 shadow-xl select-none">
          <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
          <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-slate-400">
            {isOnline ? "Online" : "Sem Rede"}
          </span>
        </div>

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
    </div>
  );
}
