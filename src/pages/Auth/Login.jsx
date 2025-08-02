// Login.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Typography, Box } from '@mui/material';
import AuthForm from './AuthForm';

const Login = () => {
  const { login, loading, user } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (credentials) => {
    await login(credentials);
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography component="h3" variant="h5" sx={{ 
        mb: 1,
        color: 'white',
        fontWeight: 'bold'
      }}>
        Acceso al sistema
      </Typography>
      <Typography variant="body1" sx={{ 
        color: 'rgba(255,255,255,0.8)',
        mb: 4
      }}>
        Departamento Hotelería
      </Typography>
      <AuthForm 
        isLogin={true} 
        onSubmit={handleSubmit} 
        loading={loading}
      />
    </Box>
  );
};

export default Login;