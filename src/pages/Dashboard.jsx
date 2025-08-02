import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  Avatar,
  Drawer,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Tooltip,
  IconButton,
  List,
  styled
} from '@mui/material';
import {
  Monitor as MonitorIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  Home as HomeIcon,
  Assignment as AssignmentIcon,
  GridOn as GridIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  ExitToApp as LogoutIcon
} from '@mui/icons-material';

import LocalesTab from '../components/Dashboard/LocalesTab';
import EmpleadosTab from '../components/Dashboard/EmpleadosTab';
import MonitoreoTab from '../components/Dashboard/MonitoreoTab';
import AnalisisTab from '../components/Dashboard/AnalisisTab';
import ParteTab from '../components/Dashboard/ParteTab';
import TableroTab from '../components/Dashboard/TableroTab';
import AdminConfigTab from '../components/Dashboard/AdminConfigTab';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import hospitalNavalLogo from '../assets/hospital-naval-logo.png';

const drawerWidth = 250;

const whiteLogoStyle = {
  filter: 'brightness(0) invert(1)',
  height: '40px',
  width: 'auto',
  objectFit: 'contain'
};

// Estilo personalizado para el SideNav
const SideNavRoot = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  background: theme.palette.background.sidenav || '#37373d',
  color: theme.palette.text.primary,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
}));

// Estilo para los items del SideNav
const SideNavItem = styled(ListItem)(({ theme, selected }) => ({
  margin: theme.spacing(0.5, 1.5),
  borderRadius: '8px',
  cursor: 'pointer',
  width: 'calc(100% - 24px)',
  padding: '8px 16px',
  transition: 'all 0.2s ease',

  // Estado normal
  '& .MuiListItemIcon-root': {
    color: selected ? 'white' : 'rgba(255, 255, 255, 1)',
    minWidth: '36px',
    transition: 'color 0.2s ease',
  },

  '& .MuiTypography-root': {
    color: selected ? 'white' : 'rgba(255, 255, 255, 1)',
    fontWeight: 400, // Más delgado que el anterior (600 para seleccionado)
    fontSize: '0.875rem', // 14px (el segundo ejemplo usa un tamaño ligeramente menor)
    lineHeight: 1.43,
    letterSpacing: '0.01071em',
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    transition: 'color 0.2s ease',
  },

  // Estado hover
  '&:hover': {
    backgroundColor: selected ? theme.palette.primary.main : 'rgba(255, 255, 255, 0.08)',
    '& .MuiListItemIcon-root': {
      color: 'white',
    },
    '& .MuiTypography-root': {
      color: 'white',
    },
  },

  // Estado seleccionado
  backgroundColor: selected ? theme.palette.primary.main : 'transparent',
}));

const Dashboard = () => {
  const TAB_CONFIG = useMemo(() => [
  { path: 'monitoreo', component: <MonitoreoTab />, label: "Monitoreo", icon: <MonitorIcon />, title: "Monitoreo de Limpieza" },
  { path: 'analisis', component: <AnalisisTab />, label: "Calendario", icon: <CalendarIcon />, title: "Calendario" },
  { path: 'parte', component: <ParteTab />, label: "Parte", icon: <AssignmentIcon />, title: "Parte del Personal" },
  { path: 'personal', component: <EmpleadosTab />, label: "Personal", icon: <PeopleIcon />, title: "Gestión de Personal" },
  { path: 'locales', component: <LocalesTab />, label: "Locales", icon: <HomeIcon />, title: "Gestión de Locales" },
  { path: 'tablero', component: <TableroTab />, label: "Tablero", icon: <GridIcon />, title: "Tablero de Asignaciones" },
  { path: 'admin-config', component: <AdminConfigTab />, label: "Configuración", icon: <SettingsIcon />, title: "Configuración del Sistema"}
], []);

  const [tabValue, setTabValue] = useState(0);
  const { user, logout } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [user, navigate, location]);

  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const currentRoute = pathSegments[1] || 'monitoreo';

    const currentTabIndex = TAB_CONFIG.findIndex(tab => tab.path === currentRoute);
    if (currentTabIndex !== -1) {
      setTabValue(currentTabIndex);
    }
  }, [location.pathname, TAB_CONFIG]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    navigate(`/dashboard/${TAB_CONFIG[newValue].path}`, { replace: true });
    if (isMobile) setMobileOpen(false);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  };

  // Contenido del SideNav
  const drawerContent = (
    <SideNavRoot>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%'
      }}>
        {/* Contenedor del logo */}
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 2,
          px: 1,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <img 
            src={hospitalNavalLogo} 
            alt="Hospital Naval Logo"
            style={whiteLogoStyle}
          />
        </Box>

        {/* Lista de items (contenido existente) */}
        <List component="nav" sx={{ 
          p: 1, 
          flexGrow: 1,
          overflowY: 'auto' // Scroll interno si es necesario
        }}>
          {TAB_CONFIG.map((tab, index) => (
            <SideNavItem
              key={index}
              button
              selected={tabValue === index}
              onClick={(event) => handleTabChange(event, index)}
            >
              <ListItemIcon>{tab.icon}</ListItemIcon>
              <ListItemText primary={tab.label} />
            </SideNavItem>
          ))}
        </List>
      </Box>
    </SideNavRoot>
  );
  
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
    
    {/* Sidebar para desktop y mobile */}  
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          disableScrollLock: true,
          keepMounted: true,
          BackdropProps: {
            invisible: true // Elimina completamente el backdrop
          }
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            height: 'calc(100% - 32px)',
            margin: '16px 16px 0 16px',
            borderRadius: '12px 0 0 12px',
            border: 'none',
            boxShadow: theme.shadows[16],
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: theme.zIndex.drawer,
            overflowY: 'auto',
            transform: mobileOpen ? 'translateX(0)' : `translateX(-${drawerWidth + 16}px)`,
            transition: theme.transitions.create('transform', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box',
            width: drawerWidth,
            border: 'none',
            background: theme.palette.background.sidenav || '#37373d',
            overflow: 'hidden',
            position: 'fixed',
            height: 'calc(100% - 32px)', // 16px arriba y abajo
            margin: '16px 16px 0 16px',
            borderRadius: '12px 0 0 12px',
            boxShadow: theme.shadows[16]
          }
        }}
        open
      >
        {drawerContent}
      </Drawer>

    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100vh',
      ml: { md: `calc(${drawerWidth}px + 24px)` }, // Solo margen en desktop
      //width: { md: `calc(100% - ${drawerWidth}px)` },
      position: 'relative',
      p: 3
    }}>

      {/* AppBar */}
        <AppBar
          position="sticky"
          sx={{
            mx: 'auto', // Centrado horizontal
            // Estilos específicos del computado CSS
            backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.6)' : 'transparent',
            backdropFilter: scrolled ? 'saturate(2) blur(30px)' : 'none',
            boxShadow: scrolled ? theme.shadows[1] : 'none',
            color: scrolled ? '#344767' : '#7b809a',
            height: '75px',
            minHeight: '4.6875rem', // 75px
            top: '0.75rem', // 12px
            borderRadius: '0.75rem', // 12px
            padding: '0.5rem 0',
            
            // Propiedades de layout
            display: 'grid',
            alignItems: 'center',
            
            // Transiciones
            transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
            
            // Estilos para pantallas pequeñas
            [theme.breakpoints.down('sm')]: {
              minHeight: '3.75rem', // 60px en móviles
            },
            
            // Estilos heredados
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            zIndex: 1100,
            position: 'sticky',
            left: 'auto',
            right: 0,
            flexShrink: 0,
            boxSizing: 'border-box',
          }}
        >
          <Toolbar disableGutters sx={{ 
            minHeight: '64px !important',
            px: 2,
            justifyContent: 'space-between'
          }}>
            {/* Título */}
            <Typography
              variant="h6"
              component="h6"
              noWrap
              sx={{
                fontWeight: 600,
                color: '#344767',
                fontSize: '1rem',
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                lineHeight: 1.5,
                letterSpacing: '0.00938em'
              }}
            >
              {TAB_CONFIG[tabValue].title}
            </Typography>

            {/* User controls */}
              <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              pr: 3,
              '& .MuiIconButton-root': {
                color: '#344767', // Siempre color oscuro
                opacity: scrolled ? 1 : 0.6, // Opacidad reducida cuando AppBar es transparente
                transition: 'opacity 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(52, 71, 103, 0.1)'
                }
              },
              '& .MuiAvatar-root': {
                borderColor: scrolled ? 'rgba(52, 71, 103, 0.2)' : 'rgba(52, 71, 103, 0.1)'
              },
              '& .MuiTypography-root': {
                color: '#344767', // Siempre color oscuro
                opacity: scrolled ? 1 : 0.6 // Opacidad reducida cuando AppBar es transparente
              }
            }}>
              {/* Only show MenuIcon on mobile */}
              {isMobile && (
                <IconButton
                  edge="start"
                  color="inherit"
                  onClick={handleDrawerToggle}
                  sx={{
                    ml: 2,
                    zIndex: (theme) => mobileOpen ? theme.zIndex.drawer + 1 : theme.zIndex.appBar + 1,
                    color: '#344767', // Color oscuro fijo
                    opacity: scrolled ? 1 : 0.6 // Opacidad variable
                  }}
                >
                  <MenuIcon />
                </IconButton>
              )}

              <Typography variant="body2" sx={{
                color: '#344767', // Color oscuro fijo
                opacity: scrolled ? 1 : 0.6, // Opacidad variable
                fontWeight: 500,
                display: { xs: 'none', sm: 'block' }
              }}>
                {user?.username || user?.email}
              </Typography>

              <Tooltip title="Tu perfil">
                <Avatar sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'rgba(52, 71, 103, 0.1)', // Fondo oscuro claro
                  color: '#344767', // Color oscuro fijo
                  opacity: scrolled ? 1 : 0.6, // Opacidad variable
                  border: '1px solid rgba(52, 71, 103, 0.2)',
                }}>
                  {user?.username?.charAt(0) || user?.email?.charAt(0) || 'A'}
                </Avatar>
              </Tooltip>

              <Tooltip title="Cerrar sesión">
                <IconButton
                  onClick={handleLogout}
                  sx={{ 
                    color: '#344767', // Color oscuro fijo
                    opacity: scrolled ? 1 : 0.6 // Opacidad variable
                  }}
                >
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          py: 3,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
            {TAB_CONFIG[tabValue].component}
          </Box>
        </Box>
    </LocalizationProvider>
  );
};

export default Dashboard;