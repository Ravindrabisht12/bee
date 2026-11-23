import readline from 'node:readline/promises';
import { cyan, dim } from './ui.js';

export interface Prompter {
  text(q: string, def?: string): Promise<string>;
  choose(q: string, options: [string, string][], def: string): Promise<string>;
  confirm(q: string, def?: boolean): Promise<boolean>;
  close(): void;
}

/** Interactive prompts; in non-interactive mode every question returns its default. */
export function prompter(nonInteractive: boolean): Prompter {
  const rl = nonInteractive ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
  let closed = false;
  return {
    async text(q, def = '') {
      if (!rl) return def;
      const a = (await rl.question(`${cyan('?')} ${q}${def ? dim(` (${def})`) : ''} `)).trim();
      return a || def;
    },
    async choose(q, options, def) {
      if (!rl) return def;
      console.log(`${cyan('?')} ${q}`);
      options.forEach(([id, label], i) => console.log(`  ${dim(String(i + 1).padStart(2))} ${label}${id === def ? dim(' (default)') : ''}`));
      for (;;) {
        const a = (await rl.question(dim('  number: '))).trim();
        if (!a) return def;
        const byNum = options[parseInt(a, 10) - 1];
        if (byNum) return byNum[0];
        const byId = options.find(o => o[0] === a);
        if (byId) return byId[0];
      }
    },
    async confirm(q, def = true) {
      if (!rl) return def;
      const a = (await rl.question(`${cyan('?')} ${q} ${dim(def ? '(Y/n)' : '(y/N)')} `)).trim().toLowerCase();
      return a ? a.startsWith('y') : def;
    },
    close() {
      if (rl && !closed) { closed = true; rl.close(); }
    },
  };
}
