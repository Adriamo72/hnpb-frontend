import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Define qué endpoints son públicos (no requieren token)
const PUBLIC_ENDPOINTS = [
  '/locales/uuid/', // Para obtener local por UUID
  '/empleados/dni/',
  '/limpieza/create',
  '/auth/verify-token'
];

// Configuración global de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 segundos timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  // Solo añadir token si NO es una ruta pública
  const isPublic = PUBLIC_ENDPOINTS.some(endpoint => config.url.includes(endpoint));
  const token = localStorage.getItem('token');
  
  if (!isPublic && token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores
api.interceptors.response.use(
  response => response.data,
  error => {
    const isPublic = PUBLIC_ENDPOINTS.some(endpoint => 
      error.config.url.includes(endpoint)
    );

    // Solo manejar 401 en rutas PRIVADAS
    if (error.response?.status === 401 && !isPublic) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('unauthorized'));
    }
    if (error.response) {
      // Error con respuesta del servidor
      if (error.response.status === 401) {
        // Token inválido o expirado - forzar logout
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('unauthorized'));
      }
      
      // Mantén todo el error de Axios disponible
      const serverError = new Error(
        error.response.data.message || 
        error.response.data.error || 
        error.response.data.detail || 
        `Error ${error.response.status}`
      );
      serverError.response = error.response; // Mantén toda la respuesta
      throw serverError;
    } else if (error.request) {
      // Error sin respuesta (problema de conexión)
      throw new Error('Error de conexión con el servidor');
    } else {
      // Error en la configuración
      throw new Error('Error en la configuración de la solicitud');
    }
  }
);

export const apiService = {
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    verify: () => api.get('/auth/verify'),
    logout: () => api.post('/auth/logout'),
  },
  limpieza: {
    getAll: () => api.get('/limpieza'),
    create: (data) => api.post('/limpieza', data),
    delete: (id) => api.delete(`/limpieza/${id}`),
  },
  empleados: {
    getAll: () => api.get('/empleados'),
    getById: (id) => api.get(`/empleados/${id}`),
    getByDni: (dni) => api.get(`/empleados/dni/${dni}`),
    create: (data) => api.post('/empleados', data),
    update: (id, data) => api.put(`/empleados/${id}`, data),
    delete: (id) => api.delete(`/empleados/${id}`)
  },
  locales: {
    getAll: (includeCleanings = false) => 
      api.get(`/locales${includeCleanings ? '?include=cleanings' : ''}`),
    getById: (id, includeCleanings = false) => 
      api.get(`/locales/${id}${includeCleanings ? '?include=cleanings' : ''}`),
    getByUuid: (uuid, includeCleanings = false) =>  
    api.get(`/locales/uuid/${uuid}${includeCleanings ? '?include=cleanings' : ''}`),
    create: (data) => api.post('/locales', data),
    update: (id, data) => api.put(`/locales/${id}`, data),
    delete: (id) => api.delete(`/locales/${id}`),
  },
  licencias: {
    getAll: () => api.get('/licencias'),
    create: (data) => api.post('/licencias', data),
    getByEmpleado: (empleadoId) => api.get(`/licencias/empleado/${empleadoId}`),
    getByPeriodo: (desde, hasta) => api.get('/licencias/periodo', { params: { desde, hasta } }),
    delete: (id) => api.delete(`/licencias/${id}`),
    update: (id, data) => api.put(`/licencias/${id}`, data)
  },
  tablero: {
    getAsignaciones: (fecha) => api.get('/tablero', { params: { fecha } }),
    getEmpleadosDisponibles: (fecha) => api.get('/tablero/empleados', { params: { fecha } }),
    getLocalesTablero: () => api.get('/tablero/locales'),
    createOrUpdateAsignacion: (data) => api.post('/tablero', data),
    deleteAsignacion: (id) => api.delete(`/tablero/${id}`)
  },
  feriados: {
    getAll: (params) => api.get('/feriados', { params }),
    create: (data) => api.post('/feriados', data),
    delete: (id) => api.delete(`/feriados/${id}`),
    update: (id, data) => api.put(`/feriados/${id}`, data)
  },
  horarios: {
    getAll: () => api.get('/horarios'),
    create: (data) => api.post('/horarios', data),
    update: (id, data) => api.put(`/horarios/${id}`, data),
    delete: (id) => api.delete(`/horarios/${id}`),
    getByTurno: (turno) => api.get(`/horarios/${turno}`)
  }
};

export default api;