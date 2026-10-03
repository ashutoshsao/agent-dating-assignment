import { EventEmitter } from "node:events";
import type { DateEvent } from "@dating/shared";

/** In-process pub/sub for live date events, keyed by dateId. */
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export const bus = {
  publish: (dateId: string, e: DateEvent) => emitter.emit(dateId, e),
  subscribe: (dateId: string, fn: (e: DateEvent) => void) => {
    emitter.on(dateId, fn);
    return () => emitter.off(dateId, fn);
  },
};
