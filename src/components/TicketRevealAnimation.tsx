import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Ticket, Sparkles } from "lucide-react";
import VouGanheiLogo from "./VouGanheiLogo";
import { audioService } from "../utils/audio";

interface TicketRevealAnimationProps {
  ticketNumber: number;
  name: string;
  onComplete: () => void;
}

export default function TicketRevealAnimation({
  ticketNumber,
  name,
  onComplete,
}: TicketRevealAnimationProps) {
  const [currentNum, setCurrentNum] = useState<string | number>(0);
  const [isSpinning, setIsSpinning] = useState(true);

  useEffect(() => {
    let startTime = Date.now();
    const duration = 3000; // 3 seconds as requested
    
    // Play an entry tick immediately to declare/unlock audio context
    audioService.playCountdownTick();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        // Fast spin through random numbers
        const rand = Math.floor(Math.random() * 999).toString().padStart(3, '0');
        setCurrentNum(rand);
        // Play light mechanical tick for each step of the number spin
        audioService.playSpinTick();
        setTimeout(tick, 60);
      } else {
        // Stop on the actual ticket number
        setIsSpinning(false);
        setCurrentNum(ticketNumber.toString().padStart(3, '0'));
        // Play beautiful success fanfare when the ticket is unlocked!
        audioService.playVictoryFanfare();
        // The reveal lasts for some more time before onComplete
        setTimeout(onComplete, 4000);
      }
    };

    tick();
  }, [ticketNumber, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-[#0F1115] flex flex-col items-center justify-center p-6 text-center overflow-hidden"
    >
      {/* Background Ambience / Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px]" />

      <AnimatePresence mode="wait">
        {isSpinning ? (
          <motion.div
            key="spinning"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            className="flex flex-col items-center"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
              className="mb-8 opacity-40"
            >
               <VouGanheiLogo size="sm" />
            </motion.div>
            
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-blue-400 font-mono text-[10px] sm:text-xs font-black tracking-[0.4em] uppercase mb-12"
            >
              Gerando seu Número da Sorte...
            </motion.div>
            
            <div className="text-7xl sm:text-8xl md:text-9xl font-display font-black text-white/10 select-none italic tracking-tighter">
              #{currentNum}
            </div>
            
            {/* Scrabble/Casino like indicator belt */}
            <div className="mt-8 flex gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500/30 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="revealed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center relative z-10 w-full max-w-sm"
          >
             <motion.div 
               animate={{ scale: [1, 1.08, 1], rotate: [-1, 1, -1] }}
               transition={{ repeat: Infinity, duration: 5 }}
               className="relative mb-8"
             >
                <div className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full" />
                <div className="bg-gradient-to-b from-blue-500 to-indigo-600 p-5 rounded-3xl relative z-10 shadow-2xl overflow-hidden group">
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-100%] animate-shine pointer-events-none" style={{ animation: "shine 2s infinite" }} />
                  <Ticket className="w-12 h-12 text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]" />
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.3 }}
                  className="absolute -top-2 -right-2 bg-amber-500 p-1.5 rounded-full z-20 shadow-lg"
                >
                  <Sparkles className="w-4 h-4 text-white fill-white" />
                </motion.div>
             </motion.div>

             <h2 className="text-emerald-400 font-mono text-[9px] sm:text-[10px] font-extrabold tracking-[0.3em] uppercase mb-4">
               BILHETE GERADO COM SUCESSO!
             </h2>
             
             <motion.div 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.2, type: "spring" }}
               className="font-display font-black text-white text-8xl sm:text-9xl tracking-tighter drop-shadow-[0_0_40px_rgba(59,130,246,0.4)] mb-8 select-none"
             >
               #{currentNum}
             </motion.div>

             <motion.div 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.4, type: "spring" }}
               className="w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl relative"
             >
               <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg">
                 Sorteio Ativo
               </div>
               
               <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-1 pt-2">Participante</p>
               <h3 className="text-xl sm:text-2xl font-black text-white truncate px-2">{name}</h3>
               <p className="text-slate-500 text-[11px] mt-4 font-medium leading-relaxed">
                 Sua sorte está lançada! Mostre este número quando o sorteio começar.
               </p>
             </motion.div>

             {/* Animated Particles with motion */}
             <div className="absolute inset-0 pointer-events-none -z-10">
               {[...Array(40)].map((_, i) => (
                 <motion.div
                   key={i}
                   initial={{ 
                     x: 0, 
                     y: 0, 
                     opacity: 1, 
                     scale: Math.random() * 0.5 + 0.3 
                   }}
                   animate={{ 
                     x: (Math.random() - 0.5) * 800, 
                     y: (Math.random() - 0.5) * 800,
                     opacity: 0,
                     rotate: 360,
                     scale: 0
                   }}
                   transition={{ duration: 3.5, ease: "easeOut", delay: 0.1 }}
                   className={`absolute top-1/2 left-1/2 w-3 h-3 rounded-sm ${['bg-blue-400', 'bg-indigo-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400'][i % 5]}`}
                 />
               ))}
             </div>
             
             <motion.p
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 2.5 }}
               className="text-slate-650 text-[10px] mt-10 font-mono uppercase tracking-widest"
             >
               Entrando no lobby de sorteio...
             </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
