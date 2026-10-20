import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api';
import Notice from '../components/Notice';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('The two passwords do not match');
    setBusy(true);
    setError('');
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <div className="page narrow">
      <h1>Create your account</h1>
      <form className="card form" onSubmit={submit}>
        <Notice kind="error">{error}</Notice>
        <label className="field">
          <span>Full name</span>
          <input required autoComplete="name" value={form.name} onChange={set('name')} />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
        </label>
        <label className="field">
          <span>Phone <em>(optional)</em></span>
          <input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
          <small>Only shared with the other person after a claim is approved.</small>
        </label>
        <div className="field-row">
          <label className="field">
            <span>Password</span>
            <input type="password" required minLength={6} autoComplete="new-password" value={form.password} onChange={set('password')} />
          </label>
          <label className="field">
            <span>Repeat password</span>
            <input type="password" required minLength={6} autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
          </label>
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="form-foot">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
