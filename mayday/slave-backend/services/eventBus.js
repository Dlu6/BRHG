import { EventEmitter } from "events";

const eventBus = new EventEmitter();

// Wrapper functions for backward compatibility
const emit = (event, data) => {
  eventBus.emit(event, data);
};

const on = (event, listener) => {
  eventBus.on(event, listener);
};

const off = (event, listener) => {
  eventBus.off(event, listener);
};

export const EventBusService = {
  emit,
  on,
  off,
  eventBus,
};
