import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import ItemTag from '../components/ItemTag';
import Loading from '../components/Loading';
import Notice from '../components/Notice';

export default function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('lost');
  const [lost, setLost] = useState(null);
  const [found, setFound] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () =>
    Promise.all([api.get('/lost/mine'), api.get('/found/mine')])
      .then(([l, f]) => { setLost(l.data.items); setFound(f.data.items); })
      .catch((e) => setError(errMsg(e)));

  useEffect(() => { load(); }, []);

  const act = async (fn, msg) => {
    setError('');
    try {
      await fn();
      setNotice(msg);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const remove = (type, item) => {
    if (!window.confirm(`Delete the report for "${item.itemName}"? This cannot be undone.`)) return;
    act(() => api.delete(`/${type}/${item._id}`), 'Report deleted');
  };

  if (!lost || !found) return error ? <div className="page"><Notice kind="error">{error}</Notice></div> : <Loading />;

  const withMatches = lost.filter((i) => i.status === 'matched').length;
  const pendingClaims = found.reduce((n, i) => n + (i.pendingClaims || 0), 0);
  const items = tab === 'lost' ? lost : found;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Hello, {user.name.split(' ')[0]}</h1>
          <p className="muted">
            {lost.length} lost report{lost.length === 1 ? '' : 's'}
            {withMatches > 0 && <>, <strong>{withMatches} with possible matches</strong></>}.{' '}
            {found.length} found item{found.length === 1 ? '' : 's'}
            {pendingClaims > 0 && <>, <strong>{pendingClaims} claim{pendingClaims > 1 ? 's' : ''} waiting for your review</strong></>}.
          </p>
        </div>
        <div className="head-actions">
          <Link to="/report/lost" className="btn btn-lost">Report lost item</Link>
          <Link to="/report/found" className="btn btn-found">Report found item</Link>
        </div>
      </header>

      <Notice kind="error" onClose={() => setError('')}>{error}</Notice>
      <Notice kind="success" onClose={() => setNotice('')}>{notice}</Notice>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'lost'} className={tab === 'lost' ? 'active' : ''} onClick={() => setTab('lost')}>
          Things I lost ({lost.length})
        </button>
        <button role="tab" aria-selected={tab === 'found'} className={tab === 'found' ? 'active' : ''} onClick={() => setTab('found')}>
          Things I found ({found.length})
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          {tab === 'lost' ? (
            <>
              <p>You have not reported anything lost.</p>
              <Link to="/report/lost" className="btn btn-primary">Report a lost item</Link>
            </>
          ) : (
            <>
              <p>You have not registered anything you found.</p>
              <Link to="/report/found" className="btn btn-primary">Report a found item</Link>
            </>
          )}
        </div>
      ) : (
        <div className="tag-grid">
          {items.map((item) => (
            <ItemTag key={item._id} item={item} type={tab}>
              {tab === 'lost' ? (
                <>
                  {['open', 'matched'].includes(item.status) && (
                    <Link to={`/lost/${item._id}/matches`} className="btn btn-sm btn-primary">See matches</Link>
                  )}
                  {item.status !== 'returned' && <Link to={`/edit/lost/${item._id}`} className="btn btn-sm btn-ghost">Edit</Link>}
                  {['open', 'matched'].includes(item.status) && (
                    <button className="btn btn-sm btn-ghost" onClick={() => act(() => api.patch(`/lost/${item._id}/status`, { status: 'closed' }), 'Report closed')}>
                      I got it back
                    </button>
                  )}
                  {item.status === 'closed' && (
                    <button className="btn btn-sm btn-ghost" onClick={() => act(() => api.patch(`/lost/${item._id}/status`, { status: 'open' }), 'Report reopened')}>
                      Reopen
                    </button>
                  )}
                  <button className="btn btn-sm btn-danger-ghost" onClick={() => remove('lost', item)}>Delete</button>
                </>
              ) : (
                <>
                  {item.pendingClaims > 0 && (
                    <Link to="/claims?tab=received" className="btn btn-sm btn-primary">Review {item.pendingClaims} claim{item.pendingClaims > 1 ? 's' : ''}</Link>
                  )}
                  {item.status !== 'returned' && <Link to={`/edit/found/${item._id}`} className="btn btn-sm btn-ghost">Edit</Link>}
                  <button className="btn btn-sm btn-danger-ghost" onClick={() => remove('found', item)}>Delete</button>
                </>
              )}
            </ItemTag>
          ))}
        </div>
      )}
    </div>
  );
}
