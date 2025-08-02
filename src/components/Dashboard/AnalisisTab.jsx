import React, { useState, useEffect, useCallback } from 'react';
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
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { apiService } from '../../services/apiService';
import { useSnackbar } from 'notistack';

// Configuración de moment.js en español
moment.locale('es', {
    months: 'Enero_Febrero_Marzo_Abril_Mayo_Junio_Julio_Agosto_Septiembre_Octubre_Noviembre_Diciembre'.split('_'),
    monthsShort: 'Ene._Feb._Mar._Abr._May._Jun._Jul._Ago._Sep._Oct._Nov._Dic.'.split('_'),
    weekdays: 'Domingo_Lunes_Martes_Miércoles_Jueves_Viernes_Sábado'.split('_'),
    weekdaysShort: 'Dom._Lun._Mar._Mié._Jue._Vie._Sáb.'.split('_'),
    weekdaysMin: 'Do_Lu_Ma_Mi_Ju_Vi_Sá'.split('_'),
    longDateFormat: {
      LT: 'H:mm',
      LTS: 'H:mm:ss',
      L: 'DD/MM/YYYY',
      LL: 'D [de] MMMM [de] YYYY',
      LLL: 'D [de] MMMM [de] YYYY H:mm',
      LLLL: 'dddd, D [de] MMMM [de] YYYY H:mm'
    }
  });
  moment.updateLocale('es', {
  week: {
    dow: 1, // Lunes como primer día de la semana
    doy: 4  // La semana que contiene el 4 de enero es la primera semana del año
  }
});

const localizer = momentLocalizer(moment);

const CustomToolbar = ({ label, onNavigate, onView, view }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', sm: 'row' },
      justifyContent: 'space-between', 
      alignItems: 'center',
      mb: 2,
      gap: 1,
      p: 1,
      backgroundColor: '#f5f5f5',
      borderRadius: 1
    }}>
      <ButtonGroup variant="contained" size="small" sx={{ order: { xs: 2, sm: 1 } }}>
        <Button onClick={() => onNavigate('PREV')}>Anterior</Button>
        <Button onClick={() => onNavigate('TODAY')}>Hoy</Button>
        <Button onClick={() => onNavigate('NEXT')}>Siguiente</Button>
      </ButtonGroup>

      <Typography variant="h6" sx={{ 
        fontWeight: 'bold', 
        mx: 2,
        order: { xs: 1, sm: 2 },
        textAlign: 'center',
        width: { xs: '100%', sm: 'auto' }
      }}>
        {label}
      </Typography>

      <ButtonGroup variant="contained" size="small" sx={{ order: 3 }}>
        <Button 
          onClick={() => onView('month')}
          sx={{ 
            bgcolor: view === 'month' ? 'primary.main' : 'grey.300',
            color: view === 'month' ? 'white' : 'text.primary'
          }}
        >
          Mes
        </Button>
        <Button 
          onClick={() => onView('week')}
          sx={{ 
            bgcolor: view === 'week' ? 'primary.main' : 'grey.300',
            color: view === 'week' ? 'white' : 'text.primary'
          }}
        >
          Semana
        </Button>
        <Button 
          onClick={() => onView('day')}
          sx={{ 
            bgcolor: view === 'day' ? 'primary.main' : 'grey.300',
            color: view === 'day' ? 'white' : 'text.primary'
          }}
        >
          Día
        </Button>
      </ButtonGroup>
    </Box>
  );
};

const AnalisisTab = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [licencias, setLicencias] = useState([]);
  const [empleados, setEmpleados] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date()); // Estado para controlar la fecha actual del calendario
  const [filters, setFilters] = useState({
    motivo: '',
    fechaInicio: '',
    fechaFin: '',
    jerarquia: ''
  });

  // Función para manejar la navegación del calendario
  const handleNavigate = (newDate, view) => {
    setDate(newDate);
  };

  const cargarEmpleados = useCallback(async (empleadosIds) => {
    const empleadosData = {};
    
    try {
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

      const idsFaltantes = empleadosIds.filter(id => !empleadosData[id]);
      for (const id of idsFaltantes) {
        try {
          const empleado = await apiService.empleados.getById(id);
          empleadosData[id] = {
            nombre: empleado.nombre || 'Nombre no disponible',
            apellido: empleado.apellido || '',
            jerarquia: empleado.jerarquia || 'Sin jerarquía',
            turno: empleado.turno || 'Sin turno'
          };
        } catch (error) {
          console.error(`Error cargando empleado ${id}:`, error);
          empleadosData[id] = {
            nombre: 'Empleado',
            apellido: 'No encontrado',
            jerarquia: 'N/A',
            turno: 'N/A'
          };
          enqueueSnackbar(`Error al cargar empleado ID ${id}`, { variant: 'error' });
        }
      }
    } catch (error) {
      console.error('Error en carga de empleados:', error);
      enqueueSnackbar('Error al cargar la lista de empleados', { variant: 'error' });
    }
    
    setEmpleados(empleadosData);
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
    } finally {
      setLoading(false);
    }
  }, [cargarEmpleados, enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredLicencias = licencias.filter(licencia => {
    const empleado = empleados[licencia.empleado_id] || {};
    return (
      (!filters.motivo || licencia.motivo?.toLowerCase().includes(filters.motivo.toLowerCase())) &&
      (!filters.jerarquia || empleado.jerarquia === filters.jerarquia) &&
      (!filters.fechaInicio || new Date(licencia.fecha_inicio) >= new Date(filters.fechaInicio)) &&
      (!filters.fechaFin || new Date(licencia.fecha_fin) <= new Date(filters.fechaFin))
    );
  });

  const eventosCalendario = filteredLicencias.map(licencia => {
    const empleado = empleados[licencia.empleado_id] || {};
    
    // Usar moment.js para evitar problemas de zona horaria
    const startDate = moment(licencia.fecha_inicio).startOf('day').toDate();
    const endDate = moment(licencia.fecha_fin).endOf('day').toDate();
    
    return {
      id: licencia.id,
      title: `${empleado.nombre?.charAt(0)}. ${empleado.apellido}`.trim(),
      start: startDate,
      end: endDate,
      allDay: true,
      resource: { 
        licencia,
        empleado
      }
    };
  });

  const EventoCalendario = ({ event }) => {
    const { licencia, empleado } = event.resource;
    const nombreCorto = `${empleado.nombre?.split(' ')[0] || ''} ${empleado.apellido?.split(' ')[0] || ''}`.trim();
    const jerarquiaCorta = empleado.jerarquia?.split(' ')[0] || '';
    
    return (
      <Tooltip title={
        <div>
          <div><strong>{empleado.jerarquia}</strong> {empleado.nombre} {empleado.apellido}</div>
          <div>Motivo: {licencia.motivo || 'Sin especificar'}</div>
          <div>Del {moment(licencia.fecha_inicio).format('DD/MM/YYYY')} al {moment(licencia.fecha_fin).format('DD/MM/YYYY')}</div>
        </div>
      }>
        <div style={{
          backgroundColor: '#1976d2',
          color: 'white',
          padding: '0 2px',
          borderRadius: '2px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          fontSize: '11px',
          overflow: 'hidden'
        }}>
          <span style={{
            display: 'inline-block',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}>
            {jerarquiaCorta} {nombreCorto}
          </span>
        </div>
      </Tooltip>
    );
  };

  const jerarquiasUnicas = [...new Set(
    Object.values(empleados)
      .map(e => e.jerarquia)
      .filter(j => j && !['N/A', 'Sin jerarquía'].includes(j))
  )];

  const messages = {
    allDay: 'Todo el día',
    previous: 'Anterior',
    next: 'Siguiente',
    today: 'Hoy',
    month: 'Mes',
    week: 'Semana',
    day: 'Día',
    agenda: 'Agenda',
    date: 'Fecha',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'No hay eventos en este rango.',
    showMore: total => `+${total} más`, // Esta es la línea clave que resuelve tu problema
  };
  

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        
        <IconButton onClick={fetchData} color="primary" size="large">
          <Refresh />
        </IconButton>
      </Box>

      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center'
      }}>
          {/* Filtro por motivo */}
          <Box sx={{ width: { xs: '100%', sm: '220px' } }}>
            <TextField
              select
              label="Filtrar por motivo"
              fullWidth
              size="small"
              value={filters.motivo}
              onChange={(e) => setFilters({...filters, motivo: e.target.value})}
              sx={{ 
                maxWidth: '220px', // Ancho máximo personalizado
                '& .MuiOutlinedInput-root': {
                  height: '40px' // Altura reducida
                }
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

          {/* Filtro por jerarquía */}
          <Box sx={{ width: { xs: '100%', sm: '220px' } }}>
            <TextField
              select
              label="Filtrar por jerarquía"
              fullWidth
              size="small"
              value={filters.jerarquia}
              onChange={(e) => setFilters({...filters, jerarquia: e.target.value})}
              sx={{ 
                maxWidth: '220px', // Ancho aún más reducido
                '& .MuiOutlinedInput-root': {
                  height: '40px'
                }
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

          {/* Resto de los filtros (fechas) */}
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
            <Box sx={{ 
              flex: 1,
              minHeight: '600px', // Altura mínima garantizada
              display: 'flex',
              flexDirection: 'column',
              '& .rbc-calendar': {
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              },
              '& .rbc-month-view': {
                flex: 1,
                minHeight: '500px', // Altura suficiente para vista de mes
              },
              '& .rbc-month-header': {
                flex: '0 0 auto',
              },
              '& .rbc-month-row': {
                flex: 1,
                minHeight: '100px', // Altura de fila adecuada
              }
            }}>
              <Calendar
                localizer={localizer}
                events={eventosCalendario}
                startAccessor="start"
                endAccessor="end"
                messages={messages}
                date={date}
                onNavigate={handleNavigate}
                view={view}
                onView={setView}
                components={{
                  event: EventoCalendario,
                  toolbar: CustomToolbar
                }}
                defaultView="month"
                culture="es"
                style={{ 
                  height: '100%',
                  flex: 1
                }}            
                dayLayoutAlgorithm="no-overlap"
                eventPropGetter={() => ({
                  style: {
                    height: '22px',
                    marginBottom: '2px',
                  }
                })}
                firstDayOfWeek={1}
              />
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
                          {moment(licencia.fecha_inicio).format('DD/MM/YYYY')} -{' '}
                          {moment(licencia.fecha_fin).format('DD/MM/YYYY')}
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
  );
};

export default AnalisisTab; 