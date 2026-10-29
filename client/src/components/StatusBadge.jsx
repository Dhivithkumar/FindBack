import { STATUS_LABELS } from '../utils/format';

export default function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      <span className="badge-dot" aria-hidden="true" />
      <span className="badge-text">{STATUS_LABELS[status] || status}</span>
    </span>
  );
}
