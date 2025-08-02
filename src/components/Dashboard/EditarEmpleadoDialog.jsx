// src/components/Dashboard/EditarEmpleadoDialog.jsx
import React, { useState, useEffect, useCallback } from 'react';
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
import { useSnackbar } from 'notistack';
import { isEmployeeOnLeave } from '../../utils/leaveUtils'; // Import the helper

const EditarEmpleadoDialog = ({
  asignacionId,
  fieldName, // 'empleado_id'
  currentValue, // El ID actual del empleado en la asignación
  empleados, // Lista completa de empleados disponibles
  licencias, // NEW: Licenses data
  asignacionDate, // NEW: The date of the assignment being edited
  onSave,
  onCancel,
}) => {
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState('');
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    setSelectedEmpleadoId(currentValue || '');
  }, [currentValue]);

  const handleEmpleadoChange = useCallback((event) => {
    setSelectedEmpleadoId(event.target.value);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedEmpleadoId) {
      enqueueSnackbar('Por favor, seleccione un personal.', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      await onSave(asignacionId, fieldName, selectedEmpleadoId);
    } catch (error) {
      console.error('Error al guardar edición:', error);
      enqueueSnackbar('Error al guardar edición.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [asignacionId, fieldName, selectedEmpleadoId, onSave, enqueueSnackbar]);

  const handleClose = useCallback(() => {
    onCancel();
  }, [onCancel]);

  return (
    <Dialog open={true} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Cambiar Personal en Asignación</DialogTitle>
      <DialogContent dividers>
        <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
          <InputLabel id="select-empleado-label">Personal</InputLabel>
          <Select
            labelId="select-empleado-label"
            id="select-empleado"
            value={selectedEmpleadoId}
            label="Personal"
            onChange={handleEmpleadoChange}
          >
            <MenuItem value="">
              <em>Sin Asignar</em>
            </MenuItem>
            {empleados.map((empleado) => {
              // Determine if the employee is on leave for the assignment's date
              const isOnLeave = asignacionDate ? isEmployeeOnLeave(empleado.id, asignacionDate, licencias) : false;

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
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} />
            <Typography sx={{ ml: 1 }}>Guardando...</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          Guardar Cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditarEmpleadoDialog;