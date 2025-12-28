type ToastType = 'success' | 'info' | 'warning' | 'error';

type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastNotification = {
  id: string;
  type: ToastType;
  icon?: string;
  message: string;
  action?: ToastAction;
  duration?: number;
};

type BannerLevel = 'info' | 'warn' | 'critical';

export type BannerNotification = {
  id: string;
  level: BannerLevel;
  message: string;
  dismissible: boolean;
};

export type ModalNotification = {
  id: string;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type NotificationEvent = {
  type: 'toast' | 'banner' | 'modal';
  data: ToastNotification | BannerNotification | ModalNotification;
};

type NotificationListener = (event: NotificationEvent) => void;

class NotifyManager {
  private listeners: Set<NotificationListener> = new Set();
  private toastQueue: ToastNotification[] = [];
  private bannerQueue: BannerNotification[] = [];
  private modalQueue: ModalNotification[] = [];
  private currentToast: ToastNotification | null = null;
  private currentBanner: BannerNotification | null = null;
  private currentModal: ModalNotification | null = null;
  private debounceMap: Map<string, number> = new Map();
  private readonly DEBOUNCE_DURATION = 2000; // 2초

  subscribe(listener: NotificationListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: NotificationEvent) {
    this.listeners.forEach((listener) => listener(event));
  }

  private generateId(): string {
    return `notify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldDebounce(key: string): boolean {
    const now = Date.now();
    const lastTime = this.debounceMap.get(key);
    if (lastTime && now - lastTime < this.DEBOUNCE_DURATION) {
      return true;
    }
    this.debounceMap.set(key, now);
    return false;
  }

  toast(options: {
    type: ToastType;
    icon?: string;
    message: string;
    action?: ToastAction;
    duration?: number;
    debounceKey?: string;
  }) {
    const { type, icon, message, action, duration, debounceKey } = options;

    // 디바운스 체크
    if (debounceKey && this.shouldDebounce(debounceKey)) {
      return;
    }

    const notification: ToastNotification = {
      id: this.generateId(),
      type,
      icon,
      message,
      action,
      duration: duration || (type === 'error' ? 5000 : 3000)
    };

    if (this.currentToast) {
      this.toastQueue.push(notification);
    } else {
      this.currentToast = notification;
      this.emit({ type: 'toast', data: notification });
    }
  }

  banner(options: {
    level: BannerLevel;
    message: string;
    dismissible?: boolean;
  }) {
    const { level, message, dismissible = true } = options;

    const notification: BannerNotification = {
      id: this.generateId(),
      level,
      message,
      dismissible
    };

    // 배너는 최대 1개만 표시
    if (this.currentBanner) {
      this.dismissBanner(this.currentBanner.id);
    }

    this.currentBanner = notification;
    this.emit({ type: 'banner', data: notification });
  }

  modal(options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) {
    const { title, message, confirmLabel, cancelLabel, onConfirm, onCancel } = options;

    const notification: ModalNotification = {
      id: this.generateId(),
      title,
      message,
      confirmLabel: confirmLabel || '확인',
      cancelLabel: cancelLabel || '취소',
      onConfirm,
      onCancel
    };

    // 모달은 최대 1개만 표시
    if (this.currentModal) {
      this.modalQueue.push(notification);
    } else {
      this.currentModal = notification;
      this.emit({ type: 'modal', data: notification });
    }
  }

  dismissToast(id: string) {
    if (this.currentToast?.id === id) {
      this.currentToast = null;
      this.emit({ type: 'toast', data: { id, type: 'success', message: '' } as ToastNotification });

      // 큐에서 다음 토스트 표시
      if (this.toastQueue.length > 0) {
        const next = this.toastQueue.shift()!;
        this.currentToast = next;
        this.emit({ type: 'toast', data: next });
      }
    }
  }

  dismissBanner(id: string) {
    if (this.currentBanner?.id === id) {
      this.currentBanner = null;
      this.emit({ type: 'banner', data: { id, level: 'info', message: '', dismissible: true } as BannerNotification });
    }
  }

  closeModal(id: string, confirmed: boolean = false) {
    if (this.currentModal?.id === id) {
      const modal = this.currentModal;
      this.currentModal = null;
      this.emit({ type: 'modal', data: { id, title: '', message: '' } as ModalNotification });

      if (confirmed && modal.onConfirm) {
        modal.onConfirm();
      } else if (!confirmed && modal.onCancel) {
        modal.onCancel();
      }

      // 큐에서 다음 모달 표시
      if (this.modalQueue.length > 0) {
        const next = this.modalQueue.shift()!;
        this.currentModal = next;
        this.emit({ type: 'modal', data: next });
      }
    }
  }

  // 편의 메서드
  success(message: string, icon?: string, action?: ToastAction) {
    this.toast({ type: 'success', message, icon: icon || '✅', action });
  }

  info(message: string, icon?: string, action?: ToastAction) {
    this.toast({ type: 'info', message, icon: icon || 'ℹ️', action });
  }

  warning(message: string, icon?: string, action?: ToastAction) {
    this.toast({ type: 'warning', message, icon: icon || '⚠️', action });
  }

  error(message: string, icon?: string, action?: ToastAction) {
    this.toast({ type: 'error', message, icon: icon || '❌', action });
  }
}

export const notify = new NotifyManager();








