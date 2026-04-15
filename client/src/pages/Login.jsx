import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Auth.css';

function Login() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    authAPI.me()
      .then(() => navigate('/dashboard'))
      .catch(() => setChecking(false));
  }, [navigate]);

  if (checking) {
    return <div className="auth-container"><div className="auth-box">Loading...</div></div>;
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Practice Tracker</h2>
        <h3>Sign in to continue</h3>
        <a href={authAPI.googleLoginUrl} className="google-btn">
          Sign in with Google
        </a>
      </div>
    </div>
  );
}

export default Login;
