import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import uploadImage from '../utils/uploadImage';
import AdminAchievements from '../components/achievements/AdminAchievements';

const ROUTE_MAP = {
  Alumni:   'alumni',
  Research: 'research',
  Event:    'events',
  Infra:    'infra',
  Media:    'media',
  Timeline: 'timeline',
};

// Achievements are managed by their own module, but live in this admin panel
// so every showcase surface has a single entry point.
const SECTIONS = [...Object.keys(ROUTE_MAP), 'Achievements'];

const FIELDS = {
  Alumni: [
    { key: 'name',        label: 'Name',         type: 'text' },
    { key: 'batch',       label: 'Batch',        type: 'text',     placeholder: 'e.g. 2018-2022' },
    { key: 'degree',      label: 'Degree',       type: 'text',     placeholder: 'e.g. B.Tech CSE' },
    { key: 'currentRole', label: 'Current Role', type: 'text' },
    { key: 'company',     label: 'Company',      type: 'text' },
    { key: 'location',    label: 'Location',     type: 'text' },
    { key: 'achievement', label: 'Achievement',  type: 'textarea' },
    { key: 'photo',       label: 'Photo',        type: 'upload' },
    { key: 'linkedin',    label: 'LinkedIn URL', type: 'text' },
    { key: 'email',       label: 'Email',        type: 'text' },
    { key: 'isFeature',   label: 'Featured',     type: 'checkbox' },
  ],
  Research: [
    { key: 'title',         label: 'Title',          type: 'text' },
    { key: 'authors',       label: 'Authors',        type: 'text', placeholder: 'Comma separated' },
    { key: 'abstract',      label: 'Abstract',       type: 'textarea' },
    { key: 'publishedYear', label: 'Year',           type: 'number' },
    { key: 'domain',        label: 'Domain',         type: 'text' },
    { key: 'journal',       label: 'Journal',        type: 'text' },
    { key: 'doi',           label: 'DOI',            type: 'text' },
    { key: 'link',          label: 'Paper URL',      type: 'text' },
    { key: 'type',          label: 'Type',           type: 'select', options: ['journal','conference','thesis','patent','other'] },
    { key: 'isFeatured',    label: 'Featured',       type: 'checkbox' },
  ],
  Event: [
    { key: 'title',            label: 'Title',             type: 'text' },
    { key: 'date',             label: 'Start Date',        type: 'date' },
    { key: 'endDate',          label: 'End Date',          type: 'date' },
    { key: 'description',      label: 'Description',       type: 'textarea' },
    { key: 'image',            label: 'Image',             type: 'upload' },
    { key: 'venue',            label: 'Venue',             type: 'text' },
    { key: 'organizer',        label: 'Organizer',         type: 'text' },
    { key: 'category',         label: 'Category',          type: 'select', options: ['technical','cultural','sports','seminar','other'] },
    { key: 'registrationLink', label: 'Registration Link', type: 'text' },
    { key: 'isLandmark',       label: 'Landmark Event',    type: 'checkbox' },
  ],
  Infra: [
    { key: 'name',        label: 'Name',        type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'image',       label: 'Image',       type: 'upload' },
    { key: 'capacity',    label: 'Capacity',    type: 'number' },
    { key: 'location',    label: 'Location',    type: 'text' },
    { key: 'category',    label: 'Category',    type: 'select', options: ['lab','classroom','auditorium','sports','hostel','other'] },
    { key: 'amenities',   label: 'Amenities',   type: 'text', placeholder: 'Comma separated, e.g. AC, Projector' },
    // { key: 'isAvailable', label: 'Available',   type: 'checkbox' },
  ],
  Media: [
    { key: 'url',        label: 'File',        type: 'upload-media' },
    { key: 'type',       label: 'Type',        type: 'select', options: ['image','video'] },
    { key: 'caption',    label: 'Caption',     type: 'text' },
    { key: 'category',   label: 'Category',    type: 'text' },
    { key: 'tags',       label: 'Tags',        type: 'text', placeholder: 'Comma separated' },
    { key: 'uploadedBy', label: 'Uploaded By', type: 'text' },
    { key: 'isFeatured', label: 'Featured',    type: 'checkbox' },
  ],
  Timeline: [
    { key: 'year',        label: 'Year',        type: 'number' },
    { key: 'title',       label: 'Title',       type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'image',       label: 'Image',       type: 'upload' },
    { key: 'category',    label: 'Category',    type: 'select', options: ['milestone','achievement','infrastructure','academic','other'] },
    { key: 'isHighlight', label: 'Highlight',   type: 'checkbox' },
  ],
};

function parseForm(section, form) {
  const out = { ...form };
  if (section === 'Research' && typeof out.authors === 'string')
    out.authors = out.authors.split(',').map(s => s.trim()).filter(Boolean);
  if (section === 'Infra' && typeof out.amenities === 'string')
    out.amenities = out.amenities.split(',').map(s => s.trim()).filter(Boolean);
  if (section === 'Media' && typeof out.tags === 'string')
    out.tags = out.tags.split(',').map(s => s.trim()).filter(Boolean);
  return out;
}

function docToForm(section, doc) {
  const out = { ...doc };
  if (section === 'Research' && Array.isArray(out.authors))   out.authors   = out.authors.join(', ');
  if (section === 'Infra'    && Array.isArray(out.amenities)) out.amenities = out.amenities.join(', ');
  if (section === 'Media'    && Array.isArray(out.tags))      out.tags      = out.tags.join(', ');
  return out;
}

function isVideo(url) {
  return url && (/\.(mp4|webm|ogg|mov)$/i.test(url) || /(?:youtu\.be\/|youtube\.com\/)/i.test(url));
}

// ── Upload Field Component ────────────────────────────────────────────────
function UploadField({ fieldKey, label, value, onChange, acceptVideo = false }) {
  const inputRef  = useRef();
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');

  const accept = acceptVideo ? 'image/*,video/*' : 'image/*';

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(fieldKey, url);
    } catch {
      setError('Upload failed — please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    onChange(fieldKey, '');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="sc-image-upload-field">
      <label>{label}</label>

      {/* Preview */}
      {value && (
        <div className="sc-image-preview">
          {isVideo(value)
            ? <video src={value} className="sc-image-preview-thumb" muted controls />
            : <img   src={value} alt="preview" className="sc-image-preview-thumb" />
          }
          <button
            type="button"
            className="sc-image-preview-remove"
            onClick={handleRemove}
            title="Remove"
          >✕</button>
        </div>
      )}

      {/* Drop zone — only when no file */}
      {!value && (
        <div
          className={`sc-upload-zone${uploading ? ' sc-upload-zone--loading' : ''}`}
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          {uploading ? (
            <span className="sc-upload-spinner">⏳ Uploading…</span>
          ) : (
            <>
              <span className="sc-upload-icon">📁</span>
              <span className="sc-upload-hint">Click or drag & drop to upload</span>
              <span className="sc-upload-sub">
                {acceptVideo ? 'Images & videos supported' : 'Images only'}
              </span>
            </>
          )}
        </div>
      )}

      {/* Hidden native file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />

      {error && (
        <span style={{ fontSize: '0.78rem', color: 'var(--sc-red)', marginTop: 4 }}>
          {error}
        </span>
      )}

      {/* URL fallback for existing/remote files */}
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(fieldKey, e.target.value)}
        placeholder="…or paste a URL directly"
        style={{ marginTop: 6 }}
      />
    </div>
  );
}

// ── Main AdminShowcase ────────────────────────────────────────────────────
export default function AdminShowcase() {
  const [section,     setSection]     = useState('Alumni');
  const [form,        setForm]        = useState({});
  const [editId,      setEditId]      = useState(null);
  const [items,       setItems]       = useState([]);
  const [msg,         setMsg]         = useState('');
  const [loadingList, setLoadingList] = useState(false);

  const route = ROUTE_MAP[section];

  const fetchItems = () => {
    if (!route) return;
    setLoadingList(true);
    axios.get(`/api/showcase/${route}`)
      .then(r => setItems(r.data))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    setForm({});
    setEditId(null);
    if (route) fetchItems();
  }, [section]); // eslint-disable-line react-hooks/exhaustive-deps

  const notify = (text) => { setMsg(text); setTimeout(() => setMsg(''), 2500); };

  const handleSubmit = async () => {
    const payload = parseForm(section, form);
    if (editId) {
      await axios.put(`/api/showcase/${route}/${editId}`, payload);
      notify('Updated!');
    } else {
      await axios.post(`/api/showcase/${route}`, payload);
      notify('Saved!');
    }
    setForm({}); setEditId(null); fetchItems();
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setForm(docToForm(section, item));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    await axios.delete(`/api/showcase/${route}/${id}`);
    notify('Deleted!'); fetchItems();
  };

  const handleCancel = () => { setForm({}); setEditId(null); };

  const updateField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="sc-admin-panel">
      {/* <h1>Showcase Admin</h1> */}

      {/* Section Tabs */}
      <div className="sc-admin-tabs">
        {SECTIONS.map(s => (
          <button key={s} className={section === s ? 'active' : ''} onClick={() => setSection(s)}>
            {s}
          </button>
        ))}
      </div>

      {section === 'Achievements' ? (
        <AdminAchievements />
      ) : (
        <>

      {/* Form header */}
      <div className="sc-admin-form-header">
        <h2>{editId ? `Edit ${section}` : `Add ${section}`}</h2>
        {editId && <button className="sc-btn-cancel" onClick={handleCancel}>Cancel Edit</button>}
      </div>

      {/* Form */}
      <div className="sc-admin-form">
        {FIELDS[section].map(({ key, label, type, options, placeholder }) => (
          <div key={key} className="sc-form-group">

            {type === 'upload' ? (
              <UploadField
                fieldKey={key}
                label={label}
                value={form[key] || ''}
                onChange={updateField}
                acceptVideo={false}
              />

            ) : type === 'upload-media' ? (
              <UploadField
                fieldKey={key}
                label={label}
                value={form[key] || ''}
                onChange={updateField}
                acceptVideo={true}
              />

            ) : type === 'textarea' ? (
              <>
                <label>{label}</label>
                <textarea
                  value={form[key] || ''}
                  onChange={e => updateField(key, e.target.value)}
                  placeholder={placeholder || label}
                  rows={3}
                />
              </>

            ) : type === 'select' ? (
              <>
                <label>{label}</label>
                <select value={form[key] || ''} onChange={e => updateField(key, e.target.value)}>
                  <option value="">Select {label}</option>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </>

            ) : type === 'checkbox' ? (
              <>
                <label>{label}</label>
                <input
                  type="checkbox"
                  checked={!!form[key]}
                  onChange={e => updateField(key, e.target.checked)}
                  style={{ width: 'auto' }}
                />
              </>

            ) : (
              <>
                <label>{label}</label>
                <input
                  type={type}
                  value={form[key] || ''}
                  onChange={e => updateField(key, e.target.value)}
                  placeholder={placeholder || label}
                />
              </>
            )}
          </div>
        ))}

        <div className="sc-form-actions">
          <button onClick={handleSubmit}>{editId ? 'Update' : 'Save'}</button>
          {editId && <button className="sc-btn-cancel" onClick={handleCancel}>Cancel</button>}
        </div>
        {msg && <p className="sc-success">{msg}</p>}
      </div>

      {/* List */}
      <div className="sc-admin-list">
        <h2>Existing {section} ({items.length})</h2>
        {loadingList ? (
          <p className="sc-loading">Loading…</p>
        ) : items.length === 0 ? (
          <p className="sc-empty">None added yet.</p>
        ) : (
          items.map(item => (
            <div key={item._id} className="sc-admin-list-item">
              {/* Thumbnail */}
              {(item.photo || item.image) && (
                <img src={item.photo || item.image} alt="" className="sc-admin-thumb" />
              )}
              {item.url && isVideo(item.url) && (
                <video src={item.url} className="sc-admin-thumb" muted />
              )}
              {item.url && !isVideo(item.url) && (
                <img src={item.url} alt="" className="sc-admin-thumb" />
              )}

              <div className="sc-admin-list-info">
                <strong>
                  {item.title || item.name || (item.year && `Year ${item.year}`) || item.url}
                </strong>
                <small>{item.batch || item.publishedYear || item.category || item.type || ''}</small>
              </div>
              <div className="sc-admin-list-btns">
                <button className="sc-btn-edit"   onClick={() => handleEdit(item)}>Edit</button>
                <button className="sc-btn-delete" onClick={() => handleDelete(item._id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
        </>
      )}
    </div>
  );
}
