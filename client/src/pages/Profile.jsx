import { useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import Notice from '../components/Notice';
import { fmtDate } from '../utils/format';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState({ profile: '', password: '' });
  const [err, setErr] = useState({ profile: '', password: '' });

  const saveProfile = async (e) => {
    e.preventDefault();
    setErr({ ...err, profile: '' });
    try {
      const { data } = await api.put('/auth/profile', form);
      setUser(data.user);
      setMsg({ ...msg, profile: 'Profile saved' });
    } catch (ex) {
      setErr({ ...err, profile: errMsg(ex) });
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return setErr({ ...err, password: 'The new passwords do not match' });
    setErr({ ...err, password: '' });
    try {
      await api.put('/auth/password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setMsg({ ...msg, password: 'Password changed' });
    } catch (ex) {
      setErr({ ...err, password: errMsg(ex) });
    }
    return undefined;
  };

  return (
    <div className="page narrow-wide">
      <header className="page-head">
        <div>
          <h1>Your profile</h1>
          <p className="muted">
            {user.role === 'admin' ? 'Administrator' : 'Member'} since {fmtDate(user.createdAt)}.
            Your email and phone are shared only with the other person once a claim is approved.
          </p>
        </div>
      </header>

      <div className="two-col">
        <form className="card form" onSubmit={saveProfile}>
          <h2>Contact details</h2>
          <Notice kind="error">{err.profile}</Notice>
          <Notice kind="success">{msg.profile}</Notice>
          <label className="field"><span>Full name</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field"><span>Email</span>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="field"><span>Phone</span>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <button className="btn btn-primary">Save profile</button>
        </form>

        <form className="card form" onSubmit={savePassword}>
          <h2>Password</h2>
          <Notice kind="error">{err.password}</Notice>
          <Notice kind="success">{msg.password}</Notice>
          <label className="field"><span>Current password</span>
            <input type="password" required autoComplete="current-password" value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          </label>
          <label className="field"><span>New password</span>
            <input type="password" required minLength={6} autoComplete="new-password" value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          </label>
          <label className="field"><span>Repeat new password</span>
            <input type="password" required minLength={6} autoComplete="new-password" value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </label>
          <button className="btn btn-primary">Change password</button>
        </form>
      </div>
    </div>
  );
}
