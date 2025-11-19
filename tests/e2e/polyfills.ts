import { TransformStream as WebTransformStream } from "web-streams-polyfill";

if (typeof globalThis.TransformStream === "undefined") {
    Object.defineProperty(globalThis, "TransformStream", {
        value: WebTransformStream,
        writable: true,
        configurable: true,
    });
}
