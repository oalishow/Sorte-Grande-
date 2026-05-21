import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CountdownAnimatorProps {
  countdownEndsAt: number;
  onFinish?: () => void;
  onCancel?: () => void;
  isAdmin?: boolean;
}

export default function CountdownAnimator({ countdownEndsAt, onFinish, onCancel, isAdmin }: CountdownAnimatorProps) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.ceil((countdownEndsAt - Date.now()) / 1000)));
  const beepRef = useRef<HTMLAudioElement | null>(null);
  const endBeepRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // We can use generic beep sounds using web audio API to avoid needing assets
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const audioCtx = new AudioContext();
      
      const playBeep = (freq: number, type: OscillatorType, duration: number) => {
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = type;
        oscillator.frequency.value = freq;
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
        oscillator.stop(audioCtx.currentTime + duration);
      };

      // Assign to refs to call them dynamically
      (beepRef as any).current = () => playBeep(600, 'sine', 0.2);
      (endBeepRef as any).current = () => playBeep(900, 'sine', 0.6);
    }
  }, []);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((countdownEndsAt - Date.now()) / 1000));
      setTimeLeft(prev => {
        if (prev !== remaining && remaining > 0) {
          if (beepRef.current) (beepRef as any).current();
        } else if (prev !== remaining && remaining === 0) {
          if (endBeepRef.current) (endBeepRef as any).current();
        }
        return remaining;
      });

      if (remaining <= 0) {
        if (onFinish && isAdmin) {
          onFinish();
        }
      }
    };

    updateTimer(); // Initial check
    const interval = setInterval(updateTimer, 200); // Check frequently for accuracy

    return () => clearInterval(interval);
  }, [countdownEndsAt, onFinish, isAdmin]);

  if (timeLeft <= 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={timeLeft}
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.5, filter: "blur(10px)" }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
            opacity: { duration: 0.2 },
            scale: { duration: 0.4, type: "spring", bounce: 0.5 }
          }}
          className="text-white font-mono flex flex-col items-center"
        >
          <span className="text-3xl md:text-5xl font-bold mb-4 tracking-widest text-[#3b82f6] uppercase">
            Sorteio em
          </span>
          <span className="text-8xl md:text-[200px] font-black leading-none bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]">
            {timeLeft}
          </span>
        </motion.div>
      </AnimatePresence>
      
      {isAdmin && onCancel && (
        <button
          onClick={onCancel}
          className="absolute bottom-10 px-6 py-2 bg-red-600/20 text-red-500 border border-red-500/50 hover:bg-red-600 hover:text-white rounded-xl font-bold uppercase tracking-wider transition-all"
        >
          Cancelar Sorteio Automático
        </button>
      )}
    </div>
  );
}
