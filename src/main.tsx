import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initializeMobileDeviceShell } from './systems/capacitorBridge';

void initializeMobileDeviceShell();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
