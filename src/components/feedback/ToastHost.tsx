import { useEffect, useState } from 'react';
import toastBus from '@utils/toastBus';

export default function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const sub = (msg: string) => {
      setMessage(msg);
      window.clearTimeout((toastBus as any)._t);
      (toastBus as any)._t = window.setTimeout(() => setMessage(null), 2000);
    };
    toastBus.subscribe(sub);
    return () => toastBus.unsubscribe(sub);
  }, []);
  if (!message) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 72,
        background: '#1F2B52',
        color: '#F6F9F8',
        padding: '10px 14px',
        borderRadius: 12,
        border: '1px solid #2A355A',
        boxShadow: '0 10px 20px rgba(0,0,0,.35)',
        fontSize: 13,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        zIndex: 40,
        maxWidth: 320,
        textAlign: 'center',
      }}
    >
      <span>🔔</span>
      <span>{message}</span>
    </div>
  );
}
