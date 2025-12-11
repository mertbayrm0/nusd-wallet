import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

// --- MAGIC LINK HANDLER (PRE-MOUNT) ---
const search = new URLSearchParams(window.location.search);
const magicToken = search.get('token');
const magicEmail = search.get('email');

if (magicToken && magicEmail) {
  console.log("Magic Link Detected (Pre-Mount)");
  localStorage.setItem('nusd_auth_token', magicToken);
  localStorage.setItem('nusd_current_user', magicEmail);

  // Preserve exiting hash or default to admin
  let targetHash = window.location.hash;
  if (!targetHash || targetHash === '#/') {
    targetHash = '#/admin';
  }

  // Construct Clean URL
  const cleanUrl = window.location.origin + window.location.pathname + targetHash;

  // Replace history state immediately
  window.history.replaceState({}, '', cleanUrl);
  // No reload needed here because we haven't rendered yet! The App will read the clean URL and localStorage.
}
// --------------------------------------

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);