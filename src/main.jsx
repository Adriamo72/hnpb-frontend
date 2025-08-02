import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './context/AppContext';
import App from './App.jsx';
import './index.css';

// Selecciona el elemento raíz
const container = document.getElementById('root');

// Crea un root
const root = createRoot(container);

// Renderiza la aplicación
root.render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);