import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { authAPI } from '../services/api';

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading'); // loading | authenticated | unauthenticated
  const [user, setUser] = useState(null);

  useEffect(() => {
    authAPI.me()
      .then((res) => {
        setUser(res.data);
        setStatus('authenticated');
      })
      .catch(() => {
        setStatus('unauthenticated');
      });
  }, []);

  if (status === 'loading') {
    return <div className="dashboard">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" />;
  }

  // Pass user data down to children via props
  return typeof children === 'function' ? children(user) : children;
}

export default ProtectedRoute;
