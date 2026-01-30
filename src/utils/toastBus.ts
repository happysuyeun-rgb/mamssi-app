type Listener = (message: string) => void;

class ToastBus {
  private listeners: Set<Listener> = new Set();
  subscribe(fn: Listener) {
    this.listeners.add(fn);
  }
  unsubscribe(fn: Listener) {
    this.listeners.delete(fn);
  }
  emit(message: string) {
    this.listeners.forEach((fn) => fn(message));
  }
}

const bus = new ToastBus();
export default bus;
