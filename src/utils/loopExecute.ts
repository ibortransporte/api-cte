import { errorHandler } from './error';

// ----------------------------------------------------------------------

type LoopExecutorParams = {
  id: string;
  fn: () => Promise<void>;
  timeoutMs: number; // how long an execution can block re-run
  intervalMs: number; // minimum interval between runs
  pollMs?: number; // how often to check
};

// ----------------------------------------------------------------------

export const createLoopExecutor = ({
  id,
  fn,
  timeoutMs,
  intervalMs,
  pollMs = 5000,
}: LoopExecutorParams) => {
  let executionStartedAt: number | null = null;
  let lastExecutedAt: number | null = null;
  let loopTimeout: NodeJS.Timeout | number | undefined;

  const isWithinTimeout = () =>
    executionStartedAt !== null && Date.now() - executionStartedAt < timeoutMs;

  const isWithinInterval = () =>
    lastExecutedAt !== null && Date.now() - lastExecutedAt < intervalMs;

  const executeCheck = async () => {
    if (isWithinTimeout()) return;
    if (isWithinInterval()) return;

    executionStartedAt = Date.now();
    lastExecutedAt = Date.now();

    try {
      await fn();
    } catch (error) {
      errorHandler({ origin: `loopExecutor (id: ${id})`, error });
    } finally {
      executionStartedAt = null;
    }
  };

  const loop = () => {
    clearTimeout(loopTimeout);
    loopTimeout = setTimeout(() => {
      void executeCheck();
      loop();
    }, pollMs);
  };

  loop();

  return {
    stop: () => clearTimeout(loopTimeout),
  };
};
