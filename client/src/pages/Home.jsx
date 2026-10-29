import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  {
    num: '01',
    title: 'Report with Photo',
    text: 'Lost an item? Pin it with photos and where you last saw it. Found something? Register it and store private verification notes.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Automated AI Matching',
    text: 'Our multi-factor matching engine analyzes category, title overlap, description keywords, and location to notify you instantly.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Verify Secret Proof',
    text: 'Claim your item by revealing details only the owner knows. The finder compares them side-by-side with their secret notes.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    num: '04',
    title: 'Safe Pickup & Return',
    text: 'Once approved, pickup coordinates and contact information are revealed. Handover is confirmed and the case is closed.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/items/stats').then((r) => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-text">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span>The Modern Lost & Found Hub</span>
          </div>
          <h1>Lost it? Found it? Bring it back.</h1>
          <p className="lead">
            FindBack replaces paper pinboards and chaotic chat groups with automated match intelligence,
            confidential proof-of-ownership verification, and smooth item recovery.
          </p>

          <div className="hero-metrics">
            <div className="hero-stat-card">
              <span className="hero-stat-num">{stats ? stats.lost : '–'}</span>
              <span className="hero-stat-label">Lost Reports</span>
            </div>
            <div className="hero-stat-card">
              <span className="hero-stat-num">{stats ? stats.found : '–'}</span>
              <span className="hero-stat-label">Found Items</span>
            </div>
            <div className="hero-stat-card highlight">
              <span className="hero-stat-num">{stats ? stats.returned : '–'}</span>
              <span className="hero-stat-label">Returned to Owners</span>
            </div>
          </div>

          <div className="hero-actions">
            <Link to={user ? '/report/lost' : '/register'} className="btn btn-lost btn-lg">
              <span>Report a lost item</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </Link>
            <Link to={user ? '/report/found' : '/register'} className="btn btn-found btn-lg">
              <span>Register a found item</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </Link>
            <Link to="/browse" className="btn btn-ghost btn-lg">
              <span>Browse board</span>
            </Link>
          </div>
        </div>

        <div className="hero-tags-container">
          <div className="hero-ambient-glow" aria-hidden="true" />
          <div className="hero-tags">
            <Link to={user ? '/report/lost' : '/register'} className="hero-tag tag-lost">
              <span className="tag-string" aria-hidden="true" />
              <span className="tag-hole" aria-hidden="true"><span className="tag-grommet" /></span>
              <span className="hero-tag-kind">LOST REPORT</span>
              <span className="hero-tag-title">I lost something</span>
              <span className="hero-tag-sub">Pin details & get matched →</span>
            </Link>
            <Link to={user ? '/report/found' : '/register'} className="hero-tag tag-found">
              <span className="tag-string" aria-hidden="true" />
              <span className="tag-hole" aria-hidden="true"><span className="tag-grommet" /></span>
              <span className="hero-tag-kind">FOUND REPORT</span>
              <span className="hero-tag-title">I found something</span>
              <span className="hero-tag-sub">Safe storage & verification →</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="steps-section" aria-labelledby="how">
        <div className="section-head">
          <span className="section-eyebrow">HOW IT WORKS</span>
          <h2 id="how">Four simple steps from lost to found</h2>
          <p className="muted">Engineered to prevent fraudulent claims while keeping community recovery effortless.</p>
        </div>

        <div className="steps-grid">
          {STEPS.map((s) => (
            <div key={s.num} className="step-card">
              <div className="step-card-top">
                <span className="step-icon">{s.icon}</span>
                <span className="step-num">{s.num}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>

        {!user && (
          <div className="steps-cta card">
            <div>
              <h3>Ready to find your belongings?</h3>
              <p className="muted">Join your campus and community network in seconds.</p>
            </div>
            <div className="steps-cta-buttons">
              <Link to="/register" className="btn btn-primary">Create a free account</Link>
              <Link to="/login" className="btn btn-ghost">Log in</Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
