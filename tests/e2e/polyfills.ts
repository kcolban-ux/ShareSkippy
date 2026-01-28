import { TransformStream as WebTransformStream } from 'web-streams-polyfill';

/**
 * Fills the runtime with a TransformStream implementation when missing so Playwright
 * scripts can rely on the same stream APIs as modern browsers.
 */
if (typeof globalThis.TransformStream === 'undefined') {
  Object.defineProperty(globalThis, 'TransformStream', {
    value: WebTransformStream,
    writable: false,
    enumerable: false,
    configurable: true,
  });
}
