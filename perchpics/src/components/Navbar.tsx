import { Link, useNavigate, useLocation } from 'react-router-dom';
import atProtoService from '../services/atproto';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleLogout = () => {
    atProtoService.logout();
    navigate('/login');
    window.location.reload(); // Force reload to clear state
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          PerchPics
        </Link>
        <div className="navbar-links">
          <Link 
            to="/" 
            className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link 
            to="/upload" 
            className={`navbar-link ${location.pathname === '/upload' ? 'active' : ''}`}
          >
            Upload
          </Link>
          <Link 
            to={`/profile/${atProtoService.getCurrentUserDid()}`} 
            className={`navbar-link ${location.pathname.startsWith('/profile') ? 'active' : ''}`}
          >
            Profile
          </Link>
          <Link 
            to="/moderation" 
            className={`navbar-link ${location.pathname === '/moderation' ? 'active' : ''}`}
          >
            HMA Review
          </Link>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 