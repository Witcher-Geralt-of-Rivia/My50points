'use client';

import { useState } from 'react';
import { X, User, Mail, Lock, Zap } from 'lucide-react';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { useLanguage } from '@/frontend/lib/i18n/LanguageContext';
import { logoFile } from '@/frontend/lib/config/paths';

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
  const [tab, setTab] = useState(initialTab);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, playAsGuest } = useAuth();
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(username, password);
      } else {
        await register(username, email, password);
      }
      onClose();
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError('');
    setLoading(true);
    try {
      await playAsGuest();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-strong rounded-2xl border border-white/10 p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <img
            src={logoFile()}
            alt="50points"
            className="h-10 w-auto mx-auto mb-3 object-contain"
          />
          <h2 className="text-2xl font-bold text-white">
            {tab === 'login' ? t('auth.login') : t('auth.register')}
          </h2>
        </div>

        <div className="flex mb-6 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              tab === 'login' ? 'bg-gradient-to-r from-purple to-purple-light text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t('auth.login')}
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              tab === 'register' ? 'bg-gradient-to-r from-purple to-purple-light text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t('auth.register')}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder={t('auth.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple/50 transition-colors"
              required
            />
          </div>

          {tab === 'register' && (
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                placeholder={t('auth.email') + ' (' + t('auth.optional') + ')'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple/50 transition-colors"
              />
            </div>
          )}

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="password"
              placeholder={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple/50 transition-colors"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple to-purple-light rounded-lg btn-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '...' : tab === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')}
          </button>
        </form>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-zinc-500 uppercase">{t('auth.or')}</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button
          onClick={handleGuest}
          disabled={loading}
          className="mt-4 w-full py-3 text-sm font-medium text-zinc-300 border border-white/10 rounded-lg hover:bg-white/5 hover:border-white/20 disabled:opacity-50 transition-all"
        >
          {t('auth.playAsGuest')}
        </button>
      </div>
    </div>
  );
}
