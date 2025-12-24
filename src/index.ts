import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { ENV } from './env';
import { routes } from './routes';
import { syncDexcoNfes } from './services/sync-dexco-nfe';
import { createLoopExecutor } from './utils/loopExecute';

// ----------------------------------------------------------------------

console.info('[Fluxu] Starting BOT API');
console.info(`[Fluxu] TZ: ${ENV.TZ}`);
console.info(`[Fluxu] Allow origin: ${ENV.ORIGIN}`);
console.info(`[Fluxu] Hasura: ${ENV.HASURA_HTTPS}`);

// ----------------------------------------------------------------------

createLoopExecutor({
  id: 'sync-dexco-nfe',
  fn: async () => syncDexcoNfes(),
  intervalMs: 15 * 60_000,
  timeoutMs: 30 * 60_000,
});

// ----------------------------------------------------------------------

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors({ origin: ENV.ORIGIN }));

app.use('/api', routes);

app.listen(ENV.PORT, () => console.info(`[Fluxu] Running on port ${ENV.PORT}`));
