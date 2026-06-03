import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { supabase } from './lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function setupPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await supabase.from('push_subscriptions').upsert({
        user_id: session.user.id,
        subscription: JSON.parse(JSON.stringify(subscription))
      }, { onConflict: 'user_id' });
    }
  } catch(e) { console.error('Push setup error:', e); }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    setTimeout(setupPushNotifications, 3000);
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)