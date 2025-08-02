import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    IconButton,
    Tooltip,
    CircularProgress,
    Chip,
    Button,
    Skeleton,
    Divider
} from '@mui/material';
import {
    Search,
    Refresh,
    Delete,
    Schedule,
    Person,
    Info,
    Warning
} from '@mui/icons-material';
import CleaningServices from '@mui/icons-material/CleaningServices';
import { format, parseISO, addHours, differenceInHours, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { apiService } from '../../services/apiService';
import { useAppContext } from '../../context/AppContext';
import { useSnackbar } from 'notistack';
import '../../styles/fontFace.css';

const MonitoreoTab = () => {
    const [limpiezas, setLimpiezas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredData, setFilteredData] = useState([]);
    const { joinRoom, leaveRoom, limpiezaUpdates, isAdmin } = useAppContext();
    const { enqueueSnackbar } = useSnackbar();

    const formatDateSafe = useCallback((dateString) => {
        try {
            if (!dateString) return '--';
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? '--' : format(date, 'PPpp', { locale: es });
        } catch (error) {
            console.error('Error formateando fecha:', error);
            return '--';
        }
    }, []);

    const getCleaningStatus = (fechaHora, frecuenciaHoras, validado) => {
        if (!fechaHora) return { status: 'overdue', horasRestantes: 0 };

        const ahora = new Date();
        const ultimaLimpieza = parseISO(fechaHora);
        const proximaLimpieza = addHours(ultimaLimpieza, frecuenciaHoras);
        const horasRestantes = differenceInHours(proximaLimpieza, ahora);

        if (horasRestantes <= 0) {
            return { 
                status: 'overdue', 
                horasRestantes: 0
            };
        }
        return { 
            status: 'completed', 
            horasRestantes
        };
    };

    const normalizeCleaningData = useCallback((cleaningData) => {
    if (!cleaningData) return null;

    const frecuencia = cleaningData.local?.frecuencia || 24;
    const validado = cleaningData.validado || false;
    const { status, horasRestantes } = getCleaningStatus(
        cleaningData.fechaHora, 
        frecuencia,
        validado
    );

    // Función para capitalizar el texto
    const capitalizeEachWord = (str) => {
    if (!str) return '--';
    
    return str
        .split(' ')
        .map(word => {
            // Si la palabra empieza con "(", capitalizar solo la primera letra después del paréntesis
            if (word.startsWith('(')) {
                return `(${word.charAt(1).toUpperCase()}${word.slice(2).toLowerCase()}`;
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    };

    return {
        ...cleaningData,
        id: cleaningData.id,
        localId: cleaningData.local?.id || cleaningData.localId,
        localNombre: cleaningData.local?.nombre ? capitalizeEachWord(cleaningData.local.nombre) : '--',
        localNivel: cleaningData.local?.nivel || '--',
        categoria: cleaningData.local?.categoria || '--',
        empleadoNombre: cleaningData.empleado
            ? `${cleaningData.empleado.nombre || ''} ${cleaningData.empleado.apellido || ''}`.trim()
            : '--',
        empleadoJerarquia: cleaningData.empleado?.jerarquia || '--',
        frecuencia,
        novedades: cleaningData.novedades || 'Sin novedades',
        fechaHora: cleaningData.fechaHora,
        fechaHoraFormatted: formatDateSafe(cleaningData.fechaHora),
        status,
        horasRestantes,
        validado
    };
    }, [formatDateSafe]);

    const fetchLimpiezas = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiService.limpieza.getAll();
            if (response.data) {
                const normalizedData = response.data.map(normalizeCleaningData).filter(Boolean);
                setLimpiezas(normalizedData);
                setFilteredData(normalizedData);
            }
        } catch (error) {
            console.error('Error al obtener limpiezas:', error);
            enqueueSnackbar('Error al cargar los datos de limpieza', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [normalizeCleaningData, enqueueSnackbar]);

    const handleDelete = useCallback(async (id) => {
        if (window.confirm('¿Está seguro que desea eliminar este registro?')) {
            try {
                await apiService.limpieza.delete(id);
                enqueueSnackbar('Registro eliminado correctamente', { variant: 'success' });
                setLimpiezas(prev => prev.filter(item => item.id !== id));
            } catch (error) {
                console.error('Error eliminando registro:', error);
                enqueueSnackbar(
                    error.response?.data?.message || 'No se puede eliminar, tiene otros registros asociados',
                    { variant: 'error', autoHideDuration: 6000 }
                );
            }
        }
    }, [enqueueSnackbar]);

    useEffect(() => {
        if (limpiezaUpdates.length > 0) {
            const lastUpdate = limpiezaUpdates[limpiezaUpdates.length - 1];

            setLimpiezas(prev => {
                if (lastUpdate.deleted) {
                    return prev.filter(item => item.id !== lastUpdate.id);
                } else {
                    const updatedLimpieza = normalizeCleaningData(lastUpdate);
                    if (updatedLimpieza) {
                        const exists = prev.some(item => item.id === updatedLimpieza.id);
                        return exists
                            ? prev.map(item => item.id === updatedLimpieza.id ? updatedLimpieza : item)
                            : [updatedLimpieza, ...prev];
                    }
                    return prev;
                }
            });
        }
    }, [limpiezaUpdates, normalizeCleaningData]);

    useEffect(() => {
    const filtered = limpiezas.filter(item => {
        const term = searchTerm.toLowerCase();
        
        // Filtros especiales
        if (term === 'estado:overdue') {
            return item.status === 'overdue';
        }
        if (term === 'estado:completed') {
            return item.status === 'completed';
        }
        
        // Búsqueda general
        return (
            (item.localNombre && item.localNombre.toLowerCase().includes(term)) ||
            (item.localNivel && item.localNivel.toLowerCase().includes(term)) ||
            (item.empleadoNombre && item.empleadoNombre.toLowerCase().includes(term)) ||
            (item.novedades && item.novedades.toLowerCase().includes(term))
        );
    });
    setFilteredData(filtered);
    }, [searchTerm, limpiezas]);

    useEffect(() => {
        fetchLimpiezas();
        joinRoom('monitoreo');
        return () => leaveRoom('monitoreo');
    }, [fetchLimpiezas, joinRoom, leaveRoom]);

    const categorias = [
        'Especializada Profunda Terminal', 
        'Especializada Profunda', 
        'General Continuo', 
        'General Mantenimiento', 
        'General', 
        'Recolección'
    ];

    const getStatusColor = (status) => {
        switch(status) {
            case 'overdue': 
                return { 
                    border: '#ea4541',
                    bg: '#ea4541',  // Rojo sólido
                    text: '#ffffff', // Blanco
                    icon: '#ffcdd2'  // Rojo claro
                };
            case 'completed': 
                return { 
                    border: '#388e3c',
                    bg: '#388e3c',   // Verde sólido
                    text: '#ffffff',
                    icon: '#c8e6c9'
                };
            default: 
                return { 
                    border: '#616161',
                    bg: '#616161',   // Gris
                    text: '#ffffff',
                    icon: '#e0e0e0'
                };
        }
    };

    const getTimeSinceCleaning = (fechaHora) => {
        if (!fechaHora) return '--';
        
        const ahora = new Date();
        const ultimaLimpieza = parseISO(fechaHora);
        const horasDesdeUltima = differenceInHours(ahora, ultimaLimpieza);
        
        if (horasDesdeUltima < 1) {
            const minutos = Math.floor(differenceInMinutes(ahora, ultimaLimpieza));
            return `Hace ${minutos} min`;
        }
        return `Hace ${horasDesdeUltima} hs`;
    };

    const getTooltipContent = (limpieza) => {
    const isOverdue = limpieza.status.includes('overdue');
    const nombreOriginal = limpieza.local?.nombre || limpieza.localNombre;
    const statusColor = isOverdue ? '#ea4541' : '#388e3c';

    return (
        <Box className="custom-tooltip-container" sx={{ 
            borderLeftColor: statusColor,
            padding: '12px' // Añadido padding general para todo el tooltip
        }}>
            {/* Título con padding adicional */}
            <div className="tooltip-header" style={{ 
                paddingTop: '8px',
                paddingBottom: '12px'
            }}>
                {nombreOriginal}
            </div>
            
            <div className="tooltip-content" style={{ padding: '0 4px' }}>
                {/* Primera fila: Chips */}
                <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    marginBottom: '16px',
                    flexWrap: 'wrap'
                }}>
                    <Chip
                        label={limpieza.localNivel}
                        size="small"
                        sx={{ 
                            color: '#ffffff',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            height: '24px',
                            fontSize: '0.75rem'
                        }}
                    />
                    <Chip
                        label={`Cada ${limpieza.frecuencia}h`}
                        size="small"
                        sx={{ 
                            color: '#ffffff',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            height: '24px',
                            fontSize: '0.75rem'
                        }}
                    />
                    <Chip
                        label={isOverdue ? 'Atrasado' : 'Completado'}
                        size="small"
                        sx={{ 
                            color: 'white',
                            backgroundColor: statusColor,
                            height: '24px',
                            fontSize: '0.75rem'
                        }}
                    />
                </div>

                {/* Empleado */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '16px'
                }}>
                    <Person sx={{ 
                        color: '#ffffff',
                        opacity: 0.8,
                        marginRight: '10px',
                        fontSize: '18px'
                    }} />
                    <span style={{ 
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '0.875rem'
                    }}>
                        {`${limpieza.empleadoJerarquia || '--'} ${limpieza.empleadoNombre}`}
                    </span>
                </div>

                {/* Última limpieza */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: limpieza.novedades !== 'Sin novedades' ? '16px' : '0'
                }}>
                    <Schedule sx={{ 
                        color: '#ffffff',
                        opacity: 0.8,
                        marginRight: '10px',
                        fontSize: '18px'
                    }} />
                    <span style={{ 
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '0.875rem'
                    }}>
                        {limpieza.fechaHoraFormatted}
                    </span>
                </div>

                {/* Novedades */}
                {limpieza.novedades !== 'Sin novedades' && (
                    <div style={{ 
                        display: 'flex',
                        marginTop: '12px',
                        alignItems: 'flex-start'
                    }}>
                        <Warning sx={{ 
                            color: '#ffc107',
                            marginRight: '10px',
                            fontSize: '18px',
                            flexShrink: 0,
                            marginTop: '2px'
                        }} />
                        <span style={{ 
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontStyle: 'italic',
                            fontSize: '0.875rem'
                        }}>
                            {limpieza.novedades}
                        </span>
                    </div>
                )}

                {/* Botón admin */}
                {isAdmin && (
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        marginTop: '16px'
                    }}>
                        <Tooltip title="Eliminar registro">
                            <IconButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(limpieza.id);
                                }}
                                size="small"
                                sx={{ 
                                    color: '#ffffff',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 0, 0, 0.2)'
                                    }
                                }}
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </div>
                )}
            </div>
        </Box>
    );
};

    if (loading) {
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Cargando validaciones...</Typography>
          </Box>
        );
      }    

    return (
        <Box sx={{ 
            width: '100%',
            mt: 3,
            mx: 'auto'
        }}>
            {/* Header y búsqueda */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                flexWrap: 'wrap',
                gap: 2
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{ startAdornment: <Search /> }}
                        sx={{ mr: 1, minWidth: 200 }}
                    />
                    <Tooltip title="Refrescar">
                        <IconButton onClick={fetchLimpiezas}><Refresh /></IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Filtros rápidos */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip
                    label="Todos"
                    onClick={() => setSearchTerm('')}
                    color={!searchTerm ? 'primary' : 'default'}
                    variant={!searchTerm ? 'filled' : 'outlined'}
                />
                <Chip
                    label="Atrasados"
                    onClick={() => setSearchTerm('estado:overdue')}
                    color={searchTerm === 'estado:overdue' ? 'primary' : 'default'}
                    variant={searchTerm === 'estado:overdue' ? 'filled' : 'outlined'}
                />
                <Chip
                    label="Completados"
                    onClick={() => setSearchTerm('estado:completed')}
                    color={searchTerm === 'estado:completed' ? 'primary' : 'default'}
                    variant={searchTerm === 'estado:completed' ? 'filled' : 'outlined'}
                />
            </Box>

            {/* Vista de Tarjetas agrupadas por categoría */}
            {loading ? (
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                    gap: 2
                }}>
                    {[...Array(6)].map((_, index) => (
                        <Skeleton key={`skeleton-${index}`} variant="rectangular" height={60} />
                    ))}
                </Box>
            ) : filteredData.length > 0 ? (
                <Box>
                    {categorias.map((categoria) => {
                        const categoryItems = filteredData.filter(item => item.categoria === categoria);
                        if (categoryItems.length === 0) return null;

                        return (
                            <Box key={categoria} sx={{ mb: 4 }}>
                                {/* Separador de categoría */}
                                <Box sx={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 2,
                                    width: '100%'
                                }}>
                                    {/* Contenedor del ícono y texto */}
                                    <Box sx={{ 
                                        display: 'flex',
                                        alignItems: 'center',
                                        flexShrink: 0
                                    }}>
                                        {/* Ícono de información con fondo circular */}
                                        <Box sx={{
                                            bgcolor: '#344767',  // Fondo oscuro (azul)
                                            color: '#f0f2f5',    // Color del icono (gris claro)
                                            borderRadius: '50%',
                                            width: 20,
                                            height: 20,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mr: 1
                                        }}>
                                            <Info sx={{ 
                                                fontSize: '20px', 
                                                opacity: 1
                                            }} />
                                        </Box>
                                        
                                        {/* Título */}
                                        <Typography 
                                            variant="h6" 
                                            noWrap
                                            sx={{
                                                fontFamily: "'Myriad Pro Regular', sans-serif",
                                                fontWeight: 500,
                                                fontSize: '1.2rem',
                                                color: '#344767'
                                            }}
                                        >
                                            {categoria}
                                        </Typography>
                                    </Box>
                                    
                                    {/* Divider */}
                                    <Divider 
                                        sx={{ 
                                            flexGrow: 1,
                                            ml: 3,
                                            backgroundColor: '#344767',
                                            height: 4, // Hace la línea más gruesa
                                            borderRadius: '8px',
                                            opacity: 0.1, // Ajusta la opacidad (0-1)
                                        }} 
                                    />
                                </Box>

                                {/* Tarjetas de la categoría */}
                                <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                        gap: 2,
                                        width: 'calc(100% - 32px)', // Compensa el padding general de la página
                                        margin: '0 auto',
                                        maxWidth: '100%'
                                    }}>
                                    {categoryItems.map((limpieza) => {
                                        const isOverdue = limpieza.status.includes('overdue');
                                        return (
                                            <Tooltip 
                                                key={limpieza.id}
                                                title={getTooltipContent(limpieza)}
                                                componentsProps={{
                                                    tooltip: {
                                                        sx: {
                                                            backgroundColor: 'rgba(30, 30, 30, 0.95)',
                                                            padding: 0,
                                                            borderRadius: '6px',
                                                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                                                            maxWidth: '320px',
                                                            borderLeft: `4px solid ${isOverdue ? '#ea4541' : '#388e3c'}`
                                                        }
                                                    }
                                                }}
                                                arrow
                                                placement="top"
                                            >
                                                <Paper
                                                    elevation={isOverdue ? 6 : 3}
                                                    sx={{
                                                        pt: 2,
                                                        pb: 2,
                                                        pl: 1,
                                                        pr: 2,
                                                        borderRadius: '60px',
                                                        backgroundColor: getStatusColor(limpieza.status).bg,
                                                        color: getStatusColor(limpieza.status).text,
                                                        position: 'relative',
                                                        transition: 'all 0.3s ease',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0,
                                                        height: '30px',
                                                        width: 'calc(100% - 16px)',
                                                        margin: '0 auto',
                                                        maxWidth: '240px',
                                                        '&:hover': {
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: 6,
                                                            opacity: 0.9
                                                        },
                                                        '&::after': {
                                                            content: '""',
                                                            position: 'absolute',
                                                            bottom: 0,
                                                            left: '10%',
                                                            right: '10%',
                                                            height: '1px',
                                                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                                                        }
                                                    }}
                                                >
                                                    {/* Ícono de advertencia para novedades */}
                                                    {limpieza.novedades !== 'Sin novedades' && (
                                                        <Box sx={{
                                                            position: 'absolute',
                                                            top: -6,
                                                            right: -5,
                                                            bgcolor: 'rgba(0,0,0,0.7)',
                                                            color: '#ffc107',
                                                            borderRadius: '50%',
                                                            width: 24,
                                                            height: 24,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            zIndex: 1,
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                                            animation: 'pulse 1.5s infinite',
                                                            border: '1px solid rgba(255,193,7,0.3)',
                                                            '@keyframes pulse': {
                                                                '0%': { transform: 'scale(1)' },
                                                                '50%': { transform: 'scale(1.15)' },
                                                                '100%': { transform: 'scale(1)' }
                                                            }
                                                        }}>
                                                            <Warning fontSize="small" sx={{ fontSize: '1rem' }} />
                                                        </Box>
                                                    )}

                                                    {/* Ícono principal con degradado */}
                                                    <Box sx={{
                                                        background: 'linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%)',
                                                        color: getStatusColor(limpieza.status).bg,
                                                        borderRadius: '50%',
                                                        width: 43,
                                                        height: 43,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        marginRight: 1,
                                                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1), 0 1px 1px rgba(255,255,255,0.5)',
                                                        border: '1px solid rgba(0,0,0,0.05)'
                                                    }}>
                                                        <CleaningServices sx={{ 
                                                            fontSize: '24px',
                                                            width: '24px',
                                                            height: '24px',
                                                            opacity: 1
                                                        }} />
                                                    </Box>

                                                    {/* Contenido de texto */}
                                                    <Box sx={{ 
                                                        flexGrow: 1,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'center',
                                                        height: '100%',
                                                        gap: 0.1,
                                                        overflow: 'hidden',
                                                        pr: limpieza.novedades !== 'Sin novedades' ? 1.5 : 0
                                                    }}>
                                                        <Typography 
                                                            variant="subtitle2" 
                                                            sx={{ 
                                                                fontFamily: "'Myriad Pro Regular', sans-serif",
                                                                fontWeight: 600,
                                                                fontSize: '0.78rem',
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                width: '100%',
                                                                lineHeight: '1.1',
                                                                minHeight: '1.1em',
                                                                maxHeight: '2.2em',
                                                                mb: 0.1,
                                                                letterSpacing: '0.02em'
                                                            }}
                                                        >
                                                            {limpieza.localNombre}
                                                        </Typography>
                                                        
                                                        <Box sx={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center',
                                                            width: '100%',
                                                            justifyContent: 'space-between',
                                                            mt: 0.2
                                                        }}>
                                                            <Typography variant="caption" sx={{ 
                                                                fontFamily: "'Myriad Pro Regular', sans-serif",
                                                                fontWeight: 500,
                                                                color: 'rgba(255,255,255,0.85)',
                                                                fontSize: '0.65rem',
                                                                lineHeight: 1.2,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                flexGrow: 1,
                                                                pr: 1,
                                                                textTransform: 'none',
                                                                letterSpacing: '0.03em'
                                                            }}>
                                                                {limpieza.localNivel}
                                                            </Typography>
                                                            
                                                            <Chip
                                                                label={getTimeSinceCleaning(limpieza.fechaHora)}
                                                                size="small"
                                                                sx={{
                                                                    height: '18px',
                                                                    fontSize: '0.6rem',
                                                                    color: 'rgba(255,255,255,0.9)',
                                                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                                                    flexShrink: 0,
                                                                    ml: 'auto',
                                                                    '& .MuiChip-label': {
                                                                        px: 0.5,
                                                                        letterSpacing: '0.02em'
                                                                    }
                                                                }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </Paper>
                                            </Tooltip>
                                        );
                                    })}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            ) : (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                        No se encontraron registros
                    </Typography>
                    <Button 
                        onClick={() => setSearchTerm('')} 
                        sx={{ mt: 2 }}
                        startIcon={<Refresh />}
                    >
                        Limpiar filtros
                    </Button>
                </Paper>
            )}
        </Box>
    );
};

export default MonitoreoTab;