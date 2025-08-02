import React, { useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import dayjs from 'dayjs';


const AsignacionesTableView = ({
  asignaciones,
  empleados,
  horariosTurnos,
  locales,
  onEdit,
  onDelete,
  isAdmin,
  selectedDate,
}) => {
  const sortedLocales = useMemo(() => {
    return [...locales].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [locales]);

  const filteredLocales = useMemo(() => {
  const localesWithAssignments = new Set();
  
  asignaciones.forEach(asignacion => {
    if (dayjs(asignacion.fecha).isSame(selectedDate, 'day')) {
      localesWithAssignments.add(asignacion.local_id);
    }
  });

  return sortedLocales.filter(local => localesWithAssignments.has(local.id));
  }, [sortedLocales, asignaciones, selectedDate]);


  const getEmpleadoForCell = useCallback((empleadoId) => {
    const empleado = empleados.find(emp => emp.id === empleadoId);
    if (empleado) {
      const { apellido, nombre, jerarquia } = empleado;
      const firstInitial = nombre ? nombre.charAt(0).toUpperCase() : '';

      // Construct the string with hierarchy, last name, and first initial
      // Assuming 'jerarquia' is optional and might not always be present
      if (jerarquia) {
        return `${jerarquia} ${apellido}, ${firstInitial}`;
      } else {
        return `${apellido}, ${firstInitial}`;
      }
    }
    return 'Sin Asignar';
  }, [empleados]);

  const groupedTableHeaders = useMemo(() => {
  const groupedHeaders = {};
  const assignedShiftTaskCombos = new Set();

  // Primero recolectamos todas las combinaciones de turno-tarea que tienen asignaciones
  asignaciones.forEach(asignacion => {
    if (dayjs(asignacion.fecha).isSame(selectedDate, 'day')) {
      assignedShiftTaskCombos.add(`${asignacion.horario_turno_id}-${asignacion.tarea_asociada_nombre}`);
    }
  });

  // Solo procesamos los horarios que tienen asignaciones
  horariosTurnos.forEach(horario => {
    // Verificamos si este horario tiene alguna tarea asignada
    const hasAssignments = Array.from(assignedShiftTaskCombos).some(combo => 
      combo.startsWith(`${horario.id}-`)
    );

    if (hasAssignments && horario.tareas_asociadas && Array.isArray(horario.tareas_asociadas)) {
      horario.tareas_asociadas.forEach(tarea => {
        const comboKey = `${horario.id}-${tarea}`;
        if (assignedShiftTaskCombos.has(comboKey)) {
          if (!groupedHeaders[horario.id]) {
            groupedHeaders[horario.id] = {
              horarioNombre: horario.nombre_turno,
              horaEntrada: horario.hora_entrada,
              horaSalida: horario.hora_salida,
              tasks: [],
            };
          }
          groupedHeaders[horario.id].tasks.push({
            tareaNombre: tarea,
            horarioId: horario.id,
          });
        }
      });
     }
    });

    // Custom sorting logic for turns
    const turnOrder = ["Mañana", "Tarde", "Noche 1°", "Noche 2°"];
    const sortedGroupedHeaders = Object.values(groupedHeaders).sort((a, b) => {
        const nameA = a.horarioNombre.includes("Mañana") ? "Mañana" :
                      a.horarioNombre.includes("Tarde") ? "Tarde" :
                      a.horarioNombre.includes("Noche 1°") ? "Noche 1°" :
                      a.horarioNombre.includes("Noche 2°") ? "Noche 2°" : "";

        const nameB = b.horarioNombre.includes("Mañana") ? "Mañana" :
                      b.horarioNombre.includes("Tarde") ? "Tarde" :
                      b.horarioNombre.includes("Noche 1°") ? "Noche 1°" :
                      b.horarioNombre.includes("Noche 2°") ? "Noche 2°" : "";

        const indexA = turnOrder.indexOf(nameA);
        const indexB = turnOrder.indexOf(nameB);

        if (indexA === -1 && indexB === -1) {
            // If both are not in the predefined order, sort by time as a fallback
            const timeA = dayjs(`2000-01-01T${a.horaEntrada}`);
            const timeB = dayjs(`2000-01-01T${b.horaEntrada}`);
            return timeA.diff(timeB);
        } else if (indexA === -1) {
            return 1; // b comes first if a is not in the predefined order
        } else if (indexB === -1) {
            return -1; // a comes first if b is not in the predefined order
        }
        return indexA - indexB;
    });

    sortedGroupedHeaders.forEach(group => {
      group.tasks.sort((a, b) => a.tareaNombre.localeCompare(b.tareaNombre));
    });

    return sortedGroupedHeaders;
  }, [horariosTurnos, asignaciones, selectedDate]);


  return (
    <TableContainer 
      component={Paper} 
      sx={{ 
        overflow: 'auto',
        width: '100%',
        '@media print': {
          overflow: 'visible',
          boxShadow: 'none',
          backgroundColor: 'transparent'
        },
        '& .MuiTableCell-root': {
          boxSizing: 'border-box'
        }
      }} 
      className="print-table-container" // Esta clase es importante
      id="tablero-asignaciones" // Agrega un ID para fácil selección
    >
        <Table 
          stickyHeader 
          aria-label="asignaciones table" 
          size="small"
          sx={{
            tableLayout: 'fixed',
            width: '100%',
            '@media print': {
              tableLayout: 'auto'
            }
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                rowSpan={2}
                sx={{
                  width: '15%', // Ancho fijo para la columna Servicio
                  minWidth: '100px',
                  maxWidth: '150px',
                  wordWrap: 'break-word',
                  whiteSpace: 'normal'
                }}
              >
                <Typography variant="body2" fontWeight="bold" sx={{ textAlign: 'center' }}> 
                  Servicio
                </Typography>
              </TableCell>
            {groupedTableHeaders.map(group => (
              <TableCell
                key={group.horarioNombre}
                colSpan={group.tasks.length}
                sx={{
                  textAlign: 'center',
                  minWidth: group.tasks.length * 100,
                  borderBottom: 'none',
                  p: 1,
                  fontSize: '0.875rem' // Igualar tamaño de fuente
                }}
              >
                <Typography variant="body2" fontWeight="bold">
                  Turno {group.horarioNombre}
                </Typography>
                <Typography variant="caption" display="block">
                  ({group.horaEntrada} - {group.horaSalida})
                </Typography>
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            {groupedTableHeaders.map(group => (
              group.tasks.map((task, index) => (
                <TableCell
                  key={`${group.horarioNombre}-${task.tareaNombre}-${index}`}
                  sx={{
                    minWidth: 100,
                    maxWidth: 150,
                    textAlign: 'center',
                    borderTop: 'none',
                    borderLeft: index > 0 ? '1px solid rgba(224, 224, 224, 1)' : 'none',
                    p: 1,
                    fontSize: '0.875rem' // Igualar tamaño de fuente
                  }}
                >
                  <Typography variant="caption" display="block" fontWeight="bold">
                    {task.tareaNombre}
                  </Typography>
                </TableCell>
              ))
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {filteredLocales.map(local => (
            <TableRow key={local.id} sx={{ 
              height: 'auto',
              '& > td, & > th': {
                verticalAlign: 'top', // Alinear todo al top para múltiples asignaciones
                borderBottom: '1px solid rgba(224, 224, 224, 1)',
                height: 'auto', // Permitir que la altura se ajuste al contenido
              },
              '&:last-child > td, &:last-child > th': {
                borderBottom: 'none' // Opcional: eliminar borde inferior de la última fila
              }
            }}>
              <TableCell 
                  component="th" 
                  scope="row" 
                  sx={{ 
                    fontWeight: 'bold',
                    width: '15%',
                    minWidth: '100px',
                    maxWidth: '150px',
                    p: 1,
                    fontSize: '0.875rem',
                    position: 'relative',
                    height: '100%',
                    verticalAlign: 'top', 
                    borderBottom: '1px solid rgba(224, 224, 224, 1)',
                    display: 'table-cell', 
                  }}
                  className="service-cell"
                >
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '64px', 
                  height: '100%',
                  p: 1,
                  boxSizing: 'border-box'
                }}>
                  <Typography variant="body2" sx={{
                    textAlign: 'center',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    width: '100%',
                    lineHeight: '1.5',
                  }}>
                    {local.nombre}
                  </Typography>
                </Box>
              </TableCell>
              {groupedTableHeaders.map(group => (
                group.tasks.map((task) => {
                  const asignacionesEnCelda = asignaciones.filter(
                    a =>
                      dayjs(a.fecha).isSame(selectedDate, 'day') &&
                      a.local_id === local.id &&
                      a.horario_turno_id === task.horarioId &&
                      a.tarea_asociada_nombre === task.tareaNombre
                  );

                  return (
                    <TableCell
                        key={`${local.id}-${task.horarioId}-${task.tareaNombre}`}
                        sx={{
                          textAlign: 'center',
                          p: 1,
                          minWidth: 100,
                          maxWidth: 150,
                          height: '100%',
                          position: 'relative',
                          verticalAlign: 'top',
                          '@media print': {
                            height: 'auto !important', // Asegúrate de que la altura sea automática en la impresión
                          },
                        }}
                      >
                      <Box sx={{ 
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center'
                        }}></Box>
                      {asignacionesEnCelda.length > 0 ? (
                        <Box sx={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              gap: 1,
                              p: 1,
                              minHeight: '64px' // Altura mínima igual a una asignación
                            }}>
                              {asignacionesEnCelda.map((asignacion, index) => (
                                <Box
                                  key={asignacion.id}
                                  sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    p: 0.5,
                                    width: '100%',
                                    mb: index < asignacionesEnCelda.length - 1 ? 1 : 0,
                                    // No establecer altura fija para permitir expansión
                                  }}
                                >
                              <Typography variant="body2">
                                {getEmpleadoForCell(asignacion.empleado_id)}
                              </Typography>
                              {isAdmin && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5 }}>
                                  <Tooltip title="Editar Asignación">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      // IMPORTANT CHANGE HERE: Pass asignacion.fecha
                                      onClick={() => onEdit(asignacion.id, 'empleado_id', asignacion.empleado_id, asignacion.fecha)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Eliminar Asignación">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => onDelete(asignacion.id)}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Sin Asignar
                        </Typography>
                      )}
                    </TableCell>
                  );
                })
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {locales.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">No hay servicios configurados para el tablero.</Typography>
        </Box>
      )}
      {locales.length > 0 && horariosTurnos.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">No hay horarios de turno configurados.</Typography>
        </Box>
      )}
      {locales.length > 0 && horariosTurnos.length > 0 && groupedTableHeaders.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">No hay asignaciones para la fecha seleccionada.</Typography>
          <Typography variant="caption" color="text.secondary">
            (O no hay turnos con tareas asociadas para mostrar)
          </Typography>
        </Box>
      )}
      {locales.length > 0 && horariosTurnos.length > 0 && filteredLocales.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">No hay servicios con asignaciones para la fecha seleccionada.</Typography>
        </Box>
      )}

    </TableContainer>
  );
};

export default AsignacionesTableView;