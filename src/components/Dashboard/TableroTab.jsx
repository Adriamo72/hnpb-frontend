// src/components/Dashboard/TableroTab.jsx
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem 
} from '@mui/material';
import {
  Add,
  Print
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import 'dayjs/locale/es'; // Spanish locale
import localizedFormat from 'dayjs/plugin/localizedFormat';
import updateLocale from 'dayjs/plugin/updateLocale'; 
import { apiService } from '../../services/apiService';
import { useAppContext } from '../../context/AppContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';


// Asegúrate de que estos componentes existan en el mismo directorio (src/components/Dashboard)
import EditarEmpleadoDialog from './EditarEmpleadoDialog';
import FormularioNuevaAsignacion from './FormularioNuevaAsignacion';
import AsignacionesTableView from './AsignacionesTableView';

dayjs.extend(localizedFormat);
dayjs.extend(updateLocale); // Now this will work correctly
dayjs.locale('es');

dayjs.updateLocale('es', {
  months: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ],
  weekdays: [
    'Domingo', 'Lunes', 'Martes', 'Miércoles',
    'Jueves', 'Viernes', 'Sábado'
  ]
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
          <Typography variant="h6">¡Ups! Algo salió mal.</Typography>
          <Typography variant="body2">{this.state.error && this.state.error.toString()}</Typography>
          <Button onClick={() => this.setState({ hasError: false, error: null })}>
            Intentar de nuevo
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

const TableroTab = () => {
  const [asignaciones, setAsignaciones] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [horariosTurnos, setHorariosTurnos] = useState([]);
  const [locales, setLocales] = useState([]);
  const [localesTablero, setLocalesTablero] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updateKey, setUpdateKey] = useState(0); // Para forzar re-render de AsignacionesTableView
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin } = useAppContext();
  const [selectedDate, setSelectedDate] = useState(dayjs());

 useEffect(() => {
    dayjs.locale('es');
  }, []);

  const formatTitleDate = useCallback((date) => {
    return date.locale('es').format('dddd D [de] MMMM');
  }, []);

  const [editDialog, setEditDialog] = useState({
    open: false,
    asignacionId: null,
    fieldName: '',
    currentValue: null,
    asignacionDate: null,
  });

  const [showNuevaAsignacionForm, setShowNuevaAsignacionForm] = useState(false);
  const [nuevaAsignacion, setNuevaAsignacion] = useState({
    fecha: dayjs().format('YYYY-MM-DD'),
    horario_turno_id: '',
    tarea_asociada_nombre: '',
    local_id: '',
    empleado_id: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [licencias, setLicencias] = useState([]);

  const fetchTableroData = useCallback(async (date) => {
    setLoading(true);
    try {
      const formattedDate = date.format('YYYY-MM-DD');
      const [
        asignacionesRes,
        empleadosRes,
        localesRes,
        localesTableroRes,
        horariosTurnosRes,
        licenciasRes
      ] = await Promise.all([
        apiService.tablero.getAsignaciones(formattedDate).catch(error => {
          console.error('Error fetching asignaciones:', error);
          return { data: [] };
        }),
        apiService.empleados.getAll().catch(() => ({ data: [] })),
        apiService.locales.getAll().catch(() => ({ data: [] })),
        apiService.tablero.getLocalesTablero().catch(() => ({ data: [] })),
        apiService.horarios.getAll().catch(() => ({ data: [] })),
        apiService.licencias.getByPeriodo(formattedDate, formattedDate).catch(error => {
          console.error('Error fetching licencias:', error);
          return { data: [] };
        })
      ]);

      setAsignaciones(asignacionesRes.data || []);
      setEmpleados(empleadosRes.data || []);
      setLocales(localesRes.data || []);
      setLocalesTablero(localesTableroRes.data || []);
      setHorariosTurnos(horariosTurnosRes.data || []);
      setLicencias(licenciasRes.data || []);

    } catch (error) {
      console.error('Error al cargar datos del tablero:', error);
      enqueueSnackbar('Error al cargar datos del tablero.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchTableroData(selectedDate);
  }, [selectedDate, fetchTableroData]);

  const handleDateChange = (date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleOpenEditDialog = useCallback((asignacionId, fieldName, currentValue, asignacionDate) => {
    setEditDialog({
      open: true,
      asignacionId,
      fieldName,
      currentValue,
      asignacionDate,
    });
  }, []);

  const handleSaveEdit = useCallback(
  async (asignacionId, fieldName, newValue) => {
    setEditDialog((prev) => ({ ...prev, loading: true }));
    
    try {
      const asignacionOriginal = asignaciones.find(a => a.id === asignacionId);
      const horarioAsignacion = horariosTurnos.find(h => h.id === asignacionOriginal.horario_turno_id);
      const nuevoEmpleado = empleados.find(e => e.id === newValue);
      
      let procederConGuardado = true;

      // Solo verificar si estamos cambiando el empleado y solo para el turno
      if (fieldName === 'empleado_id' && horarioAsignacion && nuevoEmpleado) {
        const turnoDiferente = nuevoEmpleado.turno !== horarioAsignacion.nombre_turno;
        
        if (turnoDiferente) {
          procederConGuardado = window.confirm(
            `El personal ${nuevoEmpleado.jerarquia} ${nuevoEmpleado.apellido}, ${nuevoEmpleado.nombre} tiene:\n` +
            `- Turno actual: ${nuevoEmpleado.turno}\n\n` +
            `La asignación requiere:\n` +
            `- Turno: ${horarioAsignacion.nombre_turno}\n\n` +
            `¿Desea actualizar el turno del personal para que coincida con esta asignación?\n\n` +
            `Si selecciona "Cancelar", la asignación NO se modificará.`
          );

          if (procederConGuardado) {
            try {
              await apiService.empleados.update(nuevoEmpleado.id, {
                ...nuevoEmpleado,
                turno: horarioAsignacion.nombre_turno
                // Se eliminó la actualización de la tarea
              });
              enqueueSnackbar('Turno del personal actualizado correctamente.', { variant: 'success' });
              setEmpleados(prev => prev.map(emp => 
                emp.id === nuevoEmpleado.id 
                  ? { ...emp, 
                      turno: horarioAsignacion.nombre_turno
                      // Se eliminó la actualización de la tarea
                    }
                  : emp
              ));
            } catch (error) {
              console.error('Error al actualizar el personal:', error);
              enqueueSnackbar('Error al actualizar turno del personal.', { variant: 'error' });
              procederConGuardado = false;
            }
          }
        }
      }

      if (procederConGuardado) {
        await apiService.tablero.createOrUpdateAsignacion({
          id: asignacionId,
          [fieldName]: newValue,
        });
        enqueueSnackbar('Asignación actualizada con éxito.', { variant: 'success' });
        fetchTableroData(selectedDate);
        setUpdateKey((prev) => prev + 1);
      }
      
      setEditDialog({ open: false, asignacionId: null, fieldName: '', currentValue: null, asignacionDate: null });
      
    } catch (error) {
      console.error('Error al actualizar asignación:', error);
      enqueueSnackbar('Error al actualizar asignación.', { variant: 'error' });
    } finally {
      setEditDialog((prev) => ({ ...prev, loading: false }));
    }
  },
  [enqueueSnackbar, fetchTableroData, selectedDate, asignaciones, empleados, horariosTurnos]
);


  const handleDeleteAsignacion = useCallback(
    async (id) => {
      if (window.confirm('¿Está seguro de que desea eliminar esta asignación?')) {
        try {
          await apiService.tablero.deleteAsignacion(id);
          enqueueSnackbar('Asignación eliminada con éxito.', { variant: 'success' });
          fetchTableroData(selectedDate);
          setUpdateKey((prev) => prev + 1);
        } catch (error) {
          console.error('Error al eliminar asignación:', error);
          enqueueSnackbar('Error al eliminar asignación.', { variant: 'error' });
        }
      }
    },
    [enqueueSnackbar, fetchTableroData, selectedDate]
  );

  const handleCancelEdit = useCallback(() => {
    setEditDialog({ open: false, asignacionId: null, fieldName: '', currentValue: null, asignacionDate: null });
  }, []);

  const handleOpenNuevaAsignacion = () => {
    setNuevaAsignacion({
      fecha: selectedDate.format('YYYY-MM-DD'),
      horario_turno_id: '',
      tarea_asociada_nombre: '',
      local_id: '',
      empleado_id: '',
    });
    setShowNuevaAsignacionForm(true);
  };

  const handleCloseNuevaAsignacion = useCallback(() => {
    setShowNuevaAsignacionForm(false);
    setIsSaving(false); // Reset saving state
  }, []);

  const handleNuevaAsignacionChange = useCallback((e) => {
    const { name, value } = e.target;
    setNuevaAsignacion((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleAddAsignacion = useCallback(async () => {
  setIsSaving(true);
  try {
    if (!nuevaAsignacion.fecha || !nuevaAsignacion.horario_turno_id || 
        !nuevaAsignacion.tarea_asociada_nombre || !nuevaAsignacion.local_id || 
        !nuevaAsignacion.empleado_id) {
      enqueueSnackbar('Por favor, complete todos los campos de la asignación.', { variant: 'warning' });
      setIsSaving(false);
      return;
    }

    const horarioSeleccionado = horariosTurnos.find(h => h.id === nuevaAsignacion.horario_turno_id);
    const empleadoSeleccionado = empleados.find(e => e.id === nuevaAsignacion.empleado_id);

    if (empleadoSeleccionado && horarioSeleccionado) {
      // Solo verificar el turno, no la tarea
      const turnoDiferente = empleadoSeleccionado.turno !== horarioSeleccionado.nombre_turno;
      
      if (turnoDiferente) {
        const confirmar = window.confirm(
          `El personal ${empleadoSeleccionado.apellido}, ${empleadoSeleccionado.nombre} tiene:\n` +
          `- Turno actual: ${empleadoSeleccionado.turno}\n\n` +
          `La asignación será:\n` +
          `- Nuevo turno: ${horarioSeleccionado.nombre_turno}\n\n` +
          `¿Desea actualizar el turno del personal para que coincida con esta asignación?`
        );

        if (confirmar) {
          try {
            await apiService.empleados.update(empleadoSeleccionado.id, {
              turno: horarioSeleccionado.nombre_turno
              // Se eliminó la actualización de la tarea
            });
            enqueueSnackbar('Turno del personal actualizado correctamente.', { variant: 'success' });
            
            setEmpleados(prev => prev.map(emp => 
              emp.id === empleadoSeleccionado.id 
                ? { ...emp, 
                    turno: horarioSeleccionado.nombre_turno
                    // Se eliminó la actualización de la tarea
                  }
                : emp
            ));
          } catch (error) {
            console.error('Error al actualizar el personal:', error);
            enqueueSnackbar('Error al actualizar turno del personal.', { variant: 'error' });
          }
        }
      }
    }

    await apiService.tablero.createOrUpdateAsignacion(nuevaAsignacion);
    enqueueSnackbar('Asignación creada exitosamente.', { variant: 'success' });
    
    fetchTableroData(selectedDate);
    setUpdateKey(prev => prev + 1);
    handleCloseNuevaAsignacion();
    
  } catch (error) {
    console.error('Error en handleAddAsignacion:', error);
    enqueueSnackbar(
      error.response?.data?.message || 
      'Error al crear la asignación', 
      { variant: 'error' }
    );
  } finally {
    setIsSaving(false);
  }
}, [
  nuevaAsignacion, 
  empleados, 
  horariosTurnos, 
  enqueueSnackbar, 
  selectedDate, 
  fetchTableroData, 
  handleCloseNuevaAsignacion
]);

  const availableLocales = useMemo(() => {
    const tableroLocalIds = new Set(localesTablero.map(lt => lt.id || lt.local_id));
    return locales.filter(local => tableroLocalIds.has(local.id));
  }, [locales, localesTablero]);

  const [anchorEl, setAnchorEl] = useState(null);
const open = Boolean(anchorEl);

const handlePrintMenuClick = (event) => {
  setAnchorEl(event.currentTarget);
};

const handlePrintMenuClose = () => {
  setAnchorEl(null);
};

const handlePrintPDF = async () => {
  handlePrintMenuClose();
  let tempContainer;

  try {
    enqueueSnackbar('Generando PDF...', { variant: 'info', autoHideDuration: 2000 });
    document.body.classList.add('generating-pdf');

    // 1. Configuración del contenedor temporal
    tempContainer = document.createElement('div');
    Object.assign(tempContainer.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '794px', // Ancho A4 en pixels (210mm)
      padding: '0',
      margin: '0',
      zIndex: '9999',
      backgroundColor: '#fff'
    });
    document.body.appendChild(tempContainer);

    // 2. Clonado de elementos
    const title = document.querySelector('.pdf-title-container')?.cloneNode(true);
    const table = document.getElementById('tablero-asignaciones')?.cloneNode(true);
    
    if (!title || !table) {
      throw new Error('No se encontraron los elementos a imprimir');
    }

    Object.assign(title.style, {
      margin: '0 0 5px 0',
      padding: '0',
      fontSize: '16px'
    });
    
    Object.assign(table.style, {
      margin: '0',
      padding: '0',
      borderCollapse: 'collapse',
      fontSize: '12px'
    });
    
    tempContainer.appendChild(title);
    tempContainer.appendChild(table);

    // 3. Captura del contenido completo para medición
    const fullCanvas = await html2canvas(tempContainer, {
      scale: 1,
      useCORS: true,
      logging: true,
      windowWidth: tempContainer.scrollWidth,
      windowHeight: tempContainer.scrollHeight
    });

    // 4. Configuración de PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const imgWidth = 190;
    const imgHeight = (fullCanvas.height * imgWidth) / fullCanvas.width;
    const margin = { top: 10, left: 10 };
    const usableHeight = 287; // 297mm (A4) - 10mm margen

    // 5. Calcular páginas necesarias
    if (imgHeight <= usableHeight) {
      // Caso de una sola página
      pdf.addImage(
        fullCanvas.toDataURL('image/jpeg', 0.85),
        'JPEG',
        margin.left,
        margin.top,
        imgWidth,
        imgHeight
      );
    } else {
      // Caso de múltiples páginas
      let currentPosition = 0;
      let pageCount = 0;
      const totalHeight = fullCanvas.height;
      const sectionHeight = (usableHeight * fullCanvas.width) / imgWidth;

      while (currentPosition < totalHeight) {
        if (pageCount > 0) {
          pdf.addPage();
        }

        // Calcular altura del segmento actual
        const segmentHeight = Math.min(sectionHeight, totalHeight - currentPosition);
        
        // Crear canvas para el segmento actual
        const segmentCanvas = document.createElement('canvas');
        segmentCanvas.width = fullCanvas.width;
        segmentCanvas.height = segmentHeight;
        
        const ctx = segmentCanvas.getContext('2d');
        ctx.drawImage(
          fullCanvas,
          0, currentPosition, // Coordenadas de origen
          fullCanvas.width, segmentHeight, // Dimensiones de origen
          0, 0, // Coordenadas de destino
          fullCanvas.width, segmentHeight // Dimensiones de destino
        );

        // Agregar al PDF
        pdf.addImage(
          segmentCanvas.toDataURL('image/jpeg', 0.95),
          'JPEG',
          margin.left,
          margin.top,
          imgWidth,
          (segmentHeight * imgWidth) / fullCanvas.width
        );

        currentPosition += segmentHeight;
        pageCount++;
      }
    }

    // 6. Guardar el PDF
    pdf.save(`Tablero_Asignaciones_${selectedDate.format('YYYY-MM-DD')}.pdf`);
    enqueueSnackbar('PDF generado correctamente', { variant: 'success' });

  } catch (error) {
    console.error('Error en generación de PDF:', error);
    enqueueSnackbar(`Error al generar PDF: ${error.message}`, { variant: 'error' });
  } finally {
    // Limpieza garantizada
    if (tempContainer && document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer);
    }
    document.body.classList.remove('generating-pdf');
  }
};

const handlePrintBrowser = () => {
  handlePrintMenuClose();
  window.print();
};

  return (
    <ErrorBoundary>
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
        {/* Encabezado con título y controles */}
    <Box
      sx={{
        p: 3,
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
      }}
      id="tablero-header"
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
          '@media print': {
            justifyContent: 'center'
          }
        }}
      >
    {/* Título - visible en PDF */}
    <Box className="pdf-title-container" sx={{ 
      display: 'flex', 
      alignItems: 'center',
      '@media print': {
        width: '100%',
        justifyContent: 'center'
      }
    }}>
      <Typography 
        variant="h6" 
        component="h6"
        noWrap
        sx={{
          fontWeight: 600,
          fontSize: '1rem',
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          lineHeight: 1.5,
          letterSpacing: '0.00938em',
          color: '#344767',
          '&::first-letter': {
            textTransform: 'uppercase'
          },
          '@media print': {
            fontSize: '16px !important',
            textAlign: 'center'
          }
        }}
      >
        {formatTitleDate(selectedDate)}
      </Typography>
          </Box>

          {/* Controles - ocultos en PDF */}
          <Box className="no-print-controls" sx={{
            display: 'flex',
            gap: 1,
            '@media print': {
              display: 'none !important'
            }
          }}>
            <DatePicker
              label="Fecha"
              value={selectedDate}
              onChange={handleDateChange}
              format="DD/MM/YYYY"
              slotProps={{ textField: { size: 'small' } }}
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenNuevaAsignacion}
              size="medium"
            >
              Nueva Asignación
            </Button>
            <IconButton 
              color="primary" 
              onClick={handlePrintMenuClick}
              aria-controls={open ? 'print-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <Print />
            </IconButton>
            <Menu
              id="print-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handlePrintMenuClose}
              MenuListProps={{
                'aria-labelledby': 'print-button',
              }}
            >
              <MenuItem onClick={handlePrintPDF}>Generar PDF</MenuItem>
              <MenuItem onClick={handlePrintBrowser}>Imprimir directamente</MenuItem>
            </Menu>
          </Box>
        </Box>
      </Box>
        
        {/* Contenedor de la tabla */}
        <Box 
        className="table-scroll-wrapper"
        sx={{ 
          flex: 1,
          overflow: 'auto'
        }}>
          {loading ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%'
            }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Cargando asignaciones...</Typography>
            </Box>
          ) : (
            <AsignacionesTableView
              asignaciones={asignaciones}
              empleados={empleados}
              horariosTurnos={horariosTurnos}
              locales={locales}
              localesTablero={localesTablero}
              updateKey={updateKey}
              onEdit={handleOpenEditDialog}
              onDelete={handleDeleteAsignacion}
              isAdmin={isAdmin}
              selectedDate={selectedDate}
            />
          )}
        </Box>

        {/* Modales (mantener igual) */}
        {editDialog.open && (
          <EditarEmpleadoDialog
            asignacionId={editDialog.asignacionId}
            fieldName={editDialog.fieldName}
            currentValue={editDialog.currentValue}
            empleados={empleados}
            licencias={licencias}
            asignacionDate={editDialog.asignacionDate}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        )}

        {showNuevaAsignacionForm && (
          <FormularioNuevaAsignacion
            nuevaAsignacion={nuevaAsignacion}
            handleNuevaAsignacionChange={handleNuevaAsignacionChange}
            handleAddAsignacion={handleAddAsignacion}
            handleCancel={handleCloseNuevaAsignacion}
            isSaving={isSaving}
            availableLocales={availableLocales}
            empleados={empleados}
            horariosTurnos={horariosTurnos}
            licencias={licencias}
            selectedDate={selectedDate}
          />
        )}
      </Paper>
    </ErrorBoundary>
  );
};

export default memo(TableroTab);