'use client';

import { useEffect } from 'react';
import { api } from '@/lib/http-client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }
  return outputArray;
}

export function PwaBootstrap() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js').then(async (registration) => {
      if (!('PushManager' in window) || Notification.permission !== 'granted') return;
      const existing = await registration.pushManager.getSubscription();
      if (existing) return;
      const { data } = await api<{ publicKey: string | null }>('GET', '/push/public-key');
      if (!data.publicKey) return;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
      const json = subscription.toJSON();
      await api('POST', '/push/subscribe', {
        endpoint: json.endpoint,
        keys: json.keys,
      });
    }).catch(() => undefined);
  }, []);

  return null;
}
