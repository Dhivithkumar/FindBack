import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg, imgUrl } from '../api';
import Loading from '../components/Loading';
import Notice from '../components/Notice';
import { toLocalInput } from '../utils/format';

const EMPTY = { itemName: '', category: '', description: '', location: '', date: '', storageLocation: '', hiddenDetails: '' };

// One form for Module 2 (lost) and Module 3 (found), in create and edit mode
export default function ReportItem() {
  const { type, id } = useParams();
  const isEdit = Boolean(id);
  const isLost = type === 'lost';
  const navigate = useNavigate();

  const [form, setForm] = useState({ ...EMPTY, date: toLocalInput() });
  const [categories, setCategories] = useState([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [existingImage, setExistingImage] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) {
      setForm({ ...EMPTY, date: toLocalInput() });
      return;
    }
    setLoading(true);
    api.get(`/${type}/${id}`)
      .then(({ data }) => {
        if (!data.isOwner) throw new Error('You can only edit your own reports');
        const it = data.item;
        setForm({
          itemName: it.itemName,
          category: it.category?._id || '',
          description: it.description,
          location: it.location,
          date: toLocalInput(isLost ? it.lostAt : it.foundAt),
          storageLocation: it.storageLocation || '',
          hiddenDetails: it.hiddenDetails || '',
        });
        setExistingImage(it.image);
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [type, id, isEdit, isLost]);

  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!['lost', 'found'].includes(type)) return <Navigate to="/dashboard" replace />;
  if (loading) return <Loading />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('Photo must be 5 MB or smaller'); e.target.value = ''; return; }
    setError('');
    setFile(f);
    setRemoveImage(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fd = new FormData();
    fd.append('itemName', form.itemName.trim());
    fd.append('category', form.category);
    fd.append('description', form.description.trim());
    fd.append('location', form.location.trim());
    fd.append(isLost ? 'lostAt' : 'foundAt', new Date(form.date).toISOString());
    if (!isLost) {
      fd.append('storageLocation', form.storageLocation.trim());
      fd.append('hiddenDetails', form.hiddenDetails.trim());
    }
    if (file) fd.append('image', file);
    if (removeImage) fd.append('removeImage', 'true');

    try {
      if (isEdit) {
        await api.put(`/${type}/${id}`, fd);
        navigate(`/items/${type}/${id}`, { state: { flash: 'Changes saved' } });
      } else {
        const { data } = await api.post(`/${type}`, fd);
        if (isLost && data.matchCount > 0) {
          navigate(`/lost/${data.item._id}/matches`, { state: { fresh: true } });
        } else {
          const flash = isLost
            ? 'Report saved. Nothing matches yet; you will get a notification when a similar item is found.'
            : data.matchCount > 0
              ? `Item registered. ${data.matchCount} person${data.matchCount > 1 ? 's have' : ' has'} been told it may be theirs.`
              : 'Item registered. People who lost something similar will be able to find and claim it.';
          navigate(`/items/${type}/${data.item._id}`, { state: { flash } });
        }
      }
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  const shownImage = preview || (!removeImage && existingImage ? imgUrl(existingImage) : '');

  return (
    <div className="page form-page">
      <header className="page-head">
        <div>
          <h1>{isEdit ? 'Edit report' : isLost ? 'Report a lost item' : 'Report a found item'}</h1>
          <p className="muted">
            {isLost
              ? 'The more specific you are, the better your matches. Colours, brands and marks all help.'
              : 'Describe what you found, but keep a few details back. You will use them to check who really owns it.'}
          </p>
        </div>
      </header>

      <form className={`card form report-form report-${type}`} onSubmit={submit}>
        <Notice kind="error">{error}</Notice>

        <div className="field-row">
          <label className="field">
            <span>Item name</span>
            <input required maxLength={100} placeholder={isLost ? 'e.g. Black HP laptop bag' : 'e.g. Silver wristwatch'}
              value={form.itemName} onChange={set('itemName')} />
          </label>
          <label className="field">
            <span>Category</span>
            <select required value={form.category} onChange={set('category')}>
              <option value="">Choose a category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Description</span>
          <textarea required rows={4} maxLength={1000} value={form.description} onChange={set('description')}
            placeholder={isLost ? 'Colour, brand, size, stickers, scratches, what was inside…' : 'Colour, brand, size and general condition'} />
        </label>

        <div className="field-row">
          <label className="field">
            <span>{isLost ? 'Where did you last see it?' : 'Where did you find it?'}</span>
            <input required maxLength={150} placeholder="e.g. Central library, 2nd floor reading hall"
              value={form.location} onChange={set('location')} />
          </label>
          <label className="field">
            <span>{isLost ? 'When did you lose it?' : 'When did you find it?'}</span>
            <input type="datetime-local" required max={toLocalInput()} value={form.date} onChange={set('date')} />
          </label>
        </div>

        {!isLost && (
          <>
            <label className="field">
              <span>Where is it being kept now?</span>
              <input required maxLength={200} placeholder="e.g. Hostel B warden's office, or with me in room 214"
                value={form.storageLocation} onChange={set('storageLocation')} />
              <small>Only shown to the owner after you approve their claim.</small>
            </label>
            <label className="field field-private">
              <span>Private details for checking claims</span>
              <textarea rows={3} maxLength={1000} value={form.hiddenDetails} onChange={set('hiddenDetails')}
                placeholder="Things only the owner would know: lock-screen picture, initials inside, contents, serial number…" />
              <small>Never shown publicly. You will see these next to each claim so you can compare.</small>
            </label>
          </>
        )}

        <div className="field">
          <span className="field-label">Photo <em>(optional, up to 5 MB)</em></span>
          <div className="photo-input">
            {shownImage ? <img src={shownImage} alt="Selected item" /> : <div className="photo-empty">No photo</div>}
            <div className="photo-controls">
              <label className="btn btn-ghost btn-sm file-btn">
                {shownImage ? 'Choose a different photo' : 'Add a photo'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onFile} />
              </label>
              {shownImage && (
                <button type="button" className="btn btn-sm btn-danger-ghost"
                  onClick={() => { setFile(null); if (existingImage) setRemoveImage(true); }}>
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button className={`btn ${isLost ? 'btn-lost' : 'btn-found'}`} disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : isLost ? 'Report lost item' : 'Report found item'}
          </button>
        </div>
      </form>
    </div>
  );
}
