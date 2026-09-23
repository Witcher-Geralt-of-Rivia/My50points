'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchJson, fetchAuthJson } from '@/frontend/lib/api/client';
import { clearPersistedModality, persistModality } from '@/frontend/lib/gameModalities';
import { clearTrackTicketUsage } from '@/frontend/lib/trackTicketUsage';

const AuthContext = createContext(null);

/**
 * Modalidad 4 (invitado): la identidad es efímera.
 * - Vive 12 h desde su creación (el servidor manda: `expiresAt`).
 * - Se desloguea a los 2 min sin actividad. El usuario registrado conserva 30 min:
 *   2 min echaría a alguien que solo está leyendo la cartelera.
 */
const GUEST_INACTIVITY_MS = 2 * 60 * 1000;
const USER_INACTIVITY_MS = 30 * 60 * 1000;
const SESSION_WATCH_INTERVAL_MS = 5 * 1000;

const STORAGE_KEYS = {
  token: '50points_token',
  guestToken: '50points_guest_token',
  lastActivity: '50points_last_activity',
  guestCreatedAt: '50points_guest_created_at',
  guestExpiresAt: '50points_guest_expires_at',
};

// Marca de sesión de invitado EN PAUSA por inactividad. La identidad sigue viva
// (dura 12 h en el servidor), así que no se borra nada: solo se exige volver a
// elegir el alias en la ventana de bienvenida en vez de re-loguear en silencio.
const GUEST_PAUSED_KEY = '50points_guest_paused';

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function clearSessionStorage() {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(GUEST_PAUSED_KEY);
  } catch (e) {}
}

/** Guarda el reloj de vida que envía el servidor (nunca se adivina en el cliente). */
function persistGuestClock(u) {
  try {
    if (u?.isGuest && u?.expiresAt) {
      localStorage.setItem(STORAGE_KEYS.guestExpiresAt, u.expiresAt);
      if (u.createdAt) {
        localStorage.setItem(
          STORAGE_KEYS.guestCreatedAt,
          String(new Date(u.createdAt).getTime()),
        );
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.guestExpiresAt);
      localStorage.removeItem(STORAGE_KEYS.guestCreatedAt);
    }
  } catch (e) {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (authToken) => {
    try {
      const data = await fetchJson('/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setUser(data.user);
      persistGuestClock(data.user);
      return data.user;
    } catch {
      // 401 incluye "invitado expirado": el servidor ya no reconoce la identidad.
      clearSessionStorage();
      clearPersistedModality();
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  const updateActivity = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.lastActivity, Date.now().toString());
    } catch (e) {}
  }, []);

  /** Cierre TOTAL: logout explícito o identidad de invitado ya vencida (12 h). */
  const endSession = useCallback(() => {
    clearSessionStorage();
    try {
      localStorage.removeItem(GUEST_PAUSED_KEY);
    } catch (e) {}
    clearPersistedModality();
    setToken(null);
    setUser(null);
  }, []);

  /** Pausa por inactividad de un INVITADO: la identidad sigue viva en el servidor
   * (le pueden quedar horas de sus 12), así que se conserva su clave localmente y
   * al volver se le lleva a la ventana de elegir su alias o crear uno nuevo —
   * nunca a un re-login silencioso ni a perder el perfil. */
  const pauseGuestSession = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.lastActivity);
      localStorage.setItem(GUEST_PAUSED_KEY, '1');
    } catch (e) {}
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const lastActivity = readStorage(STORAGE_KEYS.lastActivity);
        const guestExpiresAt = readStorage(STORAGE_KEYS.guestExpiresAt);
        const wasGuest = Boolean(readStorage(STORAGE_KEYS.guestToken) || guestExpiresAt);

        // Identidad de invitado vencida (12 h): aquí sí se borra todo.
        if (guestExpiresAt && Date.now() >= new Date(guestExpiresAt).getTime()) {
          clearSessionStorage();
          try {
            localStorage.removeItem(GUEST_PAUSED_KEY);
          } catch (e) {}
          clearPersistedModality();
          setToken(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // El invitado tiene un umbral de inactividad mucho más corto que el
        // registrado. Para el invitado la inactividad PAUSA (identidad intacta,
        // se reelige el alias en la ventana); para el registrado cierra sesión.
        const inactivityLimit = wasGuest ? GUEST_INACTIVITY_MS : USER_INACTIVITY_MS;
        if (lastActivity && Date.now() - Number(lastActivity) > inactivityLimit) {
          if (wasGuest) {
            try {
              localStorage.removeItem(STORAGE_KEYS.token);
              localStorage.removeItem(STORAGE_KEYS.lastActivity);
              localStorage.setItem(GUEST_PAUSED_KEY, '1');
            } catch (e) {}
          } else {
            clearSessionStorage();
            clearPersistedModality();
          }
          setToken(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // Sesión de invitado en pausa: NO reanudar en silencio. El jugador debe
        // pasar por la ventana de "elige tu alias o crea uno nuevo".
        if (readStorage(GUEST_PAUSED_KEY) === '1') {
          setToken(null);
          setUser(null);
          setLoading(false);
          return;
        }

        const stored = readStorage(STORAGE_KEYS.token);

        if (stored) {
          setToken(stored);
          const fetchedUser = await fetchUser(stored);
          if (fetchedUser) {
            updateActivity();
          }
          if (!cancelled) setLoading(false);
          return;
        }

        const guestStored = readStorage(STORAGE_KEYS.guestToken);

        if (guestStored) {
          try {
            const data = await fetchJson('/auth/guest/resume', {
              method: 'POST',
              body: JSON.stringify({ guestToken: guestStored }),
              timeoutMs: 10000,
            });
            if (cancelled) return;
            try {
              localStorage.setItem(STORAGE_KEYS.token, data.token);
              updateActivity();
            } catch (e) {}
            setToken(data.token);
            setUser(data.user);
            persistGuestClock(data.user);
            if (data.user?.isGuest) persistModality('guest');
          } catch {
            // 404 = invitado inexistente o ya expirado en el servidor.
            clearSessionStorage();
            clearPersistedModality();
          }
        }
      } catch (err) {
        console.error('Auth bootstrapping error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();

    // La actividad incluye movimiento y scroll, no solo clic/tecla: con un umbral
    // de 2 min, alguien leyendo la cartelera sin tocar nada sería expulsado.
    const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    let lastWrite = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastWrite < 1000) return; // throttle de escrituras a localStorage
      lastWrite = now;
      updateActivity();
    };
    activityEvents.forEach((evt) =>
      window.addEventListener(evt, handleUserActivity, { passive: true }),
    );

    return () => {
      cancelled = true;
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
    };
  }, [fetchUser, updateActivity]);

  // Vigilante de sesión: expulsa por inactividad (2 min invitado / 30 min registrado)
  // y al morir la identidad de invitado. Antes solo se comprobaba al cargar la
  // página, así que una pestaña abierta nunca se deslogueaba sola.
  useEffect(() => {
    if (!token) return undefined;

    const isGuest = Boolean(user?.isGuest);
    const inactivityLimit = isGuest ? GUEST_INACTIVITY_MS : USER_INACTIVITY_MS;
    const expiresAt = user?.expiresAt || readStorage(STORAGE_KEYS.guestExpiresAt);
    const expiresMs = expiresAt ? new Date(expiresAt).getTime() : null;

    const check = () => {
      if (isGuest && expiresMs && Date.now() >= expiresMs) {
        endSession(); // identidad muerta de verdad (12 h)
        return;
      }
      const last = Number(readStorage(STORAGE_KEYS.lastActivity) || 0);
      if (last && Date.now() - last > inactivityLimit) {
        if (isGuest) {
          pauseGuestSession(); // identidad viva: solo re-elegir alias
        } else {
          endSession();
        }
      }
    };

    check();
    const interval = setInterval(check, SESSION_WATCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token, user?.isGuest, user?.expiresAt, endSession, pauseGuestSession]);

  // `modality` comes from the login URL (?modality=). Registered players
  // default to Mode 2 (free); login no longer forces the future Mode 1.
  const login = async (identifier, password, { modality = null } = {}) => {
    const data = await fetchJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: identifier, password }),
    });
    clearSessionStorage();
    localStorage.setItem(STORAGE_KEYS.token, data.token);
    updateActivity();
    setToken(data.token);
    setUser(data.user);
    persistModality(modality === 'paid' || modality === 'special' ? modality : 'free');
    return data.user;
  };

  const register = async (username, email, password) => {
    const data = await fetchJson('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    clearSessionStorage();
    localStorage.setItem(STORAGE_KEYS.token, data.token);
    updateActivity();
    setToken(data.token);
    setUser(data.user);
    persistModality('free');
    return data.user;
  };

  const playAsGuest = async (customUsername, extra = {}) => {
    const payload = customUsername ? { username: customUsername, ...extra } : undefined;
    const body = payload ? JSON.stringify(payload) : undefined;
    const data = await fetchJson('/auth/guest', {
      method: 'POST',
      body,
    });
    // Identidad NUEVA: hay que borrar el reloj del invitado anterior. Si no, el
    // contador heredaba la fecha de creación del invitado previo y un alias recién
    // nacido aparecía con "0h 00m" restante.
    clearSessionStorage();
    localStorage.setItem(STORAGE_KEYS.token, data.token);
    if (data.guestToken) {
      localStorage.setItem(STORAGE_KEYS.guestToken, data.guestToken);
    }
    persistGuestClock(data.user);
    updateActivity();
    clearTrackTicketUsage();
    setToken(data.token);
    setUser(data.user);
    persistModality('guest');
    return data;
  };

  /** Resume or create a guest JWT so unregistered players can submit tickets. */
  const ensureGuestSession = useCallback(async () => {
    if (token) {
      return { token, user };
    }

    const guestStored = readStorage(STORAGE_KEYS.guestToken);

    if (guestStored) {
      try {
        const data = await fetchJson('/auth/guest/resume', {
          method: 'POST',
          body: JSON.stringify({ guestToken: guestStored }),
          timeoutMs: 10000,
        });
        try {
          localStorage.setItem(STORAGE_KEYS.token, data.token);
          localStorage.removeItem(GUEST_PAUSED_KEY);
        } catch (e) {}
        persistGuestClock(data.user);
        updateActivity();
        setToken(data.token);
        setUser(data.user);
        if (data.user?.isGuest) persistModality('guest');
        return { token: data.token, user: data.user };
      } catch {
        clearSessionStorage();
        clearPersistedModality();
      }
    }

    return { token: null, user: null };
  }, [token, user, updateActivity]);

  const resumeGuestWithToken = async (guestToken) => {
    const data = await fetchJson('/auth/guest/resume', {
      method: 'POST',
      body: JSON.stringify({ guestToken }),
    });
    clearSessionStorage();
    localStorage.setItem(STORAGE_KEYS.token, data.token);
    localStorage.setItem(STORAGE_KEYS.guestToken, data.guestToken);
    persistGuestClock(data.user);
    updateActivity();
    setToken(data.token);
    setUser(data.user);
    persistModality('guest');
    return data.user;
  };

  // Memoizado: se pasa como callback de expiración a componentes que lo usan en
  // efectos (un logout nuevo en cada render reiniciaría sus temporizadores).
  const logout = useCallback(() => {
    endSession();
  }, [endSession]);

  const refreshUser = async () => {
    if (!token) return null;
    return fetchUser(token);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        // Token presence enables protected navigation while profile refresh is in-flight.
        isAuthenticated: !!token,
        login,
        register,
        playAsGuest,
        ensureGuestSession,
        resumeGuestWithToken,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
