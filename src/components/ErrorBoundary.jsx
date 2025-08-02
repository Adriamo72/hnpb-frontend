import React, { Component } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

/**
 * Componente que captura errores en sus componentes hijos
 * y muestra una interfaz de fallback en lugar de crashear toda la app
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  /**
   * Actualiza el estado cuando ocurre un error
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * Captura detalles del error cuando ocurre
   */
  componentDidCatch(error, errorInfo) {
    console.error('Error capturado en ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  /**
   * Restablece el estado de error
   */
  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    // Si hay un error, mostrar interfaz de fallback
    if (this.state.hasError) {
      return (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            m: 2, 
            maxWidth: '800px', 
            mx: 'auto',
            textAlign: 'center',
            borderLeft: '5px solid #f44336'
          }}
        >
          <Typography variant="h5" color="error" gutterBottom>
            Algo salió mal
          </Typography>
          
          <Typography variant="body1" paragraph>
            Ha ocurrido un error en este componente. Puede intentar recargar esta sección
            o volver a la página anterior.
          </Typography>
          
          <Box sx={{ mt: 3, mb: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={this.resetError}
              sx={{ mr: 2 }}
            >
              Reintentar
            </Button>
            
            <Button 
              variant="outlined" 
              onClick={() => window.location.reload()}
            >
              Recargar página
            </Button>
          </Box>
          
          {process.env.NODE_ENV !== 'production' && (
            <Box sx={{ mt: 4, textAlign: 'left', p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Detalles del error (solo visible en desarrollo):
              </Typography>
              <Typography variant="body2" component="pre" sx={{ 
                overflow: 'auto', 
                p: 1,
                fontSize: '0.75rem',
                fontFamily: 'monospace' 
              }}>
                {this.state.error && this.state.error.toString()}
              </Typography>
            </Box>
          )}
        </Paper>
      );
    }

    // Si no hay error, renderizar los hijos normalmente
    return this.props.children;
  }
}

export default ErrorBoundary;