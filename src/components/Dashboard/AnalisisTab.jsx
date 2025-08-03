import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  CircularProgress,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  ButtonGroup
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { apiService } from '../../services/apiService';
import { useSnackbar } from 'notistack';
import ErrorBoundary from '../ErrorBoundary';

// Configurar dayjs
dayjs.extend(localizedFormat);
dayjs.locale('es');

const plugins = [dayGridPlugin, timeGridPlugin, interactionPlugin];

const AnalisisTab = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [licencias, setLicencias] = useState([]);
  const [empleados, setEmpleados] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [currentTitle, setCurrentTitle] = useState('');
  const [filters, setFilters] = useState({
    motivo: '',
    fechaInicio: '',
    fechaFin: '',
    jerarquia: ''
  });
  const calendarRef = useRef(null);

  const cargarEmpleados = useCallback(async (empleadosIds) => {
    try {
      const empleadosData = {};
      const response = await apiService.empleados.getAll();
      const todosEmpleados = Array.isArray(response) ? response : response?.data || [];
      
      todosEmpleados.forEach(empleado => {
        if (empleado?.id && empleadosIds.includes(empleado.id)) {
          empleadosData[empleado.id] = {
            nombre: empleado.nombre || 'Nombre no disponible',
            apellido: empleado.apellido || '',
            jerarquia: empleado.jerarquia || 'Sin jerarquía',
            turno: empleado.turno || 'Sin turno'
          };
        }
      });

      setEmpleados(empleadosData);
    } catch (error) {
      console.error('Error en carga de empleados:', error);
      enqueueSnackbar('Error al cargar la lista de empleados', { variant: 'error' });
      throw error;
    }
  }, [enqueueSnackbar]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.licencias.getAll();
      const licenciasData = Array.isArray(response) ? response : response?.data || [];
      setLicencias(licenciasData);
      
      const empleadosIds = [...new Set(licenciasData.map(l => l.empleado_id).filter(Boolean))];
      if (empleadosIds.length > 0) {
        await cargarEmpleados(empleadosIds);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      enqueueSnackbar('Error al cargar las licencias', { variant: 'error' });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [cargarEmpleados, enqueueSnackbar]);

  useEffect(() => {
    fetchData().catch(() => {});
  }, [fetchData]);

  const safeFormatDate = (date) => {
    try {
      return dayjs(date).isValid() ? dayjs(date).format('DD/MM/YYYY') : 'Fecha inválida';
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Fecha inválida';
    }
  };

  const filteredLicencias = licencias.filter(licencia => {
    try {
      const empleado = empleados[licencia.empleado_id] || {};
      const fechaInicioValida = filters.fechaInicio ? dayjs(filters.fechaInicio).isValid() : true;
      const fechaFinValida = filters.fechaFin ? dayjs(filters.fechaFin).isValid() : true;
      
      return (
        licencia &&
        (!filters.motivo || (licencia.motivo && licencia.motivo.toLowerCase().includes(filters.motivo.toLowerCase()))) &&
        (!filters.jerarquia || empleado.jerarquia === filters.jerarquia) &&
        (!filters.fechaInicio || (fechaInicioValida && dayjs(licencia.fecha_inicio).isSameOrAfter(dayjs(filters.fechaInicio)))) &&
        (!filters.fechaFin || (fechaFinValida && dayjs(licencia.fecha_fin).isSameOrBefore(dayjs(filters.fechaFin))))
      );
    } catch (error) {
      console.error('Error filtrando licencia:', licencia, error);
      return false;
    }
  });

  const eventosCalendario = filteredLicencias.map(licencia => {
    try {
      const empleado = empleados[licencia.empleado_id] || {};
      const nombreCorto = `${empleado.nombre?.charAt(0) || ''}. ${empleado.apellido || ''}`.trim();
      const jerarquiaCorta = empleado.jerarquia?.split(' ')[0] || '';
      
      return {
        id: licencia.id,
        title: `${jerarquiaCorta} ${nombreCorto}`,
        start: licencia.fecha_inicio,
        end: dayjs(licencia.fecha_fin).add(1, 'day').format('YYYY-MM-DD'),
        allDay: true,
        extendedProps: {
          licencia,
          empleado
        }
      };
    } catch (error) {
      console.error('Error creando evento de calendario:', licencia, error);
      return null;
    }
  }).filter(Boolean);

  const renderEventContent = (eventInfo) => {
    try {
      const { licencia, empleado } = eventInfo.event.extendedProps || {};
      
      if (!empleado || !licencia) {
        return (
          <div style={{ position: 'relative', ...eventStyle }}>
            Datos incompletos
          </div>
        );
      }

      const nombreCorto = `${empleado.nombre?.split(' ')[0] || ''} ${empleado.apellido?.split(' ')[0] || ''}`.trim();
      const jerarquiaCorta = empleado.jerarquia?.split(' ')[0] || '';

      return (
        <div style={{ position: 'relative' }}>
          <Tooltip 
            title={
              <div>
                <div><strong>{empleado.jerarquia || 'N/A'}</strong> {empleado.nombre || ''} {empleado.apellido || ''}</div>
                <div>Motivo: {licencia.motivo || 'Sin especificar'}</div>
                <div>Del {safeFormatDate(licencia.fecha_inicio)} al {safeFormatDate(licencia.fecha_fin)}</div>
              </div>
            }
            PopperProps={{
              modifiers: [
                {
                  name: 'preventOverflow',
                  options: {
                    boundary: 'viewport',
                    padding: 8,
                  },
                },
              ],
            }}
          >
            <div style={eventStyle}>
              <span style={eventTextStyle}>
                {jerarquiaCorta} {nombreCorto}
              </span>
            </div>
          </Tooltip>
        </div>
      );
    } catch (error) {
      console.error("Error renderizando evento:", error);
      return (
        <div style={{ position: 'relative', ...eventStyle }}>
          Error mostrando evento
        </div>
      );
    }
  };

  const eventStyle = {
    backgroundColor: '#1976d2',
    color: 'white',
    padding: '0 2px',
    borderRadius: '2px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '10px',
    overflow: 'hidden',
    marginBottom: '1px'
  };

  const eventTextStyle = {
    display: 'inline-block',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap'
  };

  const handleDatesSet = (dateInfo) => {
    try {
      const title = dayjs(dateInfo.start).locale('es').format('MMMM YYYY').replace(/^\w/, c => c.toUpperCase());
      setCurrentTitle(title);
      setCurrentView(dateInfo.view.type);
    } catch (error) {
      console.error('Error actualizando título:', error);
    }
  };

  const handleNavigate = (action) => {
    try {
      if (calendarRef.current) {
        const api = calendarRef.current.getApi();
        switch (action) {
          case 'PREV': api.prev(); break;
          case 'NEXT': api.next(); break;
          case 'TODAY': api.today(); break;
          default: break;
        }
      }
    } catch (error) {
      console.error('Error navegando calendario:', error);
    }
  };

  const jerarquiasUnicas = [...new Set(
    Object.values(empleados)
      .map(e => e.jerarquia)
      .filter(j => j && !['N/A', 'Sin jerarquía'].includes(j))
  )];

  return (
    <ErrorBoundary>
      <Paper elevation={3} sx={{ borderRadius: '12px', overflow: 'hidden', width: '100%', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={fetchData} color="primary" size="large">
            <Refresh />
          </IconButton>
        </Box>

        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Box sx={{ width: { xs: '100%', sm: '220px' } }}>
              <TextField
                select
                label="Filtrar por motivo"
                fullWidth
                size="small"
                value={filters.motivo}
                onChange={(e) => setFilters({...filters, motivo: e.target.value})}
                sx={{ 
                  maxWidth: '220px',
                  '& .MuiOutlinedInput-root': { height: '40px' }
                }}
              >
                <MenuItem value="">Todos los motivos</MenuItem>
                {[...new Set(licencias.map(l => l.motivo).filter(Boolean))].map(motivo => (
                  <MenuItem key={motivo} value={motivo}>
                    {motivo.length > 20 ? `${motivo.substring(0, 20)}...` : motivo}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ width: { xs: '100%', sm: '220px' } }}>
              <TextField
                select
                label="Filtrar por jerarquía"
                fullWidth
                size="small"
                value={filters.jerarquia}
                onChange={(e) => setFilters({...filters, jerarquia: e.target.value})}
                sx={{ 
                  maxWidth: '220px',
                  '& .MuiOutlinedInput-root': { height: '40px' }
                }}
              >
                <MenuItem value="">Todas las jerarquías</MenuItem>
                {jerarquiasUnicas.map(jerarquia => (
                  <MenuItem key={jerarquia} value={jerarquia}>
                    {jerarquia}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ flexGrow: 1, minWidth: '150px' }}>
              <TextField
                label="Desde"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={filters.fechaInicio}
                onChange={(e) => setFilters({...filters, fechaInicio: e.target.value})}
              />
            </Box>
            <Box sx={{ flexGrow: 1, minWidth: '150px' }}>
              <TextField
                label="Hasta"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={filters.fechaFin}
                onChange={(e) => setFilters({...filters, fechaFin: e.target.value})}
              />
            </Box>
          </Box>
        </Paper>

        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)} 
          sx={{ mb: 2 }}
          variant="fullWidth"
        >
          <Tab label="Calendario" />
          <Tab label="Tabla" />
          <Tab label="Resumen" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
            <CircularProgress size={60} />
          </Box>
        ) : (
          <>
            {currentTab === 0 && (
              <Box sx={{ p: 2 }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 2,
                  p: 1,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1
                }}>
                  <ButtonGroup variant="contained" size="small">
                    <Button onClick={() => handleNavigate('PREV')}>Anterior</Button>
                    <Button onClick={() => handleNavigate('NEXT')}>Siguiente</Button>
                  </ButtonGroup>

                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {currentTitle}
                  </Typography>

                  <ButtonGroup variant="contained" size="small">
                    <Button 
                      onClick={() => setCurrentView('dayGridMonth')}
                      sx={{ 
                        bgcolor: currentView === 'dayGridMonth' ? 'primary.main' : 'grey.300',
                        color: currentView === 'dayGridMonth' ? 'white' : 'text.primary'
                      }}
                    >
                      Mes
                    </Button>
                    <Button 
                      onClick={() => setCurrentView('timeGridWeek')}
                      sx={{ 
                        bgcolor: currentView === 'timeGridWeek' ? 'primary.main' : 'grey.300',
                        color: currentView === 'timeGridWeek' ? 'white' : 'text.primary'
                      }}
                    >
                      Semana
                    </Button>
                    <Button 
                      onClick={() => setCurrentView('timeGridDay')}
                      sx={{ 
                        bgcolor: currentView === 'timeGridDay' ? 'primary.main' : 'grey.300',
                        color: currentView === 'timeGridDay' ? 'white' : 'text.primary'
                      }}
                    >
                      Día
                    </Button>
                  </ButtonGroup>
                </Box>

                <Box sx={{ height: '600px' }}>
                  <FullCalendar
                    ref={calendarRef}
                    plugins={plugins}
                    initialView={currentView}
                    locale="es"
                    firstDay={1}
                    events={eventosCalendario}
                    eventContent={renderEventContent}
                    dayMaxEvents={2}
                    moreLinkContent={(arg) => (
                      <span style={{ fontWeight: 'bold', color: 'red' }}>
                        +{arg.num} más
                      </span>
                    )}
                    moreLinkDidMount={(arg) => {
                      // Sobrescribe el tooltip en español
                      arg.el.setAttribute('title', `Ver ${arg.num} eventos más`);
                    }}
                    eventDisplay="block"
                    eventOrder="start,-duration,allDay,title"
                    eventMinHeight={16}
                    height="auto"
                    datesSet={handleDatesSet}
                    headerToolbar={false}
                    popoverContent={(arg) => {
                      return (
                        <div style={{ padding: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                          {arg.dayEl.children.map((eventEl, index) => {
                            const event = arg.eventStore[eventEl.getAttribute('data-event-id')];
                            return (
                              <div key={index} style={{ marginBottom: '4px' }}>
                                {event.timeText && (
                                  <span style={{ marginRight: '8px', fontWeight: 'bold' }}>
                                    {event.timeText}
                                  </span>
                                )}
                                <span>{event.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }}
                  />
                </Box>
              </Box>
            )}

            {currentTab === 1 && (
              <TableContainer component={Paper} sx={{ flexGrow: 1, maxHeight: 'calc(100vh - 300px)' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '25%' }}>Empleado</TableCell>
                      <TableCell sx={{ width: '20%' }}>Jerarquía</TableCell>
                      <TableCell sx={{ width: '25%' }}>Motivo</TableCell>
                      <TableCell sx={{ width: '20%' }}>Fechas</TableCell>
                      <TableCell align="right" sx={{ width: '10%' }}>Días</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLicencias.map(licencia => {
                      const empleado = empleados[licencia.empleado_id] || {};
                      return (
                        <TableRow key={licencia.id} hover>
                          <TableCell>
                            {empleado.nombre} {empleado.apellido}
                          </TableCell>
                          <TableCell>{empleado.jerarquia}</TableCell>
                          <TableCell>
                            <Tooltip title={licencia.motivo || 'Sin motivo'} placement="top">
                              <span>
                                {licencia.motivo?.length > 20 
                                  ? `${licencia.motivo.substring(0, 20)}...` 
                                  : licencia.motivo || 'Sin motivo'}
                              </span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {safeFormatDate(licencia.fecha_inicio)} -{' '}
                            {safeFormatDate(licencia.fecha_fin)}
                          </TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={licencia.dias || '0'} 
                              size="small"
                              color={
                                licencia.dias > 5 ? 'error' : 
                                licencia.dias > 2 ? 'warning' : 'success'
                              } 
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {currentTab === 2 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Resumen de Licencias</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>Por Jerarquía</Typography>
                      {jerarquiasUnicas.map(jerarquia => {
                        const count = filteredLicencias.filter(l => {
                          const emp = empleados[l.empleado_id] || {};
                          return emp.jerarquia === jerarquia;
                        }).length;
                        return (
                          <Box key={jerarquia} sx={{ mb: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2">{jerarquia}</Typography>
                              <Typography variant="body2" fontWeight="bold">{count}</Typography>
                            </Box>
                            <Box sx={{ height: 8, bgcolor: 'primary.light', width: `${Math.min(count * 10, 100)}%` }} />
                          </Box>
                        );
                      })}
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>Por Motivo</Typography>
                      {[...new Set(filteredLicencias.map(l => l.motivo))].map(motivo => {
                        const count = filteredLicencias.filter(l => l.motivo === motivo).length;
                        return (
                          <Box key={motivo} sx={{ mb: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Tooltip title={motivo || 'Sin motivo'}>
                                <Typography variant="body2">
                                  {motivo?.length > 20 
                                    ? `${motivo.substring(0, 20)}...` 
                                    : motivo || 'Sin motivo'}
                                </Typography>
                              </Tooltip>
                              <Typography variant="body2" fontWeight="bold">{count}</Typography>
                            </Box>
                            <Box sx={{ height: 8, bgcolor: 'secondary.light', width: `${Math.min(count * 10, 100)}%` }} />
                          </Box>
                        );
                      })}
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
          </>
        )}
      </Paper>
    </ErrorBoundary>
  );
};

export default AnalisisTab;