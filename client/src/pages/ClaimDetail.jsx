import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import api, { errMsg, imgUrl } from '../api';
import Loading from '../components/Loading';
import Notice from '../components/Notice';
import StatusBadge from '../components/StatusBadge';
import { fmtDate, fmtDateTime } from '../utils/format';

const STATUS_HELP = {
  pending: {
    claimant: 'The finder is checking your details. You will be notified when they decide.',
    finder: 'Compare what the claimant wrote with your private details, then approve or reject.',
    admin: 'Waiting for the finder to review.',
  },
  approved: {
    claimant: 'Approved. Contact the finder or go to the pickup location below to collect your item.',
    finder: 'You approved this claim. Hand the item over, then confirm the return.',
    admin: 'Approved and waiting for the handover.',
  },
  rejected: {
    claimant: 'The finder did not approve this claim. If you believe it is yours, you can raise a dispute for an administrator to review.',
    finder: 'You rejected this claim.',
    admin: 'Rejected.',
  },
  disputed: {
    claimant: 'An administrator is reviewing this claim.',
    finder: 'An administrator is reviewing this claim.',
    admin: 'Both sides are waiting for your decision.',
  },
  returned: {
    claimant: 'The item has been returned to you.',
    finder: 'Returned to its owner. Thank you for handing it in.',
    admin: 'Returned.',
  },
  withdrawn: {
    claimant: 'You withdrew this claim.',
    finder: 'The claimant withdrew this claim.',
    admin: 'Withdrawn by the claimant.',
  },
};

// Module 6: claim verification and item return
export default function ClaimDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(location.state?.flash || '');
  const [note, setNote] = useState('');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () => api.get(`/claims/${id}`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e))),
    [id]
  );
  useEffect(() => { load(); }, [load]);

  if (error && !data) return <div className="page"><Notice kind="error">{error}</Notice></div>;
  if (!data) return <Loading />;

  const { claim, role, otherClaims } = data;
  const item = claim.foundItem;
  const canReview = (role === 'finder' && claim.status === 'pending') ||
    (role === 'admin' && ['pending', 'disputed', 'approved', 'rejected'].includes(claim.status));
  const canReturn = (role === 'finder' || role === 'admin') && claim.status === 'approved';
  const canDispute = (role === 'claimant' || role === 'finder') && ['pending', 'rejected', 'approved'].includes(claim.status);
  const canWithdraw = role === 'claimant' && ['pending', 'disputed'].includes(claim.status);
  const contactsShared = ['approved', 'returned'].includes(claim.status) || role === 'admin';

  const run = async (fn, msg) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      setFlash(msg);
      setNote('');
      setDisputeOpen(false);
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const review = (decision) => {
    if (decision === 'approve' && !window.confirm('Approve this claim? Their contact details and the pickup location will be shared, and any other claims on this item will be rejected.')) return;
    run(() => api.patch(`/claims/${id}/review`, { decision, note }), decision === 'approve' ? 'Claim approved' : 'Claim rejected');
  };

  const Person = ({ label, person }) => (
    <div className="person">
      <span className="muted">{label}</span>
      <strong>{person?.name}</strong>
      {contactsShared && person?.email && <a href={`mailto:${person.email}`}>{person.email}</a>}
      {contactsShared && person?.phone && <a href={`tel:${person.phone}`}>{person.phone}</a>}
    </div>
  );

  return (
    <div className="page">
      <Link to={role === 'admin' ? '/admin?tab=claims' : `/claims${role === 'finder' ? '?tab=received' : ''}`} className="back-link">
        Back to claims
      </Link>
      <Notice kind="success" onClose={() => setFlash('')}>{flash}</Notice>
      <Notice kind="error" onClose={() => setError('')}>{error}</Notice>

      <header className="page-head">
        <div>
          <h1>Claim for {item?.itemName || 'a removed item'}</h1>
          <p className="claim-status"><StatusBadge status={claim.status} /> {STATUS_HELP[claim.status]?.[role]}</p>
        </div>
      </header>

      <div className="claim-layout">
        <section className="card claim-item">
          {item?.image ? <img src={imgUrl(item.image)} alt={item.itemName} /> : <div className="photo-empty">No photo</div>}
          {item && (
            <>
              <h2><Link to={`/items/found/${item._id}`}>{item.itemName}</Link></h2>
              <p className="muted">{item.category?.name}. Found at {item.location} on {fmtDate(item.foundAt)}.</p>
              {item.storageLocation && (
                <p className="pickup"><strong>Pickup:</strong> {item.storageLocation}</p>
              )}
            </>
          )}
          <div className="people">
            <Person label="Claimed by" person={claim.claimant} />
            <Person label="Found by" person={claim.finder} />
          </div>
          {!contactsShared && <small className="muted">Contact details are shared once the claim is approved.</small>}
        </section>

        <section className="claim-evidence">
          <div className={`compare ${role === 'claimant' ? 'single' : ''}`}>
            <div className="card compare-col">
              <h2>{role === 'claimant' ? 'What you told the finder' : 'What the claimant says'}</h2>
              <p className="evidence">{claim.identifyingDetails}</p>
              {claim.proofNote && (<><h3>Extra notes</h3><p>{claim.proofNote}</p></>)}
              {claim.lostItem && (
                <p className="muted small">
                  Linked lost report: <Link to={`/items/lost/${claim.lostItem._id}`}>{claim.lostItem.itemName}</Link>,
                  lost at {claim.lostItem.location} on {fmtDate(claim.lostItem.lostAt)}.
                  {claim.matchScore > 0 && <> Match score {claim.matchScore}/100.</>}
                </p>
              )}
              <p className="muted small">Sent {fmtDateTime(claim.createdAt)}</p>
            </div>
            {role !== 'claimant' && (
              <div className="card compare-col private-box">
                <h2>Private details recorded by the finder</h2>
                <p className="evidence">{item?.hiddenDetails || 'No private details were recorded. Ask the claimant a question only the owner could answer before approving.'}</p>
              </div>
            )}
          </div>

          {claim.reviewNote && (
            <div className="card">
              <h3>Review note</h3>
              <p>{claim.reviewNote}</p>
              {claim.reviewedAt && <p className="muted small">{claim.reviewedBy?.role === 'admin' ? 'Administrator' : 'Finder'}, {fmtDateTime(claim.reviewedAt)}</p>}
            </div>
          )}
          {claim.disputeReason && (
            <div className="card warn-card">
              <h3>Dispute</h3>
              <p>{claim.disputeReason}</p>
            </div>
          )}
          {claim.returnedAt && <p className="muted">Returned on {fmtDateTime(claim.returnedAt)}.</p>}

          {canReview && (
            <div className="card review-box">
              <h2>{role === 'admin' && claim.status === 'disputed' ? 'Decide this dispute' : 'Your decision'}</h2>
              <label className="field">
                <span>Note to the claimant <em>(optional)</em></span>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. The wallpaper matches. Collect it from the warden's office after 4 pm." />
              </label>
              <div className="row-gap">
                {claim.status !== 'approved' && <button className="btn btn-found" disabled={busy} onClick={() => review('approve')}>Approve claim</button>}
                {claim.status !== 'rejected' && <button className="btn btn-danger-ghost" disabled={busy} onClick={() => review('reject')}>Reject claim</button>}
              </div>
            </div>
          )}

          {canReturn && (
            <div className="card review-box">
              <h2>Handover</h2>
              <p>When the owner has the item in hand, confirm it here. This closes the claim and both reports.</p>
              <button className="btn btn-primary" disabled={busy}
                onClick={() => window.confirm('Confirm the item has been handed back?') && run(() => api.patch(`/claims/${id}/return`), 'Item marked as returned')}>
                Confirm item returned
              </button>
            </div>
          )}

          {(canDispute || canWithdraw) && (
            <div className="secondary-actions">
              {canWithdraw && (
                <button className="btn btn-ghost btn-sm" disabled={busy}
                  onClick={() => window.confirm('Withdraw this claim?') && run(() => api.patch(`/claims/${id}/withdraw`), 'Claim withdrawn')}>
                  Withdraw claim
                </button>
              )}
              {canDispute && !disputeOpen && (
                <button className="btn btn-ghost btn-sm" onClick={() => setDisputeOpen(true)}>Ask an administrator to review</button>
              )}
            </div>
          )}

          {disputeOpen && (
            <form className="card form" onSubmit={(e) => { e.preventDefault(); run(() => api.patch(`/claims/${id}/dispute`, { reason: disputeReason }), 'Dispute sent to administrators'); }}>
              <label className="field">
                <span>What should the administrator know?</span>
                <textarea required rows={3} maxLength={500} value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder={role === 'claimant' ? 'Why you are sure this is yours, and any proof you can show in person' : 'Why you think this claim is not genuine'} />
              </label>
              <div className="row-gap">
                <button className="btn btn-primary btn-sm" disabled={busy}>Send dispute</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDisputeOpen(false)}>Cancel</button>
              </div>
            </form>
          )}

          {otherClaims?.length > 0 && (
            <div className="card">
              <h3>Other claims on this item</h3>
              <ul className="plain-list">
                {otherClaims.map((o) => (
                  <li key={o._id}>
                    <Link to={`/claims/${o._id}`}>{o.claimant?.name}</Link> <StatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
