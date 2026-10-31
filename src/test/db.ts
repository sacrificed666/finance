import type { Mock } from "vitest";

export interface QueryResult {
  rows: unknown[];
  rowCount: number;
}

export type QueryFn = (sql: string, params?: readonly unknown[]) => Promise<QueryResult>;

type Handler = readonly [RegExp, (params: readonly unknown[]) => unknown[] | QueryResult];

// A result as pg gives it, with the row count
export const result = (rows: unknown[] = [], rowCount = rows.length): QueryResult => ({ rows, rowCount });

// Answers each statement with the first handler that matches it, or no rows
export const answerQueries = (query: Mock<QueryFn>, handlers: readonly Handler[]) =>
  query.mockImplementation((sql, params = []) => {
    const handler = handlers.find(([pattern]) => pattern.test(sql));
    const answer = handler ? handler[1](params) : [];
    return Promise.resolve(Array.isArray(answer) ? result(answer) : answer);
  });

// The statements a query mock was called with, squeezed to one line each
export const statements = (query: Mock<QueryFn>): string[] =>
  query.mock.calls.map(([sql]) => sql.replaceAll(/\s+/gu, " ").trim());
