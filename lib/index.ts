interface WorkInit<TInit> {
  init: () => Promise<TInit>;
  loop: {
    start: number;
    end: () => boolean;
  };
  work: (index: number, ref: TInit) => Promise<void>;
  async?: {
    workers: number;
    amount: number;
  };
}

async function spawnWorker<TInit>(
  [startIndex, endIndex]: [number, number],
  work: (index: number, ref: TInit) => Promise<void>,
  value: TInit,
  end: () => boolean
) {
  for (let index = startIndex; index < endIndex; index++) {
    if (end()) {
      break;
    }

    await work(index, value);
  }
}

export function loop<T>(
  init: () => Promise<(index: number) => T>,
  end: () => boolean,
  start: number = 0
) {
  return {
    async work(index: number, ref: (index: number) => T) {
      await ref(index);
    },
    loop: {
      start,
      end,
    },
    init,
  };
}

export function splitWork<TInit>({
  init,
  loop,
  work,
  async,
}: WorkInit<TInit>): Promise<void> {
  let allocationIndex = 0;
  let returned: TInit[] = [];

  const allocateWorkload = () => {
    const workload = [
      allocationIndex,
      allocationIndex + (async?.amount ?? 32),
    ] as [number, number];
    allocationIndex += async?.amount ?? 32;
    return workload;
  };
  let activeWorkers = 0;

  const reuseOrInit = async () => {
    if (returned.length) {
      const selected = returned[0];
      returned = returned.filter((item) => item !== selected);
      return selected;
    }
    return await init();
  };
  return new Promise<void>((resolve) => {
    let queued = false;
    const respawnWorkers = async () => {
      for (; activeWorkers < (async?.workers ?? 8); activeWorkers++) {
        if (loop.end()) {
          resolve();
          return;
        }
        const item = await reuseOrInit();
        spawnWorker(allocateWorkload(), work, item, loop.end).finally(() => {
          returned.push(item);
          if (!queued) {
            queued = true;
            queueMicrotask(() => {
              queued = false;
              respawnWorkers();
            });
          }
          activeWorkers--;
        });
      }
    };
    respawnWorkers();
  });
}
