// A request to the app, with a JSON body when one is given
export const request = (
  path: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Request => {
  const url = `http://localhost${path}`;
  if (body === undefined) return new Request(url, { method, headers });
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Request(url, { method, headers: { "Content-Type": "application/json", ...headers }, body: text });
};

// The status and JSON body of an answer
export const answerOf = async (response: Response): Promise<{ status: number; body: unknown }> => {
  const body: unknown = await response.json();
  return { status: response.status, body };
};
