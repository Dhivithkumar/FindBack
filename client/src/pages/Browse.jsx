import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import ItemTag from '../components/ItemTag';
import Notice from '../components/Notice';

const DEFAULTS = { type: 'all', q: '', category: '', location: '', from: '', to: '', show: 'active', sort: 'newest' };

// Module 4: search, filter and sort lost and found reports
export default function Browse() {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, params.get(k) ?? DEFAULTS[k]]));

  const [qText, setQText] = useState(filters.q);
  const [locText, setLocText] = useState(filters.location);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => {
      if (v && v !== DEFAULTS[k]) next.set(k, v);
      else next.delete(k);
    });
    setParams(next, { replace: true });
  };

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data.categories)).catch(() => {});
  }, []);

  // Typing waits a moment before searching
  useEffect(() => {
    const t = setTimeout(() => {
      if (qText !== filters.q || locText !== filters.location) update({ q: qText.trim(), location: locText.trim() });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qText, locText]);

  const key = params.toString();
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.get('/items/search', { params: { ...filters, page: 1 } })
      .then(({ data }) => {
        if (cancelled) return;
        setItems(data.items);
        setMeta({ page: data.page, pages: data.pages, total: data.total });
      })
      .catch((e) => !cancelled && setError(errMsg(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/items/search', { params: { ...filters, page: meta.page + 1 } });
      setItems((prev) => [...prev, ...data.items]);
      setMeta({ page: data.page, pages: data.pages, total: data.total });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setQText('');
    setLocText('');
    setParams(new URLSearchParams(), { replace: true });
  };
  const filtered = key.length > 0;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Browse the board</h1>
          <p className="muted">Every report people have pinned up. Look for yours, or for its owner.</p>
        </div>
      </header>

      <section className="filters card" aria-label="Search and filters">
        <div className="segmented" role="radiogroup" aria-label="Report type">
          {[['all', 'Everything'], ['lost', 'Lost'], ['found', 'Found']].map(([v, label]) => (
            <button key={v} role="radio" aria-checked={filters.type === v}
              className={filters.type === v ? 'active' : ''} onClick={() => update({ type: v })}>
              {label}
            </button>
          ))}
        </div>
        <div className="filter-grid">
          <label className="field">
            <span>Search</span>
            <input type="search" placeholder="Item name or keyword" value={qText} onChange={(e) => setQText(e.target.value)} />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={filters.category} onChange={(e) => update({ category: e.target.value })}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Location</span>
            <input placeholder="e.g. library" value={locText} onChange={(e) => setLocText(e.target.value)} />
          </label>
          <label className="field">
            <span>From</span>
            <input type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" value={filters.to} onChange={(e) => update({ to: e.target.value })} />
          </label>
          <label className="field">
            <span>Show</span>
            <select value={filters.show} onChange={(e) => update({ show: e.target.value })}>
              <option value="active">Still open</option>
              <option value="returned">Returned</option>
              <option value="all">All reports</option>
            </select>
          </label>
          <label className="field">
            <span>Sort</span>
            <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
      </section>

      <div className="results-bar">
        <span>{loading && items.length === 0 ? 'Searching…' : `${meta.total} report${meta.total === 1 ? '' : 's'}`}</span>
        {filtered && <button className="btn-link" onClick={clearAll}>Clear filters</button>}
      </div>

      <Notice kind="error">{error}</Notice>

      {!loading && items.length === 0 ? (
        <div className="empty">
          <p>Nothing on the board matches these filters.</p>
          {filtered && <button className="btn btn-ghost" onClick={clearAll}>Clear filters</button>}
        </div>
      ) : (
        <div className="tag-grid board">
          {items.map((item) => <ItemTag key={`${item.type}-${item._id}`} item={item} />)}
        </div>
      )}

      {meta.page < meta.pages && (
        <div className="load-more">
          <button className="btn btn-ghost" onClick={loadMore} disabled={loading}>{loading ? 'Loading…' : 'Show more'}</button>
        </div>
      )}
    </div>
  );
}
