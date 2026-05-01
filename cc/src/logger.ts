// ANSI color codes
const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

let indent = 0;

function timestamp(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

function tagStr(tag: string): string {
  return `${C.bold}[${tag}]${C.reset}`;
}

function indentStr(): string {
  return indent > 0 ? '  '.repeat(indent) : '';
}

function formatData(data?: unknown): string {
  if (data === undefined) return '';
  if (typeof data === 'string') return ` ${C.dim}${data}${C.reset}`;
  try {
    const s = JSON.stringify(data);
    return s.length > 200 ? ` ${C.dim}${s.slice(0, 200)}...${C.reset}` : ` ${C.dim}${s}${C.reset}`;
  } catch {
    return ` ${C.dim}${String(data)}${C.reset}`;
  }
}

function write(msg: string) {
  process.stderr.write(msg + '\n');
}

export const log = {
  info(tag: string, message: string, data?: unknown) {
    write(`${C.gray}[${timestamp()}]${C.reset} ${indentStr()}${tagStr(tag)} ${message}${formatData(data)}`);
  },

  step(tag: string, message: string, data?: unknown) {
    write(`${C.gray}[${timestamp()}]${C.reset} ${indentStr()}${C.cyan}▶${C.reset} ${tagStr(tag)} ${message}${formatData(data)}`);
  },

  success(tag: string, message: string, data?: unknown) {
    write(`${C.gray}[${timestamp()}]${C.reset} ${indentStr()}${C.green}✓${C.reset} ${tagStr(tag)} ${message}${formatData(data)}`);
  },

  warn(tag: string, message: string, data?: unknown) {
    write(`${C.gray}[${timestamp()}]${C.reset} ${indentStr()}${C.yellow}⚠${C.reset} ${tagStr(tag)} ${message}${formatData(data)}`);
  },

  error(tag: string, message: string, data?: unknown) {
    write(`${C.gray}[${timestamp()}]${C.reset} ${indentStr()}${C.red}✗${C.reset} ${tagStr(tag)} ${message}${formatData(data)}`);
  },

  data(tag: string, label: string, value: unknown) {
    const v = typeof value === 'string' ? value : JSON.stringify(value);
    write(`${C.gray}[${timestamp()}]${C.reset} ${indentStr()}${C.magenta}●${C.reset} ${tagStr(tag)} ${C.dim}${label}:${C.reset} ${v}`);
  },

  group(tag: string, message: string) {
    write(`${C.gray}[${timestamp()}]${C.reset} ${indentStr()}${C.blue}┏${C.reset} ${tagStr(tag)} ${C.bold}${message}${C.reset}`);
    indent++;
  },

  groupEnd() {
    indent = Math.max(0, indent - 1);
  },
};
