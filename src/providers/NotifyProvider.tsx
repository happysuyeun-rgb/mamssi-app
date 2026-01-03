import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { notify, type ToastNotification, type BannerNotification, type ModalNotification } from '@lib/notify';
import Toast from '@components/notify/Toast';
import Banner from '@components/notify/Banner';
import Modal from '@components/notify/Modal';

type NotifyContextType = typeof notify;

const NotifyContext = createContext<NotifyContextType | undefined>(undefined);

export function useNotify() {
  const context = useContext(NotifyContext);
  if (context === undefined) {
    throw new Error('useNotify must be used within a NotifyProvider');
  }
  return context;
}

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [banner, setBanner] = useState<BannerNotification | null>(null);
  const [modal, setModal] = useState<ModalNotification | null>(null);

  useEffect(() => {
    const unsubscribe = notify.subscribe((event) => {
      if (event.type === 'toast') {
        const data = event.data as ToastNotification;
        if (data.message) {
          setToast(data);
        } else {
          setToast(null);
        }
      } else if (event.type === 'banner') {
        const data = event.data as BannerNotification;
        if (data.message) {
          setBanner(data);
        } else {
          setBanner(null);
        }
      } else if (event.type === 'modal') {
        const data = event.data as ModalNotification;
        if (data.title || data.message) {
          setModal(data);
        } else {
          setModal(null);
        }
      }
    });

    return unsubscribe;
  }, []);

  const handleToastDismiss = (id: string) => {
    notify.dismissToast(id);
  };

  const handleBannerDismiss = (id: string) => {
    notify.dismissBanner(id);
  };

  const handleModalClose = (id: string, confirmed: boolean) => {
    notify.closeModal(id, confirmed);
  };

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      {toast && <Toast notification={toast} onDismiss={handleToastDismiss} />}
      {banner && <Banner notification={banner} onDismiss={handleBannerDismiss} />}
      {modal && <Modal notification={modal} onClose={handleModalClose} />}
    </NotifyContext.Provider>
  );
}













