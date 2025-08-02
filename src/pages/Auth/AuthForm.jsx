// AuthForm.jsx
import { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';

const AuthForm = ({ isLogin, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    ...(!isLogin && { name: '', confirmPassword: '' })
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Box 
      component="form" 
      onSubmit={handleSubmit} 
      sx={{ 
        '& .MuiTextField-root': {
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
        }
      }}
    >
      {!isLogin && (
        <TextField
          fullWidth
          variant="standard"
          label="Nombre completo"
          name="name"
          autoComplete="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      )}
      
      <TextField
        fullWidth
        variant="standard"
        label="Correo electrónico"
        name="email"
        type="email"
        autoComplete="email"
        value={formData.email}
        onChange={handleChange}
        required
      />
      
      <TextField
        fullWidth
        variant="standard"
        name="password"
        label="Contraseña"
        type="password"
        autoComplete={isLogin ? "current-password" : "new-password"}
        value={formData.password}
        onChange={handleChange}
        required
      />
      
      {!isLogin && (
        <TextField
          fullWidth
          variant="standard"
          name="confirmPassword"
          label="Confirmar contraseña"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />
      )}
      
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
            backgroundColor: 'rgba(255,255,255,0.9)'
          }
        }}
        disabled={loading}
      >
        {isLogin ? 'Iniciar sesión' : 'Registrarse'}
      </Button>
    </Box>
  );
};

export default AuthForm;