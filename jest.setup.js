require("@testing-library/jest-dom");

// C7.18: layout-aware list rows use ResizeObserver; jsdom intentionally has no
// implementation, so provide the minimal lifecycle-safe browser contract.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
