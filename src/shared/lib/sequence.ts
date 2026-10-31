// The results of an async step for each item, run one after another
export const mapInOrder = <T, R>(items: readonly T[], step: (item: T) => Promise<R>): Promise<R[]> =>
  items.reduce<Promise<R[]>>(
    (done, item) =>
      done.then(async (results) => {
        results.push(await step(item));
        return results;
      }),
    Promise.resolve([]),
  );
