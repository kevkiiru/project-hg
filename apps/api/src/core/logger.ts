import { config } from './config/config';

type Level = 'fatal' | 'error' | 'warn' | 'info' | 'debug';
const ORDER: Record<Level, number> = { fatal: 60, error: 50, warn: 40, info: 30, debug: 20 };

let correlationId: string | undefined;
export const setCorrelationId = (id: string) => {
  correlationId = id;
};

function write(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (ORDER[level] < ORDER[config().LOG_LEVEL]) return;
  const line = {
    time: new Date().toISOString(),
    level,
    msg,
    correlationId,
    ...((fields ? sanitize(fields) : {}) as Record<string, unknown>),
  };
  const out = level === 'error' || level === 'fatal' ? process.stderr : process.stdout;
  out.write(JSON.stringify(line) + '\n');
}

const SECRET_KEYS = /password|secret|token|authorization|pin|otp|card|cvv|passkey/i;
export function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 6 || obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Error) {
    return { name: obj.name, message: obj.message, stack: obj.stack?.split('\n').slice(0, 8) };
  }
  if (Array.isArray(obj)) return obj.map((x) => sanitize(x, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SECRET_KEYS.test(k)) out[k] = '[redacted]';
    else out[k] = sanitize(v, depth + 1);
  }
  return out;
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => write('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => write('error', msg, fields),
  fatal: (msg: string, fields?: Record<string, unknown>) => write('fatal', msg, fields),
};
