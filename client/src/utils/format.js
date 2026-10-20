export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';

export const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} d ago`;
  return fmtDate(d);
};

// Value for <input type="datetime-local"> in the user's own timezone
export const toLocalInput = (d) => {
  const x = d ? new Date(d) : new Date();
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};

// Short tag number shown on every report, e.g. "4F2A9C"
export const tagNo = (id) => String(id || '').slice(-6).toUpperCase();

export const STATUS_LABELS = {
  open: 'Still missing',
  matched: 'Possible matches',
  returned: 'Returned',
  closed: 'Closed',
  available: 'Waiting for owner',
  claimed: 'Claim approved',
  pending: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  disputed: 'Disputed',
  withdrawn: 'Withdrawn',
};
