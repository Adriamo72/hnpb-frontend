import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const PrivateRoute = ({ children, roles = [] }) => {
  const { user, isAdmin } = useAppContext();
  const location = useLocation();

  // Si no hay usuario, redirigir a login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificación de roles si se especifican
  if (roles.length > 0) {
    const hasRole = roles.includes('admin') ? isAdmin : true;
    if (!hasRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default PrivateRoute;