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
  Grid,
  IconButton,
  Tooltip,
  Typography,
  Paper,
  Box,
  InputAdornment
} from '@mui/material';
import { QrCode as QrCodeIcon, Add, Edit, Delete, Search } from '@mui/icons-material';
import QRGenerator from '../QRGenerator';
import DataTable from '../DataTable';
import { apiService } from '../../services/apiService';
import { useSnackbar } from 'notistack';
import { useAppContext } from '../../context/AppContext';

const LocalesTab = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [locales, setLocales] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentLocal, setCurrentLocal] = useState(null);
  const [qrData, setQrData] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedLocalForQr, setSelectedLocalForQr] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { isAdmin } = useAppContext();
  const niveles = ['Subsuelo 1','Subsuelo 2','Subsuelo 3', 'Planta Baja', 'Primer Piso', 'Segundo Piso', 'Tercer Piso','Cuarto Piso','Quinto Piso','Sexto Piso'];
  const categorias = ['Especializada Profunda Terminal', 'Especializada Profunda', 'General Continuo', 'General Mantenimiento', 'General', 'Recolección', 'TABLERO'];
  const frecuencias = [3, 6, 12, 24, 36, 48, 72];

  const fetchLocales = useCallback(async () => {
    setLoading(true); // Activar el estado de carga
    try {
      const response = await apiService.locales.getAll();
      setLocales(response.data);
    } catch (error) {
      console.error('Error fetching locales:', error);
      enqueueSnackbar('Error al cargar los locales', { variant: 'error' });
    } finally {
      setLoading(false); // Desactivar el estado de carga, independientemente del resultado
    }
  }, [enqueueSnackbar]); 
  
  useEffect(() => {
    fetchLocales();
  }, [fetchLocales]); 

  const filteredLocales = locales.filter(local =>
    local.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    local.nivel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    local.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (local = null) => {
    setCurrentLocal(local || { nombre: '', nivel: '', categoria: '', frecuencia: 24 });
    setOpenDialog(true);
    if (local) {
      setQrData(`https://hnpb-hoteleria.netlify.app/cleaning/${local.uuid}`);  // Cambiado a local.uuid
    } else {
      setQrData('');
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentLocal(null);
  };

  const handleShowQr = (local) => {
    setSelectedLocalForQr(local);
    setQrData(`https://hnpb-hoteleria.netlify.app/cleaning/${local.uuid}`);  // Cambiado a local.uuid
    setShowQrModal(true);
  };

  const handleCloseQrModal = () => {
    setShowQrModal(false);
    setSelectedLocalForQr(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentLocal({ ...currentLocal, [name]: value });
    if (name === 'id') {  // Puedes dejar esto como está o cambiarlo a uuid si es relevante
      setQrData(`https://hnpb-hoteleria.netlify.app/cleaning/${value}`);
    }
  };

  const handleSubmit = async () => {
    try {
      if (currentLocal.id) {
        await apiService.locales.update(currentLocal.id, currentLocal);
        enqueueSnackbar('Local actualizado correctamente', { 
          variant: 'success',
          autoHideDuration: 3000
        });
      } else {
        await apiService.locales.create(currentLocal);
        enqueueSnackbar('Local creado correctamente', { 
          variant: 'success',
          autoHideDuration: 3000
        });
      }
      fetchLocales();
      handleCloseDialog();
    } catch (error) {
      console.error('Error completo:', error);
      
      let errorMessage = 'Error al guardar el local';
      
      // Ahora podemos acceder a error.response gracias al interceptor modificado
      if (error.response) {
        if (error.response.status === 403) {
          errorMessage = 'Acceso prohibido: se requieren privilegios de administrador';
        } else {
          // Intenta obtener el mensaje de varias propiedades comunes
          errorMessage = error.response.data?.message || 
                        error.response.data?.error || 
                        error.response.data?.detail || 
                        `Error ${error.response.status}`;
        }
      } else {
        errorMessage = error.message || errorMessage;
      }
  
      enqueueSnackbar(errorMessage, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro que desea eliminar este local?')) {
      try {
        await apiService.locales.delete(id);
        fetchLocales();
        enqueueSnackbar('Local eliminado correctamente', { 
          variant: 'success',
          autoHideDuration: 3000,
          anchorOrigin: {
            vertical: 'top',
            horizontal: 'right'
          }
        });
      } catch (error) {
        console.error('Error deleting local:', error);
        
        let errorMessage = 'Error al eliminar el local';
        
        if (error.response && error.response.status === 403) {
          errorMessage = 'Acceso prohibido: se requieren privilegios de administrador';
        }
        else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        
        enqueueSnackbar(errorMessage, { 
          variant: 'error',
          autoHideDuration: 6000,
          anchorOrigin: {
            vertical: 'top',
            horizontal: 'right'
          }
        });
      }
    }
  };

  const columns = [
    { field: 'nombre', headerName: 'Nombre', flex: 1 },
    { field: 'nivel', headerName: 'Nivel', flex: 1 },
    { field: 'categoria', headerName: 'Categoría', flex: 1 },
    { 
      field: 'frecuencia', 
      headerName: 'Frecuencia (horas)', 
      flex: 1,
      renderCell: (params) => `${params.row.frecuencia} h`
    },
    {
      field: 'qr',
      headerName: 'QR',
      flex: 0.5,
      renderCell: (params) => (
        <Tooltip title="Generar QR">
          <IconButton onClick={() => handleShowQr(params.row)}>
            <QrCodeIcon color="primary" />
          </IconButton>
        </Tooltip>
      ),
    },
    ...(isAdmin ? [{
      field: 'actions',
      headerName: 'Acciones',
      flex: 0.8, // Puedes ajustar este valor según necesites
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Editar">
            <IconButton 
              color="primary"
              onClick={() => handleOpenDialog(params.row)}
            >
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton 
              color="error"
              onClick={() => handleDelete(params.row.id)}
            >
              <Delete />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    }] : [])
  ];

  const downloadQRWithDetails = async () => {
    try {
      const qrSize = 200;
      const qrCanvas = document.createElement('canvas');
      qrCanvas.width = qrSize;
      qrCanvas.height = qrSize;
      
      const QRCode = await import('qrcode');
      await QRCode.toCanvas(qrCanvas, qrData, {
        width: qrSize,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
  
      const container = document.createElement('div');
      Object.assign(container.style, {
        position: 'fixed',
        left: '-9999px',
        width: '300px',
        padding: '20px',
        backgroundColor: 'white',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      });
  
      container.innerHTML = `
        <div style="color: #1976d2; font-weight: bold; font-size: 20px; margin-bottom: 8px;">
          Departamento Hoteleria
        </div>
        <div style="font-weight: 600; margin-bottom: 15px; font-size: 16px;">
          ${selectedLocalForQr?.nombre || 'Local'}
        </div>
        <div style="margin: 15px 0; font-size: 12px; color: #666;">
          Escanee para acceder al formulario
        </div>
      `;
  
      container.insertBefore(qrCanvas, container.children[2]);
      document.body.appendChild(container);
  
      const html2canvas = (await import('html2canvas')).default;
      const finalCanvas = await html2canvas(container, {
        scale: 2,
        logging: true,
        useCORS: true,
        backgroundColor: null
      });
  
      const link = document.createElement('a');
      link.download = `QR_${selectedLocalForQr?.nombre || 'Local'}.png`;
      link.href = finalCanvas.toDataURL('image/png');
      link.click();
  
      document.body.removeChild(container);
  
    } catch (error) {
      console.error('Error al generar QR:', error);
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.download = `qr-${selectedLocalForQr?.nombre || 'local'}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    }
  };

  if (loading) {
          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Cargando locales...</Typography>
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
            placeholder="Buscar local..."
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
              Nuevo Local
            </Button>
          )}
        </Box>
      </Box>

      <DataTable rows={filteredLocales} columns={columns} />

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          {currentLocal?.id ? 'Editar Local' : 'Crear Local'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                autoFocus
                margin="dense"
                name="nombre"
                label="Nombre del Local"
                fullWidth
                value={currentLocal?.nombre || ''}
                onChange={handleChange}
                sx={{ mb: 2 }}
              />
              <TextField
                select
                margin="dense"
                name="nivel"
                label="Nivel"
                fullWidth
                value={currentLocal?.nivel || ''}
                onChange={handleChange}
                sx={{ mb: 2 }}
              >
                {niveles.map((nivel) => (
                  <MenuItem key={nivel} value={nivel}>
                    {nivel}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                margin="dense"
                name="categoria"
                label="Categoría"
                fullWidth
                value={currentLocal?.categoria || ''}
                onChange={handleChange}
              >
                {categorias.map((categoria) => (
                  <MenuItem key={categoria} value={categoria}>
                    {categoria}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                margin="dense"
                name="frecuencia"
                label="Frecuencia de Limpieza (horas)"
                fullWidth
                value={currentLocal?.frecuencia || 24}
                onChange={handleChange}
              >
                {frecuencias.map((freq) => (
                  <MenuItem key={freq} value={freq}>
                    {freq} horas
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {qrData && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    Vista previa del QR
                  </Typography>
                  <QRGenerator data={qrData} size={180} />
                </>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showQrModal} onClose={handleCloseQrModal} maxWidth="xs" fullWidth>
        <DialogTitle sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 1.5,
          textAlign: 'center',
          position: 'relative'
        }}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <QrCodeIcon sx={{ 
              fontSize: 40, 
              mb: 1,
              color: 'white'
            }}/>
            <Typography variant="h6" sx={{ 
              fontWeight: 'bold',
              lineHeight: 1.2,
              fontSize: '1.4rem'
            }}>
              Departamento Hoteleria
            </Typography>
            <Typography variant="caption" sx={{ 
              display: 'block',
              mt: 0.5,
              fontSize: '1.2rem'
            }}>
              {selectedLocalForQr?.nombre || 'Local'}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 3,
          px: 2
        }}>
          <Box sx={{
            p: 1,
            border: '1px solid #eee',
            borderRadius: 1,
            mb: 2
          }}>
            <QRGenerator data={qrData} size={200} />
          </Box>
          
          <Typography variant="body2" sx={{
            textAlign: 'center',
            color: 'text.secondary',
            fontSize: '0.8rem',
            maxWidth: '90%'
          }}>
            Escanee para registrar tarea
          </Typography>
        </DialogContent>

        <DialogActions sx={{
          justifyContent: 'center',
          pb: 2,
          pt: 0,
          px: 2
        }}>
          <Button 
            onClick={handleCloseQrModal}
            size="small"
            sx={{
              minWidth: 100,
              fontSize: '0.75rem'
            }}
          >
            Cerrar
          </Button>
          <Button 
            onClick={downloadQRWithDetails}
            color="primary"
            size="small"
            startIcon={<QrCodeIcon />}
          >
            Descargar QR Completo
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default LocalesTab;