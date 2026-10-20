import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api, { errMsg, imgUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import Notice from '../components/Notice';
import StatusBadge from '../components/StatusBadge';
import { fmtDate, fmtDateTime, tagNo } from '../utils/format';

function ClaimForm({ item, preselectLost, onDone }) {
  const [myLost, setMyLost] = useState([]);
  const [form, setForm] = useState({ lostItemId: preselectLost || '', identifyingDetails: '', proofNote: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/lost/mine')
      .then((r) => setMyLost(r.data.items.filter((l) => ['open', 'matched'].includes(l.status))))
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/claims', { foundItemId: item._id, ...form, lostItemId: form.lostItemId || undefined });
      onDone(data.claim);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <form className="card form claim-form" onSubmit={submit}>
      <h2>Claim this item</h2>
      <p className="muted">
        The finder kept some details private. Describe what only the owner would know; they will compare it
        before approving.
      </p>
      <Notice kind="error">{error}</Notice>
      {myLost.length > 0 && (
        <label className="field">
          <span>Link to your lost report <em>(optional)</em></span>
          <select value={form.lostItemId} onChange={(e) => setForm({ ...form, lostItemId: e.target.value })}>
            <option value="">Do not link a report</option>
            {myLost.map((l) => <option key={l._id} value={l._id}>{l.itemName}, lost {fmtDate(l.lostAt)}</option>)}
          </select>
          <small>Linking marks your lost report as returned when you get the item back.</small>
        </label>
      )}
      <label className="field">
        <span>Identifying details</span>
        <textarea required rows={4} maxLength={1000} value={form.identifyingDetails}
          onChange={(e) => setForm({ ...form, identifyingDetails: e.target.value })}
          placeholder="e.g. Lock screen is a photo of a beach. Small crack on the bottom-left corner. Initials R.K. on the case." />
      </label>
      <label className="field">
        <span>Anything else <em>(optional)</em></span>
        <textarea rows={2} maxLength={500} value={form.proofNote}
          onChange={(e) => setForm({ ...form, proofNote: e.target.value })}
          placeholder="Where and when you lost it, a receipt you can show, a good time to collect…" />
      </label>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending claim…' : 'Send claim'}</button>
    </form>
  );
}

function FlagForm({ type, id, onDone }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  if (msg) return <p className="muted small">{msg}</p>;
  if (!open) return <button className="btn-link small" onClick={() => setOpen(true)}>Report this listing</button>;

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post(`/items/${type}/${id}/flag`, { reason });
      setMsg(data.message);
      onDone?.();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <form className="flag-form" onSubmit={submit}>
      <Notice kind="error">{error}</Notice>
      <label className="field">
        <span>What is wrong with this listing?</span>
        <input required maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Spam, offensive, fake, or a duplicate" />
      </label>
      <div className="row-gap">
        <button className="btn btn-sm btn-danger-ghost">Send to administrators</button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

export default function ItemDetail() {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(location.state?.flash || '');
  const [showClaim, setShowClaim] = useState(Boolean(searchParams.get('claimWith')));

  const load = useCallback(() => {
    setError('');
    return api.get(`/${type}/${id}`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [type, id]);

  useEffect(() => { load(); }, [load]);

  if (error && !data) {
    return (
      <div className="page narrow empty">
        <Notice kind="error">{error}</Notice>
        <Link to="/browse" className="btn btn-ghost">Back to the board</Link>
      </div>
    );
  }
  if (!data) return <Loading />;

  const { item, isOwner, myClaim, claimCount } = data;
  const isLost = type === 'lost';
  const isAdmin = user.role === 'admin';
  const owner = isLost ? item.reporter : item.finder;
  const canManage = isOwner || isAdmin;

  const run = async (fn, msg) => {
    try {
      await fn();
      setFlash(msg);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this report? This cannot be undone.')) return;
    try {
      await api.delete(`/${type}/${id}`);
      navigate(isOwner ? '/dashboard' : '/admin?tab=reports');
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const canClaim = !isLost && !isOwner && item.status === 'available' && (!myClaim || ['rejected', 'withdrawn'].includes(myClaim.status));

  return (
    <div className="page">
      <Link to={isOwner ? '/dashboard' : '/browse'} className="back-link">
        {isOwner ? 'Back to my reports' : 'Back to the board'}
      </Link>

      <Notice kind="success" onClose={() => setFlash('')}>{flash}</Notice>
      <Notice kind="error" onClose={() => setError('')}>{error}</Notice>
      {item.isHidden && <Notice kind="warn">This report is hidden from other users by an administrator.</Notice>}

      <article className={`detail detail-${type}`}>
        <div className="detail-photo">
          {item.image ? <img src={imgUrl(item.image)} alt={item.itemName} /> : <div className="photo-empty big">No photo</div>}
        </div>

        <div className="detail-body">
          <div className="detail-kicker">
            <span className={`kind-chip kind-${type}`}>{isLost ? 'Lost' : 'Found'}</span>
            <span className="muted">No. {tagNo(item._id)}</span>
            <StatusBadge status={item.status} />
          </div>
          <h1>{item.itemName}</h1>
          <p className="detail-desc">{item.description}</p>

          <dl className="facts">
            <div><dt>Category</dt><dd>{item.category?.name}</dd></div>
            <div><dt>{isLost ? 'Last seen at' : 'Found at'}</dt><dd>{item.location}</dd></div>
            <div><dt>{isLost ? 'Lost on' : 'Found on'}</dt><dd>{fmtDateTime(isLost ? item.lostAt : item.foundAt)}</dd></div>
            <div><dt>{isLost ? 'Reported by' : 'Found by'}</dt><dd>{isOwner ? 'You' : owner?.name}</dd></div>
            {item.storageLocation && <div><dt>Kept at</dt><dd>{item.storageLocation}</dd></div>}
            {item.status === 'returned' && item.returnedAt && (
              <div><dt>Returned</dt><dd>{fmtDate(item.returnedAt)}{item.returnedTo?.name ? ` to ${item.returnedTo.name}` : ''}</dd></div>
            )}
            {isAdmin && !isOwner && owner?.email && <div><dt>Owner contact</dt><dd>{owner.email}{owner.phone ? `, ${owner.phone}` : ''}</dd></div>}
          </dl>

          {!isLost && canManage && item.hiddenDetails !== undefined && (
            <div className="private-box">
              <h2>Private details</h2>
              <p>{item.hiddenDetails || 'You did not record any private details. Edit the report to add some; they make claims easier to check.'}</p>
              <small>Only you and administrators can see this.</small>
            </div>
          )}

          {canManage && (
            <div className="detail-actions">
              {isLost && ['open', 'matched'].includes(item.status) && (
                <Link to={`/lost/${item._id}/matches`} className="btn btn-primary">See possible matches</Link>
              )}
              {!isLost && claimCount > 0 && (
                <Link to="/claims?tab=received" className="btn btn-primary">Review {claimCount} claim{claimCount > 1 ? 's' : ''}</Link>
              )}
              {isOwner && item.status !== 'returned' && <Link to={`/edit/${type}/${item._id}`} className="btn btn-ghost">Edit</Link>}
              {isLost && ['open', 'matched'].includes(item.status) && (
                <button className="btn btn-ghost" onClick={() => run(() => api.patch(`/lost/${id}/status`, { status: 'closed' }), 'Report closed')}>I got it back</button>
              )}
              {isLost && item.status === 'closed' && (
                <button className="btn btn-ghost" onClick={() => run(() => api.patch(`/lost/${id}/status`, { status: 'open' }), 'Report reopened')}>Reopen</button>
              )}
              {!isLost && item.status === 'available' && (
                <button className="btn btn-ghost" onClick={() => {
                  if (window.confirm('Mark as returned? Use this when you handed it back without a claim on FindBack.')) {
                    run(() => api.patch(`/found/${id}/status`, { status: 'returned' }), 'Marked as returned');
                  }
                }}>Mark returned</button>
              )}
              <button className="btn btn-danger-ghost" onClick={remove}>Delete</button>
            </div>
          )}

          {!isOwner && isLost && item.status !== 'returned' && (
            <div className="hint-box">
              <p>Have you found this? Register it as a found item and the owner will be notified.</p>
              <Link to="/report/found" className="btn btn-found">Report it found</Link>
            </div>
          )}

          {!isOwner && !isLost && myClaim && !['rejected', 'withdrawn'].includes(myClaim.status) && (
            <div className="hint-box">
              <p>You claimed this item. Status: <StatusBadge status={myClaim.status} /></p>
              <Link to={`/claims/${myClaim._id}`} className="btn btn-ghost">Open my claim</Link>
            </div>
          )}

          {canClaim && !showClaim && (
            <div className="hint-box">
              <p>{myClaim ? 'Your earlier claim was not approved. You can send a new one with more detail.' : 'Is this yours?'}</p>
              <button className="btn btn-primary" onClick={() => setShowClaim(true)}>Claim this item</button>
            </div>
          )}

          {!isOwner && <div className="flag-wrap"><FlagForm type={type} id={id} /></div>}
        </div>
      </article>

      {canClaim && showClaim && (
        <ClaimForm item={item} preselectLost={searchParams.get('claimWith')} onDone={(claim) => navigate(`/claims/${claim._id}`, { state: { flash: 'Claim sent. The finder has been notified.' } })} />
      )}
    </div>
  );
}
