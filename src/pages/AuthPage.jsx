// AuthPage.jsx
import { useState } from 'react';
import { Container, Paper, Tabs, Tab, Box } from '@mui/material';
import { Login, Register } from './Auth';
import hospitalLogo from '../assets/hospital-naval-logo.png';

const AuthPage = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ py: 8 }}>
      <Paper elevation={0} sx={{ 
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#2e3f57' // Fondo azul para todo el formulario
      }}>
        {/* Encabezado con logo */}
        <Box sx={{ 
          py: 3,
          textAlign: 'center'
        }}>
          <img 
            src={hospitalLogo} 
            alt="Hospital Naval" 
            style={{ 
              height: '60px',
              filter: 'brightness(0) invert(1)'
            }} 
          />
        </Box>

        {/* Pestañas */}
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          centered
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: 'white',
            },
            '& .MuiTab-root': {
              color: 'rgba(255,255,255,0.7)',
              '&.Mui-selected': {
                color: 'white',
                fontWeight: 'bold'
              }
            }
          }}
        >
          <Tab label="Iniciar sesión" />
          <Tab label="Registrarse" />
        </Tabs>
        
        {/* Contenido del formulario */}
        <Box sx={{ p: 4 }}>
          {tabValue === 0 ? <Login /> : <Register />}
        </Box>
      </Paper>
    </Container>
  );
};

export default AuthPage;