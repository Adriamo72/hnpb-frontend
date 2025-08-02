import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Container, 
  Typography, 
  Box, 
  TextareaAutosize,
  Paper,
  Grid
} from '@mui/material';
import { apiService as api } from '../services/apiService';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import hospitalLogo from '../assets/hospital-naval-logo.png';

const CleaningForm = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [local, setLocal] = useState(null);
  const [dni, setDni] = useState('');
  const [novedades, setNovedades] = useState('');
  const [empleado, setEmpleado] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleDniChange = async (e) => {
    const value = e.target.value;
    setDni(value);

    if (value.length === 8) {
      try {
        const response = await api.empleados.getByDni(value);
        setEmpleado(response.data);
      } catch (error) {
        console.error('Error fetching empleado:', error);
        setEmpleado(null);
      }
    } else {
      setEmpleado(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const cleaningData = {
        localId: local?.id,
        empleadoId: empleado?.id,
        empleadoDni: empleado?.dni,
        novedades,
        fechaHora: new Date().toISOString(),
      };
      
      await api.limpieza.create(cleaningData);
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting cleaning:', error);
    }
  };

  useEffect(() => {
    const fetchLocal = async () => {
      try {
        const response = await api.locales.getByUuid(uuid);
        setLocal(response.data);
      } catch (error) {
        console.error('Error fetching local:', error);
        navigate('/error', { state: { message: 'Local no encontrado' } });
      }
    };
  
    fetchLocal();
  }, [uuid, navigate]);

  if (submitted) {
    return (
      <Container maxWidth="xs" sx={{ 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <Paper elevation={3} sx={{ 
          p: 4,
          borderRadius: '8px',
          backgroundColor: '#2e3f57',
          color: 'white'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <CleaningServicesIcon sx={{ 
              fontSize: 60,
              color: 'white'
            }} />
          </Box>
          <Typography component="h1" variant="h5" sx={{ 
            mb: 3,
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            ¡Limpieza registrada!
          </Typography>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ mb: 1, opacity: 0.9 }}>
              Local: {local?.nombre}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1, opacity: 0.9 }}>
              Personal: {empleado?.jerarquia} {empleado?.nombre} {empleado?.apellido}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Hora: {new Date().toLocaleString()}
            </Typography>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xs" sx={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      backgroundColor: '#f8fafc'
    }}>
      <Paper elevation={3} sx={{
        p: 4,
        borderRadius: '8px',
        backgroundColor: '#2e3f57',
        color: 'white'
      }}>
        <Box sx={{ 
          py: 2,
          textAlign: 'center'
        }}>
          <img 
            src={hospitalLogo} 
            alt="Hospital Naval" 
            style={{ 
              height: '90px',
              filter: 'brightness(0) invert(1)'
            }} 
          />
        </Box>
        <Typography component="h1" variant="h5" sx={{ 
          mb: 2,
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          Registro de Limpieza
        </Typography>
        
        {local && (
          <Typography variant="subtitle1" sx={{ 
            mb: 3,
            opacity: 0.9,
            textAlign: 'center'
          }}>
            {local.nombre} - {local.nivel}
          </Typography>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="DNI del Personal"
                variant="standard"
                value={dni}
                onChange={handleDniChange}
                inputProps={{ 
                  maxLength: 8,
                  style: { color: 'white' }
                }}
                required
                sx={{
                  mb: 2,
                  '& .MuiInputBase-root': {
                    color: 'white'
                  },
                  '& .MuiInput-underline:before': {
                    borderBottomColor: 'rgba(255,255,255,0.5)',
                  },
                  '& .MuiInput-underline:after': {
                    borderBottomColor: 'white',
                  },
                  '& .MuiFormLabel-root': {
                    color: 'rgba(255,255,255,0.7)',
                    '&.Mui-focused': {
                      color: 'white'
                    }
                  }
                }}
              />
            </Grid>

            {empleado && (
              <Grid item xs={12}>
                <Box sx={{ 
                  p: 2,
                  mb: 2,
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }}>
                  <Typography variant="body1">
                    <strong>Validador:</strong> {empleado.jerarquia} {empleado.nombre} {empleado.apellido}
                  </Typography>
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex',
                justifyContent: 'center',
                width: '100%'
              }}>
                <TextareaAutosize
                  minRows={2}
                  placeholder="Novedades (opcional)"
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    padding: '12px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    resize: 'vertical',
                    '::placeholder': {
                      color: 'rgba(255,255,255,0.5)'
                    }
                  }}
                  value={novedades}
                  onChange={(e) => setNovedades(e.target.value)}
                />
              </Box>
            </Grid>
          </Grid>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ 
              mt: 3,
              py: 1.5,
              backgroundColor: 'white',
              color: '#2e3f57',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.9)',
                boxShadow: 'none'
              },
              '&:disabled': {
                backgroundColor: 'rgba(255,255,255,0.5)'
              }
            }}
            disabled={!empleado}
          >
          Registrar
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CleaningForm;