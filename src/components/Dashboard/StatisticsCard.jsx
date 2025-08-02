import React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

const StatisticsBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '4rem',
  height: '4rem',
  marginTop: '-1.5rem',
  color: '#ffffff',
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[10],
}));

const StatisticsCard = React.memo(({ color, icon, title, count, percentage, gradientColors, titleStyle }) => {
  const colorGradients = {
    dark: 'linear-gradient(195deg, #42424a, #191919)',
    primario: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
    success: 'linear-gradient(195deg, #66BB6A, #43A047)',
    error: 'linear-gradient(195deg, #EF5350, #E53935)',
  };

  const background = gradientColors 
    ? `linear-gradient(195deg, ${gradientColors[0]}, ${gradientColors[1]})`
    : colorGradients[color] || colorGradients.primario;

  // Función para renderizar múltiples porcentajes
  const renderPercentages = () => {
    if (!percentage) return null;
    
    // Si percentage es un array, renderizar cada uno
    if (Array.isArray(percentage)) {
      return percentage.map((p, index) => (
        <React.Fragment key={index}>
          <Typography
            component="span"
            variant="button"
            fontWeight="bold"
            color={p.color === "success" ? "success.main" : 
                  p.color === "error" ? "error.main" : "inherit"}
            sx={{ marginRight: '4px', fontSize: '0.875rem' }}
          >
            {p.amount}
          </Typography>
          <Typography
            component="span"
            variant="button"
            fontWeight="medium"
            color="text.secondary"
            sx={{ fontSize: '0.875rem', marginRight: '8px' }}
          >
            {p.label}
          </Typography>
        </React.Fragment>
      ));
    }
    
    // Si es un solo objeto, renderizarlo normalmente
    return (
      <>
        <Typography
          component="span"
          variant="button"
          fontWeight="bold"
          color={percentage.color === "success" ? "success.main" : 
                percentage.color === "error" ? "error.main" : "inherit"}
          sx={{ marginRight: '4px', fontSize: '0.875rem' }}
        >
          {percentage.amount}
        </Typography>
        <Typography
          component="span"
          variant="button"
          fontWeight="medium"
          color="text.secondary"
          sx={{ fontSize: '0.875rem' }}
        >
          {percentage.label}
        </Typography>
      </>
    );
  };

  return (
    <Card sx={{ 
      borderRadius: '12px',
      overflow: 'visible',
      boxShadow: (theme) => theme.shadows[3],
      height: '100%',
      width: '100%'
    }}>
      <Box display="flex" justifyContent="space-between" pt={1} px={2}>
        <StatisticsBox 
          sx={{
            background: background,
            borderRadius: '12px',
          }}
        >
          {React.cloneElement(icon, {
            sx: { 
              fontSize: '1.5rem',
              color: 'inherit'
            }
          })}
        </StatisticsBox>
        
        <Box textAlign="right" lineHeight={1.25} sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography 
            variant="button" 
            fontWeight="light" 
            color="text.secondary"
            sx={{
              display: 'block',
              lineHeight: 1.5,
              fontSize: '0.875rem',
              ...titleStyle
            }}
          >
            {title}
          </Typography>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              lineHeight: 1.375,
              marginTop: '4px',
              fontSize: '1.7rem'
            }}
          >
            {count}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ marginTop: '16px', marginBottom: '16px' }} />

      <Box pb={2} px={2}>
        <Typography component="p" variant="button" color="text.secondary" display="flex" flexWrap="wrap">
          {renderPercentages()}
        </Typography>
      </Box>
    </Card>
  );
});

export default StatisticsCard;