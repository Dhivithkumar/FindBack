export default function Notice({ kind = 'info', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onClose && (
        <button type="button" className="notice-close" onClick={onClose} aria-label="Dismiss">×</button>
      )}
    </div>
  );
}
