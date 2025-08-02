// src/components/Dashboard/FormularioNuevaAsignacion.jsx
import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { isEmployeeOnLeave } from '../../utils/leaveUtils'; // Import the helper

const FormularioNuevaAsignacion = ({
  nuevaAsignacion,
  handleNuevaAsignacionChange,
  handleAddAsignacion,
  handleCancel,
  isSaving,
  availableLocales, // Locales de categoría 'TABLERO'
  empleados,
  horariosTurnos, // Todos los horarios de turno
  licencias, // NEW: Licenses data
  selectedDate, // NEW: Selected date from TableroTab
}) => {

  // Filtra las tareas disponibles según el horario de turno seleccionado
  const tareasDisponibles = useMemo(() => {
    // Ensure horariosTurnos is an array before finding
    if (!Array.isArray(horariosTurnos)) return [];
    const selectedHorario = horariosTurnos.find(
      (h) => h.id === nuevaAsignacion.horario_turno_id
    );
    // Ensure tareas_asociadas is an array before returning
    return selectedHorario && Array.isArray(selectedHorario.tareas_asociadas) ? selectedHorario.tareas_asociadas : [];
  }, [nuevaAsignacion.horario_turno_id, horariosTurnos]);

  // handleDateChange can be inlined or kept as useCallback if preferred for performance,
  // but for clarity and to resolve the unused warning, let's keep it here.
  const handleDateChange = (date) => {
    handleNuevaAsignacionChange({
      target: {
        name: 'fecha',
        value: dayjs(date).format('YYYY-MM-DD'),
      },
    });
  };

  return (
    <Dialog open={true} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>Crear Nueva Asignación</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <DatePicker
            label="Fecha"
            value={dayjs(nuevaAsignacion.fecha)}
            onChange={handleDateChange}
            format="DD/MM/YYYY"
            sx={{ width: '100%' }}
            slotProps={{ textField: { variant: 'outlined' } }}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel id="local-select-label">Servicio</InputLabel>
            <Select
              labelId="local-select-label"
              name="local_id"
              value={nuevaAsignacion.local_id}
              onChange={handleNuevaAsignacionChange}
              label="Servicio"
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxHeight: '300px',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f1f1',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#888',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: '#555',
                    },
                  },
                },
              }}
            >
              <MenuItem value="">
                <em>Seleccione un Servicio</em>
              </MenuItem>
              {Array.isArray(availableLocales) && availableLocales.map((local) => (
                <MenuItem key={local.id} value={local.id}>
                  {local.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel id="horario-turno-select-label">Horario de Turno</InputLabel>
            <Select
              labelId="horario-turno-select-label"
              name="horario_turno_id"
              value={nuevaAsignacion.horario_turno_id}
              onChange={handleNuevaAsignacionChange}
              label="Horario de Turno"
            >
              <MenuItem value="">
                <em>Seleccione un Horario</em>
              </MenuItem>
              {Array.isArray(horariosTurnos) && horariosTurnos.map((horario) => ( // Itera sobre horariosTurnos
                <MenuItem key={horario.id} value={horario.id}>
                  {horario.nombre_turno} ({horario.hora_entrada} - {horario.hora_salida})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Tarea Asociada</InputLabel>
            <Select
              name="tarea_asociada_nombre"
              value={nuevaAsignacion.tarea_asociada_nombre}
              onChange={handleNuevaAsignacionChange}
              label="Tarea Asociada"
              disabled={!nuevaAsignacion.horario_turno_id} // Deshabilita si no hay horario seleccionado
            >
              <MenuItem value="">
                <em>Seleccione una Tarea</em>
              </MenuItem>
              {/* tareasDisponibles is already checked in useMemo, but a final check here is safe */}
              {Array.isArray(tareasDisponibles) && tareasDisponibles.map((tarea) => (
                <MenuItem key={tarea} value={tarea}>
                  {tarea}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Personal</InputLabel>
            <Select
              name="empleado_id"
              value={nuevaAsignacion.empleado_id}
              onChange={handleNuevaAsignacionChange}
              label="Personal"
            >
              <MenuItem value="">
                <em>Seleccione un personal</em>
              </MenuItem>
              {/* Ensure empleados is an array before mapping */}
              {Array.isArray(empleados) && empleados.map((empleado) => { // Corrected 'employees.map' to 'empleados.map'
                // Use the date from `nuevaAsignacion.fecha` for the check, or `selectedDate` as a fallback
                const dateToCheck = nuevaAsignacion.fecha ? nuevaAsignacion.fecha : selectedDate.format('YYYY-MM-DD');
                const isOnLeave = isEmployeeOnLeave(empleado.id, dateToCheck, licencias);

                return (
                  <MenuItem
                    key={empleado.id}
                    value={empleado.id}
                    sx={{
                      color: isOnLeave ? 'error.main' : 'inherit', // Red color for leave
                      fontWeight: isOnLeave ? 'bold' : 'normal', // Bold for leave
                    }}
                  >
                    {empleado.apellido}, {empleado.nombre} ({empleado.jerarquia})
                    {isOnLeave && <Typography component="span" sx={{ ml: 1, color: 'error.main', fontSize: '0.8em' }}>(Licencia)</Typography>}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Box>

        {isSaving && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} />
            <Typography sx={{ ml: 1 }}>Creando asignación...</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={isSaving}>
          Cancelar
        </Button>
        <Button onClick={handleAddAsignacion} variant="contained" disabled={isSaving}>
          Guardar Asignación
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormularioNuevaAsignacion;