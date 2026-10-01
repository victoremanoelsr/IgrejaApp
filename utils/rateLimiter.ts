// Utilitário de Proteção contra Força Bruta (Rate Limiting de Login)
// Limita tentativas consecutivas de senha incorreta para proteger contas de usuários e membros.

const STORAGE_KEY = 'ia_auth_rate_limit_v1';
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutos de bloqueio temporário

interface AttemptRecord {
  count: number;
  lockedUntil?: number;
  lastAttempt: number;
}

type AttemptMap = Record<string, AttemptRecord>;

const normalizeKey = (identifier: string): string => {
  const clean = identifier.trim().toLowerCase();
  // Se for CPF (com pontuação ou não), normaliza para apenas dígitos
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length === 11) {
    return `cpf_${digitsOnly}`;
  }
  return `user_${clean}`;
};

const getStore = (): AttemptMap => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const saveStore = (store: AttemptMap) => {
  try {
    // Limpeza de registros muito antigos (mais de 24h)
    const now = Date.now();
    const cleaned: AttemptMap = {};
    for (const [k, v] of Object.entries(store)) {
      if (now - v.lastAttempt < 24 * 60 * 60 * 1000) {
        cleaned[k] = v;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // Fallback silencioso caso localStorage esteja restrito
  }
};

export interface RateLimitStatus {
  isLocked: boolean;
  remainingSeconds: number;
  attemptsLeft: number;
  totalAttempts: number;
}

/**
 * Verifica se um identificador (usuário ou CPF) está temporariamente bloqueado.
 */
export const checkRateLimit = (identifier: string): RateLimitStatus => {
  if (!identifier || !identifier.trim()) {
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_LOGIN_ATTEMPTS, totalAttempts: 0 };
  }

  const key = normalizeKey(identifier);
  const store = getStore();
  const record = store[key];

  if (!record) {
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_LOGIN_ATTEMPTS, totalAttempts: 0 };
  }

  const now = Date.now();

  // Se havia bloqueio mas o tempo expirou, reseta o contador
  if (record.lockedUntil && record.lockedUntil <= now) {
    delete store[key];
    saveStore(store);
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_LOGIN_ATTEMPTS, totalAttempts: 0 };
  }

  // Se ainda está no período de bloqueio
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
 * Registra uma tentativa falha de login.
 * Se atingir o limite, ativa o bloqueio temporário.
 */
export const recordFailedLogin = (identifier: string): RateLimitStatus => {
  if (!identifier || !identifier.trim()) {
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_LOGIN_ATTEMPTS, totalAttempts: 0 };
  }

  const key = normalizeKey(identifier);
  const store = getStore();
  const now = Date.now();
  const current = store[key] || { count: 0, lastAttempt: now };

  // Se já tinha expirado o bloqueio, reseta
  if (current.lockedUntil && current.lockedUntil <= now) {
    current.count = 0;
    delete current.lockedUntil;
  }

  current.count += 1;
  current.lastAttempt = now;

  if (current.count >= MAX_LOGIN_ATTEMPTS) {
    current.lockedUntil = now + LOCKOUT_DURATION_MS;
    store[key] = current;
    saveStore(store);
    return {
      isLocked: true,
      remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      attemptsLeft: 0,
      totalAttempts: current.count,
    };
  }

  store[key] = current;
  saveStore(store);

  return {
    isLocked: false,
    remainingSeconds: 0,
    attemptsLeft: Math.max(0, MAX_LOGIN_ATTEMPTS - current.count),
    totalAttempts: current.count,
  };
};

/**
 * Reseta as tentativas falhas após um login com sucesso.
 */
export const resetLoginAttempts = (identifier: string) => {
  if (!identifier) return;
  const key = normalizeKey(identifier);
  const store = getStore();
  if (store[key]) {
    delete store[key];
    saveStore(store);
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
