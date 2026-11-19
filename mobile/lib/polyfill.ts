const target = globalThis as typeof globalThis & {
  requestAnimationFrame?: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame?: (handle: number) => void;
};

if (typeof target.requestAnimationFrame !== 'function') {
  target.requestAnimationFrame = (callback) =>
    setTimeout(() => callback(Date.now()), 0) as unknown as number;
  target.cancelAnimationFrame = (handle) => clearTimeout(handle);
}
