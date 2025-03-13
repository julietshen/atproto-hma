import { Link, useLocation } from 'react-router-dom';
import atProtoService from '../services/atproto';

const Navbar = () => {
  const location = useLocation();
  
  const handleLogout = () => {
    atProtoService.logout();
    window.location.href = '/login';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/home" className="navbar-logo">
          PerchPics
        </Link>
        <div className="navbar-links">
          <Link to="/home" className={location.pathname === '/home' ? 'active' : ''}>
            Home
          </Link>
          <Link to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>
            Profile
          </Link>
          <Link to="/upload" className={location.pathname === '/upload' ? 'active' : ''}>
            Upload
          </Link>
          <a
            href="http://localhost:4200"
            target="_blank"
            rel="noopener noreferrer"
          >
            Moderation
          </a>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 