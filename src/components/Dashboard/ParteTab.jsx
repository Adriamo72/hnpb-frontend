import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { 
  Typography, 
  Grid, 
  Paper, 
  Box,
  Chip,
  Card,
  CircularProgress,
  Tooltip as MuiTooltip,
  Divider
} from '@mui/material';
import { 
  commonTooltipConfig, 
  commonChartEvents 
} from '../../utils/chartConfig';
import { useChartTooltips } from '../../hooks/useChartTooltips';
import ApexChart from 'react-apexcharts';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import 'dayjs/locale/es'; 
import { apiService } from '../../services/apiService';
import StatisticsCard from './StatisticsCard';
import Groups2Icon from '@mui/icons-material/Groups2';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import GroupRemoveIcon from '@mui/icons-material/GroupRemove';

dayjs.locale('es');

const Clock = React.memo(() => {
  const [time, setTime] = useState(dayjs());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDateTime = time.format('dddd, D [de] MMMM, HH:mm:ss');

  return (
    <Typography 
      component="span" 
      sx={{ 
        color: '#344767',
        fontWeight: 600,
        fontSize: '1rem',
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      }}
    >
      {formattedDateTime}
    </Typography>
  );
});

// Días de la semana para mostrar en tooltips
const DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

// Lista de tareas posibles (debería coincidir con AdminConfigTab)
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

const ParteTab = () => {
  useChartTooltips('tasks-chart-container');
  useChartTooltips('assignments-chart-container');
  useChartTooltips('shifts-distribution-container');
  useChartTooltips('current-shift-distribution-container');
  useChartTooltips('real-time-status-container');
  useChartTooltips('license-trends-container');

  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState({
    empleados: [],
    licencias: [],
    horarios: [],
    locales: []
  });
  const [feriados, setFeriados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [asignaciones, setAsignaciones] = useState([]);
  const [lastShiftUpdate, setLastShiftUpdate] = useState(null);
  const [turnosColors, setTurnosColors] = useState({});
  const currentDate = currentTime.format('YYYY-MM-DD');

  // Configuración constante
  const JERARQUIAS_MILITARES = ['MSTV', 'MITV', 'CS', 'CI', 'CP', 'SS', 'SI', 'SP', 'SM'];
  const COLORS = {
    military: '#3f51b5',
    civilian: '#ff5722',
    present: '#4caf50',
    absent: '#f44336',
    rest: '#ffc107',
    otherShift: '#9e9e9e'
  };

  // Generar colores para los turnos dinámicamente
  const generateTurnColors = useCallback((turnos) => {
    const colors = [
      '#4CAF50', '#2196F3', '#9C27B0', '#FFC107', 
      '#FF5722', '#607D8B', '#E91E63', '#3F51B5',
      '#009688', '#795548', '#673AB7', '#CDDC39'
    ];
    
    return turnos.reduce((acc, turno, index) => {
      acc[turno.nombre_turno] = colors[index % colors.length];
      return acc;
    }, {});
  }, []);

  // Actualizar colores cuando cambian los turnos
  useEffect(() => {
  if (data.horarios.length > 0) {
    const colors = generateTurnColors(data.horarios);
    // Asegurarse de que todos los turnos tengan color
    const allTurnos = [...new Set(data.empleados.map(e => e.turno).filter(Boolean))];
    allTurnos.forEach(turno => {
      if (!colors[turno]) {
        colors[turno] = '#666'; // Color por defecto
      }
    });
    setTurnosColors(colors);
  }
}, [data.horarios, data.empleados, generateTurnColors]);

  // Obtener nombres de turnos únicos para usar en gráficos
  const turnosNombres = useMemo(() => 
    data.horarios.map(h => h.nombre_turno), 
    [data.horarios]
  );

  // Actualizar hora actual
  useEffect(() => {
    const timer = setInterval(() => {
      const now = dayjs();
      setCurrentTime(now);
      
      if (!lastShiftUpdate || now.diff(lastShiftUpdate, 'minute') >= 1) {
        setLastShiftUpdate(now);
      }
    }, 60000);
    
    return () => clearInterval(timer);
  }, [lastShiftUpdate]);

  // Carga de datos inicial
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empleadosRes, licenciasRes, horariosRes, feriadosRes, asignacionesRes, localesRes] = await Promise.all([
          apiService.empleados.getAll(),
          apiService.licencias.getAll(),
          apiService.horarios.getAll(),
          apiService.feriados.getAll(),
          apiService.tablero.getAsignaciones(currentDate),
          apiService.locales.getAll()
        ]);
        
        setData({
          empleados: empleadosRes.data,
          licencias: licenciasRes.data,
          horarios: horariosRes.data,
          locales: localesRes.data
        });
        setFeriados(feriadosRes.data);
        setAsignaciones(asignacionesRes.data || []);
      } catch (error) {
        enqueueSnackbar('Error al cargar los datos', { variant: 'error' });
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [enqueueSnackbar, currentDate]);

  // Verificar si es feriado
  const isFeriado = useCallback((date) => {
    const dateStr = date.format('YYYY-MM-DD');
    return feriados.some(f => {
      const fechaFeriado = dayjs(f.fecha).format('YYYY-MM-DD');
      return fechaFeriado === dateStr || 
             (f.recurrente && dayjs(f.fecha).format('MM-DD') === date.format('MM-DD'));
    });
  }, [feriados]);

  // Función para determinar los turnos activos actuales
      const getCurrentShifts = useCallback(() => {
        const now = currentTime;
        const currentDay = now.day(); // 0=domingo, 1=lunes, ..., 6=sábado
        const isHoliday = isFeriado(now);
        const yesterday = (currentDay - 1 + 7) % 7;
        const yesterdayDate = now.subtract(1, 'day');

        const activeShifts = data.horarios.filter(shift => {
            // Parsear horas
            const [startH, startM] = shift.hora_entrada.split(':').map(Number);
            const [endH, endM] = shift.hora_salida.split(':').map(Number);
            
            // Crear objetos dayjs sin modificar 'now'
            const startTimeToday = now.clone().hour(startH).minute(startM).second(0);
            let endTimeToday = now.clone().hour(endH).minute(endM).second(0);

            // Verificar si hoy es un día válido para este turno
            const isTodayValidDay = shift.dias_semana.includes(currentDay) || 
                                  (shift.aplica_en_feriados && isHoliday);

            // Para turnos nocturnos (que cruzan medianoche)
            if (shift.es_nocturno) {
                // Ajustar fin de turno para el día siguiente si es necesario
                if (endH < startH) {
                    endTimeToday = endTimeToday.add(1, 'day');
                }

                // Verificar si ayer era un día válido para este turno
                const wasYesterdayValidDay = shift.dias_semana.includes(yesterday) || 
                                          (shift.aplica_en_feriados && isFeriado(yesterdayDate));

                // Solo considerar el turno nocturno si:
                // 1. Hoy es día válido Y estamos en la parte del turno que corresponde a hoy
                // O
                // 2. Ayer fue día válido Y estamos en la parte del turno que corresponde a ayer
                
                const isActiveToday = isTodayValidDay && now.isBetween(
                    startTimeToday, 
                    endTimeToday, 
                    null, 
                    '[]'
                );
                
                const isActiveYesterday = wasYesterdayValidDay && now.isBetween(
                    startTimeToday.subtract(1, 'day'), 
                    endTimeToday.subtract(1, 'day'), 
                    null, 
                    '[]'
                );

                return isActiveToday || isActiveYesterday;
            }
            
            // Para turnos normales (no nocturnos)
            return isTodayValidDay && now.isBetween(startTimeToday, endTimeToday, null, '[]');
        }).map(shift => shift.nombre_turno);

        return activeShifts.length > 0 ? activeShifts : null;
    }, [data.horarios, currentTime, isFeriado]);

    
      const isOnDuty = useCallback((empleado) => {
      const now = currentTime;
      const currentDay = now.day(); // 0=domingo, 1=lunes, ..., 6=sábado
      const horario = data.horarios.find(h => h.nombre_turno === empleado.turno);
      
      if (!horario) return false;

      const [entradaH, entradaM] = horario.hora_entrada.split(':').map(Number);
      const [salidaH, salidaM] = horario.hora_salida.split(':').map(Number);
      
      const horaEntrada = now.clone().hour(entradaH).minute(entradaM).second(0);
      let horaSalida = now.clone().hour(salidaH).minute(salidaM).second(0);

      // Para turnos nocturnos (que cruzan medianoche)
      if (horario.es_nocturno) {
        // Ajustar fin de turno para el día siguiente si es necesario
        if (salidaH < entradaH) {
          horaSalida = horaSalida.add(1, 'day');
        }

        // Verificar días válidos considerando que el turno puede comenzar un día y terminar otro
        const yesterday = (currentDay - 1 + 7) % 7;
        const yesterdayDate = now.subtract(1, 'day');
        
        // Determinar si estamos en la parte del turno que corresponde a hoy o a ayer
        const isInTodayPart = now.isBetween(horaEntrada, horaSalida, null, '[]');
        const isInYesterdayPart = now.isBetween(
          horaEntrada.subtract(1, 'day'), 
          horaSalida.subtract(1, 'day'), 
          null, 
          '[]'
        );

        // Verificar días válidos para ambas partes del turno
        const isTodayValidDay = horario.dias_semana.includes(currentDay) || 
                              (horario.aplica_en_feriados && isFeriado(now));
        
        const wasYesterdayValidDay = horario.dias_semana.includes(yesterday) || 
                                  (horario.aplica_en_feriados && isFeriado(yesterdayDate));

        // Caso 1: Estamos en la parte del turno que comenzó hoy
        if (isInTodayPart && isTodayValidDay) {
          return true;
        }
        
        // Caso 2: Estamos en la parte del turno que comenzó ayer
        if (isInYesterdayPart && wasYesterdayValidDay) {
          return true;
        }
        
        return false;
      }

      // Para turnos normales (no nocturnos)
      const isWorkingDay = horario.dias_semana.includes(currentDay);
      const appliesOnHoliday = horario.aplica_en_feriados && isFeriado(now);
      
      return (isWorkingDay || appliesOnHoliday) && 
            now.isBetween(horaEntrada, horaSalida, null, '[]');
    }, [data.horarios, currentTime, isFeriado]);

  // Verificar licencia activa hoy
  const isLicenseActiveToday = useCallback((licencia) => {
    const today = currentTime.format('YYYY-MM-DD');
    return licencia.dias === 1 
      ? licencia.fecha_inicio === today 
      : today >= licencia.fecha_inicio && today <= licencia.fecha_fin;
  }, [currentTime]);

  // Procesamiento de datos
  const currentShifts = useMemo(() => getCurrentShifts() || [], [getCurrentShifts]);
  const currentShiftLabel = useMemo(() => {
    if (currentShifts.length === 0) return 'No activo';
    if (currentShifts.length > 1) return currentShifts.join(' + ');
    return currentShifts[0];
  }, [currentShifts]);
  
  // Fuerza efectiva total
  const totalMilitary = data.empleados.filter(emp => JERARQUIAS_MILITARES.includes(emp.jerarquia)).length;
  const totalCivilian = data.empleados.filter(emp => !JERARQUIAS_MILITARES.includes(emp.jerarquia)).length;
  
  // Datos del turno actual
  const shiftEmployees = useMemo(() => {
    if (currentShifts.length === 0) return [];
    return currentShifts.flatMap(shiftName => 
      data.empleados.filter(emp => emp.turno === shiftName)
    );
  }, [currentShifts, data.empleados]);

  const militaryInShift = shiftEmployees.filter(emp => JERARQUIAS_MILITARES.includes(emp.jerarquia)).length;
  const civilianInShift = shiftEmployees.filter(emp => !JERARQUIAS_MILITARES.includes(emp.jerarquia)).length;

  // Empleados con licencia (todos)
  const allEmployeesWithLicenses = useMemo(() => data.empleados
    .filter(emp => data.licencias.some(lic => lic.empleado_id === emp.id && isLicenseActiveToday(lic)))
    .map(emp => ({
      ...emp,
      license: data.licencias.find(lic => lic.empleado_id === emp.id && isLicenseActiveToday(lic)),
      isCurrentShift: currentShifts.includes(emp.turno)
    })), [data.empleados, data.licencias, isLicenseActiveToday, currentShifts]);

  // Empleados presentes en turno actual
  const presentEmployees = useMemo(() => shiftEmployees
    .filter(emp => !allEmployeesWithLicenses.some(e => e.id === emp.id) && isOnDuty(emp))
    .map(emp => ({
      ...emp,
      isCurrentShift: true
    })), [shiftEmployees, allEmployeesWithLicenses, isOnDuty]);

  // Configuración de gráficos
  const barChartOptions = {
  chart: {
    type: 'bar',
    height: '100%',
    events: commonChartEvents,
    stacked: true
  },
    plotOptions: {
      bar: { horizontal: false, borderRadius: 4 }
    },
    xaxis: {
      categories: ['Total', 'Presentes', 'Ausentes'],
      labels: { 
        style: { fontSize: '12px' },
        formatter: function(value) {
          if (currentShifts.length > 1 && value === 'Total') {
            return `${value} (${currentShifts.join(' + ')})`;
          }
          return value;
        }
      }
    },
    yaxis: {
      title: { text: 'Cantidad de Personal' },
      forceNiceScale: true,
      min: 0
    },
    colors: [COLORS.military, COLORS.civilian],
    legend: { position: 'top' },
    tooltip: {
    ...commonTooltipConfig,
    custom: function({ seriesIndex, dataPointIndex, w }) {
      const categories = ['Total', 'Presentes', 'Ausentes'];
      const seriesName = w.globals.seriesNames[seriesIndex];
      const value = w.globals.series[seriesIndex][dataPointIndex];
      const borderColor = w.config.colors[seriesIndex % w.config.colors.length];
      
      return `
        <div class="custom-tooltip-container" style="border-left-color: ${borderColor}">
          <div class="tooltip-header">${seriesName}</div>
          <div class="tooltip-content">
            <div><strong>Categoría:</strong> ${categories[dataPointIndex]}</div>
            <div><strong>Cantidad:</strong> ${value}</div>
            <div><strong>Porcentaje:</strong> ${((value / w.globals.seriesTotals[dataPointIndex]) * 100).toFixed(1)}%</div>
          </div>
        </div>
      `;
    }
  }
};

  const barChartSeries = [
    {
      name: 'Personal Militar',
      data: [
        militaryInShift,
        presentEmployees.filter(e => JERARQUIAS_MILITARES.includes(e.jerarquia)).length,
        allEmployeesWithLicenses.filter(e => 
          JERARQUIAS_MILITARES.includes(e.jerarquia) && currentShifts.includes(e.turno)).length
      ]
    },
    {
      name: 'Personal Civil',
      data: [
        civilianInShift,
        presentEmployees.filter(e => !JERARQUIAS_MILITARES.includes(e.jerarquia)).length,
        allEmployeesWithLicenses.filter(e => 
          !JERARQUIAS_MILITARES.includes(e.jerarquia) && currentShifts.includes(e.turno)).length
      ]
    }
  ];

  const donutOptions = {
    chart: {
      type: 'donut',
      height: '100%',
      events: commonChartEvents
    },
    labels: turnosNombres,
    colors: turnosNombres.map(turno => turnosColors[turno] || '#666'),
    legend: {
      position: 'bottom',
      formatter: function(seriesName, opts) {
        return `${seriesName}: ${opts.w.globals.series[opts.seriesIndex]}`;
      }
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              color: '#333',
              formatter: () => data.empleados.length.toString()
            }
          }
        }
      }
    },
    tooltip: {
  ...commonTooltipConfig,
  custom: function({ seriesIndex, w }) {
    const turnoNombre = w.globals.labels[seriesIndex];
    const turno = data.horarios.find(h => h.nombre_turno === turnoNombre);
    const empleados = data.empleados.filter(e => e.turno === turnoNombre);
    const militares = empleados.filter(e => JERARQUIAS_MILITARES.includes(e.jerarquia)).length;
    const borderColor = w.config.colors[seriesIndex % w.config.colors.length];
    
    return `
      <div class="custom-tooltip-container" style="border-left-color: ${borderColor}">
          <div class="tooltip-header">${turnoNombre}</div>
          <div class="tooltip-content">
            <div><strong>Horario:</strong> ${turno?.hora_entrada || '--:--'} a ${turno?.hora_salida || '--:--'}</div>
            <div><strong>Días:</strong> ${turno?.dias_semana?.map(d => DAYS.find(day => day.value === d)?.label).join(', ') || 'No definidos'}</div>
            <div class="tooltip-divider"></div>
            <div><strong>Total personal:</strong> ${empleados.length}</div>
            <div><strong>Militares:</strong> ${militares}</div>
            <div><strong>Civiles:</strong> ${empleados.length - militares}</div>
          </div>
        </div>
      `;
    }
  }
};

  const donutSeries = useMemo(() => 
    turnosNombres.map(t => 
      data.empleados.filter(e => e.turno === t).length
    ), 
    [turnosNombres, data.empleados]
  );

const totalEmployees = data.empleados.length;
const employeesInCurrentShift = shiftEmployees.length;
const licensesInCurrentShift = allEmployeesWithLicenses.filter(e => currentShifts.includes(e.turno)).length;
const presentInCurrentShift = presentEmployees.length;
const employeesInRest = totalEmployees - employeesInCurrentShift;
const licensesInOtherShifts = allEmployeesWithLicenses.filter(e => !currentShifts.includes(e.turno)).length;
const employeesActuallyInRest = employeesInRest - licensesInOtherShifts;

// Actualizar las opciones del gráfico de estado
const statusOptions = {
  chart: { type: 'donut', height: 350 },
  labels: ['Presentes', 'Licencias (turno actual)', 'Descanso', 'Licencias (otros turnos)'],
  colors: [COLORS.present, COLORS.absent, COLORS.rest, '#9e9e9e'],
  legend: { position: 'bottom' },
 tooltip: {
  ...commonTooltipConfig,
  custom: function({ seriesIndex, w }) {
    const labels = w.config.labels;
    const values = w.config.series;
    const colors = w.config.colors;
    const borderColor = colors[seriesIndex];
    
    return `
      <div class="custom-tooltip-container" style="border-left-color: ${borderColor}">
          <div class="tooltip-header">${labels[seriesIndex]}</div>
          <div class="tooltip-content">
            <div><strong>Cantidad:</strong> ${values[seriesIndex]}</div>
            <div><strong>Porcentaje:</strong> ${Math.round((values[seriesIndex]/totalEmployees)*100)}%</div>
            <div class="tooltip-divider"></div>
            <div><strong>Total Fuerza Efectiva:</strong> ${totalEmployees}</div>
          </div>
        </div>
      `;
    }
  }
};

const statusSeries = [
  presentInCurrentShift,
  licensesInCurrentShift,
  employeesActuallyInRest,
  licensesInOtherShifts
];

  // Procesar datos de distribución de tareas
  const processTasksDistribution = () => {
  const tasks = {};
  
  // Inicializar todas las tareas posibles
  ALL_POSSIBLE_TASKS.forEach(task => {
    tasks[task] = {
      present: 0,
      absent: 0,
      presentEmployees: [],
      absentEmployees: []
    };
  });

  // Contar empleados por tarea (presentes y ausentes)
  shiftEmployees.forEach(emp => {
    if (emp.tarea) {
      const isAbsent = allEmployeesWithLicenses.some(e => e.id === emp.id);
      const asignacion = asignaciones.find(a => 
        a.empleado_id === emp.id && 
        dayjs(a.fecha).isSame(currentTime, 'day')
      );
      const local = asignacion ? data.locales.find(l => l.id === asignacion.local_id) : null;
      
      if (isAbsent) {
        tasks[emp.tarea].absent += 1;
        tasks[emp.tarea].absentEmployees.push({
          ...emp,
          servicio: local?.nombre || 'No asignado'
        });
      } else {
        tasks[emp.tarea].present += 1;
        tasks[emp.tarea].presentEmployees.push({
          ...emp,
          servicio: local?.nombre || 'No asignado'
        });
      }
    }
  });

  return Object.entries(tasks)
    .sort((a, b) => (b[1].present + b[1].absent) - (a[1].present + a[1].absent))
    .map(([tarea, counts]) => ({ 
      tarea, 
      present: counts.present, 
      absent: counts.absent,
      total: counts.present + counts.absent,
      presentEmployees: counts.presentEmployees,
      absentEmployees: counts.absentEmployees
    }));
};

  const tasksDistributionData = processTasksDistribution();

  const tasksDistributionOptions = {
  chart: {
    type: 'bar',
    height: 500,
    stacked: true,
    toolbar: { show: false },
    events: {
      mouseMove: function(e, chartContext, config) {
        if (config.dataPointIndex !== undefined) {
          // Mostrar tooltip usando la API pública
          const tooltip = document.querySelector('.apexcharts-tooltip');
          if (tooltip) {
            tooltip.style.opacity = 1;
            tooltip.style.visibility = 'visible';
          }
        }
      },
      mouseLeave: function() {
        // Ocultar tooltip al salir
        const tooltip = document.querySelector('.apexcharts-tooltip');
        if (tooltip) {
          tooltip.style.opacity = 0;
          tooltip.style.visibility = 'hidden';
        }
      }
    }
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 4,
      barHeight: '80%'
    }
  },
  colors: [COLORS.present, COLORS.absent],
  dataLabels: {
    enabled: true,
    formatter: function(val) {
      return val > 0 ? val : '';
    },
    style: {
      fontSize: '12px',
      colors: ["#333"]
    }
  },
  xaxis: {
    categories: tasksDistributionData.map(t => t.tarea),
    title: { text: 'Cantidad de Personal' }
  },
  yaxis: {
    title: { text: 'Tareas Asignadas' }
  },
  tooltip: {
    ...commonTooltipConfig,
    custom: function({ seriesIndex, dataPointIndex, w }) {
      // Tu contenido personalizado del tooltip
      const data = tasksDistributionData[dataPointIndex];
      const isPresent = seriesIndex === 0;
      const employees = isPresent ? data.presentEmployees : data.absentEmployees;
      const color = isPresent ? COLORS.present : COLORS.absent;
      
      return `
        <div class="custom-tooltip-container" style="border-left-color: ${color}">
        <div class="tooltip-header">${data.tarea} - ${isPresent ? 'Presentes' : 'Ausentes'} (${employees.length})</div>
        <div class="tooltip-content">
          ${employees.length > 0 ? 
            employees.map(emp => `
              <div class="employee-item">
                <div class="employee-name">${emp.jerarquia} ${emp.apellido}, ${emp.nombre}</div>
                ${isPresent ? `
                  <div class="employee-detail ${emp.servicio ? 'has-assignment' : 'no-assignment'}">
                    ${emp.servicio || 'No asignado'}
                  </div>
                ` : ''}
              </div>
            `).join('') 
            : `
            <div class="employee-item">
              No hay empleados ${isPresent ? 'presentes' : 'ausentes'}
            </div>
          `}
        </div>
      </div>
      `;
    },
    fixed: {
      enabled: true,
      position: 'topRight'
    },
    intersect: true,
    shared: false
  }
};

  const tasksDistributionSeries = [
    {
      name: 'Presentes',
      data: tasksDistributionData.map(t => t.present)
    },
    {
      name: 'Ausentes',
      data: tasksDistributionData.map(t => t.absent)
    }
  ];

  // Procesar datos para gráfico temporal de licencias
  const processLicenseTrends = () => {
    const trends = {};
    const last30Days = Array.from({ length: 30 }, (_, i) => 
      dayjs().subtract(i, 'day').format('YYYY-MM-DD'));
    
    // Inicializar estructura
    data.licencias.forEach(lic => {
      if (!trends[lic.motivo]) {
        trends[lic.motivo] = {
          name: lic.motivo || 'Sin especificar',
          data: new Array(30).fill(0)
        };
      }
    });

    // Contar licencias por día y motivo
    last30Days.forEach((date, index) => {
      data.licencias.forEach(lic => {
        if (dayjs(date).isBetween(lic.fecha_inicio, lic.fecha_fin, null, '[]')) {
          trends[lic.motivo].data[29 - index] += 1; // Invertir el orden
        }
      });
    });

    return {
      series: Object.values(trends),
      categories: last30Days.map(d => dayjs(d).format('DD/MM')).reverse()
    };
  };

  const licenseTrends = processLicenseTrends();

  const licenseTrendsOptions = {
    chart: {
      type: 'area',
      height: 350,
      stacked: true,
      toolbar: { show: false },
      zoom: { enabled: true }
    },
    colors: ['#3f51b5', '#ff5722', '#4caf50', '#ffc107', '#9c27b0', '#607d8b'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.8 } },
    xaxis: {
      type: 'category',
      categories: licenseTrends.categories,
      labels: { rotate: -45 }
    },
    yaxis: { title: { text: 'Licencias activas' } },
    tooltip: {
      y: { formatter: (val) => `${val} licencia${val !== 1 ? 's' : ''} activa${val !== 1 ? 's' : ''}` }
    },
    legend: { position: 'top' }
  };

  // Procesar datos de asignaciones
  const processAsignacionesData = () => {
    if (!asignaciones.length || !data.empleados.length || !data.locales.length) return [];

    // Filtrar asignaciones del turno actual
    const currentShiftNames = currentShifts;
    const currentShiftIds = data.horarios
      .filter(h => currentShiftNames.includes(h.nombre_turno))
      .map(h => h.id);

    const asignacionesTurnoActual = asignaciones.filter(a => 
      currentShiftIds.includes(a.horario_turno_id) &&
      dayjs(a.fecha).isSame(currentTime, 'day')
    );

    // Agrupar por servicio y tarea
    const groupedData = asignacionesTurnoActual.reduce((acc, asignacion) => {
      const local = data.locales.find(l => l.id === asignacion.local_id);
      const empleado = data.empleados.find(e => e.id === asignacion.empleado_id);
      
      if (!local || !empleado) return acc;

      const key = `${local.nombre}|${asignacion.tarea_asociada_nombre}`;
      
      if (!acc[key]) {
        acc[key] = {
          servicio: local.nombre,
          tarea: asignacion.tarea_asociada_nombre,
          empleados: []
        };
      }

      acc[key].empleados.push({
        nombre: `${empleado.jerarquia || ''} ${empleado.apellido}`,
        id: empleado.id
      });

      return acc;
    }, {});

    return Object.values(groupedData);
  };

  const asignacionesChartData = processAsignacionesData();
  const asignacionesSeries = [{
  name: 'Asignaciones',
  data: asignacionesChartData.map(item => ({
    x: `${item.servicio || ''} - ${item.tarea || ''}`.trim(),
    y: (item.empleados || []).length,
    servicio: item.servicio,
    tarea: item.tarea,
    empleados: item.empleados || [] // Garantizar que siempre sea un array
  }))
}];

  const asignacionesOptions = {
  chart: {
    type: 'bar',
    height: '100%',
    toolbar: { show: false },
    events: commonChartEvents,
  },
  colors: ['#3f51b5'],
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 4,
      barHeight: '80%',
      dataLabels: {
        position: 'center'
      }
    }
  },
  dataLabels: {
    enabled: true,
    formatter: function(val) {
      return val > 0 ? val : '';
    },
    style: {
      fontSize: '12px',
      colors: ['#fff']
    }
  },
  xaxis: {
    title: { text: 'Cantidad de Asignaciones', style: { fontSize: '12px' } },
    labels: {
      style: {
        fontSize: '12px'
      }
    }
  },
  yaxis: {
    title: { text: 'Servicios y Tareas', style: { fontSize: '12px' } },
    labels: {
      style: {
        fontSize: '12px'
      },
      maxWidth: 325
    }
  },
  tooltip: {
  ...commonTooltipConfig,
  custom: function({ dataPointIndex, w }) {
    try {
      const series = Array.isArray(w.config.series) ? w.config.series : [];
      const firstSeries = series[0] || {};
      const seriesData = Array.isArray(firstSeries.data) ? firstSeries.data : [];
      const dataPoint = seriesData[dataPointIndex] || {};
      
      const servicio = dataPoint.servicio || 'Servicio no especificado';
      const tarea = dataPoint.tarea || 'No especificada';
      const empleados = Array.isArray(dataPoint.empleados) ? dataPoint.empleados : [];
      // Usa el color de la configuración del gráfico
      const borderColor = w.config.colors[0] || '#3f51b5'; // Color por defecto si no hay configurado

      // Construir lista de empleados
      let empleadosHTML = '<div class="no-employees">No hay personal asignado</div>';
      if (empleados.length > 0) {
        empleadosHTML = `
          <div class="employee-list">
            ${empleados.map(e => `
              <div class="employee-item">
                ${e.nombre || 'Sin nombre'}${e.jerarquia ? ` <span class="employee-rank">(${e.jerarquia})</span>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      }

      return `
        <div class="custom-tooltip-container" style="border-left-color: ${borderColor}">
          <div class="tooltip-header">${servicio}</div>
          <div class="tooltip-content">
          ${empleadosHTML}
          <div class="tooltip-row"><span class="tooltip-label">Tarea:</span> <span class="tooltip-value">${tarea}</span></div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error en tooltip:', error);
      return '<div class="custom-tooltip-container">Error al cargar información</div>';
    }
  }
},
  responsive: [{
    breakpoint: 768,
    options: {
      tooltip: {
        fixed: {
          enabled: false
        },
        style: {
          fontSize: '12px'
        }
      }
    }
  }]
};

  const titleStyle = {
    fontWeight: 600,
    fontSize: '1rem',
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    lineHeight: 1.5,
    letterSpacing: '0.00938em',
    color: '#344767'
  };

  const responsiveMaxWidth = {
    md: '1037px',
    lg: '1271px',
    xl: '1400px'
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando parte...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      py: 0, 
      px: 0,
      width: '100%',
      maxWidth: '100%'
    }}>
      {/* Encabezado */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 5,
        width: '100%'
      }}>
        <Typography variant="h6" component="h6" noWrap sx={titleStyle}>
          Turno {currentShiftLabel}
        </Typography>
        <Clock />
      </Box>

      {/* Grid container para las tarjetas */}
      <Grid container sx={{
        flexWrap: 'wrap', 
        overflow: 'visible',
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        mt: -3,
        ml: -3,
        justifyContent: 'center'
      }}>
        {/* Fuerza efectiva total */}
        <Grid sx={{
          minWidth: '230px',
          flex: 1,
          pt:3,
          pl:3,
          pb:1
        }}>
          <Box sx={{ height: '100%' }}>
            <StatisticsCard
              color="dark"
              icon={<Groups2Icon fontSize="medium" />}
              title="Fuerza Efectiva"
              count={data.empleados.length}
              percentage={[
                {
                  color: "success",
                  amount: `${totalMilitary}`,
                  label: "militares"
                },
                {
                  color: "success",
                  amount: `${totalCivilian}`,
                  label: "civiles"
                }
              ]}
              titleStyle={titleStyle}
            />
          </Box>
        </Grid>

        {/* Fuerza efectiva del turno */}
        <Grid sx={{
          minWidth: '230px',
          flex: 1,
          pt: 3,
          pl:3,
          pb:1
        }}>
          <Box sx={{ height: '100%' }}>
            <StatisticsCard
              color="primario"
              icon={<GroupWorkIcon fontSize="medium" />}
              title={`Turno ${currentShiftLabel}`}
              count={shiftEmployees.length}
              percentage={[
                {
                  color: "success",
                  amount: `${militaryInShift}`,
                  label: "militares"
                },
                {
                  color: "success",
                  amount: `${civilianInShift}`,
                  label: "civiles"
                }
              ]}
              titleStyle={titleStyle}
            />
          </Box>
        </Grid>

        {/* Presentes */}
        <Grid sx={{
          minWidth: '230px',
          flex: 1,
          pt:3,
          pl:3,
          pb:1
        }}>
          <Box sx={{ height: '100%' }}>
            <StatisticsCard
              color="success"
              icon={<HowToRegIcon fontSize="medium" />}
              title="Presentes"
              count={presentEmployees.length}
              percentage={{
                color: "success",
                amount: shiftEmployees.length > 0 ? 
                  `${Math.round((presentEmployees.length / shiftEmployees.length) * 100)}%` : "0%",
                label: "del turno"
              }}
              titleStyle={titleStyle}
            />
          </Box>
        </Grid>

        {/* Ausentes */}
        <Grid sx={{
          minWidth: '230px',
          flex: 1,
          pt: 3,
          pl:3,
          pb:1
        }}>
          <Box sx={{ height: '100%' }}>
            <StatisticsCard
              color="error"
              icon={<GroupRemoveIcon fontSize="medium" />}
              title="Ausentes"
              count={allEmployeesWithLicenses.filter(e => currentShifts.includes(e.turno)).length}
              percentage={{
                color: "success",
                amount: shiftEmployees.length > 0 ? 
                  `${Math.round((allEmployeesWithLicenses.filter(e => currentShifts.includes(e.turno)).length / 
                  shiftEmployees.length) * 100)}%` : "0%",
                label: "del turno"
              }}
              titleStyle={titleStyle}
            />
          </Box>
        </Grid>
      </Grid>   

      {/* Sección de Personal */}
      <Box sx={{ 
        width: '100%',
        maxWidth: responsiveMaxWidth,
        mt: 3,
        mx: 'auto'
      }}>
        <Grid container sx={{
          mt: -3,
          ml: -3,
          flexWrap: { xs: 'wrap', md: 'wrap' },
          overflow: 'visible',
          '&::-webkit-scrollbar': {
            display: 'none'
          },
          justifyContent: 'center'
        }}>
          {/* Card 1: Personal Presente */}
          <Grid sx={{
            minWidth: { xs: '100%', md: '500px' },
            flex: 1,
            pt: 3,
            pl: 3,
            mb: 3
          }}>
            <Paper elevation={3} sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '12px',
              overflow: 'visible'
            }}>
              <Card sx={{ 
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                p: 2,
                borderRadius: 'inherit'
              }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                  position: 'relative'
                }}>
                  <Box>
                    <Typography variant="h6" component="h6" noWrap sx={titleStyle}>
                      Personal Presente
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      <Box component="span" sx={{ color: COLORS.present }}>■</Box> Turno actual ({currentShiftLabel})
                    </Typography>
                  </Box>
                  
                  <Box sx={{ 
                    width: 100, 
                    height: 100,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Box sx={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%'
                    }}>
                      <ApexChart
                        options={{
                          chart: {
                            type: 'radialBar',
                            sparkline: {
                              enabled: true
                            },
                            height: '100%'
                          },
                          plotOptions: {
                            radialBar: {
                              startAngle: -90,
                              endAngle: 90,
                              hollow: {
                                margin: 0,
                                size: '70%'
                              },
                              dataLabels: {
                                name: {
                                  show: false
                                },
                                value: {
                                  offsetY: 0,
                                  fontSize: '22px',
                                  fontWeight: 'bold',
                                  formatter: (val) => `${val}%`,
                                  color: COLORS.present
                                }
                              },
                              track: {
                                background: '#f5f5f5',
                                strokeWidth: '100%',
                                margin: 0
                              }
                            }
                          },
                          stroke: {
                            lineCap: 'round'
                          },
                          colors: [COLORS.present],
                          fill: {
                            type: 'gradient',
                            gradient: {
                              shade: 'light',
                              shadeIntensity: 0.1,
                              inverseColors: false,
                              opacityFrom: 1,
                              opacityTo: 1,
                              stops: [0, 100]
                            }
                          }
                        }}
                        series={[shiftEmployees.length > 0 
                          ? Math.round((presentEmployees.length / shiftEmployees.length) * 100) 
                          : 0]}
                        type="radialBar"
                        height={100}
                        width={100}
                      />
                    </Box>
                  </Box>
                </Box>
            
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  {/* Sección Militar */}
                  <Box>
                    <Typography variant="h6" component="h6" noWrap sx={titleStyle}>
                      Militar ({presentEmployees.filter(e => JERARQUIAS_MILITARES.includes(e.jerarquia)).length})
                    </Typography>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 1,
                      minHeight: 24,
                      maxHeight: '300px',
                      overflowY: 'auto',
                      pr: 1,
                      '&::-webkit-scrollbar': {
                        width: '4px'
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: '#bdbdbd',
                        borderRadius: '2px'
                      }
                    }}>
                      {presentEmployees
                        .filter(emp => JERARQUIAS_MILITARES.includes(emp.jerarquia))
                        .map(emp => (
                          // Ejemplo para Personal Presente - Militar
                          <MuiTooltip
                            componentsProps={{
                              tooltip: {
                                sx: {
                                  backgroundColor: 'rgba(30, 30, 30, 0.95)',
                                  color: '#ffffff',
                                  padding: '12px 16px',
                                  borderRadius: '6px',
                                  borderLeft: `4px solid ${COLORS.present}`,
                                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                                  maxWidth: '320px'
                                }
                              }
                            }}
                            key={emp.id}
                            title={
                              <Box className="custom-tooltip-container">
                                <div className="tooltip-header">
                                  {emp.jerarquia} {emp.nombre} {emp.apellido}
                                </div>
                                <div className="tooltip-content">
                                  <div><strong>Turno:</strong> {emp.turno}</div>
                                  <div><strong>Horario:</strong> {
                                    data.horarios.find(h => h.nombre_turno === emp.turno)?.hora_entrada || '--:--'
                                  } a {
                                    data.horarios.find(h => h.nombre_turno === emp.turno)?.hora_salida || '--:--'
                                  }</div>
                                  <div><strong>Tarea:</strong> {emp.tarea || 'No especificada'}</div>
                                </div>
                              </Box>
                            }
                          >
                            <Chip
                              label={`${emp.jerarquia} ${emp.apellido}`}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                cursor: 'pointer',
                                borderColor: COLORS.present,
                                color: COLORS.present,
                                '&:hover': { opacity: 0.9 }
                              }}
                            />
                          </MuiTooltip>
                        ))}
                    </Box>
                  </Box>

                  <Divider 
                    sx={{ 
                      borderColor: '#e0e0e0',
                      borderWidth: 1,
                      my: 1,
                      width: '100%'
                    }} 
                  />

                  {/* Sección Civil */}
                  <Box>
                    <Typography variant="h6" component="h6" noWrap sx={titleStyle}>
                      Civil ({presentEmployees.filter(e => !JERARQUIAS_MILITARES.includes(e.jerarquia)).length})
                    </Typography>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 1,
                      minHeight: 24,
                      maxHeight: '300px',
                      overflowY: 'auto',
                      pr: 1,
                      '&::-webkit-scrollbar': {
                        width: '4px'
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: '#bdbdbd',
                        borderRadius: '2px'
                      }
                    }}>
                      {presentEmployees
                        .filter(emp => !JERARQUIAS_MILITARES.includes(emp.jerarquia))
                        .map(emp => (
                          <MuiTooltip
                            componentsProps={{
                              tooltip: {
                                sx: {
                                  backgroundColor: 'rgba(30, 30, 30, 0.95)',
                                  color: '#ffffff',
                                  padding: '12px 16px',
                                  borderRadius: '6px',
                                  borderLeft: `4px solid ${COLORS.present}`,
                                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                                  maxWidth: '320px'
                                }
                              }
                            }}
                            key={emp.id}
                            title={
                              <Box className="custom-tooltip-container">
                                <div className="tooltip-header">
                                  {emp.jerarquia} {emp.nombre} {emp.apellido}
                                </div>
                                <div className="tooltip-content">
                                  <div><strong>Turno:</strong> {emp.turno}</div>
                                  <div><strong>Horario:</strong> {
                                    data.horarios.find(h => h.nombre_turno === emp.turno)?.hora_entrada || '--:--'
                                  } a {
                                    data.horarios.find(h => h.nombre_turno === emp.turno)?.hora_salida || '--:--'
                                  }</div>
                                  <div><strong>Tarea:</strong> {emp.tarea || 'No especificada'}</div>
                                  {emp.servicio && (
                                    <div><strong>Servicio:</strong> {emp.servicio}</div>
                                  )}
                                </div>
                              </Box>
                            }
                          >
                            <Chip
                              label={`${emp.jerarquia} ${emp.apellido}`}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                cursor: 'pointer',
                                borderColor: COLORS.present,
                                color: COLORS.present,
                                '&:hover': { opacity: 0.9 }
                              }}
                            />
                          </MuiTooltip>
                        ))}
                    </Box>
                  </Box>
                </Box>
              </Card>
            </Paper>
          </Grid>

          {/* Card 2: Personal con Licencia */}
          <Grid sx={{
            minWidth: { xs: '100%', md: '500px' },
            flex: 1,
            pt: 3,
            pl: 3,
            mb: 3
          }}>
            <Paper elevation={3} sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '12px',
              overflow: 'visible'
            }}>
              <Card sx={{ 
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                p: 2,
                borderRadius: 'inherit'
              }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                  position: 'relative'
                }}>
                  <Box>
                    <Typography variant="h6" component="h6" noWrap sx={titleStyle}>
                      Personal con Licencia (Ausencia Laboral)
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                      <Box component="span" sx={{ color: COLORS.absent }}>■</Box> Turno actual ({currentShiftLabel}) • 
                      <Box component="span" sx={{ color: COLORS.otherShift }}> ■</Box> Otros turnos
                    </Typography>
                  </Box>
                  
                  <Box sx={{ 
                    width: 100, 
                    height: 100,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Box sx={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%'
                    }}>
                      <ApexChart
                        options={{
                          chart: {
                            type: 'radialBar',
                            sparkline: {
                              enabled: true
                            },
                            height: '100%'
                          },
                          plotOptions: {
                            radialBar: {
                              startAngle: -90,
                              endAngle: 90,
                              hollow: {
                                margin: 0,
                                size: '70%'
                              },
                              dataLabels: {
                                name: {
                                  show: false
                                },
                                value: {
                                  offsetY: 0,
                                  fontSize: '22px',
                                  fontWeight: 'bold',
                                  formatter: (val) => `${val}%`,
                                  color: COLORS.absent
                                }
                              },
                              track: {
                                background: '#f5f5f5',
                                strokeWidth: '100%',
                                margin: 0
                              }
                            }
                          },
                          stroke: {
                            lineCap: 'round'
                          },
                          colors: [COLORS.absent],
                          fill: {
                            type: 'gradient',
                            gradient: {
                              shade: 'light',
                              shadeIntensity: 0.1,
                              inverseColors: false,
                              opacityFrom: 1,
                              opacityTo: 1,
                              stops: [0, 100]
                            }
                          }
                        }}
                        series={[
                          shiftEmployees.length > 0 
                            ? Math.round(
                                (allEmployeesWithLicenses.filter(e => 
                                  currentShifts.includes(e.turno)).length / 
                                shiftEmployees.length) * 100
                              ) 
                            : 0
                        ]}
                        type="radialBar"
                        height={100}
                        width={100}
                      />
                    </Box>
                  </Box>
                </Box>
              
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  {/* Sección Militar */}
                  <Box>
                    <Typography variant="h6" component="h6" noWrap sx={titleStyle}>
                      Militar ({allEmployeesWithLicenses.filter(e => JERARQUIAS_MILITARES.includes(e.jerarquia)).length})
                    </Typography>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 1,
                      minHeight: 24,
                      maxHeight: '300px',
                      overflowY: 'auto',
                      pr: 1,
                      '&::-webkit-scrollbar': {
                        width: '4px'
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: '#bdbdbd',
                        borderRadius: '2px'
                      }
                    }}>
                      {allEmployeesWithLicenses
                        .filter(emp => JERARQUIAS_MILITARES.includes(emp.jerarquia))
                        .map(emp => (
                          <MuiTooltip
                          componentsProps={{
                            tooltip: {
                              sx: {
                                backgroundColor: 'rgba(30, 30, 30, 0.95)',
                                color: '#ffffff',
                                padding: '12px 16px',
                                borderRadius: '6px',
                                borderLeft: `4px solid ${currentShifts.includes(emp.turno) ? COLORS.absent : COLORS.otherShift}`,
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                                maxWidth: '320px'
                              }
                            }
                          }}
                          key={emp.id}
                          title={
                            <Box className="custom-tooltip-container">
                              <div className="tooltip-header">
                                {emp.jerarquia} {emp.nombre} {emp.apellido}
                              </div>
                              <div className="tooltip-content">
                                <div><strong>Turno:</strong> {emp.turno}</div>
                                <div><strong>Licencia:</strong> {emp.license.motivo} ({emp.license.dias} día{emp.license.dias !== 1 ? 's' : ''})</div>
                                <div><strong>Período:</strong> {dayjs(emp.license.fecha_inicio).format('DD/MM/YYYY')}
                                  {emp.license.dias > 1 && ` al ${dayjs(emp.license.fecha_fin).format('DD/MM/YYYY')}`}
                                </div>
                              </div>
                            </Box>
                          }
                        >
                          <Chip
                            label={`${emp.jerarquia} ${emp.apellido}`}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              cursor: 'pointer',
                              borderColor: currentShifts.includes(emp.turno) ? COLORS.absent : COLORS.otherShift,
                              color: currentShifts.includes(emp.turno) ? COLORS.absent : COLORS.otherShift,
                              '&:hover': { opacity: 0.9 }
                            }}
                          />
                        </MuiTooltip>
                        ))}
                    </Box>
                  </Box>

                  <Divider 
                    sx={{ 
                      borderColor: '#e0e0e0',
                      borderWidth: 1,
                      my: 1,
                      width: '100%'
                    }} 
                  />

                  {/* Sección Civil */}
                  <Box>
                    <Typography variant="h6" component="h6" noWrap sx={titleStyle}>
                      Civil ({allEmployeesWithLicenses.filter(e => !JERARQUIAS_MILITARES.includes(e.jerarquia)).length})
                    </Typography>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 1,
                      minHeight: 24,
                      maxHeight: '300px',
                      overflowY: 'auto',
                      pr: 1,
                      '&::-webkit-scrollbar': {
                        width: '4px'
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: '#bdbdbd',
                        borderRadius: '2px'
                      }
                    }}>
                      {allEmployeesWithLicenses
                        .filter(emp => !JERARQUIAS_MILITARES.includes(emp.jerarquia))
                        .map(emp => (
                          <MuiTooltip
                          componentsProps={{
                            tooltip: {
                              sx: {
                                backgroundColor: 'rgba(30, 30, 30, 0.95)',
                                color: '#ffffff',
                                padding: '12px 16px',
                                borderRadius: '6px',
                                borderLeft: `4px solid ${currentShifts.includes(emp.turno) ? COLORS.absent : COLORS.otherShift}`,
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                                maxWidth: '320px'
                              }
                            }
                          }}
                          key={emp.id}
                          title={
                            <Box className="custom-tooltip-container">
                              <div className="tooltip-header">
                                {emp.jerarquia} {emp.nombre} {emp.apellido}
                              </div>
                              <div className="tooltip-content">
                                <div><strong>Turno:</strong> {emp.turno}</div>
                                <div><strong>Licencia:</strong> {emp.license.motivo} ({emp.license.dias} día{emp.license.dias !== 1 ? 's' : ''})</div>
                                <div><strong>Período:</strong> {dayjs(emp.license.fecha_inicio).format('DD/MM/YYYY')}
                                  {emp.license.dias > 1 && ` al ${dayjs(emp.license.fecha_fin).format('DD/MM/YYYY')}`}
                                </div>
                                <div><strong>Tipo:</strong> {currentShifts.includes(emp.turno) ? 'Turno actual' : 'Otro turno'}</div>
                              </div>
                            </Box>
                          }
                        >
                          <Chip
                            label={`${emp.jerarquia} ${emp.apellido}`}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              cursor: 'pointer',
                              borderColor: currentShifts.includes(emp.turno) ? COLORS.absent : COLORS.otherShift,
                              color: currentShifts.includes(emp.turno) ? COLORS.absent : COLORS.otherShift,
                              '&:hover': { opacity: 0.9 }
                            }}
                          />
                        </MuiTooltip>
                        ))}
                    </Box>
                  </Box>
                </Box>
              </Card>
            </Paper>
          </Grid>
        </Grid>
      </Box>   
  
      <Suspense fallback={<CircularProgress />}>
        {/* Primer grupo - 2 gráficos */}
        <Box sx={{ 
          width: '100%',
          mt: 2,
          maxWidth: responsiveMaxWidth,
          mx: 'auto',
          overflow: 'visible',
        }}>
          <Grid container sx={{
            mt: -3,
            ml: -3,
            flexWrap: { xs: 'wrap', md: 'wrap' },
            overflow: 'visible',
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            justifyContent: 'center'
          }}>
            {/* Gráfico 1 - Distribución de Tareas Asignadas */}
            <Grid sx={{
              minWidth: { xs: '100%', md: '500px' },
              flex: 1,
              pt: 3,
              pl: 3,
              mb: 3
            }}>
              <Box sx={{
                height: '100%',
                '& > .MuiPaper-root': {
                  overflow: 'visible'
                }
              }}>
                <Paper elevation={3} sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '12px',
                  overflow: 'visible',
                  '& .MuiCard-root': {
                    overflow: 'visible'
                  }
                }}>
                  <Card sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    p: 2,
                    borderRadius: 'inherit',
                    overflow: 'visible'
                  }}>
                    <Typography variant="h6" component="h6" noWrap sx={titleStyle}>
                      Tareas Asignadas - Turno {currentShiftLabel}
                    </Typography>
                    <Box id="tasks-chart-container" sx={{ 
                      flex: 1,
                      minHeight: 500,
                      width: '100%',
                      position: 'relative'
                    }}>
                      <ApexChart
                        options={tasksDistributionOptions}
                        series={tasksDistributionSeries}
                        type="bar"
                        height="100%"
                        width="100%"
                      />
                    </Box>
                  </Card>
                </Paper>
              </Box>
            </Grid>

            {/* Gráfico 2 - Asignaciones de Personal */}
            <Grid sx={{
              minWidth: { xs: '100%', md: '500px' },
              flex: 1,
              pt: 3,
              pl: 3,
              mb: 3
            }}>
              <Box sx={{
                height: '100%',
                '& > .MuiPaper-root': {
                  overflow: 'visible'
                }
              }}>
                <Paper elevation={3} sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '12px',
                  overflow: 'visible',
                  '& .MuiCard-root': {
                    overflow: 'visible'
                  }
                }}>
                  <Card sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    p: 2,
                    borderRadius: 'inherit'
                  }}>
                    <Typography variant="h6" component="h6" noWrap sx={titleStyle}>
                      Asignaciones en Servicios - Turno {currentShiftLabel}
                    </Typography>
                    {asignacionesChartData.length > 0 ? (
                      <Box id="assignments-chart-container" sx={{ 
                        flex: 1,
                        minHeight: 500,
                        width: '100%',
                        position: 'relative'
                      }}>
                        <ApexChart
                          options={{
                            ...asignacionesOptions,
                            xaxis: {
                              ...asignacionesOptions.xaxis,
                              categories: asignacionesChartData.map(item => `${item.servicio} - ${item.tarea}`)
                            }
                          }}
                          series={asignacionesSeries}
                          type="bar"
                          height="100%"
                          width="100%"
                        />
                      </Box>
                    ) : (
                      <Box sx={{ 
                        height: 500, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Typography color="text.secondary">
                          No hay asignaciones para el turno actual
                        </Typography>
                      </Box>
                    )}
                  </Card>
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Segundo grupo - 3 gráficos en una fila */}
        <Box sx={{ 
          width: '100%',
          mt: 2,
          maxWidth: responsiveMaxWidth,
          mx: 'auto'
        }}>
          <Grid container sx={{
            mt: -3,
            ml: -3,
            flexWrap: { xs: 'wrap', md: 'wrap' },
            overflow: 'visible',
            '&::-webkit-scrollbar': { display: 'none' },
            justifyContent: 'center'
          }}>
            {/* Gráfico 1 - Distribución General por Turnos */}
            <Grid sx={{
              minWidth: { xs: '100%', md: '320px' },
              flex: 1,
              pt: 3,
              pl: 3,
              mb: 3
            }}>
              <Paper elevation={3} sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '12px',
                mx: 0,
                overflow: 'visible'
              }}>
                <Card sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  p: 0,
                  borderRadius: 'inherit',
                  overflow: 'visible'
                }}>
                  <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                    <Typography variant="h6" component="h6" noWrap sx={titleStyle}>
                      Distribución General por Turnos
                    </Typography>
                  </Box>
                  <Box id="shifts-distribution-container" sx={{ 
                    flex: 1,
                    minHeight: 300,
                    width: '100%',
                    position: 'relative',
                    px: 0,
                    pb: 2
                  }}>
                    {Object.keys(turnosColors).length > 0 && (
                      <ApexChart
                        options={donutOptions}
                        series={donutSeries}
                        type="donut"
                        height="100%"
                        width="100%"
                      />
                    )}
                  </Box>
                </Card>
              </Paper>
            </Grid>  

            {/* Gráfico 2 - Distribución Turno */}
            <Grid sx={{
              minWidth: { xs: '100%', md: '320px' },
              flex: 1,
              pt: 3,
              pl: 3,
              mb: 3
            }}>
              <Paper elevation={3} sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '12px',
                mx: 0,
                overflow: 'visible'
              }}>
                <Card sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  p: 0,
                  borderRadius: 'inherit',
                  overflow: 'visible'
                }}>
                  <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                    <Typography variant="h6" component="h6" noWrap sx={titleStyle}>
                      Distribución Turno {currentShiftLabel}
                    </Typography>
                  </Box>
                  <Box id="current-shift-distribution-container" sx={{ 
                    flex: 1,
                    minHeight: 300,
                    width: '100%',
                    position: 'relative',
                    px: 0,
                    pb: 2
                  }}>
                    <ApexChart
                      options={barChartOptions}
                      series={barChartSeries}
                      type="bar"
                      height="100%"
                      width="100%"
                    />
                  </Box>
                </Card>
              </Paper>
            </Grid>

            {/* Gráfico 3 - Parte en Tiempo Actual */}
            <Grid sx={{
              minWidth: { xs: '100%', md: '320px' },
              flex: 1,
              pt: 3,
              pl: 3,
              mb: 3
            }}>
              <Paper elevation={3} sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '12px',
                mx: 0,
                overflow: 'visible'
              }}>
                <Card sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  p: 0,
                  borderRadius: 'inherit',
                  overflow: 'visible'
                }}>
                  <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                    <Typography variant="h6" component="h6" noWrap sx={titleStyle}>
                      Parte en Tiempo Actual
                    </Typography>
                  </Box>
                  <Box id="real-time-status-container" sx={{ 
                    flex: 1,
                    minHeight: 300,
                    width: '100%',
                    position: 'relative',
                    px: 0,
                    pb: 2
                  }}>
                    <ApexChart
                      options={statusOptions}
                      series={statusSeries}
                      type="donut"
                      height="100%"
                      width="100%"
                    />
                  </Box>
                </Card>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Tercer grupo - Gráfico de Tendencias */}
        <Box sx={{ 
          width: '100%',
          mt: 2,
          maxWidth: responsiveMaxWidth,
          mx: 'auto'
        }}>
          <Grid container sx={{
            mt: -3,
            ml: -3,
            flexWrap: { xs: 'wrap', md: 'wrap' },
            overflow: 'visible',
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            justifyContent: 'center'
          }}>
            {/* Gráfico de Tendencias */}
            <Grid sx={{
              minWidth: { xs: '100%', md: '500px' },
              flex: 1,
              pt: 3,
              pl: 3,
              mb: 3
            }}>
              <Box sx={{
                height: '100%',
                '& > .MuiPaper-root': {
                  overflow: 'visible'
                }
              }}>
                <Paper elevation={3} sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '12px',
                  overflow: 'visible',
                  '& .MuiCard-root': {
                    overflow: 'visible'
                  }
                }}>
                  <Card sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    p: 2,
                    borderRadius: 'inherit'
                  }}>
                    <Typography variant="h6" component="h6" noWrap sx={titleStyle}>
                      Tendencia de Licencias (Últimos 30 días)
                    </Typography>
                    {data.licencias.length > 0 ? (
                      <Box id="license-trends-container" sx={{ 
                        flex: 1,
                        minHeight: 400,
                        width: '100%',
                        position: 'relative'
                      }}>
                        <ApexChart
                          options={{
                            ...licenseTrendsOptions,
                            chart: {
                              ...licenseTrendsOptions.chart,
                              height: '100%'
                            }
                          }}
                          series={licenseTrends.series}
                          type="area"
                          height="100%"
                          width="100%"
                        />
                      </Box>
                    ) : (
                      <Box sx={{ 
                        height: 400, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Typography color="text.secondary">
                          No hay datos de licencias
                        </Typography>
                      </Box>
                    )}
                  </Card>
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Suspense>
    </Box>
  );
};

export default ParteTab;