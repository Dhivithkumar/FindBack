import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import api, { errMsg, imgUrl } from '../api';
import Loading from '../components/Loading';
import Notice from '../components/Notice';
import StatusBadge from '../components/StatusBadge';
import { fmtDate } from '../utils/format';

function Score({ value }) {
  const level = value >= 70 ? 'high' : value >= 50 ? 'mid' : 'low';
  return (
    <div className={`score score-${level}`} aria-label={`Match score ${value} out of 100`}>
      <span className="score-num">{value}</span>
      <span className="score-label">{level === 'high' ? 'Strong match' : level === 'mid' ? 'Likely' : 'Possible'}</span>
      <span className="score-bar"><span style={{ width: `${value}%` }} /></span>
    </div>
  );
}

// Module 5: ranked possible matches for one lost report
export default function Matches() {
  const { id } = useParams();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/lost/${id}/matches`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [id]);

  if (error) return <div className="page"><Notice kind="error">{error}</Notice></div>;
  if (!data) return <Loading text="Comparing with found items…" />;

  const { lost, matches } = data;

  return (
    <div className="page">
      <Link to={`/items/lost/${lost._id}`} className="back-link">Back to my lost report</Link>
      {location.state?.fresh && (
        <Notice kind="success">Your report is saved, and these found items already look similar.</Notice>
      )}

      <header className="page-head">
        <div>
          <h1>Possible matches for your {lost.itemName}</h1>
          <p className="muted">
            Each found item is scored out of 100 on category, name, description, location and timing.
            Open one to check the photo, then claim it if it is yours.
          </p>
        </div>
      </header>

      {!['open', 'matched'].includes(lost.status) ? (
        <div className="empty">
          <p>This report is <StatusBadge status={lost.status} />, so we stopped looking for matches.</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="empty">
          <p>No found item looks like yours yet. You will get a notification as soon as one does.</p>
          <Link to={`/browse?type=found&category=${lost.category?._id || ''}`} className="btn btn-ghost">Browse found {lost.category?.name || 'items'}</Link>
        </div>
      ) : (
        <ol className="match-list">
          {matches.map(({ item, score, breakdown, myClaim }) => (
            <li key={item._id} className="match card">
              <div className="match-photo">
                {item.image ? <img src={imgUrl(item.image)} alt={item.itemName} /> : <div className="photo-empty">No photo</div>}
              </div>
              <div className="match-body">
                <h2><Link to={`/items/found/${item._id}`}>{item.itemName}</Link></h2>
                <p className="muted">Found at {item.location} on {fmtDate(item.foundAt)} by {item.finder?.name}</p>
                <p className="match-desc">{item.description}</p>
                <ul className="reasons">
                  <li className={breakdown.category ? 'yes' : 'no'}>{breakdown.category ? 'Same category' : 'Different category'}</li>
                  <li className={breakdown.name >= 50 ? 'yes' : 'no'}>Name {breakdown.name}% similar</li>
                  <li className={breakdown.description >= 30 ? 'yes' : 'no'}>Description {breakdown.description}% similar</li>
                  <li className={breakdown.location >= 50 ? 'yes' : 'no'}>Location {breakdown.location}% similar</li>
                  <li className={breakdown.timing === 'consistent' ? 'yes' : 'no'}>Timing {breakdown.timing}</li>
                </ul>
              </div>
              <div className="match-side">
                <Score value={score} />
                {myClaim ? (
                  <Link to={`/claims/${myClaim._id}`} className="btn btn-ghost btn-sm">Claim: <StatusBadge status={myClaim.status} /></Link>
                ) : (
                  <Link to={`/items/found/${item._id}?claimWith=${lost._id}`} className="btn btn-primary btn-sm">This is mine</Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
