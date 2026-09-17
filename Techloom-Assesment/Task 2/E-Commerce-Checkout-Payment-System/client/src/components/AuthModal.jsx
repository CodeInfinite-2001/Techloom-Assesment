import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield, ArrowRight, RotateCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }) {
  if (!isOpen) return null;

  const { login, signup } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Login inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup inputs
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(loginEmail, loginPassword);
    setLoading(false);

    if (result.success) {
      setSuccessMsg(result.message || 'Logged in successfully!');
      setTimeout(() => {
        onClose();
        if (onAuthSuccess) onAuthSuccess(result.user);
      }, 700);
    } else {
      setError(result.error);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signup({
      name: signupName,
      email: signupEmail,
      password: signupPassword,
      role: 'customer'
    });
    setLoading(false);

    if (result.success) {
      setSuccessMsg(`Welcome, ${result.user.name}! Your account was created successfully.`);
      setTimeout(() => {
        onClose();
        if (onAuthSuccess) onAuthSuccess(result.user);
      }, 800);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md glass-modal rounded-3xl overflow-hidden border border-emerald-500/30 my-6 animate-in zoom-in-95 duration-200 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-emerald-500/20 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-cyber-neon shadow-glass-neon">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                CyberStore Security Gateway
              </h2>
              <p className="text-[11px] text-emerald-400/80 font-mono">
                Customer Portal & Admin Gateway
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-emerald-500/20 bg-black/50">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-3 text-xs font-mono font-bold transition-all ${
              mode === 'login'
                ? 'text-cyber-neon border-b-2 border-cyber-neon bg-emerald-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-3 text-xs font-mono font-bold transition-all ${
              mode === 'signup'
                ? 'text-cyber-neon border-b-2 border-cyber-neon bg-emerald-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Account (Sign Up)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-7 space-y-5">
          
          {/* Messages */}
          {error && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs font-mono">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-cyber-neon text-cyber-neon text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* =========================================
              LOGIN FORM
             ========================================= */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono text-gray-400 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  <input
                    type="email"
                    required
                    placeholder="you@cybermail.com"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 glass-input text-xs rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-gray-400 block mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 glass-input text-xs rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-xs bg-cyber-neon text-cyber-950 hover:bg-emerald-400 shadow-glass-neon flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <span>Sign In</span>}
              </button>
            </form>
          ) : (
            /* =========================================
                SIGNUP FORM
               ========================================= */
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono text-gray-400 block mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  <input
                    type="text"
                    required
                    placeholder="Gordon Freeman"
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 glass-input text-xs rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-gray-400 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  <input
                    type="email"
                    required
                    placeholder="gordon@blackmesa.org"
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 glass-input text-xs rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-gray-400 block mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 glass-input text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-[11px] text-gray-400 font-mono flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyber-neon flex-shrink-0" />
                <span>New accounts are created with Customer access for store browsing, carts & orders.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-xs bg-cyber-neon text-cyber-950 hover:bg-emerald-400 shadow-glass-neon flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
