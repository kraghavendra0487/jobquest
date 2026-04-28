import { Navigate } from 'react-router-dom';

export function RequireAdmin({ userData, children }) {
  if (userData?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
