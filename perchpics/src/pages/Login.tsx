import { useState } from 'react';
import atProtoService from '../services/atproto';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login = ({ onLoginSuccess }: LoginProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const success = await atProtoService.login(username, password);
      
      if (success) {
        onLoginSuccess();
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const useTestAccount = () => {
    setUsername('demo');
    setPassword('perchpics123');
  };

  return (
    <div className="login-container">
      <div className="card login-card">
        <h1>PerchPics</h1>
        <p className="login-subtitle">A custom photo sharing app with its own PDS</p>
        
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={isLoading}
              required
            />
          </div>
          
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="divider"></div>
        
        <div className="test-account">
          <p><strong>Demo Account</strong></p>
          <p>Use our demo account to explore PerchPics:</p>
          <p>Username: demo</p>
          <p>Password: perchpics123</p>
          <button 
            className="text-button" 
            onClick={useTestAccount}
            disabled={isLoading}
          >
            Use Demo Account
          </button>
        </div>
        
        <div className="divider"></div>
        
        <p className="login-info">
          PerchPics is built on the <a href="https://atproto.com" target="_blank" rel="noopener noreferrer">AT Protocol</a>.
          <br />
          This is a demonstration app with its own Personal Data Server (PDS).
          <br />
          <strong>Note:</strong> Photos posted here will not appear on Bluesky.
        </p>
      </div>
    </div>
  );
};

export default Login; 