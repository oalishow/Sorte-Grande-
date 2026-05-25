import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, MessageSquare, Shield, Smile, VolumeX, Volume2, Trash2 } from "lucide-react";
import { Room, ChatMessage } from "../types";
import { firebaseSendChatMessage, firebaseMuteUser, firebaseRemoveUserMessages, firebaseUpdateTypingStatus } from "../lib/firebase";

interface LiveChatProps {
  room: Room;
  playerId: string;
  playerName: string;
  isAdmin?: boolean;
}

export default function LiveChat({ room, playerId, playerName, isAdmin = false }: LiveChatProps) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = room.messages || [];
  const mutedUserIds = room.mutedUserIds || [];

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyTypingRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Check if current user is muted
  const isLocalUserMuted = !isAdmin && mutedUserIds.includes(playerId);

  // Background timer to refresh currentTime every 2 seconds for pruning stale local markers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 2000);
    return () => {
      clearInterval(timer);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Compute active typing users from Firestore data (excluding local user, older than 7 seconds is stale)
  const activeTypingList = Object.entries(room.typingUsers || {})
    .filter(([uid, data]) => {
      return uid !== playerId && (currentTime - data.timestamp < 7000);
    })
    .map(([_, data]) => data.name);

  // Auto scroll to bottom when a message arrives or typing lists change size
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, activeTypingList.length]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    if (isLocalUserMuted) return;

    // Send typing: true if starting to type
    if (!isCurrentlyTypingRef.current && val.trim().length > 0) {
      isCurrentlyTypingRef.current = true;
      firebaseUpdateTypingStatus(room.id, playerId, playerName, true);
    }

    // Stop typing immediately if input is cleared
    if (val.trim().length === 0) {
      if (isCurrentlyTypingRef.current) {
        isCurrentlyTypingRef.current = false;
        firebaseUpdateTypingStatus(room.id, playerId, playerName, false);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      return;
    }

    // Debounce the stop-typing update
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isCurrentlyTypingRef.current = false;
      firebaseUpdateTypingStatus(room.id, playerId, playerName, false);
    }, 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending || isLocalUserMuted) return;

    const messageText = text.trim();
    setText("");
    setIsSending(true);

    // Cancel typing indicator when message is submitted
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isCurrentlyTypingRef.current = false;
    firebaseUpdateTypingStatus(room.id, playerId, playerName, false);

    try {
      await firebaseSendChatMessage(room.id, playerId, playerName, messageText, isAdmin);
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Preset emojis for fast tap reactions
  const emojis = ["👋", "🎉", "🔥", "🚀", "🍀", "🏆", "🌟", "😱"];

  const handleEmojiClick = async (emoji: string) => {
    if (isSending || isLocalUserMuted) return;
    setIsSending(true);
    try {
      await firebaseSendChatMessage(room.id, playerId, playerName, emoji, isAdmin);
    } catch (err) {
      console.error("Erro ao enviar emoji:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleMute = async (senderIdToMute: string, currentlyMuted: boolean) => {
    try {
      await firebaseMuteUser(room.id, senderIdToMute, !currentlyMuted);
    } catch (err) {
      console.error("Erro ao modular silêncio do usuário:", err);
    }
  };

  const handleRemoveMessages = async (senderIdToRemove: string, senderName: string) => {
    if (window.confirm(`Deseja apagar todas as mensagens enviadas por "${senderName}" neste chat?`)) {
      try {
        await firebaseRemoveUserMessages(room.id, senderIdToRemove);
      } catch (err) {
        console.error("Erro ao remover mensagens do chat:", err);
      }
    }
  };

  return (
    <div className="bg-[#161920] border border-white/5 rounded-2.5xl shadow-xl flex flex-col h-[400px] overflow-hidden">
      {/* Chat Header */}
      <div className="bg-[#111319] px-4 py-3 border-b border-white/5 flex items-center justify-between select-none animate-fade-in">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/10">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider font-sans">
              Chat em Tempo Real 💬
            </h4>
            <p className="text-[9px] text-slate-400">
              {messages.length === 0 ? "Comece a conversa!" : `${messages.length} mensagens enviadas`}
            </p>
          </div>
        </div>
        
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>

      {/* Messages Stream */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth bg-[#0F1115]/45"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 select-none">
            <MessageSquare className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
            <p className="text-xs text-slate-400 font-sans">Nenhuma mensagem ainda.</p>
            <p className="text-[10px] text-slate-650 mt-0.5">Mande sua mensagem e torça junto!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMe = msg.senderId === playerId;
              const isSenderMuted = !msg.isAdmin && mutedUserIds.includes(msg.senderId);
              
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  {/* Sender title bar */}
                  <div className="flex items-center gap-1.5 mb-1 max-w-full truncate px-1 text-[10px]">
                    {msg.isAdmin ? (
                      <span className="flex items-center gap-0.5 text-rose-450 font-bold bg-rose-500/10 border border-rose-500/20 px-1 py-0.5 rounded-md scale-90">
                        <Shield className="w-2.5 h-2.5 fill-rose-500/10" /> Admin
                      </span>
                    ) : (
                      <span className={`font-bold ${isMe ? "text-blue-400" : "text-slate-400"}`}>
                        {msg.senderName}
                      </span>
                    )}

                    {/* 'User Muted' indicator */}
                    {isSenderMuted && (
                      <span className="text-[9px] text-[#f43f5e] bg-rose-500/10 border border-rose-500/20 rounded px-1.5 py-0.2 select-none font-black inline-flex items-center gap-0.5">
                        [Usuário Silenciado 🔇]
                      </span>
                    )}

                    <span className="text-[8px] text-slate-650 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* Admin Moderation Button Tray */}
                    {isAdmin && !msg.isAdmin && (
                      <div className="flex items-center gap-1 ml-1 shrink-0 select-none scale-90">
                        <button
                          type="button"
                          onClick={() => handleToggleMute(msg.senderId, isSenderMuted)}
                          className={`p-1 rounded-md transition-all active:scale-75 ${
                            isSenderMuted
                              ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-450 border border-emerald-500/20"
                              : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20"
                          }`}
                          title={isSenderMuted ? "Permitir voz (Desmutar)" : "Silenciar usuário (Mute)"}
                        >
                          {isSenderMuted ? (
                            <Volume2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <VolumeX className="w-3 h-3 text-amber-500" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveMessages(msg.senderId, msg.senderName)}
                          className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/20 rounded-md transition-all active:scale-75"
                          title="Remover todas as mensagens do participante"
                        >
                          <Trash2 className="w-3 h-3 text-rose-450" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`px-3.5 py-2 rounded-2xl max-w-[85%] text-xs font-sans leading-relaxed break-words shadow-sm transition-all ${
                      isMe
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none"
                        : "bg-[#1C202B]/85 border border-white/5 text-slate-200 rounded-tl-none"
                    } ${isSenderMuted ? "opacity-75" : ""}`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* Live Typing Indicator */}
        <AnimatePresence>
          {activeTypingList.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 text-[10px] text-slate-450 font-sans px-1 py-1 italic select-none"
            >
              <div className="flex gap-0.5 items-center shrink-0">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
              </div>
              <span>
                {activeTypingList.length === 1
                  ? `${activeTypingList[0]} está digitando...`
                  : activeTypingList.length === 2
                  ? `${activeTypingList[0]} e ${activeTypingList[1]} estão digitando...`
                  : `${activeTypingList.slice(0, 2).join(", ")} e mais ${activeTypingList.length - 2} estão digitando...`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Reaction Bar */}
      <div className="px-3 py-1.5 bg-[#111319]/85 border-t border-white/5 flex gap-1.5 overflow-x-auto justify-between shrink-0 select-none no-scrollbar">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            disabled={isSending || isLocalUserMuted}
            onClick={() => handleEmojiClick(emoji)}
            className="text-sm px-1.5 py-0.5 hover:bg-white/5 border border-transparent hover:border-white/5 rounded-md transition-all active:scale-75 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form 
        onSubmit={handleSubmit}
        className="p-3 bg-[#111319] border-t border-white/5 flex items-center gap-2 shrink-0 select-none"
      >
        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          placeholder={isLocalUserMuted ? "Você foi silenciado(a) pelo administrador 🔇" : "Mande sua mensagem..."}
          maxLength={240}
          disabled={isSending || isLocalUserMuted}
          className="flex-1 bg-[#0F1115] border border-white/5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-base md:text-xs text-slate-200 outline-none transition-all placeholder:text-slate-650 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!text.trim() || isSending || isLocalUserMuted}
          className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-35"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
