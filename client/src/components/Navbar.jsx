import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout, unread } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  const isDark = theme === 'dark';

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to={user ? '/dashboard' : '/'} className="brand">
          <span className="brand-mark" aria-hidden="true" />
          FindBack
        </Link>
        <div className="nav-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? (
              <svg
                className="theme-icon sun-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4.5" />
                <line x1="12" y1="1" x2="12" y2="3.5" />
                <line x1="12" y1="20.5" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.99" y2="5.99" />
                <line x1="18.01" y1="18.01" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3.5" y2="12" />
                <line x1="20.5" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.99" y2="18.01" />
                <line x1="18.01" y1="5.99" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg
                className="theme-icon moon-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
            <span className="theme-toggle-text">{isDark ? 'Light' : 'Dark'}</span>
          </button>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
        <nav id="main-nav" className={`nav-links${open ? ' open' : ''}`}>
          {user ? (
            <>
              <NavLink to="/dashboard">My reports</NavLink>
              <NavLink to="/browse">Browse</NavLink>
              <NavLink to="/report/lost">Report lost</NavLink>
              <NavLink to="/report/found">Report found</NavLink>
              <NavLink to="/claims">Claims</NavLink>
              <NavLink to="/notifications" className="nav-notif">
                Notifications
                {unread > 0 && (
                  <span className="nav-count" aria-label={`${unread} unread`}>
                    <span className="ping-ring" aria-hidden="true" />
                    {unread}
                  </span>
                )}
              </NavLink>
              {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
              <NavLink to="/profile">Profile</NavLink>
              <button type="button" className="nav-logout" onClick={() => { logout(); navigate('/'); }}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <Link to="/register" className="btn btn-primary btn-sm">Create account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
