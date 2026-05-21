import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, HelpCircle, X, Check, CheckCircle2 } from "lucide-react";

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type: "info" | "confirm" | "success";
  confirmText?: string;
  cancelText?: string;
}

export default function CustomModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
}: CustomModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={type === "info" || type === "success" ? onClose : undefined}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 15 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            className="relative w-full max-w-md bg-[#161920] border border-white/5 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Ambient Background Glow matching badge style */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* Close button for non-critical modals */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-550 hover:text-slate-300 hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon & Title */}
            <div className="flex items-start gap-4 mb-4 mt-1">
              <div className="shrink-0">
                {type === "confirm" ? (
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                ) : type === "success" ? (
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-display text-lg font-bold text-white truncate">
                  {title}
                </h3>
                <p className="mt-2 text-slate-400 font-sans text-xs md:text-sm leading-relaxed whitespace-pre-line">
                  {message}
                </p>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-white/5 pt-4">
              {type === "confirm" ? (
                <>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-755 border border-white/5 text-slate-300 hover:text-white font-medium text-xs rounded-xl shadow-md transition-all cursor-pointer min-w-[80px]"
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={() => {
                      if (onConfirm) onConfirm();
                      onClose();
                    }}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer hover:shadow-amber-550/10 min-w-[100px]"
                  >
                    {confirmText}
                  </button>
                </>
              ) : (
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shadow-blue-500/10 min-w-[90px]"
                >
                  OK
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
