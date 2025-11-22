import toastBus from './toastBus';
export default function toast(message: string) {
  toastBus.emit(message);
}


