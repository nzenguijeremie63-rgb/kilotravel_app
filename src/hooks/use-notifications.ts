import { useState, useEffect } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Ce navigateur ne supporte pas les notifications.');
      return;
    }
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch (error) {
      console.error('Erreur lors de la demande de permission', error);
    }
  };

  const notify = (title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/pwa-192.png',
        badge: '/pwa-192.png',
        ...options
      });
    }
  };

  return { permission, requestPermission, notify };
}
