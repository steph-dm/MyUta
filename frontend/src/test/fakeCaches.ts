/** Minimal in-memory Cache Storage for tests (jsdom and Node have none). */
export function installFakeCaches(target: Record<string, unknown> = globalThis as never) {
  const stores = new Map<string, Map<string, Response>>();
  const keyOf = (req: RequestInfo | URL) =>
    new URL(
      typeof req === "string" ? req : req instanceof URL ? req.href : req.url,
      "http://localhost",
    ).pathname;
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return {
      put: async (req: RequestInfo | URL, res: Response) => void store.set(keyOf(req), res),
      match: async (req: RequestInfo | URL) => store.get(keyOf(req))?.clone(),
      delete: async (req: RequestInfo | URL) => store.delete(keyOf(req)),
      keys: async () => [...store.keys()].map((k) => new Request(`http://localhost${k}`)),
      addAll: async () => undefined,
    };
  };
  const caches = {
    open,
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async () => undefined,
  };
  target.caches = caches;
  return { caches, stores };
}
