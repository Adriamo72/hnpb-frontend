import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { io } from 'socket.io-client';
import { useSnackbar } from 'notistack';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [limpiezaUpdates, setLimpiezaUpdates] = useState([]); // Ahora almacena los datos de actualización
  const { enqueueSnackbar } = useSnackbar();
  const socketRef = useRef(null);
  const audioRef = useRef(null);

  const logout = useCallback(async (isExpired = false) => {
    try {
      // Limpiar estado local primero
      localStorage.removeItem('token');
      setUser(null);
      
      // Intentar logout en el servidor (opcional)
      const token = localStorage.getItem('token');
      if (token) {
        await apiService.auth.logout().catch(() => {});
      }
      
      // Mostrar solo una notificación relevante
      enqueueSnackbar(
        isExpired ? 'Tu sesión ha expirado' : 'Sesión cerrada correctamente', 
        { 
          variant: isExpired ? 'error' : 'info',
          autoHideDuration: 3000
        }
      );
      
      if (socketRef.current) socketRef.current.disconnect();
    } catch (error) {
      console.log('Error en logout:', error);
    }
  }, [enqueueSnackbar]);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log('Error al reproducir sonido:', e));
    }
  }, []);

  const verifyAuth = useCallback(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      setLoading(true);
      try {
        const response = await apiService.auth.verify();
        setUser(response.user);
      } catch (error) {
        if (error.response?.status === 401) {
          logout(true); // Pasar true para indicar que es por expiración
        }
      } finally {
        setLoading(false);
      }
    }, [logout]);

  // Configuración del socket y manejo de eventos
  useEffect(() => {
    if (!user) return;

    audioRef.current = new Audio('/notification.wav');
    audioRef.current.volume = 0.3;

    socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
      path: '/socket.io',
      secure: true,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    const socket = socketRef.current;

    const handleLimpiezaUpdate = (data) => {
      playNotificationSound();
      enqueueSnackbar(`Limpieza actualizada en ${data.local?.nombre || 'un local'}`, {
        variant: 'success',
        autoHideDuration: 3000
      });
      setLimpiezaUpdates(prev => [...prev, data]); // Almacena los datos completos
    };

    socket.on('limpieza:actualizada', handleLimpiezaUpdate);
    socket.on('limpieza:deleted', (data) => {
      playNotificationSound();
      enqueueSnackbar(`Limpieza eliminada en ${data.local?.nombre || 'un local'}`, {
        variant: 'info',
        autoHideDuration: 3000
      });
      setLimpiezaUpdates(prev => [...prev, { ...data, deleted: true }]);
    });

    return () => {
      socket.off('limpieza:actualizada', handleLimpiezaUpdate);
      socket.disconnect();
    };
  }, [user, enqueueSnackbar, playNotificationSound]);

  useEffect(() => {
      const token = localStorage.getItem('token');
      if (token) verifyAuth();

      // Controlador único para eventos de logout
      const handleAuthEvents = (event) => {
        if (event.type === 'unauthorized' || event.key === 'logout') {
          logout(event.type === 'unauthorized');
        }
      };

      window.addEventListener('storage', handleAuthEvents);
      window.addEventListener('unauthorized', handleAuthEvents);

      return () => {
        window.removeEventListener('storage', handleAuthEvents);
        window.removeEventListener('unauthorized', handleAuthEvents);
      };
    }, [verifyAuth, logout]);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    try {
      const response = await apiService.auth.login(credentials);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      enqueueSnackbar('Inicio de sesión exitoso', { 
        variant: 'success',
        autoHideDuration: 3000
      });
      return { success: true, user: response.user };
    } catch (error) {
      enqueueSnackbar(error.message || 'Error al iniciar sesión', { 
        variant: 'error',
        autoHideDuration: 3000
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  const register = useCallback(async (userData) => {
    setLoading(true);
    try {
      await apiService.auth.register(userData);
      enqueueSnackbar('Registro exitoso. Por favor inicia sesión.', { 
        variant: 'success',
        autoHideDuration: 3000
      });
      return { success: true };
    } catch (error) {
      enqueueSnackbar(error.message || 'Error al registrarse', { 
        variant: 'error',
        autoHideDuration: 3000
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  const joinRoom = useCallback((room) => {
    if (socketRef.current) {
      socketRef.current.emit('join', room);
    }
  }, []);

  const leaveRoom = useCallback((room) => {
    if (socketRef.current) {
      socketRef.current.emit('leave', room);
    }
  }, []);

  const contextValue = {
    user,
    loading,
    login,
    register,
    logout,
    joinRoom,
    leaveRoom,
    limpiezaUpdates, 
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext debe usarse dentro de un AppProvider');
  }
  return context;
};