import { ENV } from './env';
import { syncDexcoNfes } from './services/sync-dexco-nfe';
import { createLoopExecutor } from './utils/loopExecute';

// ----------------------------------------------------------------------

console.info('[Fluxu] Starting BOT API');
console.info(`[Fluxu] TZ: ${ENV.TZ}`);

// ----------------------------------------------------------------------

createLoopExecutor({
  id: 'sync-dexco-nfe',
  fn: async () => syncDexcoNfes(),
  intervalMs: 15 * 60_000,
  timeoutMs: 30 * 60_000,
});
