import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wrench, HardHat, Zap, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

const LOADING_STEPS = [
  "Initializing SiteQuote AI Trade Engine...",
  "Authenticating Firebase Security Tokens...",
  "Loading Municipal Building Code Rules...",
  "Synchronizing Local Contractor Labor Cards...",
  "SiteQuote AI Ready."
];

export default function Preloader({ message, fullScreen = true, duration = 1200, onComplete }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < LOADING_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, duration / LOADING_STEPS.length);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          if (onComplete) onComplete();
          return 100;
        }
        return prev + 5;
      });
    }, duration / 20);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [duration, onComplete]);

  const displayMessage = message || LOADING_STEPS[currentStepIndex];

  if (!fullScreen) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-pulse">
            <Wrench className="w-6 h-6 animate-spin" />
          </div>
          <div className="absolute -inset-1 bg-amber-500/20 rounded-2xl blur-md -z-10 animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-mono text-slate-300 font-semibold uppercase tracking-wider">
            {displayMessage}
          </p>
          <div className="w-48 bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800/80 mx-auto">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-300 shadow-sm shadow-amber-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-slate-800/40 rounded-full blur-2xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 flex flex-col items-center max-w-sm w-full text-center space-y-6"
      >
        {/* Animated Brand Logo Icon with Pulsing Halo */}
        <div className="relative">
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              ease: "easeInOut",
            }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 flex items-center justify-center shadow-2xl shadow-amber-500/30 border border-amber-300/40 relative z-10"
          >
            <Wrench className="w-10 h-10 stroke-[2.5]" />
          </motion.div>
          {/* Radial Glow */}
          <div className="absolute -inset-3 bg-amber-500/25 rounded-3xl blur-xl animate-pulse" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            SiteQuote <span className="text-amber-400">AI</span>
          </h1>
          <p className="text-xs font-mono text-amber-500/80 uppercase tracking-widest mt-0.5">
            Trade Estimating & Dispatch Engine
          </p>
        </div>

        {/* Progress Bar & Status */}
        <div className="w-full space-y-3 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold truncate">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{displayMessage}</span>
            </span>
            <span className="font-bold text-white shrink-0">{progress}%</span>
          </div>

          {/* Smooth Bar */}
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 p-0.5">
            <motion.div
              className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 h-full rounded-full shadow-lg shadow-amber-500/30"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut", duration: 0.3 }}
            />
          </div>

          <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-800/80">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-400" /> Grounded Code Security
            </span>
            <span>v2.5 Pro</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
