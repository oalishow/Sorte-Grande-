import React from "react";
import { motion } from "motion/react";

interface VouGanheiLogoProps {
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

export default function VouGanheiLogo({ size = "md", animate = true }: VouGanheiLogoProps) {
  // Dimensions based on size
  const dimensions = {
    sm: "w-16 h-16",
    md: "w-28 h-28",
    lg: "w-40 h-40",
  }[size];

  const iconSizes = {
    sm: "scale-75",
    md: "scale-100",
    lg: "scale-150",
  }[size];

  return (
    <div className={`relative ${dimensions} flex items-center justify-center select-none`}>
      {/* Dynamic Ambient Glow Backdrops */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 opacity-20 blur-xl animate-pulse" />
      <div className="absolute -inset-4 rounded-full bg-blue-500/10 opacity-30 blur-2xl animate-pulse" style={{ animationDuration: "4s" }} />

      {/* Rotating Cybernetic Outer Rings */}
      <motion.div
        animate={animate ? { rotate: 360 } : {}}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full border border-dashed border-amber-500/30 p-1"
      />
      <motion.div
        animate={animate ? { rotate: -360 } : {}}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute -inset-1.5 rounded-full border border-double border-blue-500/10"
      />

      {/* Main Glassmorphic Circular Badge */}
      <motion.div
        whileHover={{ scale: 1.05, rotate: 2 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-full h-full rounded-full bg-gradient-to-b from-[#1C202B] via-[#12141C] to-[#0A0C12] border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden group cursor-pointer"
      >
        {/* Shimmer effect shifting across */}
        <motion.div
          animate={animate ? { x: ["-100%", "200%"] } : {}}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
        />

        {/* Celebrating Floating Confetti Elements inside the badge */}
        {animate && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-60">
            {/* Tiny color bits */}
            <motion.div
              animate={{ y: [-10, 80], x: [-10, 15], rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute top-2 left-6 w-1.5 h-1.5 rounded-sm bg-amber-400"
            />
            <motion.div
              animate={{ y: [-10, 80], x: [10, -5], rotate: -360 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 1 }}
              className="absolute top-1 right-8 w-1 h-2 rounded-full bg-blue-400"
            />
            <motion.div
              animate={{ y: [-15, 85], x: [0, 10], rotate: 180 }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "linear", delay: 0.5 }}
              className="absolute top-0 right-1/3 w-2 h-1 bg-red-400"
            />
          </div>
        )}

        {/* The Core SVG Artwork */}
        <div className={`relative z-10 ${iconSizes} flex items-center justify-center transition-transform duration-300`}>
          <svg
            width="80"
            height="80"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          >
            {/* Background Ray Glow */}
            <path
              d="M50 15 L50 3 M50 97 L50 85 M15 50 L3 50 M97 50 L85 50 M25 25 L15 15 M85 85 L75 75 M25 75 L15 85 M85 15 L75 25"
              stroke="url(#rayGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="opacity-75"
            />

            {/* Lucky Celebration Arch */}
            <path
              d="M18 68 C 22 84, 78 84, 82 68"
              stroke="url(#luckyArch)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Lucky Ticket Badge Peeking behind */}
            <motion.g
              animate={animate ? { rotate: [-5, 5, -5], y: [0, -1, 0] } : {}}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <rect
                x="32"
                y="26"
                width="36"
                height="22"
                rx="3.5"
                transform="rotate(-12 50 37)"
                fill="#2563EB"
                stroke="#3B82F6"
                strokeWidth="1.5"
                className="opacity-90"
              />
              {/* Ticket side punches */}
              <circle cx="33" cy="34" r="2.5" fill="#12141C" />
              <circle cx="67" cy="27" r="2.5" fill="#12141C" />
              {/* Lucky stars stamp on the ticket */}
              <path
                d="M48 28 L49.5 31.5 L53 31.5 L50 33.5 L51.5 37 L48 35 L44.5 37 L46 33.5 L43 31.5 L46.5 31.5 Z"
                fill="#FBBF24"
              />
            </motion.g>

            {/* Glowing Golden Trophy */}
            <motion.g
              animate={animate ? { y: [0, -2, 0], scale: [1, 1.03, 1] } : {}}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Left and Right Handles */}
              <path
                d="M32 45 C 22 45, 23 58, 32 58"
                stroke="url(#goldCup)"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M68 45 C 78 45, 77 58, 68 58"
                stroke="url(#goldCup)"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />

              {/* Main Cup Body */}
              <path
                d="M31 40 H69 C69 40, 69 58, 50 64 C31 58, 31 40, 31 40 Z"
                fill="url(#goldCup)"
                stroke="#F59E0B"
                strokeWidth="1"
              />

              {/* Cup Lid / Sparkly rim */}
              <ellipse cx="50" cy="40" rx="19" ry="2.5" fill="#FEF08A" />

              {/* Stem / Stand */}
              <path d="M47 64 H53 L54 73 H46 Z" fill="url(#goldCup)" />
              <path d="M38 73 H62 V78 C62 80, 38 80, 38 78 Z" fill="url(#goldPlatform)" />

              {/* Engraving ribbon / Emblem 'V' */}
              <path
                d="M45 47 L50 54 L55 47"
                stroke="#92400E"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.g>

            {/* Radiant Sparkly Stars */}
            <g>
              {/* Star 1 */}
              <motion.path
                animate={animate ? { scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                d="M26 22 L27.2 24.5 L30 24.5 L27.8 26.2 L28.6 29 L26 27.2 L23.4 29 L24.2 26.2 L22 24.5 L24.8 24.5 Z"
                fill="#FEF08A"
              />
              {/* Star 2 */}
              <motion.path
                animate={animate ? { scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] } : {}}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                d="M74 24 L75 26 L77.5 26 L75.5 27.5 L76.2 30 L74 28.5 L71.8 30 L72.5 27.5 L70.5 26 L73 26 Z"
                fill="#FBBF24"
              />
              {/* Star 3 (Bottom left) */}
              <motion.path
                animate={animate ? { scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] } : {}}
                transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                d="M23 60 L24 62 L26.5 62 L24.5 63.5 L25.2 66 L23 64.5 L20.8 66 L21.5 63.5 L19.5 62 L22 62 Z"
                fill="#F59E0B"
              />
            </g>

            {/* Definitions of beautiful glossy gradients */}
            <defs>
              <linearGradient id="goldCup" x1="31" y1="40" x2="69" y2="64">
                <stop offset="0%" stopColor="#FB5757" stopOpacity="0"/>
                <stop offset="1%" stopColor="#FEF08A"/>
                <stop offset="45%" stopColor="#FBBF24"/>
                <stop offset="75%" stopColor="#D97706"/>
                <stop offset="100%" stopColor="#92400E"/>
              </linearGradient>
              <linearGradient id="goldPlatform" x1="38" y1="73" x2="62" y2="80">
                <stop offset="0%" stopColor="#FEF08A"/>
                <stop offset="50%" stopColor="#F59E0B"/>
                <stop offset="100%" stopColor="#78350F"/>
              </linearGradient>
              <linearGradient id="rayGrad" x1="50" y1="3" x2="50" y2="97">
                <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.8"/>
                <stop offset="40%" stopColor="#60A5FA" stopOpacity="0.2"/>
                <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.2"/>
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.5"/>
              </linearGradient>
              <linearGradient id="luckyArch" x1="18" y1="75" x2="82" y2="75">
                <stop offset="0%" stopColor="#EF4444"/>
                <stop offset="30%" stopColor="#FBBF24"/>
                <stop offset="70%" stopColor="#10B981"/>
                <stop offset="100%" stopColor="#3B82F6"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Outer Highlight glare ring */}
        <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none" />
      </motion.div>
    </div>
  );
}
