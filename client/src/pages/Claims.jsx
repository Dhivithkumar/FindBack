import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errMsg, imgUrl } from '../api';
import Loading from '../components/Loading';
import Notice from '../components/Notice';
import StatusBadge from '../components/StatusBadge';
import { timeAgo } from '../utils/format';

export default function Claims() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'received' ? 'received' : 'mine';
  const [mine, setMine] = useState(null);
  const [received, setReceived] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/claims/mine'), api.get('/claims/received')])
      .then(([a, b]) => { setMine(a.data.claims); setReceived(b.data.claims); })
      .catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <div className="page"><Notice kind="error">{error}</Notice></div>;
  if (!mine || !received) return <Loading />;

  const waiting = received.filter((c) => c.status === 'pending').length;
  const list = tab === 'mine' ? mine : received;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Claims</h1>
          <p className="muted">Items you asked for, and requests from people who say they own something you found.</p>
        </div>
      </header>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'active' : ''} onClick={() => setParams({})}>
          My claims ({mine.length})
        </button>
        <button role="tab" aria-selected={tab === 'received'} className={tab === 'received' ? 'active' : ''} onClick={() => setParams({ tab: 'received' })}>
          On items I found ({received.length}){waiting > 0 && <span className="nav-count">{waiting}</span>}
        </button>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          {tab === 'mine' ? (
            <>
              <p>You have not claimed anything yet. When you spot your item, open it and choose “Claim this item”.</p>
              <Link to="/browse?type=found" className="btn btn-ghost">Browse found items</Link>
            </>
          ) : (
            <p>Nobody has claimed an item you found yet. You will be notified when someone does.</p>
          )}
        </div>
      ) : (
        <ul className="row-list">
          {list.map((c) => (
            <li key={c._id}>
              <Link to={`/claims/${c._id}`} className={`row ${c.status === 'pending' && tab === 'received' ? 'row-attention' : ''}`}>
                <span className="row-thumb">
                  {c.foundItem?.image ? <img src={imgUrl(c.foundItem.image)} alt="" /> : <span>{c.foundItem?.itemName?.[0] || '?'}</span>}
                </span>
                <span className="row-main">
                  <strong>{c.foundItem?.itemName || 'Removed item'}</strong>
                  <span className="muted">
                    {tab === 'mine' ? `Found by ${c.finder?.name}` : `Claimed by ${c.claimant?.name}`}, {timeAgo(c.createdAt)}
                  </span>
                </span>
                <StatusBadge status={c.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
