"use client";

import React, { useState } from "react";
import { User, Lock, X, Check, AlertCircle, LogIn, UserPlus } from "lucide-react";
import { authManager } from "@/lib/authManager";
import { sound } from "./sound";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

const AVATAR_COLORS = [
  "#0284c7", // Sky Cyan
  "#10b981", // Emerald Green
  "#f59e0b", // Amber Gold
  "#ef4444", // Ruby Red
  "#8b5cf6", // Violet
  "#ec4899", // Rose Pink
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (tab === "signin") {
        if (!identifier.trim()) {
          setErrorMsg("Please enter your username.");
          setIsLoading(false);
          return;
        }
        const res = await authManager.signIn(identifier, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          sound.playClick();
          onAuthSuccess?.();
          onClose();
        }
      } else {
        if (!username.trim()) {
          setErrorMsg("Please choose a username.");
          setIsLoading(false);
          return;
        }
        const res = await authManager.signUp(username.trim(), password, selectedColor);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          sound.playClick();
          onAuthSuccess?.();
          onClose();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 pointer-events-auto select-none">
      <div className="glass-panel-glow max-w-sm w-full rounded-2xl p-6 text-slate-100 shadow-2xl border border-cyan-500/30 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-200">
                EXPLORER ACCOUNT
              </h3>
              <p className="text-[11px] text-slate-400">Save best times and join expeditions</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-slate-950/80 p-1 border border-slate-800 mb-4">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab("signin");
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === "signin"
                ? "bg-cyan-600 text-white shadow-md font-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab("signup");
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === "signup"
                ? "bg-cyan-600 text-white shadow-md font-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === "signup" ? (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Choose Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={18}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. MasterMiner"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans"
                />
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans"
                />
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans"
              />
              <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          {/* Color Picker (on Signup) */}
          {tab === "signup" && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Suit Color Accent
              </label>
              <div className="flex items-center gap-2">
                {AVATAR_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSelectedColor(hex);
                    }}
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                      selectedColor === hex
                        ? "ring-2 ring-white scale-110 shadow-lg"
                        : "opacity-70 hover:opacity-100 hover:scale-105"
                    }`}
                    style={{ backgroundColor: hex }}
                  >
                    {selectedColor === hex && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-900/40 active:scale-98 transition-all disabled:opacity-50"
          >
            {isLoading
              ? "Connecting..."
              : tab === "signin"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
};
