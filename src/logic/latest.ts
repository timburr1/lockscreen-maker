export type LatestResult<T> = { readonly kind: 'current'; readonly value: T } | { readonly kind: 'stale' };

export type Latest = {
  /** Resolves `stale` for a task superseded before it finished, including one that failed; only the latest task's failure rejects. */
  run<T>(task: () => Promise<T>): Promise<LatestResult<T>>;
};

export function latestCreate(): Latest {
  let latest = 0;
  return {
    async run<T>(task: () => Promise<T>): Promise<LatestResult<T>> {
      latest += 1;
      const mine = latest;
      try {
        const value = await task();
        return mine === latest ? { kind: 'current', value } : { kind: 'stale' };
      } catch (error) {
        if (mine === latest) {
          throw error;
        }
        return { kind: 'stale' };
      }
    },
  };
}
