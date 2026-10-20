import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Loading from '../../components/Loading';
import Notice from '../../components/Notice';
import StatusBadge from '../../components/StatusBadge';
import { fmtDate, timeAgo } from '../../utils/format';

/* ---------- Overview: statistics ---------- */
function Overview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/admin/stats').then((r) => setData(r.data)).catch((e) => setError(errMsg(e))); }, []);
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!data) return <Loading />;

  const t = data.totals;
  const tiles = [
    ['Lost reports', t.lost, `${t.lostOpen} still missing`],
    ['Found items', t.found, `${t.available} waiting for owners`],
    ['Matched', t.matched, `${t.lostWithMatches} lost reports have suggestions`],
    ['Returned', t.returned, `${t.returnRate}% of found items`],
    ['Claims to review', t.claimsPending, `${t.claimsDisputed} disputed`],
    ['Flagged reports', t.flagged, `${t.users} registered users`],
  ];
  const maxCat = Math.max(1, ...data.byCategory.map((c) => c.lost + c.found));
  const maxMonth = Math.max(1, ...data.months.flatMap((m) => [m.lost, m.found, m.returned]));
  const monthName = (key) => new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' });

  return (
    <>
      <div className="stat-grid">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className="stat card">
            <span className="stat-value">{value}</span>
            <span className="stat-label">{label}</span>
            <span className="muted small">{sub}</span>
          </div>
        ))}
      </div>

      {(t.claimsDisputed > 0 || t.flagged > 0) && (
        <Notice kind="warn">
          Needs attention: {t.claimsDisputed > 0 && <Link to="/admin?tab=claims">{t.claimsDisputed} disputed claim{t.claimsDisputed > 1 ? 's' : ''}</Link>}
          {t.claimsDisputed > 0 && t.flagged > 0 && ' and '}
          {t.flagged > 0 && <Link to="/admin?tab=reports&flagged=1">{t.flagged} flagged report{t.flagged > 1 ? 's' : ''}</Link>}.
        </Notice>
      )}

      <div className="two-col">
        <section className="card">
          <h2>Reports by category</h2>
          <div className="legend"><span className="key key-lost" /> Lost <span className="key key-found" /> Found</div>
          <ul className="hbars">
            {data.byCategory.map((c) => (
              <li key={c.name}>
                <span className="hbar-label">{c.name}</span>
                <span className="hbar-track">
                  <span className="hbar hbar-lost" style={{ width: `${(c.lost / maxCat) * 100}%` }} title={`${c.lost} lost`} />
                  <span className="hbar hbar-found" style={{ width: `${(c.found / maxCat) * 100}%` }} title={`${c.found} found`} />
                </span>
                <span className="hbar-num">{c.lost + c.found}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Last six months</h2>
          <div className="legend"><span className="key key-lost" /> Lost <span className="key key-found" /> Found <span className="key key-returned" /> Returned</div>
          <div className="vbars" role="img" aria-label="Lost, found and returned items per month">
            {data.months.map((m) => (
              <div key={m.month} className="vbar-group">
                <div className="vbar-stack">
                  <span className="vbar vbar-lost" style={{ height: `${(m.lost / maxMonth) * 100}%` }} title={`${m.lost} lost`} />
                  <span className="vbar vbar-found" style={{ height: `${(m.found / maxMonth) * 100}%` }} title={`${m.found} found`} />
                  <span className="vbar vbar-returned" style={{ height: `${(m.returned / maxMonth) * 100}%` }} title={`${m.returned} returned`} />
                </div>
                <span className="vbar-label">{monthName(m.month)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

/* ---------- Reports: moderation ---------- */
function Reports({ initialFlagged }) {
  const [type, setType] = useState('lost');
  const [flagged, setFlagged] = useState(initialFlagged);
  const [hidden, setHidden] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api.get('/admin/reports', { params: { type, flagged: flagged || undefined, hidden: hidden || undefined, q, page } })
      .then((r) => setData(r.data))
      .catch((e) => setError(errMsg(e)));
  }, [type, flagged, hidden, q, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (fn, text) => {
    setError('');
    try { await fn(); setMsg(text); load(); } catch (e) { setError(errMsg(e)); }
  };

  return (
    <>
      <div className="toolbar">
        <div className="segmented">
          {['lost', 'found'].map((v) => (
            <button key={v} className={type === v ? 'active' : ''} onClick={() => { setType(v); setPage(1); }}>
              {v === 'lost' ? 'Lost reports' : 'Found reports'}
            </button>
          ))}
        </div>
        <input type="search" placeholder="Search name, description or place" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <label className="check"><input type="checkbox" checked={flagged} onChange={(e) => { setFlagged(e.target.checked); setPage(1); }} /> Flagged only</label>
        <label className="check"><input type="checkbox" checked={hidden} onChange={(e) => { setHidden(e.target.checked); setPage(1); }} /> Hidden only</label>
      </div>

      <Notice kind="error" onClose={() => setError('')}>{error}</Notice>
      <Notice kind="success" onClose={() => setMsg('')}>{msg}</Notice>

      {!data ? <Loading /> : data.items.length === 0 ? (
        <div className="empty"><p>No reports match.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Item</th><th>Reported by</th><th>Status</th><th>Created</th><th>Flags</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it._id} className={it.isHidden ? 'row-hidden' : ''}>
                  <td>
                    <Link to={`/items/${type}/${it._id}`}>{it.itemName}</Link>
                    <div className="muted small">{it.category?.name}, {it.location}</div>
                  </td>
                  <td>{it.owner?.name}<div className="muted small">{it.owner?.email}</div></td>
                  <td><StatusBadge status={it.status} />{it.isHidden && <div className="small muted">Hidden</div>}</td>
                  <td>{fmtDate(it.createdAt)}</td>
                  <td>
                    {it.flagged ? (
                      <details>
                        <summary>{it.flagReasons.length} report{it.flagReasons.length === 1 ? '' : 's'}</summary>
                        <ul className="plain-list small">
                          {it.flagReasons.map((f, i) => <li key={i}>{f.reason} <span className="muted">by {f.by?.name || 'a user'}</span></li>)}
                        </ul>
                      </details>
                    ) : <span className="muted">None</span>}
                  </td>
                  <td className="cell-actions">
                    {it.flagged && (
                      <button className="btn btn-sm btn-ghost" onClick={() => act(() => api.patch(`/admin/reports/${type}/${it._id}`, { flagged: false }), 'Flags cleared')}>Clear flags</button>
                    )}
                    <button className="btn btn-sm btn-ghost" onClick={() => {
                      if (it.isHidden) return act(() => api.patch(`/admin/reports/${type}/${it._id}`, { isHidden: false }), 'Report is visible again');
                      const note = window.prompt('Reason for hiding (sent to the reporter):', '');
                      if (note === null) return undefined;
                      return act(() => api.patch(`/admin/reports/${type}/${it._id}`, { isHidden: true, note }), 'Report hidden');
                    }}>{it.isHidden ? 'Unhide' : 'Hide'}</button>
                    <button className="btn btn-sm btn-danger-ghost" onClick={() => window.confirm(`Delete "${it.itemName}" permanently?`) &&
                      act(() => api.delete(`/admin/reports/${type}/${it._id}`), 'Report deleted')}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="pager">
          <button className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {data.page} of {data.pages}</span>
          <button className="btn btn-sm btn-ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </>
  );
}

/* ---------- Claims: disputes ---------- */
function Claims() {
  const [status, setStatus] = useState('disputed');
  const [claims, setClaims] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setClaims(null);
    api.get('/admin/claims', { params: { status } }).then((r) => setClaims(r.data.claims)).catch((e) => setError(errMsg(e)));
  }, [status]);

  return (
    <>
      <div className="toolbar">
        <label className="field inline">
          <span>Show</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="disputed">Disputed</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved, awaiting handover</option>
            <option value="returned">Returned</option>
            <option value="rejected">Rejected</option>
            <option value="all">All claims</option>
          </select>
        </label>
      </div>
      <Notice kind="error">{error}</Notice>
      {!claims ? <Loading /> : claims.length === 0 ? (
        <div className="empty"><p>No {status === 'all' ? '' : status} claims.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Item</th><th>Claimant</th><th>Finder</th><th>Status</th><th>Updated</th><th><span className="sr-only">Open</span></th></tr></thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c._id}>
                  <td>{c.foundItem?.itemName || 'Removed item'}</td>
                  <td>{c.claimant?.name}<div className="muted small">{c.claimant?.email}</div></td>
                  <td>{c.finder?.name}<div className="muted small">{c.finder?.email}</div></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{timeAgo(c.updatedAt)}</td>
                  <td><Link className="btn btn-sm btn-primary" to={`/claims/${c._id}`}>{c.status === 'disputed' ? 'Decide' : 'Open'}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------- Users ---------- */
function Users() {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/admin/users', { params: { q } }).then((r) => setUsers(r.data.users)).catch((e) => setError(errMsg(e)));
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const update = async (u, body) => {
    setError('');
    try { await api.patch(`/admin/users/${u._id}`, body); load(); } catch (e) { setError(errMsg(e)); }
  };

  return (
    <>
      <div className="toolbar">
        <input type="search" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Notice kind="error" onClose={() => setError('')}>{error}</Notice>
      {!users ? <Loading /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>User</th><th>Reports</th><th>Joined</th><th>Role</th><th>Account</th></tr></thead>
            <tbody>
              {users.map((u) => {
                const self = u._id === me._id;
                return (
                  <tr key={u._id} className={u.isActive ? '' : 'row-hidden'}>
                    <td>{u.name}{self && <span className="muted"> (you)</span>}<div className="muted small">{u.email}{u.phone ? `, ${u.phone}` : ''}</div></td>
                    <td>{u.lostCount} lost, {u.foundCount} found</td>
                    <td>{fmtDate(u.createdAt)}</td>
                    <td>
                      <select value={u.role} disabled={self} onChange={(e) => update(u, { role: e.target.value })} aria-label={`Role for ${u.name}`}>
                        <option value="user">User</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                    <td>
                      <button className={`btn btn-sm ${u.isActive ? 'btn-danger-ghost' : 'btn-ghost'}`} disabled={self}
                        onClick={() => update(u, { isActive: !u.isActive })}>
                        {u.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------- Categories ---------- */
function Categories() {
  const [list, setList] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/categories').then((r) => setList(r.data.categories)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const run = async (fn) => {
    setError('');
    try { await fn(); setEditing(null); load(); } catch (e) { setError(errMsg(e)); }
  };

  return (
    <>
      <form className="card form inline-form" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post('/categories', form); setForm({ name: '', description: '' }); }); }}>
        <label className="field"><span>New category</span>
          <input required maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Umbrellas" />
        </label>
        <label className="field grow"><span>Description</span>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What belongs here" />
        </label>
        <button className="btn btn-primary">Add category</button>
      </form>
      <Notice kind="error" onClose={() => setError('')}>{error}</Notice>
      {!list ? <Loading /> : (
        <ul className="row-list">
          {list.map((c) => (
            <li key={c._id} className="row static">
              {editing?._id === c._id ? (
                <form className="inline-form grow" onSubmit={(e) => { e.preventDefault(); run(() => api.put(`/categories/${c._id}`, editing)); }}>
                  <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} aria-label="Category name" />
                  <input className="grow" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} aria-label="Category description" />
                  <button className="btn btn-sm btn-primary">Save</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                </form>
              ) : (
                <>
                  <span className="row-main"><strong>{c.name}</strong><span className="muted">{c.description}</span></span>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditing({ _id: c._id, name: c.name, description: c.description || '' })}>Rename</button>
                  <button className="btn btn-sm btn-danger-ghost" onClick={() => window.confirm(`Delete "${c.name}"?`) && run(() => api.delete(`/categories/${c._id}`))}>Delete</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const TABS = [
  ['overview', 'Overview'],
  ['reports', 'Reports'],
  ['claims', 'Claims'],
  ['users', 'Users'],
  ['categories', 'Categories'],
];

// Module 8: administrator dashboard
export default function AdminDashboard() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'overview';

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Administration</h1>
          <p className="muted">Moderate reports, settle disputed claims and manage people and categories.</p>
        </div>
      </header>
      <div className="tabs" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setParams({ tab: k })}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'reports' && <Reports initialFlagged={params.get('flagged') === '1'} />}
      {tab === 'claims' && <Claims />}
      {tab === 'users' && <Users />}
      {tab === 'categories' && <Categories />}
    </div>
  );
}
