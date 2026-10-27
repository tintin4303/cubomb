"use client";

import React, { useState } from "react";
import { User, Lock, X, Check, AlertCircle, LogIn, UserPlus } from "lucide-react";
import { authManager } from "@/lib/authManager";
import { sound } from "./sound";

import { PILOT_SKINS, DEFAULT_SKIN_ID } from "./skins";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedSkinId, setSelectedSkinId] = useState(DEFAULT_SKIN_ID);
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
        const res = await authManager.signUp(username.trim(), password, selectedSkinId);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 pointer-events-auto select-none">
      <div className="glass-panel max-w-sm w-full rounded-2xl p-6 text-slate-100 shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-sm font-mono font-bold tracking-wider text-white">
              PILOT ACCOUNT
            </span>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-slate-950/80 p-1 border border-white/5 mb-4">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab("signin");
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === "signin"
                ? "bg-slate-800 text-white font-bold"
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
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === "signup"
                ? "bg-slate-800 text-white font-bold"
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

          {/* Pilot Suit Picker (on Signup) */}
          {tab === "signup" && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Starting Pilot Suit
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {PILOT_SKINS.map((skin) => {
                  const isSel = selectedSkinId === skin.id;
                  return (
                    <button
                      key={skin.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setSelectedSkinId(skin.id);
                      }}
                      className={`p-2 rounded-xl text-left border transition-all flex flex-col gap-1 ${
                        isSel
                          ? "bg-slate-800 border-cyan-400 shadow-sm"
                          : "bg-slate-900/60 border-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: skin.previewColor,
                            boxShadow: isSel ? `0 0 6px ${skin.previewColor}` : "none",
                          }}
                        />
                        {isSel && <Check className="w-3 h-3 text-cyan-400" />}
                      </div>
                      <span className="text-[10px] font-bold text-white font-mono truncate">
                        {skin.name}
                      </span>
                    </button>
                  );
                })}
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
