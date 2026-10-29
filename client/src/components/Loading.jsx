export default function Loading({ text = 'Loading…' }) {
  return (
    <div className="loading-wrap" role="status" aria-live="polite">
      <div className="loading-spinner">
        <span className="loading-tag-pulse" aria-hidden="true" />
      </div>
      <p className="loading-text">{text}</p>
    </div>
  );
}
