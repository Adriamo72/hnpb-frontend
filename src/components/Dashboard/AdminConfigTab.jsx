// frontend/src/components/Admin/AdminConfigTab.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Tab, Tabs, Box, Typography, Paper, Alert, AlertTitle,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Button, FormControl, Select,
  MenuItem, Checkbox, ListItemText, Chip, CircularProgress,
  IconButton, Dialog, DialogTitle, DialogContent, Tooltip,
  DialogActions, DialogContentText, InputLabel,
  OutlinedInput, FormControlLabel
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { apiService } from '../../services/apiService';
import { useSnackbar } from 'notistack';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useAppContext } from '../../context/AppContext';

dayjs.locale('es');

// Días de la semana para el selector
const DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

const ALL_POSSIBLE_TASKS = [
  'Limpieza', 
  'Repostería', 
  'Coordinador', 
  'Peón', 
  'Lavandería', 
  'Residuos Patogénicos', 
  'Administrativo', 
  'Pañol',
  'Supervisión', 
  'Otros'
];


const AdminConfigTab = () => {
  const { enqueueSnackbar } = useSnackbar();
  const formRef = useRef(null);
  // MODIFICACIÓN AQUI: Accede directamente a `isAdmin` del contexto
  const { isAdmin } = useAppContext(); 

  const [currentTab, setCurrentTab] = useState(0);

  // Estados para Horarios de Turno
  const [horarios, setHorarios] = useState([]);
  const [newHorario, setNewHorario] = useState({
    nombre_turno: '',
    hora_entrada: '00:00',
    hora_salida: '00:00',
    dias_semana: [],
    tareas_asociadas: [],
    aplica_en_feriados: false
  });
  const [editHorario, setEditHorario] = useState(null);
  const [loading, setLoading] = useState({
    horarios: false,
    feriados: false,
    adding: false,
    updating: false,
    deleting: false,
  });

  // Estados para Feriados
  const [feriados, setFeriados] = useState([]);
  const [newFeriado, setNewFeriado] = useState({
    fecha: dayjs(),
    descripcion: '',
  });
  const [editFeriado, setEditFeriado] = useState(null);

  // Diálogo de confirmación de eliminación
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    id: null,
    type: null,
    data: null,
  });


  // --- Hooks de Efecto para Cargar Datos ---

  useEffect(() => {
    if (currentTab === 0) {
      const fetchHorarios = async () => {
        setLoading(prev => ({ ...prev, horarios: true }));
        try {
          const response = await apiService.horarios.getAll();
          setHorarios(response.data);
        } catch (error) {
          console.error('Error al cargar horarios:', error);
          enqueueSnackbar('Error al cargar horarios.', { variant: 'error' });
        } finally {
          setLoading(prev => ({ ...prev, horarios: false }));
        }
      };
      fetchHorarios();
    }
  }, [currentTab, enqueueSnackbar]);

  useEffect(() => {
    if (currentTab === 1) {
      const fetchFeriados = async () => {
        setLoading(prev => ({ ...prev, feriados: true }));
        try {
          const response = await apiService.feriados.getAll();
          setFeriados(response.data);
        } catch (error) {
          console.error('Error al cargar feriados:', error);
          enqueueSnackbar('Error al cargar feriados.', { variant: 'error' });
        } finally {
          setLoading(prev => ({ ...prev, feriados: false }));
        }
      };
      fetchFeriados();
    }
  }, [currentTab, enqueueSnackbar]);


  // --- Handlers Generales para Formularios ---

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (editHorario) {
      setEditHorario(prev => ({ ...prev, [name]: value }));
    } else {
      setNewHorario(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDayChange = (event) => {
    const { value } = event.target;
    if (editHorario) {
      setEditHorario(prev => ({
        ...prev,
        dias_semana: typeof value === 'string' ? value.split(',').map(Number) : value,
      }));
    } else {
      setNewHorario(prev => ({
        ...prev,
        dias_semana: typeof value === 'string' ? value.split(',').map(Number) : value,
      }));
    }
  };

  const handleTaskChange = (event) => {
    const { value } = event.target;
    if (editHorario) {
      setEditHorario(prev => ({
        ...prev,
        tareas_asociadas: typeof value === 'string' ? value.split(',') : value,
      }));
    } else {
      setNewHorario(prev => ({
        ...prev,
        tareas_asociadas: typeof value === 'string' ? value.split(',') : value,
      }));
    }
  };


  // --- Handlers para Horarios de Turno ---

  const handleAddHorario = async (e) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, adding: true }));
    try {
      const response = await apiService.horarios.create(newHorario);
      if (response.success) {
        setHorarios(prev => [...prev, response.data]);
        setNewHorario({
          nombre_turno: '',
          hora_entrada: '00:00',
          hora_salida: '00:00',
          dias_semana: [],
          tareas_asociadas: [],
        });
        enqueueSnackbar('Horario agregado exitosamente.', { variant: 'success' });
      } else {
        enqueueSnackbar(response.message || 'Error al agregar horario.', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error al agregar horario:', error);
      enqueueSnackbar('Error al agregar horario.', { variant: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, adding: false }));
    }
  };

  const handleUpdateHorario = async (e) => {
    e.preventDefault();
    if (!editHorario || !editHorario.id) return;

    setLoading(prev => ({ ...prev, updating: true }));
    try {
      const response = await apiService.horarios.update(editHorario.id, editHorario);
      if (response.success) {
        setHorarios(prev =>
          prev.map(horario => (horario.id === response.data.id ? response.data : horario))
        );
        setEditHorario(null);
        enqueueSnackbar('Horario actualizado exitosamente.', { variant: 'success' });
      } else {
        enqueueSnackbar(response.message || 'Error al actualizar horario.', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error al actualizar horario:', error);
      enqueueSnackbar('Error al actualizar horario.', { variant: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, updating: false }));
    }
  };

  const handleDeleteHorario = async (id, nombre_turno) => {
    setLoading(prev => ({ ...prev, deleting: true }));
    try {
      const response = await apiService.horarios.delete(id);
      if (response.success) {
        setHorarios(prev => prev.filter(horario => horario.id !== id));
        enqueueSnackbar(`Horario '${nombre_turno}' eliminado exitosamente.`, { variant: 'success' });
      } else {
        enqueueSnackbar(response.message || 'Error al eliminar horario.', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error al eliminar horario:', error);
      
      // Mensaje mejorado para el caso de empleados asignados
      if (error.response?.status === 400 && error.message.includes('empleados asignados')) {
        enqueueSnackbar(
          `No se puede eliminar el turno '${nombre_turno}' porque tiene empleados asignados.`, 
          { 
            variant: 'error',
            autoHideDuration: 6000
          }
        );
      } else {
        enqueueSnackbar(
          error.message || 'Error al eliminar turno.', 
          { variant: 'error' }
        );
      }
    } finally {
      setLoading(prev => ({ ...prev, deleting: false }));
      setDeleteDialog({ open: false, id: null, type: null, data: null });
    }
  };

  const handleEditHorario = (horario) => {
    setEditHorario({
      ...horario,
      dias_semana: horario.dias_semana || [],
      tareas_asociadas: horario.tareas_asociadas || [],
      aplica_en_feriados: horario.aplica_en_feriados || false
    });

    // Scroll al formulario
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // Notificación
    enqueueSnackbar(`Editando turno: ${horario.nombre_turno}`, { 
      variant: 'info',
      autoHideDuration: 3000
    });
  };

  const handleCancelEditHorario = () => {
    setEditHorario(null);
  };

  // --- Handlers para Feriados ---

  const handleFeriadoInputChange = (e) => {
    const { name, value } = e.target;
    if (editFeriado) {
      setEditFeriado(prev => ({ ...prev, [name]: value }));
    } else {
      setNewFeriado(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFeriadoDateChange = (date) => {
    if (editFeriado) {
      setEditFeriado(prev => ({ ...prev, fecha: date }));
    } else {
      setNewFeriado(prev => ({ ...prev, fecha: date }));
    }
  };

  const handleAddFeriado = async (e) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, adding: true }));
    try {
      const feriadoData = {
        ...newFeriado,
        fecha: newFeriado.fecha.format('YYYY-MM-DD'),
      };
      const response = await apiService.feriados.create(feriadoData);
      if (response.success) {
        setFeriados(prev => [...prev, response.data]);
        setNewFeriado({ fecha: dayjs(), descripcion: '' });
        enqueueSnackbar('Feriado agregado exitosamente.', { variant: 'success' });
      } else {
        enqueueSnackbar(response.message || 'Error al agregar feriado.', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error al agregar feriado:', error);
      enqueueSnackbar('Error al agregar feriado.', { variant: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, adding: false }));
    }
  };

  const handleUpdateFeriado = async (e) => {
    e.preventDefault();
    if (!editFeriado || !editFeriado.id) return;

    setLoading(prev => ({ ...prev, updating: true }));
    try {
      const feriadoData = {
        ...editFeriado,
        fecha: editFeriado.fecha.format('YYYY-MM-DD'),
      };
      const response = await apiService.feriados.update(editFeriado.id, feriadoData);
      if (response.success) {
        setFeriados(prev =>
          prev.map(feriado => (feriado.id === response.data.id ? response.data : feriado))
        );
        setEditFeriado(null);
        enqueueSnackbar('Feriado actualizado exitosamente.', { variant: 'success' });
      } else {
        enqueueSnackbar(response.message || 'Error al actualizar feriado.', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error al actualizar feriado:', error);
      enqueueSnackbar('Error al actualizar feriado.', { variant: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, updating: false }));
    }
  };

  const handleFeriadosChange = (e) => {
  const { checked } = e.target;
  if (editHorario) {
    setEditHorario(prev => ({ ...prev, aplica_en_feriados: checked }));
  } else {
    setNewHorario(prev => ({ ...prev, aplica_en_feriados: checked }));
  }
  };

  const handleDeleteFeriado = async (id) => {
    setLoading(prev => ({ ...prev, deleting: true }));
    try {
      const response = await apiService.feriados.delete(id);
      if (response.success) {
        setFeriados(prev => prev.filter(feriado => feriado.id !== id));
        enqueueSnackbar('Feriado eliminado exitosamente.', { variant: 'success' });
      } else {
        enqueueSnackbar(response.message || 'Error al eliminar feriado.', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error al eliminar feriado:', error);
      enqueueSnackbar('Error al eliminar feriado.', { variant: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, deleting: false }));
      setDeleteDialog({ open: false, id: null, type: null, data: null });
    }
  };

  const handleEditFeriado = (feriado) => {
    setEditFeriado({
      ...feriado,
      fecha: dayjs(feriado.fecha),
    });
  };

  const handleCancelEditFeriado = () => {
    setEditFeriado(null);
  };


  let contentText = `¿Está seguro que desea eliminar este ${deleteDialog.type}? Esta acción no se puede deshacer.`;
  if (deleteDialog.type === 'horario' && deleteDialog.data?.nombre_turno) {
    contentText = `¿Está seguro que desea eliminar el turno '${deleteDialog.data.nombre_turno}'? Esta acción no se puede deshacer. Si el turno tiene empleados asociados, no se podrá eliminar.`;
  }

  // Si isAdmin es false (porque el usuario no tiene rol de admin), mostrar el mensaje de acceso denegado
  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <AlertTitle>Acceso Denegado</AlertTitle>
          No tiene permisos para acceder a esta sección de configuración.
        </Alert>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Box sx={{ width: '100%', mt: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="admin tabs">
          <Tab label="Turnos" sx={{ fontWeight: 'bold' }} />
          <Tab label="Feriados" sx={{ fontWeight: 'bold' }} />
        </Tabs>

        {currentTab === 0 && (
          <Box sx={{ py: 3, px:0 }}>
            <Typography 
              variant="h6" 
              component="h6"
              noWrap
              sx={{
                pb: 2,
                fontWeight: 600,
                fontSize: '1rem', // 16px
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                lineHeight: 1.5,
                letterSpacing: '0.00938em',
                color: '#344767'
              }}
            >
              Gestión de Turnos Laborales
            </Typography>
            <Paper elevation={2}
                   sx={{ p: 3, mb: 3, borderRadius: '12px' }}
                   ref={formRef}
                   >

              <Box
                component="form"
                onSubmit={editHorario ? handleUpdateHorario : handleAddHorario}
                sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}
              >
                <TextField
                  label="Nombre del Turno"
                  name="nombre_turno"
                  value={editHorario ? editHorario.nombre_turno : newHorario.nombre_turno}
                  onChange={handleInputChange}
                  required
                  sx={{ minWidth: 200, flexGrow: 1 }}
                />
                <TextField
                  label="Hora de Entrada"
                  name="hora_entrada"
                  type="time"
                  value={editHorario ? editHorario.hora_entrada : newHorario.hora_entrada}
                  onChange={handleInputChange}
                  required
                  sx={{ minWidth: 150 }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                <TextField
                  label="Hora de Salida"
                  name="hora_salida"
                  type="time"
                  value={editHorario ? editHorario.hora_salida : newHorario.hora_salida}
                  onChange={handleInputChange}
                  required
                  sx={{ minWidth: 150 }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                <FormControl sx={{ minWidth: 200, flexGrow: 1 }}>
                  <InputLabel id="dias-semana-label">Días de la Semana</InputLabel>
                  <Select
                    labelId="dias-semana-label"
                    id="dias-semana-select"
                    multiple
                    value={editHorario ? editHorario.dias_semana : newHorario.dias_semana}
                    onChange={handleDayChange}
                    input={<OutlinedInput label="Días de la Semana" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={DAYS.find(d => d.value === value)?.label || value}
                            size="small"
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {DAYS.map((day) => (
                      <MenuItem key={day.value} value={day.value}>
                        <Checkbox
                          checked={
                            (editHorario ? editHorario.dias_semana : newHorario.dias_semana).indexOf(day.value) > -1
                          }
                        />
                        <ListItemText primary={day.label} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200, flexGrow: 1 }}>
                  <InputLabel id="tareas-asociadas-label">Tareas Asociadas</InputLabel>
                  <Select
                    labelId="tareas-asociadas-label"
                    id="tareas-asociadas-select"
                    multiple
                    value={editHorario ? editHorario.tareas_asociadas : newHorario.tareas_asociadas}
                    onChange={handleTaskChange}
                    input={<OutlinedInput id="select-multiple-chip-tareas" label="Tareas Asociadas" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {ALL_POSSIBLE_TASKS.map((task) => (
                      <MenuItem key={task} value={task}>
                        <Checkbox
                          checked={
                            (editHorario ? editHorario.tareas_asociadas : newHorario.tareas_asociadas).indexOf(task) > -1
                          }
                        />
                        <ListItemText primary={task} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editHorario ? editHorario.aplica_en_feriados : newHorario.aplica_en_feriados}
                      onChange={handleFeriadosChange}
                      name="aplica_en_feriados"
                    />
                  }
                  label="Aplica en feriados"
                  sx={{ 
                    ml: 1,
                    width: '100%', // O ajusta según tu diseño
                    mt: 1         // Margen superior para separación
                  }}
                />

                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  {editHorario && (
                    <Button
                      variant="outlined"
                      onClick={handleCancelEditHorario}
                      disabled={loading.adding || loading.updating}
                    >
                      Cancelar Edición
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={editHorario ? <EditIcon /> : <AddIcon />}
                    disabled={loading.adding || loading.updating}
                  >
                    {loading.adding || loading.updating ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      editHorario ? 'Actualizar Turno' : 'Agregar Turno'
                    )}
                  </Button>
                </Box>
              </Box>
            </Paper>

            <TableContainer component={Paper} sx={{ borderRadius: '12px' }}>
              <Table aria-label="tabla de horarios">
                <TableHead sx={{ '& .MuiTableCell-head': { fontWeight: 'bold' } }}>
                  <TableRow>
                  <TableCell>Turno</TableCell>
                  <TableCell>Horario Ingreso</TableCell>
                  <TableCell>Horario Egreso</TableCell>
                  <TableCell>Días de la Semana</TableCell>
                  <TableCell>Incluye Feriados</TableCell>
                  <TableCell>Nocturno</TableCell>
                  <TableCell>Tareas Asociadas</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
                </TableHead>
                <TableBody>
                  {loading.horarios ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : (
                    horarios.map((horario) => (
                      <TableRow key={horario.id}>
                        <TableCell>{horario.nombre_turno}</TableCell>
                        <TableCell>{horario.hora_entrada}</TableCell>
                        <TableCell>{horario.hora_salida}</TableCell>
                        <TableCell>
                          {horario.dias_semana
                            .map((dayValue) => DAYS.find((d) => d.value === dayValue)?.label)
                            .filter(Boolean)
                            .join(', ')}
                        </TableCell>
                        <TableCell>{horario.aplica_en_feriados ? 'Sí' : 'No'}</TableCell>
                        <TableCell>{horario.es_nocturno ? 'Sí' : 'No'}</TableCell>
                        <TableCell>
                          {horario.tareas_asociadas && horario.tareas_asociadas.length > 0
                            ? horario.tareas_asociadas.join(', ')
                            : 'Ninguna'}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Editar Horario">
                            <IconButton
                              color="primary"
                              onClick={() => handleEditHorario(horario)}
                              disabled={loading.updating}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar Horario">
                            <IconButton
                              color="error"
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  id: horario.id,
                                  type: 'horario',
                                  data: { nombre_turno: horario.nombre_turno }
                                })
                              }
                              disabled={loading.deleting}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {horarios.length === 0 && !loading.horarios && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No hay horarios de turno configurados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {currentTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography 
              variant="h6" 
              component="h6"
              noWrap
              sx={{
                pb:2,
                fontWeight: 600,
                fontSize: '1rem', // 16px
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                lineHeight: 1.5,
                letterSpacing: '0.00938em',
                color: '#344767'
              }}
            >
              Gestión de Feriados
            </Typography>
            <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: '12px' }}>
              <Box
                component="form"
                onSubmit={editFeriado ? handleUpdateFeriado : handleAddFeriado}
                sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}
              >
                <DatePicker
                  label="Fecha del Feriado"
                  value={editFeriado ? editFeriado.fecha : newFeriado.fecha}
                  onChange={handleFeriadoDateChange}
                  format="DD/MM/YYYY"
                  slotProps={{ textField: { required: true } }}
                  sx={{ minWidth: 200 }}
                />
                <TextField
                  label="Descripción"
                  name="descripcion"
                  value={editFeriado ? editFeriado.descripcion : newFeriado.descripcion}
                  onChange={handleFeriadoInputChange}
                  required
                  multiline
                  rows={1}
                  sx={{ flexGrow: 1 }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {editFeriado && (
                    <Button
                      variant="outlined"
                      onClick={handleCancelEditFeriado}
                      disabled={loading.adding || loading.updating}
                    >
                      Cancelar Edición
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={editFeriado ? <EditIcon /> : <AddIcon />}
                    disabled={loading.adding || loading.updating}
                  >
                    {loading.adding || loading.updating ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      editFeriado ? 'Actualizar Feriado' : 'Agregar Feriado'
                    )}
                  </Button>
                </Box>
              </Box>
            </Paper>

            <TableContainer component={Paper} sx={{ borderRadius: '12px' }}>
              <Table aria-label="tabla de feriados">
                <TableHead sx={{ '& .MuiTableCell-head': { fontWeight: 'bold' } }}>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading.feriados ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : (
                    feriados.map((feriado) => (
                      <TableRow key={feriado.id}>
                        <TableCell>{dayjs(feriado.fecha).format('DD/MM/YYYY')}</TableCell>
                        <TableCell>{feriado.descripcion}</TableCell>
                        <TableCell>
                          <Tooltip title="Editar Feriado">
                            <IconButton
                              color="primary"
                              onClick={() => handleEditFeriado(feriado)}
                              disabled={loading.updating}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar Feriado">
                            <IconButton
                              color="error"
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  id: feriado.id,
                                  type: 'feriado',
                                  data: null
                                })
                              }
                              disabled={loading.deleting}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {feriados.length === 0 && !loading.feriados && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No hay feriados configurados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, id: null, type: null, data: null })}
        >
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {contentText}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDeleteDialog({ open: false, id: null, type: null, data: null })}
              disabled={loading.deleting}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => deleteDialog.type === 'feriado'
                ? handleDeleteFeriado(deleteDialog.id)
                : handleDeleteHorario(deleteDialog.id, deleteDialog.data?.nombre_turno)
              }
              color="error"
              disabled={loading.deleting}
            >
              {loading.deleting ? <CircularProgress size={20} color="inherit" /> : 'Eliminar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default AdminConfigTab;