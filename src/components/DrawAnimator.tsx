import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Gift, Sparkles, User, Ticket, Award, Zap, ChevronRight, RefreshCw } from "lucide-react";
import { audioService } from "../utils/audio";

interface DrawAnimatorProps {
  winningNumber: number;
  winnerName: string;
  prizeName: string;
  onComplete?: () => void;
  isAdmin?: boolean;
  onResetDrawState?: () => void;
  duration?: number; // custom spin duration in milliseconds
  onRedraw?: () => void; // custom callback to redraw/re-roll a new winner
  drawingStartedAt?: number | null; // sync standard time from the administrator
}

// Custom rich active particle interface
interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  vRotation: number;
  shape: "circle" | "square" | "triangle" | "star";
}

export default function DrawAnimator({
  winningNumber,
  winnerName,
  prizeName,
  onComplete,
  isAdmin = false,
  onResetDrawState,
  duration = 6000,
  onRedraw,
  drawingStartedAt,
}: DrawAnimatorProps) {
  const [digits, setDigits] = useState<string[]>(["?", "?", "?"]);
  const [stage, setStage] = useState<"spinning" | "revealed">("spinning");
  const [spinningCols, setSpinningCols] = useState<boolean[]>([true, true, true]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const revealTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const nextParticleIdRef = useRef(1000);

  const [countdown, setCountdown] = useState<number | string | null>(3);
  const [countdownActive, setCountdownActive] = useState<boolean>(true);

  const targetDigits = String(winningNumber).padStart(3, "0").split("");

  // Soundless visual flash thud indicator
  const [stopFlash, setStopFlash] = useState<boolean[]>([false, false, false]);

  // Handle countdown sequences and reset state on redraw
  useEffect(() => {
    setDigits(["?", "?", "?"]);
    setStage("spinning");
    setSpinningCols([true, true, true]);
    setCountdownActive(true);
    setCountdown(3);

    const now = Date.now();
    let delay0 = 0;
    let delay1 = 600;
    let delay2 = 1200;
    let delay3 = 1800;
    let delay4 = 2400;

    if (drawingStartedAt) {
      const elapsedSinceStart = now - drawingStartedAt;
      delay0 = Math.max(0, 0 - elapsedSinceStart);
      delay1 = Math.max(0, 600 - elapsedSinceStart);
      delay2 = Math.max(0, 1200 - elapsedSinceStart);
      delay3 = Math.max(0, 1800 - elapsedSinceStart);
      delay4 = Math.max(0, 2400 - elapsedSinceStart);
    }

    if (delay0 === 0 && (!drawingStartedAt || (now - drawingStartedAt) < 600)) {
       audioService.playCountdownTick();
    }

    const t1 = setTimeout(() => {
      setCountdown(2);
      audioService.playCountdownTick();
    }, delay1);

    const t2 = setTimeout(() => {
      setCountdown(1);
      audioService.playCountdownTick();
    }, delay2);

    const t3 = setTimeout(() => {
      setCountdown("COMEÇOU! 🎲");
      audioService.playCountdownStart();
    }, delay3);

    const t4 = setTimeout(() => {
      setCountdownActive(false);
      setCountdown(null);
    }, delay4);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [winningNumber, drawingStartedAt]);

  useEffect(() => {
    if (countdownActive) return;

    let animId: any;
    
    // ---------------------------------------------------------------------------------
    // TIME SYNCRONIZATION LOGIC: 
    // The user requested that the participant finishes at EXACTLY the same time as the 
    // administrator, using the administrator's time as the standard. 
    // By using the 'drawingStartedAt' timestamp (recorded when the admin triggered the draw),
    // we calculate elapsed time based on that absolute point, ensuring perfect synchronization
    // across all connected devices regardless of when they received the Firebase update.
    // ---------------------------------------------------------------------------------
    const localStart = Date.now();
    
    const animDuration = duration;
    const playedStop = [false, false, false];
    
    // Stable timestamps inside the closure to manage deceleration tick speeds independently per column
    const lastFlipTime = [0, 0, 0];

    // Prolong spacing: Column 1 stops at 52%, Column 2 at 75%, Column 3 at 93% of duration
    const stopTimes = [
      Math.floor(animDuration * 0.52),
      Math.floor(animDuration * 0.75),
      Math.floor(animDuration * 0.93),
    ];

    const runAnimation = () => {
      const nowMs = Date.now();
      
      // Calculate elapsed time from the exact moment the administrator triggered it (+2400ms countdown duration)
      // If none provided, fallback to local mount start time.
      let elapsed = 0;
      if (drawingStartedAt) {
          elapsed = nowMs - (drawingStartedAt + 2400);
      } else {
          elapsed = nowMs - localStart;
      }
      
      // Clamp elapsed time so it doesn't break if devices are heavily out of sync
      elapsed = Math.max(0, elapsed);

      setDigits((prevDigits) => {
        const nextDigits = [...prevDigits];
        let hasChanges = false;

        for (let i = 0; i < 3; i++) {
          if (elapsed < stopTimes[i]) {
            // Highly dramatic deceleration build-up phase over the last 2.5 seconds of each column's spin
            const timeRemaining = stopTimes[i] - elapsed;
            
            let flipInterval = 30; // base hyper-fast spin delay (30ms)
            if (timeRemaining < 2500) {
              const progress = (2500 - timeRemaining) / 2500; // 0 to 1
              // Sinuous cubic deceleration from 30ms up to 550ms for that realistic physical flywheel friction feel
              flipInterval = 30 + Math.pow(progress, 3) * 520;
            }

            if (nowMs - lastFlipTime[i] >= flipInterval) {
              let rand = Math.floor(Math.random() * 10).toString();
              // Prevent duplicates during rapid cycles to preserve highly organic spin feel
              while (rand === nextDigits[i]) {
                rand = Math.floor(Math.random() * 10).toString();
              }
              nextDigits[i] = rand;
              lastFlipTime[i] = nowMs;
              hasChanges = true;
              
              // Audio ticking clicks sound perfectly matched to decelerate physically
              audioService.playSpinTick();
            }
          } else {
            // Column Locked on target number
            if (!playedStop[i]) {
              playedStop[i] = true;
              // Play optimized rising lock core pitch chime
              audioService.playRevealThud(i);
              
              // Stop the kinetic blur for this specific index
              setSpinningCols((prev) => {
                const s = [...prev];
                s[i] = false;
                return s;
              });
            }
            if (nextDigits[i] !== targetDigits[i]) {
              nextDigits[i] = targetDigits[i];
              hasChanges = true;

              // Vividly flash column frame border
              setStopFlash((prev) => {
                const f = [...prev];
                f[i] = true;
                return f;
              });
              setTimeout(() => {
                setStopFlash((prev) => {
                  const f = [...prev];
                  f[i] = false;
                  return f;
                });
              }, 400);
            }
          }
        }

        return hasChanges ? nextDigits : prevDigits;
      });

      if (elapsed < animDuration) {
        animId = requestAnimationFrame(runAnimation);
      } else {
        // Final Completion and Victory Reveal
        setDigits(targetDigits);
        setSpinningCols([false, false, false]);
        setStage("revealed");
        audioService.playVictoryFanfare();
        if (onComplete) {
          onComplete();
        }
      }
    };

    animId = requestAnimationFrame(runAnimation);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [winningNumber, duration, countdownActive]);

  // Premium double-corner particle emission for gorgeous celebrations & continuous trickle
  // Utilizing HTML5 Canvas and stable javascript ref updates to completely eliminate React Virtual DOM overhead.
  useEffect(() => {
    if (stage !== "revealed") {
      particlesRef.current = [];
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    revealTimeRef.current = Date.now();
    
    // Create initial premium particle pool
    const list: Particle[] = [];
    const colors = [
      "#F59E0B", // Gold
      "#E11D48", // Rose Red
      "#3B82F6", // Blue
      "#10B981", // Emerald
      "#EC4899", // Neon Pink
      "#8B5CF6", // Violet
      "#06B6D4"  // Cyber Cyan
    ];
    const shapes: ("circle" | "square" | "triangle" | "star")[] = ["circle", "square", "triangle", "star"];

    // Left emitter (fountains upward to right)
    for (let i = 0; i < 70; i++) {
      const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.4;
      const speed = 4 + Math.random() * 12;
      list.push({
        id: nextParticleIdRef.current++,
        x: 10,
        y: 80,
        vx: Math.cos(angle) * speed * 0.35,
        vy: Math.sin(angle) * speed * 0.35 - 0.7,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 12,
        rotation: Math.random() * 360,
        vRotation: (Math.random() - 0.5) * 15,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }

    // Right emitter (fountains upward to left)
    for (let i = 70; i < 140; i++) {
      const angle = -Math.PI * 0.75 + (Math.random() - 0.5) * 0.4;
      const speed = 4 + Math.random() * 12;
      list.push({
        id: nextParticleIdRef.current++,
        x: 90,
        y: 80,
        vx: Math.cos(angle) * speed * 0.35,
        vy: Math.sin(angle) * speed * 0.35 - 0.7,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 12,
        rotation: Math.random() * 360,
        vRotation: (Math.random() - 0.5) * 15,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }

    // Center burst
    for (let i = 140; i < 185; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      list.push({
        id: nextParticleIdRef.current++,
        x: 50,
        y: 45,
        vx: Math.cos(angle) * speed * 0.3,
        vy: Math.sin(angle) * speed * 0.3 - 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 5 + Math.random() * 10,
        rotation: Math.random() * 360,
        vRotation: (Math.random() - 0.5) * 12,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }

    particlesRef.current = list;

    const updateAndDrawCanvasConfetti = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Match and scale resolution dynamically (with retina adjustment)
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const W = rect.width;
      const H = rect.height;

      if (W === 0 || H === 0) {
        animationFrameRef.current = requestAnimationFrame(updateAndDrawCanvasConfetti);
        return;
      }

      if (canvas.width !== Math.floor(W * dpr) || canvas.height !== Math.floor(H * dpr)) {
        canvas.width = Math.floor(W * dpr);
        canvas.height = Math.floor(H * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      // Move and update active particles
      const visible = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.012, // slightly lowered gravity for longer floating hangtime
          vx: p.vx * 0.985, // air friction resistance
          rotation: p.rotation + p.vRotation,
        }))
        .filter((p) => p.y < 125 && p.x > -25 && p.x < 125);

      const elapsedSinceReveal = Date.now() - revealTimeRef.current;
      const shouldTrickle = elapsedSinceReveal < 7500; // stop trickling after 7.5 seconds for complete CPU rest

      // Spawns trickle particles dynamically directly inside the loop
      if (visible.length < 180 && shouldTrickle) {
        for (let i = 0; i < 3; i++) {
          const isLeft = Math.random() > 0.5;
          const angle = isLeft 
            ? -Math.PI / 4 + (Math.random() - 0.5) * 0.4
            : -Math.PI * 0.75 + (Math.random() - 0.5) * 0.4;
          
          const speed = 4 + Math.random() * 12;
          const startX = isLeft ? 5 : 95;

          visible.push({
            id: nextParticleIdRef.current++,
            x: startX,
            y: 80,
            vx: Math.cos(angle) * speed * 0.35,
            vy: Math.sin(angle) * speed * 0.35 - 0.7,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 5 + Math.random() * 10,
            rotation: Math.random() * 360,
            vRotation: (Math.random() - 0.5) * 12,
            shape: shapes[Math.floor(Math.random() * shapes.length)],
          });
        }
      }

      particlesRef.current = visible;

      // Render each visual shape on the 2D Context
      visible.forEach((p) => {
        const px = (p.x / 100) * W;
        const py = (p.y / 100) * H;
        
        ctx.fillStyle = p.color;

        if (p.size > 8) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
        } else {
          ctx.shadowBlur = 0;
        }

        const rad = (p.rotation * Math.PI) / 180;

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(px, py, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "square") {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(rad);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        } else if (p.shape === "triangle") {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(rad);
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (p.shape === "star") {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(rad);
          ctx.beginPath();
          const spikes = 5;
          const outerRadius = p.size / 2;
          const innerRadius = p.size / 5;
          let rAngle = (Math.PI / 2) * 3;
          let cx = 0;
          let cy = 0;
          const step = Math.PI / spikes;

          ctx.moveTo(0, -outerRadius);
          for (let i = 0; i < spikes; i++) {
            cx = Math.cos(rAngle) * outerRadius;
            cy = Math.sin(rAngle) * outerRadius;
            ctx.lineTo(cx, cy);
            rAngle += step;

            cx = Math.cos(rAngle) * innerRadius;
            cy = Math.sin(rAngle) * innerRadius;
            ctx.lineTo(cx, cy);
            rAngle += step;
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      });

      ctx.restore();

      // Clear layout shadow context
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      if (particlesRef.current.length > 0) {
        animationFrameRef.current = requestAnimationFrame(updateAndDrawCanvasConfetti);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateAndDrawCanvasConfetti);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [stage]);

  return (
    <div className="relative min-h-[510px] w-full bg-gradient-to-b from-[#181B22] to-[#0E1014] rounded-3xl overflow-hidden border border-white/5 flex flex-col items-center justify-center p-5 md:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]">
      
      {/* Immersive 3-second Countdown Overlay */}
      <AnimatePresence>
        {countdownActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(12px)" }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-[#0F1115]/98 z-40 flex flex-col items-center justify-center rounded-3xl overflow-hidden backdrop-blur-md"
          >
            <div className="absolute inset-0 bg-radial-gradient from-blue-500/10 via-transparent to-transparent pointer-events-none" />
            <AnimatePresence mode="popLayout">
              <motion.div
                key={countdown}
                initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
                animate={{ scale: 1.1, opacity: 1, rotate: 0 }}
                exit={{ scale: 1.8, opacity: 0, filter: "blur(10px)", rotate: 15 }}
                transition={{ type: "spring", damping: 11, stiffness: 130 }}
                className="flex flex-col items-center justify-center p-6 text-center select-none"
              >
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#0F1115] uppercase mb-4 py-1 px-3.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full inline-flex items-center gap-1.5 animate-pulse shadow-md shadow-amber-500/20">
                  <Zap className="w-3.5 h-3.5 text-[#0F1115] fill-current shrink-0" /> PREPARE SUA TORCIDA!
                </span>

                {typeof countdown === "number" ? (
                  <h1 className="font-display text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 tracking-tighter drop-shadow-[0_4px_25px_rgba(245,158,11,0.5)] leading-none select-none">
                    {countdown}
                  </h1>
                ) : (
                  <h1 className="font-display text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-emerald-400 uppercase tracking-tight leading-none drop-shadow-[0_4px_15px_rgba(59,130,246,0.3)] px-4 select-none">
                    {countdown}
                  </h1>
                )}

                <p className="text-slate-400 text-xs md:text-sm mt-6 max-w-xs font-sans min-h-[40px]">
                  {countdown === 3 && "Sintonizando vibes positivas... 🔮"}
                  {countdown === 2 && "Preparando os bilhetes da sorte! 🎟️"}
                  {countdown === 1 && "Dedos cruzados, vai começar! 🍀"}
                  {countdown === "COMEÇOU! 🎲" && "Rodando o tambor! ⚡"}
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Backlight glowing laser flares based on state */}
      <AnimatePresence>
        {stage === "spinning" ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            <div className="absolute right-1/4 top-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-[90px] animate-pulse" />
            <div className="absolute left-1/4 bottom-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[90px] animate-pulse" style={{ animationDelay: "1s" }} />
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Victory dynamic champion aura flaring */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-amber-500/10 to-blue-500/10 rounded-full blur-[140px] animate-bounce" />
            <div className="absolute left-1/4 top-1/3 w-96 h-96 bg-yellow-500/15 rounded-full blur-[110px]" />
            <div className="absolute right-1/4 bottom-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-[115px]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Retro futuric CRT scanline and grid glass overlays */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.12)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[size:100%_4px,6px_100%] pointer-events-none z-10 opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/5 pointer-events-none z-10" />

      {/* High-Performance Confetti particles Canvas layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20 rounded-3xl"
      />

      {/* Primary Header Info */}
      <div className="text-center z-20 max-w-lg mb-6 relative">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-bold tracking-widest mb-3 font-mono uppercase shadow-lg shadow-blue-500/5"
        >
          <Zap className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
          {stage === "spinning" ? "Sorteando ao Vivo" : "Sorteio Concluído"}
        </motion.div>
        
        <motion.h3
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="font-display text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight px-4"
        >
          {prizeName}
        </motion.h3>
        
        <p className="text-slate-400 text-xs md:text-sm mt-2 font-sans px-4">
          {stage === "spinning" 
            ? "Corações batendo forte... Quem será o grande vitorioso? ⚡" 
            : "Chega de mistério! Confira o novo felizardo sortudo(a) abaixo!"
          }
        </p>
      </div>

      {/* The Reel Scoreboard Machine Cabin */}
      <div className="relative z-20 my-5 bg-[#0F1115] p-5 md:p-8 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8),inset_0_2px_8px_rgba(255,255,255,0.05)] max-w-full flex items-center justify-center">
        
        {/* Physical side rack handles for authentic arcade chassis look */}
        <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-3 h-16 bg-slate-800 rounded-l-md border-y border-l border-white/10 shrink-0" />
        <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-3 h-16 bg-slate-800 rounded-r-md border-y border-r border-white/10 shrink-0" />

        <div className="flex gap-3 md:gap-5 items-center justify-center">
          {digits.map((digit, idx) => (
            <React.Fragment key={idx}>
              {/* Divider rails resembling distinct vertical slot cylinders */}
              {idx > 0 && (
                <div className="w-[1px] md:w-[2px] h-20 md:h-28 bg-[#1B1D23] self-stretch opacity-60 flex flex-col justify-between shrink-0">
                  <div className="w-1.5 md:w-2 h-1.5 bg-slate-650 rounded-full -mx-[2.5px]" />
                  <div className="w-1.5 md:w-2 h-1.5 bg-slate-650 rounded-full -mx-[2.5px]" />
                </div>
              )}

              <motion.div
                animate={stopFlash[idx] ? { scale: [1, 1.2, 0.95, 1], rotate: [0, -4, 4, 0] } : {}}
                transition={{ duration: 0.38, ease: "easeOut" }}
                className={`relative w-16 h-26 md:w-26 md:h-38 bg-gradient-to-b from-[#111317] to-[#0A0B0E] rounded-2xl border ${
                  stopFlash[idx]
                    ? "border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)]"
                    : spinningCols[idx]
                    ? "border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                    : "border-white/10"
                } flex items-center justify-center overflow-hidden shrink-0`}
              >
                {/* 3D mechanical cylinder shadows */}
                <div className="absolute top-0 left-0 right-0 h-5 md:h-8 bg-gradient-to-b from-black via-black/50 to-transparent z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-5 md:h-8 bg-gradient-to-t from-black via-black/50 to-transparent z-10 pointer-events-none" />

                {spinningCols[idx] ? (
                  <div className="font-display text-4xl md:text-7xl font-black font-mono select-none text-blue-400 opacity-60 filter blur-[2px] scale-y-110">
                    {digit}
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={digit}
                      initial={{ y: -80, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 80, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 700, damping: 22 }}
                      className={`font-display text-4xl md:text-7xl font-black font-mono select-none ${
                        digit === "?" 
                          ? "text-slate-700" 
                          : "text-white text-shadow-glow"
                      }`}
                    >
                      {digit}
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* Laser scan horizontal highlight track indicator */}
                <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-red-550/25 pointer-events-none z-10" />
              </motion.div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Revealed State with Grand Trophy Presentation Card */}
      <AnimatePresence>
        {stage === "revealed" && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0, y: -25 }}
            transition={{ type: "spring", damping: 14, stiffness: 200 }}
            className="w-full max-w-md bg-gradient-to-b from-[#1C1F26] to-[#111317] border border-amber-500/35 rounded-3xl p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-30 mt-3 relative outline outline-2 outline-amber-500/10 overflow-hidden"
          >
            {/* Ambient gold card shine running diagonal sweep */}
            <div className="absolute top-[-50%] left-[-60%] w-[50%] h-[200%] bg-white/5 rotate-12 blur-md translate-x-[-100%] animate-shine pointer-events-none" 
              style={{ animation: "shine 3.5s infinite ease-in-out" }}
            />

            <div className="mx-auto w-14 h-14 bg-gradient-to-b from-yellow-500/20 to-amber-500/20 text-amber-400 rounded-full flex items-center justify-center border border-amber-500/30 mb-4 animate-[bounce_1.5s_infinite] shadow-lg shadow-amber-500/10">
              <Trophy className="w-7 h-7 filter drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]" />
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <Award className="w-4 h-4 text-amber-550 animate-spin" style={{ animationDuration: "10s" }} />
              <span className="text-amber-400 text-xs md:text-sm font-black tracking-widest uppercase font-mono">
                GRANDE GANHADOR(A)!
              </span>
              <Award className="w-4 h-4 text-amber-550 animate-spin" style={{ animationDuration: "10s" }} />
            </div>

            {/* Winner Name in high prominence with display font */}
            <h4 className="font-display text-2xl md:text-4xl font-extrabold text-white leading-snug truncate px-1 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {winnerName}
            </h4>

            {/* Lucky Ticket Counter Board wrapper */}
            <div className="flex items-center justify-center gap-5 mt-4 py-2 px-5 bg-black/60 rounded-2xl border border-white/5 w-fit mx-auto shadow-inner">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold font-mono">
                <Ticket className="w-4 h-4 text-amber-400" />
                BILHETE:
              </div>
              <span className="font-mono text-base md:text-lg font-black text-amber-400 filter drop-shadow-[0_0_5px_rgba(245,158,11,0.3)]">
                #{winningNumber}
              </span>
            </div>

            <p className="text-slate-400 text-xs mt-3.5 italic">
              Ganhou o prêmio: <strong className="text-slate-200 not-italic font-bold">{prizeName}</strong>
            </p>

            {isAdmin && (
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                {onRedraw && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02, boxShadow: "0 10px 15px -3px rgba(244,63,94,0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ delay: 0.45 }}
                    type="button"
                    onClick={onRedraw}
                    className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-red-650 hover:from-rose-500 hover:to-red-550 text-white font-extrabold tracking-wider rounded-xl text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase font-mono border border-rose-500/20"
                    title="Caso a pessoa não esteja presente, clique aqui para sortear novamente o mesmo prêmio"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" style={{ animationDuration: "14s" }} />
                    Sortear Novamente ♻️
                  </motion.button>
                )}

                {onResetDrawState && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02, boxShadow: "0 10px 15px -3px rgba(16,185,129,0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ delay: 0.4 }}
                    type="button"
                    onClick={onResetDrawState}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold tracking-wider rounded-xl text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase font-mono shadow-emerald-500/10 border border-emerald-555/20"
                  >
                    Próximo Prêmio 🎲
                    <ChevronRight className="w-3.5 h-3.5 text-white" />
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
