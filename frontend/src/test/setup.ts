import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll } from "vitest";

// Most tests run in jsdom; the service-worker test runs in Node (no window).
const browser = typeof window !== "undefined";

if (browser) {
  // jsdom lacks these browser APIs used by Radix/cmdk, previews and the media-query hook.
  window.matchMedia ??= (query: string) =>
    ({
      matches: query.includes("min-width: 768px") || query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= function () {};
  Element.prototype.hasPointerCapture ??= () => false;
  URL.createObjectURL ??= () => "blob:test";
  URL.revokeObjectURL ??= () => undefined;
}

beforeAll(async () => {
  if (!browser) return;
  const { default: i18n, NAMESPACES } = await import("@/i18n");
  await i18n.changeLanguage("en");
  await i18n.loadNamespaces([...NAMESPACES]);
});

afterEach(async () => {
  if (!browser) return;
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});
