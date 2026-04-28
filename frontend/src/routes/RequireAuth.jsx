import { Navigate, useLocation } from 'react-router-dom';

export function RequireAuth({ session, children }) {
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
