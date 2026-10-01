// Utilitário de Proteção contra Força Bruta (Rate Limiting de Login)
// Integrado ao Banco de Dados (Supabase RPC) com fallback resiliente em localStorage.

import { supabase } from '../services/supabaseClient';

const STORAGE_KEY = 'ia_auth_rate_limit_v1';
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutos de bloqueio temporário

export interface RateLimitStatus {
  isLocked: boolean;
  remainingSeconds: number;
  attemptsLeft: number;
  totalAttempts: number;
}

interface AttemptRecord {
  count: number;
  lockedUntil?: number;
  lastAttempt: number;
}

type AttemptMap = Record<string, AttemptRecord>;

const normalizeKey = (identifier: string): string => {
  const clean = identifier.trim().toLowerCase();
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length === 11) {
    return `cpf_${digitsOnly}`;
  }
  return `user_${clean}`;
};

const getLocalStore = (): AttemptMap => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const saveLocalStore = (store: AttemptMap) => {
  try {
    const now = Date.now();
    const cleaned: AttemptMap = {};
    for (const [k, v] of Object.entries(store)) {
      if (now - v.lastAttempt < 24 * 60 * 60 * 1000) {
        cleaned[k] = v;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {}
};

const updateLocalCache = (identifier: string, status: RateLimitStatus) => {
  try {
    const key = normalizeKey(identifier);
    const store = getLocalStore();
    const now = Date.now();
    store[key] = {
      count: status.totalAttempts,
      lockedUntil: status.isLocked ? now + status.remainingSeconds * 1000 : undefined,
      lastAttempt: now,
    };
    saveLocalStore(store);
  } catch {}
};

/**
 * Consulta síncrona rápida no cache local (útil para renderização instantânea)
 */
export const checkLocalRateLimit = (identifier: string): RateLimitStatus => {
  if (!identifier || !identifier.trim()) {
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_LOGIN_ATTEMPTS, totalAttempts: 0 };
  }

  const key = normalizeKey(identifier);
  const store = getLocalStore();
  const record = store[key];

  if (!record) {
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_LOGIN_ATTEMPTS, totalAttempts: 0 };
  }

  const now = Date.now();

  if (record.lockedUntil && record.lockedUntil <= now) {
    delete store[key];
    saveLocalStore(store);
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_LOGIN_ATTEMPTS, totalAttempts: 0 };
  }

  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      isLocked: true,
      remainingSeconds,
      attemptsLeft: 0,
      totalAttempts: record.count,
    };
  }

  const attemptsLeft = Math.max(0, MAX_LOGIN_ATTEMPTS - record.count);
  return {
    isLocked: false,
    remainingSeconds: 0,
    attemptsLeft,
    totalAttempts: record.count,
  };
};

/**
 * Consulta de bloqueio no Banco de Dados (Supabase RPC) com fallback no cache local.
 */
export const checkRateLimit = async (identifier: string): Promise<RateLimitStatus> => {
  if (!identifier || !identifier.trim()) {
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_LOGIN_ATTEMPTS, totalAttempts: 0 };
  }

  try {
    const { data, error } = await supabase.rpc('check_login_lockout', {
      p_identifier: identifier.trim(),
    });

    if (!error && data && typeof data === 'object') {
      const status: RateLimitStatus = {
        isLocked: !!data.is_locked,
        remainingSeconds: Number(data.remaining_seconds) || 0,
        attemptsLeft: Number(data.attempts_left) ?? MAX_LOGIN_ATTEMPTS,
        totalAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - (Number(data.attempts_left) || 0)),
      };
      updateLocalCache(identifier, status);
      return status;
    }
  } catch (e) {
    console.warn('[RateLimit] Supabase indisponível, usando cache local:', e);
  }

  return checkLocalRateLimit(identifier);
};

/**
 * Registra tentativa incorreta no Banco de Dados (Supabase RPC) e atualiza cache.
 */
export const recordFailedLogin = async (identifier: string): Promise<RateLimitStatus> => {
  if (!identifier || !identifier.trim()) {
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_LOGIN_ATTEMPTS, totalAttempts: 0 };
  }

  try {
    const { data, error } = await supabase.rpc('record_login_failure', {
      p_identifier: identifier.trim(),
    });

    if (!error && data && typeof data === 'object') {
      const status: RateLimitStatus = {
        isLocked: !!data.is_locked,
        remainingSeconds: Number(data.remaining_seconds) || 0,
        attemptsLeft: Number(data.attempts_left) ?? 0,
        totalAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - (Number(data.attempts_left) || 0)),
      };
      updateLocalCache(identifier, status);
      return status;
    }
  } catch (e) {
    console.warn('[RateLimit] Erro ao gravar tentativa no banco, usando fallback local:', e);
  }

  // Fallback local caso haja falha de conexão
  const key = normalizeKey(identifier);
  const store = getLocalStore();
  const now = Date.now();
  const current = store[key] || { count: 0, lastAttempt: now };

  if (current.lockedUntil && current.lockedUntil <= now) {
    current.count = 0;
    delete current.lockedUntil;
  }

  current.count += 1;
  current.lastAttempt = now;

  if (current.count >= MAX_LOGIN_ATTEMPTS) {
    current.lockedUntil = now + LOCKOUT_DURATION_MS;
    store[key] = current;
    saveLocalStore(store);
    return {
      isLocked: true,
      remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      attemptsLeft: 0,
      totalAttempts: current.count,
    };
  }

  store[key] = current;
  saveLocalStore(store);

  return {
    isLocked: false,
    remainingSeconds: 0,
    attemptsLeft: Math.max(0, MAX_LOGIN_ATTEMPTS - current.count),
    totalAttempts: current.count,
  };
};

/**
 * Reseta as tentativas no Banco de Dados e no cache local após login com sucesso.
 */
export const resetLoginAttempts = async (identifier: string) => {
  if (!identifier) return;

  // Limpa cache local
  try {
    const key = normalizeKey(identifier);
    const store = getLocalStore();
    if (store[key]) {
      delete store[key];
      saveLocalStore(store);
    }
  } catch {}

  // Limpa no banco de dados via RPC
  try {
    await supabase.rpc('clear_login_lockout', {
      p_identifier: identifier.trim(),
    });
  } catch (e) {
    console.warn('[RateLimit] Erro ao resetar tentativas no banco:', e);
  }
};

/**
 * Formata segundos em MM:SS (ex: "04:59")
 */
export const formatLockoutTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
