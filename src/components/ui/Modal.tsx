"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  full: "max-w-5xl",
};

export function Modal({ open, onClose, title, description, children, size = "md", className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full bg-[#0d1117] border border-[rgba(99,102,241,0.2)] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden",
              sizes[size],
              className
            )}
          >
            {/* Gradient top border */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

            {(title || description) && (
              <div className="flex items-start justify-between p-6 pb-4">
                <div>
                  {title && <h2 className="text-xl font-bold text-white">{title}</h2>}
                  {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="ml-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {!title && !description && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all z-10"
              >
                <X size={18} />
              </button>
            )}

            <div className="p-6 pt-0">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
