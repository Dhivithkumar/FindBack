import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  ['Report it', 'Lost something? Describe it and where you last saw it. Found something? Add a photo and where it is being kept.'],
  ['Get matched', 'FindBack compares every lost report with every found item and tells you when one looks like yours.'],
  ['Prove it is yours', 'Claim the item by describing details that are not shown publicly. The finder checks them before approving.'],
  ['Collect it', 'Once approved, you see where to pick it up. The finder marks it returned and the case is closed.'],
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
          <h1>Lost it? Found it? Bring it back.</h1>
          <p className="lead">
            FindBack is the lost-and-found desk for your campus, hostel, library or office. Report what went
            missing, register what you picked up, and let matching do the searching.
          </p>
          {stats && (
            <p className="hero-stats">
              {stats.lost} lost reports, {stats.found} found items, {stats.returned} returned to their owners so far.
            </p>
          )}
        </div>
        <div className="hero-tags">
          <Link to={user ? '/report/lost' : '/register'} className="hero-tag tag-lost">
            <span className="tag-hole" aria-hidden="true" />
            <span className="hero-tag-title">I lost something</span>
            <span className="hero-tag-sub">Report a lost item</span>
          </Link>
          <Link to={user ? '/report/found' : '/register'} className="hero-tag tag-found">
            <span className="tag-hole" aria-hidden="true" />
            <span className="hero-tag-title">I found something</span>
            <span className="hero-tag-sub">Register a found item</span>
          </Link>
        </div>
      </section>

      <section className="steps" aria-labelledby="how">
        <h2 id="how">How an item gets back to its owner</h2>
        <ol className="step-list">
          {STEPS.map(([title, text]) => (
            <li key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        {!user && (
          <p className="steps-cta">
            <Link to="/register" className="btn btn-primary">Create a free account</Link>
            <Link to="/login" className="btn btn-ghost">I already have one</Link>
          </p>
        )}
      </section>
    </div>
  );
}
