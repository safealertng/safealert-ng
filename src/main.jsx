import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Initialize OneSignal
window.OneSignalDeferred = window.OneSignalDeferred || [];
window.OneSignalDeferred.push(async function(OneSignal) {
  await OneSignal.init({
    appId: "6abae88c-4a8e-4311-908c-5079a8acf2d3",
    notifyButton: { enable: true },
    allowLocalhostAsSecureOrigin: true,
    promptOptions: {
      slidedown: {
        prompts: [
          {
            type: "push",
            autoPrompt: true,
            text: {
              actionMessage: "SafeAlertNG needs permission to send you emergency alerts and panic notifications.",
              acceptButton: "Allow Alerts",
              cancelButton: "No Thanks",
            },
            delay: {
              pageViews: 1,
              timeDelay: 3,
            },
          }
        ]
      }
    }
  });
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)