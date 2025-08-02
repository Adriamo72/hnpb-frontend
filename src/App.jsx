import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AppProvider } from './context/AppContext';
import AppRoutes from './AppRoutes';

// Tema personalizado mejorado
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Azul hospitalario
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#4caf50', // Verde para acciones positivas
    },
    error: {
      main: '#d32f2f', // Rojo para errores
    },
    background: {
      default: '#f5f9ff', // Fondo claro azulado
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none', // Botones sin mayúsculas
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider 
        maxSnack={3}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        autoHideDuration={5000}
        preventDuplicate
      >
        <Router>
          <AppProvider>
            <AppRoutes />
          </AppProvider>
        </Router>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;