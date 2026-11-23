// bee — declare the agent skills a project runs on (.bees), pin them (.bees.lock), install them anywhere.
import { PKG } from './config.js';
import { HELP, cmdInit, cmdInstall, cmdList, cmdRemove, cmdSearch, cmdUpdate, cmdUpgrade } from './commands.js';
import { BeeError, die, red, setQuiet } from './ui.js';
import type { Flags } from './types.js';

const VALUED = new Set(['type', 'stage', 'workflow', 'target', 'name', 'description']);

export function parseArgs(argv: string[]): { flags: Flags; pos: string[] } {
  const flags: Flags = {};
  const pos: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split(/=(.*)/s) as [string, string | undefined];
      if (v !== undefined) flags[k] = v;
      else if (VALUED.has(k)) flags[k] = argv[++i];
      else flags[k] = true;
    } else if (a === '-y') flags.yes = true;
    else if (a === '-h') flags.help = true;
    else if (a === '-v') flags.version = true;
    else pos.push(a);
  }
  return { flags, pos };
}

async function main(): Promise<void> {
  const { flags, pos } = parseArgs(process.argv.slice(2));
  setQuiet(!!flags.quiet);
  const cmd = pos.shift();
  if (flags.version) { console.log(PKG.version); return; }
  if (!cmd || flags.help || cmd === 'help') { console.log(HELP); return; }
  switch (cmd) {
    case 'init': return cmdInit(flags);
    case 'install': case 'i': return cmdInstall(pos, flags);
    case 'add':
      if (!pos.length) die('Usage: bee add <skill|source...>');
      return cmdInstall(pos, flags);
    case 'remove': case 'rm': return cmdRemove(pos);
    case 'update': case 'up': return cmdUpdate(pos, flags);
    case 'list': case 'ls': return cmdList(flags);
    case 'search': return cmdSearch(pos, flags);
    case 'upgrade': case 'self-update': return cmdUpgrade();
    default: die(`Unknown command "${cmd}". Run \`bee help\`.`);
  }
}

main().catch((e: unknown) => {
  console.error(red('✗ ') + (e instanceof BeeError ? e.message : (e as Error)?.stack ?? String(e)));
  process.exit(1);
});
