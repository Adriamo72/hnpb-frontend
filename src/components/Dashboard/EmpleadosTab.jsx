import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  MenuItem,
  Typography,
  Paper,
  Box,
  Tabs,
  Tab,
  InputAdornment,
  Grid,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { Add, Edit, Delete, Search, Event, History, Close } from '@mui/icons-material';
import DataTable from '../DataTable';
import { apiService } from '../../services/apiService';
import { useSnackbar } from 'notistack';
import { useAppContext } from '../../context/AppContext';

const EmpleadosTab = () => {
  const { isAdmin } = useAppContext();
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();
  const [empleados, setEmpleados] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openLicenciaDialog, setOpenLicenciaDialog] = useState(false);
  const [currentEmpleado, setCurrentEmpleado] = useState(null);
  const [currentLicencia, setCurrentLicencia] = useState({
  id: null,
  fechaInicio: '',
  fechaFin: '',
  motivo: '',
  motivoDetalle: '', // Nuevo campo
  dias: '',
  empleadoId: null
  });
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [licenciasEmpleado, setLicenciasEmpleado] = useState([]);
  const [openLicenciasList, setOpenLicenciasList] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [empleadoParaLicencia, setEmpleadoParaLicencia] = useState(null);
  const [turnosDisponibles, setTurnosDisponibles] = useState([]);
  const [turnosInactivos, setTurnosInactivos] = useState([]);

  const jerarquiasMilitar = ['MSTV', 'MITV', 'CS', 'CI', 'CP','SS','SI','SP','SM'];
  const jerarquiasCivil = ['AGCV'];
  const tareas = ['Limpieza', 'Repostería', 'Coordinador', 'Peón', 'Lavandería', 'Residuos Patogénicos', 'Administrativo', 'Pañol', 'Supervisión', 'Otros'];
  const motivosLicencia = [
  'Falta injustificada',
  'Artículo 14 - razones particulares',
  'Artículo 14 - sin goce de haberes',
  'Artículo 13 - por estudio',
  'Enfermedad tratamiento breve',
  'Enfermedad tratamiento prolongado',
  'Enfermedad familiar',
  'Enfermedad profesional o accidente de trabajo',
  'Asueto',
  'Franco compensatorio',
  'Franco SADOFE',
  'Guardia Militar',
  'Duelo (padres, hijos, conyuge)',
  'Fenómeno meteorologico o causa de fuerza mayor',
  'Licencia por paternidad',
  'Licencia por maternidad',
  'Licencia por duelo',
  'Licencia por actividad gremial',
  'Licencia por matrimonio',
  'Licencia por cuidados de hijos',
  'Licencia anual ordinaria',
  'Licencia por receso invernal',
  'Licencia extraordinaria',
  'Paro adhesión',
  'Suspensión de empleo',
  'Otro'
];

  const fetchEmpleados = useCallback(async () => {
    setLoading(true); // Activar el estado de carga
    try {
      const response = await apiService.empleados.getAll();
      setEmpleados(response.data);
    } catch (error) {
      console.error('Error fetching personal:', error);
      enqueueSnackbar('Error al cargar el personal', { variant: 'error' });
    } finally {
      setLoading(false); // Desactivar el estado de carga
    }
  }, [enqueueSnackbar]);

  const fetchTurnosUnicos = useCallback(async () => {
    try {
      // Obtener turnos configurados
      const responseTurnos = await apiService.horarios.getAll();
      setTurnosDisponibles(responseTurnos.data);
      
      // Obtener todos los turnos únicos usados por empleados
      const responseEmpleados = await apiService.empleados.getAll();
      const todosTurnos = [...new Set(responseEmpleados.data.map(e => e.turno))];
      
      // Identificar turnos inactivos (usados pero no en configuración)
      const turnosActivos = responseTurnos.data.map(t => t.nombre_turno);
      setTurnosInactivos(
        todosTurnos.filter(t => !turnosActivos.includes(t))
      );
    } catch (error) {
      console.error('Error al cargar turnos:', error);
      enqueueSnackbar('Error al cargar turnos', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchEmpleados();
  }, [fetchEmpleados]);

  useEffect(() => {
  fetchTurnosUnicos();
  }, [fetchTurnosUnicos]);

  const fetchLicenciasEmpleado = useCallback(async (empleadoId) => {
    try {
      const response = await apiService.licencias.getByEmpleado(empleadoId);
      const empleado = empleados.find(e => e.id === empleadoId);
      
      setEmpleadoParaLicencia(empleado);
      
      const licenciasFormateadas = response.data.map(licencia => ({
        id: licencia.id,
        fecha_inicio: licencia.fecha_inicio,
        fecha_fin: licencia.fecha_fin,
        motivo: licencia.motivo,
        dias: licencia.dias,
        empleado_id: licencia.empleado_id,
        nombre_completo: empleado ? `${empleado.nombre} ${empleado.apellido}`.trim() : 'N/A'
      }));
  
      setLicenciasEmpleado(licenciasFormateadas);
      setOpenLicenciasList(true);
    } catch (error) {
      console.error('Error fetching licencias:', error);
      enqueueSnackbar('Error al cargar las licencias del personal', { variant: 'error' });
    }
  }, [enqueueSnackbar, empleados]);

  const handleOpenDialog = (empleado = null) => {
      setCurrentEmpleado(
        empleado || { 
          nombre: '', 
          apellido: '', 
          dni: '', 
          jerarquia: currentTab === 0 ? jerarquiasMilitar[0] : jerarquiasCivil[0], 
          turno: turnosDisponibles[0]?.nombre_turno || '',
          tarea: 'Limpieza'
        }
      );
      setOpenDialog(true);
    };


  const handleOpenLicenciaDialog = (empleado, licencia = null) => {
    setCurrentLicencia(licencia ? {
      id: licencia.id,
      fechaInicio: licencia.fecha_inicio,
      fechaFin: licencia.fecha_fin,
      motivo: licencia.motivo,
      dias: licencia.dias,
      empleadoId: licencia.empleado_id || empleado.id
    } : {
      id: null,
      fechaInicio: '',
      fechaFin: '',
      motivo: '',
      dias: '',
      empleadoId: empleado.id
    });
    setValidationErrors({});
    setOpenLicenciaDialog(true);
  };

  const validateLicencia = () => {
    const errors = {};
    
    if (!currentLicencia.fechaInicio) {
      errors.fechaInicio = 'La fecha de inicio es requerida';
    } else if (isNaN(new Date(currentLicencia.fechaInicio).getTime())) {
      errors.fechaInicio = 'Fecha de inicio no válida';
    }
    
    if (!currentLicencia.fechaFin) {
      errors.fechaFin = 'La fecha de fin es requerida';
    } else if (isNaN(new Date(currentLicencia.fechaFin).getTime())) {
      errors.fechaFin = 'Fecha de fin no válida';
    } else if (new Date(currentLicencia.fechaInicio) > new Date(currentLicencia.fechaFin)) {
      errors.fechaFin = 'La fecha de fin no puede ser anterior a la fecha de inicio';
    }
    
    if (!currentLicencia.motivo || currentLicencia.motivo.trim() === '') {
      errors.motivo = 'El motivo es requerido';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentEmpleado(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentEmpleado(prev => ({ ...prev, [name]: value }));
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSubmit = async () => {
  // Validar DNI
  if (!currentEmpleado.dni || currentEmpleado.dni.length !== 8) {
    enqueueSnackbar('El DNI debe tener exactamente 8 dígitos', { variant: 'error' });
    return;
  }

      // Preparar datos para enviar
      const datosEnvio = {
        nombre: currentEmpleado.nombre,
        apellido: currentEmpleado.apellido,
        dni: currentEmpleado.dni,
        jerarquia: currentEmpleado.jerarquia,
        turno: currentEmpleado.turno,
        tarea: currentEmpleado.tarea
      };

      try {
        if (currentEmpleado.id) {
          await apiService.empleados.update(currentEmpleado.id, datosEnvio);
          enqueueSnackbar('Personal actualizado correctamente', { variant: 'success' });
        } else {
          await apiService.empleados.create(datosEnvio);
          enqueueSnackbar('Personal creado correctamente', { variant: 'success' });
        }
        fetchEmpleados();
        handleCloseDialog();
      } catch (error) {
        console.error('Error saving personal:', error);
        enqueueSnackbar(error.message || 'Error al guardar personal', { variant: 'error' });
      }
    };

  const handleCloseLicenciaDialog = () => {
    setOpenLicenciaDialog(false);
    setCurrentLicencia({
      id: null,
      fechaInicio: '',
      fechaFin: '',
      motivo: '',
      dias: '',
      empleadoId: null
    });
    setValidationErrors({});
  };

  const handleSubmitLicencia = async () => {
      if (!validateLicencia()) {
        enqueueSnackbar('Por favor complete todos los campos requeridos', { variant: 'error' });
        return;
      }

      try {
        const licenciaData = {
          empleado_id: currentLicencia.empleadoId,
          fecha_inicio: currentLicencia.fechaInicio,
          fecha_fin: currentLicencia.fechaFin,
          motivo: currentLicencia.motivo === 'Otro' 
            ? currentLicencia.motivoDetalle 
            : currentLicencia.motivo
        };
        
        if (currentLicencia.id) {
          await apiService.licencias.update(currentLicencia.id, licenciaData);
        } else {
          await apiService.licencias.create(licenciaData);
        }
        
        enqueueSnackbar(
          `Licencia ${currentLicencia.id ? 'actualizada' : 'registrada'} correctamente`,
          { variant: 'success' }
        );
        
        handleCloseLicenciaDialog();
        if (openLicenciasList) {
          await fetchLicenciasEmpleado(currentLicencia.empleadoId);
        }
      } catch (error) {
        console.error('Error saving licencia:', error);
        enqueueSnackbar(
          error.response?.data?.message || error.message || 'Error al registrar la licencia',
          { variant: 'error' }
        );
      }
    };  

  const handleDeleteLicencia = async (id) => {
    if (window.confirm('¿Está seguro que desea eliminar esta licencia?')) {
      try {
        await apiService.licencias.delete(id);
        enqueueSnackbar('Licencia eliminada correctamente', { variant: 'success' });
        fetchLicenciasEmpleado(currentLicencia.empleadoId || empleadoParaLicencia?.id);
      } catch (error) {
        console.error('Error deleting licencia:', error);
        enqueueSnackbar(error.message || 'Error al eliminar la licencia', { variant: 'error' });
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro que desea eliminar este personal?')) {
      try {
        await apiService.empleados.delete(id);
        fetchEmpleados();
        enqueueSnackbar('Personal eliminado correctamente', { variant: 'success' });
      } catch (error) {
        console.error('Error deleting personal:', error);
        
        // Extrae el mensaje correctamente según la estructura de tu API
        const errorMessage = 
          error.response?.data?.message ||  // Para respuestas estructuradas
          error.message ||                 // Para errores genéricos
          'Error al eliminar el personal'; // Mensaje de respaldo
  
        enqueueSnackbar(errorMessage, { 
          variant: 'error',
          autoHideDuration: 6000,
          persist: false
        });
      }
    }
  };
  

  const columns = [
      { 
        field: 'jerarquia', 
        headerName: 'Jerarquía', 
        flex: 0.5, 
        cellClassName: 'jerarquia-cell',
        headerClassName: 'jerarquia-header'
      },
      { 
        field: 'nombre', 
        headerName: 'Nombre', 
        flex: 1 
      },
      { 
        field: 'apellido', 
        headerName: 'Apellido', 
        flex: 1 
      },
      { 
        field: 'dni', 
        headerName: 'DNI', 
        flex: 1 
      },
      { 
        field: 'turno', 
        headerName: 'Turno', 
        flex: 1,
      },
      {
        field: 'horarios', 
        headerName: 'Horarios', 
        flex: 1,
        renderCell: (params) => {
          const turno = turnosDisponibles.find(t => t.nombre_turno === params.row.turno);
          return (
            <Box>
              {turno ? (
                <>
                  <div>E: {turno.hora_entrada}</div>
                  <div>S: {turno.hora_salida}</div>
                </>
              ) : (
                <div style={{ color: 'text.disabled', fontStyle: 'italic' }}>
                  Horario no configurado
                </div>
              )}
            </Box>
          );
        }
      },
      { 
        field: 'tarea', 
        headerName: 'Tarea', 
        flex: 1 
      },
      {
        field: 'actions',
        headerName: 'Acciones',
        flex: isAdmin ? 1.5 : 0.8,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Botón Historial - siempre visible */}
            <Tooltip title="Historial de licencias">
              <IconButton 
                color="info"
                onClick={() => fetchLicenciasEmpleado(params.row.id)}
              >
                <History />
              </IconButton>
            </Tooltip>

            {isAdmin && (
              <>
                {/* Botón Licencia */}
                <Tooltip title="Registrar licencia">
                  <IconButton 
                    color="secondary"
                    onClick={() => handleOpenLicenciaDialog(params.row)}
                  >
                    <Event />
                  </IconButton>
                </Tooltip>

                {/* Botón Editar */}
                <Tooltip title="Editar personal">
                  <IconButton 
                    color="primary"
                    onClick={() => handleOpenDialog(params.row)}
                  >
                    <Edit />
                  </IconButton>
                </Tooltip>

                {/* Botón Eliminar */}
                <Tooltip title="Eliminar personal">
                  <IconButton 
                    color="error"
                    onClick={() => handleDelete(params.row.id)}
                  >
                    <Delete />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        ),
      },
    ];

  const filteredEmpleados = empleados.filter(empleado => {
    const matchesTab = currentTab === 0 
      ? jerarquiasMilitar.includes(empleado.jerarquia)
      : jerarquiasCivil.includes(empleado.jerarquia);
    
    const matchesSearch = searchTerm === '' || 
      empleado.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empleado.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empleado.dni.includes(searchTerm) ||
      empleado.jerarquia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empleado.turno.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empleado.tarea.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  if (loading) {
          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Cargando personal...</Typography>
            </Box>
          );
        }   

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        borderRadius: '12px', 
        overflow: 'hidden',
        width: '100%',
        maxWidth: '100%',
        mb: 3
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 3, mx:2 }}>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Buscar personal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ 
              width: 250,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: 'background.paper',
              }
            }}
          />
          {isAdmin && (
            <Button 
              variant="contained" 
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              sx={{ textTransform: 'none' }}
            >
              Nuevo Personal
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab 
            label="Personal Militar" 
            sx={{ fontWeight: 'bold', fontSize: '0.875rem' }} 
          />
          <Tab 
            label="Personal Civil" 
            sx={{ fontWeight: 'bold', fontSize: '0.875rem' }} 
          />
        </Tabs>
      </Box>

      <DataTable rows={filteredEmpleados} columns={columns} />

      {/* Diálogo para CRUD de empleados */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          bgcolor: 'primary.main', 
          color: 'white',
          py: 2,
          textAlign: 'center'
        }}>
          {currentEmpleado?.id ? 'Editar Personal' : 'Crear Personal'}
        </DialogTitle>
        
        <DialogContent sx={{ pt: 5, pb: 2 }}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            maxWidth: 500,
            margin: '0 auto'
          }}>
            <Box sx={{ display: 'flex', gap: 2, '& > *': { flex: 1 } }}>
              <TextField
                autoFocus
                name="nombre"
                label="Nombre"
                fullWidth
                value={currentEmpleado?.nombre || ''}
                onChange={handleChange}
                sx={{ 
                  '& .MuiOutlinedInput-root': { height: 56 },
                  mt: 2
                }}
              />
              <TextField
                name="apellido"
                label="Apellido"
                fullWidth
                value={currentEmpleado?.apellido || ''}
                onChange={handleChange}
                sx={{ 
                  '& .MuiOutlinedInput-root': { height: 56 },
                  mt: 2
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, '& > *': { flex: 1 } }}>
              <TextField
                name="dni"
                label="DNI"
                fullWidth
                value={currentEmpleado?.dni || ''}
                onChange={(e) => {
                  // Validar que solo sean números y máximo 8 dígitos
                  const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                  handleChange({ target: { name: 'dni', value } });
                }}
                error={currentEmpleado?.dni?.length !== 8 && currentEmpleado?.dni?.length > 0}
                helperText={
                  currentEmpleado?.dni?.length !== 8 && currentEmpleado?.dni?.length > 0 
                    ? 'El DNI debe tener exactamente 8 dígitos' 
                    : ''
                }
                sx={{ '& .MuiOutlinedInput-root': { height: 56 } }}
              />
              <TextField
                select
                name="jerarquia"
                label="Jerarquía"
                fullWidth
                value={currentEmpleado?.jerarquia || (currentTab === 0 ? jerarquiasMilitar[0] : jerarquiasCivil[0])}
                onChange={handleChange}
                sx={{ '& .MuiOutlinedInput-root': { height: 56 } }}
              >
                {(currentTab === 0 ? jerarquiasMilitar : jerarquiasCivil).map((jerarquia) => (
                  <MenuItem key={jerarquia} value={jerarquia}>
                    {jerarquia}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, '& > *': { flex: 1 } }}>
              <TextField
                select
                name="turno"
                label="Turno"
                fullWidth
                value={currentEmpleado?.turno || ''}
                onChange={handleChange}
                sx={{ '& .MuiOutlinedInput-root': { height: 56 } }}
              >
                {/* Turnos activos */}
                {turnosDisponibles.map((turno) => (
                  <MenuItem key={turno.nombre_turno} value={turno.nombre_turno}>
                    {turno.nombre_turno}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {turno.hora_entrada} - {turno.hora_salida}
                    </Typography>
                  </MenuItem>
                ))}
                
                {/* Turnos inactivos (si el empleado ya tiene uno) */}
                {turnosInactivos.includes(currentEmpleado?.turno) && (
                  <MenuItem 
                    key={currentEmpleado.turno} 
                    value={currentEmpleado.turno}
                    sx={{ color: 'text.disabled', fontStyle: 'italic' }}
                  >
                    {currentEmpleado.turno} (Turno no configurado)
                  </MenuItem>
                )}
              </TextField>
              
              <TextField
                select
                name="tarea"
                label="Tarea"
                fullWidth
                value={currentEmpleado?.tarea || 'Limpieza'}
                onChange={handleChange}
                sx={{ '& .MuiOutlinedInput-root': { height: 56 } }}
              >
                {tareas.map((tarea) => (
                  <MenuItem key={tarea} value={tarea}>
                    {tarea}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
          <Button 
            onClick={handleCloseDialog} 
            variant="outlined"
            sx={{ width: 120, mx: 1 }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            sx={{ width: 120, mx: 1 }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para registrar/editar licencias */}
      <Dialog 
        open={openLicenciaDialog} 
        onClose={handleCloseLicenciaDialog} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ 
          bgcolor: 'secondary.main', 
          color: 'white',
          py: 2,
          textAlign: 'center',
          marginBottom: '16px'
        }}>
          {currentLicencia.id ? 'Editar Licencia' : 'Registrar Licencia'} para {
            empleados.find(e => e.id === currentLicencia.empleadoId)?.jerarquia || 'N/A'
          } {
            empleados.find(e => e.id === currentLicencia.empleadoId)?.apellido || 'N/A'
          } {
            empleados.find(e => e.id === currentLicencia.empleadoId)?.nombre || 'N/A'
          }
        </DialogTitle>
        
        <DialogContent sx={{ 
          pt: 0,
          pb: 2,
          '& .MuiGrid-container': {
            marginTop: '8px'
          }
        }}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            maxWidth: 500,
            margin: '0 auto'
          }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Fecha de Inicio"
                  type="date"
                  name="fechaInicio"
                  value={currentLicencia.fechaInicio}
                  onChange={(e) => setCurrentLicencia({...currentLicencia, fechaInicio: e.target.value})}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                  error={!!validationErrors.fechaInicio}
                  helperText={validationErrors.fechaInicio}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Fecha de Fin"
                  type="date"
                  name="fechaFin"
                  value={currentLicencia.fechaFin}
                  onChange={(e) => setCurrentLicencia({...currentLicencia, fechaFin: e.target.value})}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                  error={!!validationErrors.fechaFin}
                  helperText={validationErrors.fechaFin}
                />
              </Grid>
            </Grid>

            <TextField
              select
              name="motivo"
              label="Motivo"
              fullWidth
              value={currentLicencia.motivo || ''}
              onChange={(e) => setCurrentLicencia({...currentLicencia, motivo: e.target.value})}
              error={!!validationErrors.motivo}
              helperText={validationErrors.motivo}
              required
            >
              {motivosLicencia.map((motivo) => (
                <MenuItem key={motivo} value={motivo}>
                  {motivo}
                </MenuItem>
              ))}
            </TextField>

            {currentLicencia.motivo === 'Otro' && (
              <TextField
                name="motivoDetalle"
                label="Especificar motivo"
                fullWidth
                multiline
                rows={2}
                value={currentLicencia.motivoDetalle || ''}
                onChange={(e) => setCurrentLicencia({...currentLicencia, motivoDetalle: e.target.value})}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          px: 3, 
          pb: 2,
          justifyContent: 'center',
          '& > *': {
            mx: 1,
            my: 0.5
          }
        }}>
          <Button 
            onClick={handleCloseLicenciaDialog} 
            variant="outlined"
            sx={{ width: 120 }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmitLicencia} 
            variant="contained" 
            color="secondary"
            sx={{ width: 120 }}
          >
            {currentLicencia.id ? 'Actualizar' : 'Registrar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para listar licencias del empleado */}
      <Dialog open={openLicenciasList} onClose={() => setOpenLicenciasList(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          bgcolor: 'info.main', 
          color: 'white',
          py: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box>
            {empleadoParaLicencia?.jerarquia} {empleadoParaLicencia?.apellido} {empleadoParaLicencia?.nombre} - Licencias
            <Chip 
              label={`Total: ${licenciasEmpleado.length}`} 
              color="primary" 
              size="small" 
              sx={{ ml: 2, color: 'white' }}
            />
          </Box>
          <IconButton 
            edge="end" 
            color="inherit" 
            onClick={() => setOpenLicenciasList(false)}
            aria-label="close"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <DataTable 
            rows={licenciasEmpleado} 
            columns={[
              { 
                field: 'fecha_inicio', 
                headerName: 'Inicio', 
                flex: 1,
                valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('es-AR') : '-'
              },
              { 
                field: 'fecha_fin', 
                headerName: 'Fin', 
                flex: 1,
                valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('es-AR') : '-'
              },
              { 
                field: 'dias', 
                headerName: 'Días', 
                flex: 1
              },
              { 
                field: 'motivo', 
                headerName: 'Motivo', 
                flex: 2
              },
              ...(isAdmin ? [{
                field: 'actions',
                headerName: 'Acciones',
                flex: 1,
                renderCell: (params) => (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Editar licencia">
                      <IconButton 
                        color="primary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLicenciaDialog(empleadoParaLicencia, params.row);
                        }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar licencia">
                      <IconButton 
                        color="error"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLicencia(params.row.id);
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ),
              }] : [])
            ]} 
          />
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default EmpleadosTab; 