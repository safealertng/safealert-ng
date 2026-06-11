import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { setupPushNotifications } from './lib/push.js'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    setTimeout(setupPushNotifications, 4000);
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)