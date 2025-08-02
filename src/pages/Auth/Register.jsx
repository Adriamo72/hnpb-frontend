import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Typography } from '@mui/material';
import AuthForm from './AuthForm';

const Register = () => {
  const { register, loading } = useAppContext();
  const navigate = useNavigate();

  const handleSubmit = async (userData) => {
    // Transforma los datos para que coincidan con el backend
    const registrationData = {
      username: userData.name, // Mapea 'name' a 'username'
      email: userData.email,
      password: userData.password,
      // Si necesitas confirmPassword en el backend:
      confirmPassword: userData.confirmPassword 
    };

    const { success } = await register(registrationData);
    if (success) {
      navigate('/login');
    }
  };

  return (
    <>
      <Typography component="h3" variant="h5" sx={{ 
              mb: 1,
              color: 'white',
              fontWeight: 'bold'
            }}>
              Crear usuario
            </Typography>
      <AuthForm 
        isLogin={false} 
        onSubmit={handleSubmit} 
        loading={loading}
      />
    </>
  );
};

export default Register;