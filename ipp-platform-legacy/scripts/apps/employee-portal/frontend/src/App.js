import React, { useState, useEffect, useCallback } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// ─── DHL Design Tokens ────────────────────────────────────────────────────────
const T = {
  // DHL brand
  yellow:        '#FFCC00',
  yellowLight:   '#FFF9E0',
  yellowSurface: '#FFFDF0',
  yellowBorder:  '#FFE566',
  red:           '#D40511',
  redDeep:       '#B0000B',
  redLight:      '#FFF0F0',
  redBorder:     '#FFAAAA',
  black:         '#1A1A1A',
  charcoal:      '#2B2B2B',
  // Surfaces
  bg:            '#FFFDF0',
  surface:       '#FFFFFF',
  surfaceAlt:    '#FFF9E0',
  border:        '#F0E080',
  borderLight:   '#FFF4C0',
  // Text
  text:          '#1A1A1A',
  textSecondary: '#4A4A4A',
  textMuted:     '#888888',
  // Status
  success:       '#16a34a',
  successLight:  '#f0fdf4',
  successBorder: '#bbf7d0',
  warning:       '#d97706',
  warningLight:  '#fffbeb',
  warningBorder: '#fde68a',
  danger:        '#D40511',
  dangerLight:   '#FFF0F0',
  dangerBorder:  '#FFAAAA',
  // Misc
  shadow:    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  shadowMd:  '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
  radius:    '8px',
  radiusSm:  '6px',
  fontMono:  "'SF Mono','Fira Code','Cascadia Code',monospace",
};

const DEPT_CONFIG = {
  Engineering: { bg: '#FFF9E0', color: '#B8860B', border: '#FFE566' },
  Product:     { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
  Security:    { bg: T.redLight, color: T.red, border: T.redBorder },
  Operations:  { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
  HR:          { bg: '#fdf2f8', color: '#9d174d', border: '#fbcfe8' },
  Finance:     { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
};

const DEPARTMENTS = Object.keys(DEPT_CONFIG);

function getDeptStyle(dept) {
  const cfg = DEPT_CONFIG[dept] || { bg: T.surfaceAlt, color: T.textSecondary, border: T.border };
  return { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` };
}

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: ${T.bg}; font-family: 'Inter','Segoe UI',system-ui,-apple-system,sans-serif; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
  .emp-row:hover td { background: ${T.yellowSurface} !important; }
  .emp-row td { transition: background .12s; }
  .delete-btn:hover { background: ${T.redLight} !important; color: ${T.red} !important; border-color: ${T.redBorder} !important; }
  .add-btn:hover { background: ${T.red} !important; color: #fff !important; border-color: ${T.redDeep} !important; }
  .action-link:hover { text-decoration: underline; }
  input:focus, select:focus { outline: 2px solid ${T.red}; outline-offset:-1px; border-color:${T.red} !important; }
  ::placeholder { color:${T.textMuted}; }
`;

// ─── DHL Official Logo ─────────────────────────────────────────────────────────
function DhlLogo({ height = 28 }) {
  // Official DHL 2025 logo — only the red letterform paths, no yellow background
  // (header is already DHL yellow so we render on transparent)
  return (
    <svg height={height} viewBox="100 120 700 60" xmlns="http://www.w3.org/2000/svg" aria-label="DHL" style={{ display:'block' }}>
      <path d="M191.6877,198.9844h109.5393c36.1736,0,56.3186-24.6026,62.5295-33.1105h-74.6789c-9.4715,0-6.6124-3.8923-5.0317-6.0289,3.1145-4.2057,8.3186-11.3295,11.3765-15.4724,3.011-4.0805,3.0917-6.4198-3.0698-6.4198h-55.7435l-44.9214,61.0315h0ZM448.9485,165.8689l-64.2475.0049c-.0217,0-24.369,33.1105-24.369,33.1105h64.2586l24.3578-33.1154h0ZM541.8709,165.8738h-64.2344c-.0217,0-24.3712,33.1105-24.3712,33.1105h64.2344l24.3712-33.1105h0ZM562.7673,165.8738c.0022,0-4.6929,6.4195-6.9744,9.5015-8.0689,10.905-.9379,23.609,25.3962,23.609h103.1619l24.3665-33.1105h-145.9502ZM223.102,100l-22.3648,30.3855h121.8887c6.1605,0,6.0798,2.3393,3.0688,6.4195-3.0579,4.1383-8.1763,11.344-11.2908,15.5497-1.5809,2.1319-4.4398,6.0239,5.0317,6.0239h49.8445s8.0341-10.9339,14.7685-20.0737c9.1626-12.4338.7947-38.305-31.9593-38.305h-128.9874ZM547.3886,158.3787l42.9646-58.3787h-64.2272l-24.6487,33.4723h-28.671l24.6292-33.4723h-64.2369l-42.9777,58.3787h157.1677ZM679.3159,100h-68.0329c-.0215,0-43.0053,58.3787-43.0053,58.3787h68.0689l42.9693-58.3787h0Z" fill="#d40511"/>
    </svg>
  );
}

function SkeletonRow() {
  const s = {
    height: '14px', borderRadius: '4px',
    background: `linear-gradient(90deg,${T.yellowSurface} 25%,${T.border} 50%,${T.yellowSurface} 75%)`,
    backgroundSize: '200% 100%', animation: 'pulse 1.4s ease-in-out infinite',
  };
  return (
    <tr>
      {[140,90,160,180,90,60].map((w,i) => (
        <td key={i} style={{ padding:'14px 20px', borderBottom:`1px solid ${T.borderLight}` }}>
          <div style={{ ...s, width: w }} />
        </td>
      ))}
    </tr>
  );
}

function StatusBadge({ online, label }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'6px' }}>
      <span style={{
        width:'7px', height:'7px', borderRadius:'50%', flexShrink:0,
        background: online ? T.success : T.danger,
        boxShadow: online ? `0 0 0 2px ${T.successBorder}` : `0 0 0 2px ${T.dangerBorder}`,
      }}/>
      <span style={{ color: online ? T.success : T.danger, fontWeight:600 }}>{label}</span>
    </span>
  );
}

function MetricCard({ label, value, sub, accentColor }) {
  return (
    <div style={{
      background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius,
      padding:'16px 20px', boxShadow:T.shadow,
      borderTop: accentColor ? `3px solid ${accentColor}` : `3px solid ${T.yellow}`,
    }}>
      <div style={{ fontSize:'11px', fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'6px' }}>
        {label}
      </div>
      <div style={{ fontSize:'15px', fontWeight:700, color:T.text, lineHeight:1.2 }}>{value}</div>
      {sub && <div style={{ fontSize:'12px', color:T.textSecondary, marginTop:'4px' }}>{sub}</div>}
    </div>
  );
}

const STACK_BADGES = [
  { label:'Backstage', color:'#1447e6' },
  { label:'Crossplane', color:'#6d28d9' },
  { label:'Argo CD',   color:'#e65c00' },
  { label:'SPIRE',     color:'#0369a1' },
  { label:'Cilium',    color:'#0891b2' },
  { label:'OPA + Kyverno', color:'#15803d' },
];

// ─── Add Employee Modal ───────────────────────────────────────────────────────
function AddEmployeeModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    name:'', email:'', department:'Engineering',
    role:'', start_date: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.role.trim()) {
      setError('Name, email, and role are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/employees`, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Server error ${res.status}`);
      }
      onAdded(await res.json());
      onClose();
    } catch(err) {
      setError(err.message || 'Failed to add employee.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width:'100%', padding:'9px 12px', fontSize:'14px',
    border:`1px solid ${T.border}`, borderRadius:T.radiusSm,
    color:T.text, background:T.surface, transition:'border-color .15s',
  };
  const labelStyle = { display:'block', fontSize:'13px', fontWeight:600, color:T.text, marginBottom:'6px' };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(26,26,26,0.5)',
      backdropFilter:'blur(4px)', display:'flex', alignItems:'center',
      justifyContent:'center', zIndex:1000, padding:'16px',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background:T.surface, borderRadius:'12px', border:`1px solid ${T.border}`,
        boxShadow:T.shadowMd, width:'100%', maxWidth:'460px',
        animation:'fadeIn .18s ease',
      }}>
        {/* Modal header — DHL yellow strip */}
        <div style={{
          padding:'0 24px', height:'50px', display:'flex', alignItems:'center', justifyContent:'space-between',
          background:T.yellow, borderRadius:'12px 12px 0 0', borderBottom:`2px solid ${T.red}`,
        }}>
          <div style={{ fontSize:'15px', fontWeight:700, color:T.black }}>Add Employee</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:T.charcoal, fontSize:'18px', padding:'4px', borderRadius:'4px', lineHeight:1 }}>✕</button>
        </div>
        <div style={{ padding:'4px 24px 6px', background:T.yellowSurface, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ fontSize:'12px', color:T.textSecondary }}>Create a new employee record in DPCS</div>
        </div>
        <form onSubmit={handleSubmit} style={{ padding:'20px 24px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <div style={{ gridColumn:'1/-1', marginBottom:'16px' }}>
              <label style={labelStyle}>Full Name *</label>
              <input name="name" value={form.name} onChange={handleChange} style={inputStyle} placeholder="Jane Doe" autoFocus />
            </div>
            <div style={{ gridColumn:'1/-1', marginBottom:'16px' }}>
              <label style={labelStyle}>Work Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} style={inputStyle} placeholder="jane.doe@dhl.com" />
            </div>
            <div style={{ marginBottom:'16px' }}>
              <label style={labelStyle}>Department</label>
              <select name="department" value={form.department} onChange={handleChange} style={{ ...inputStyle, cursor:'pointer' }}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:'16px' }}>
              <label style={labelStyle}>Role / Title *</label>
              <input name="role" value={form.role} onChange={handleChange} style={inputStyle} placeholder="Software Engineer" />
            </div>
            <div style={{ gridColumn:'1/-1', marginBottom:'16px' }}>
              <label style={labelStyle}>Start Date</label>
              <input name="start_date" type="date" value={form.start_date} onChange={handleChange} style={inputStyle} />
            </div>
          </div>
          {error && (
            <div style={{ background:T.dangerLight, border:`1px solid ${T.dangerBorder}`, borderRadius:T.radiusSm, padding:'10px 14px', fontSize:'13px', color:T.danger, marginBottom:'16px' }}>
              {error}
            </div>
          )}
          <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} disabled={submitting} style={{ padding:'9px 18px', fontSize:'14px', fontWeight:600, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, background:T.surface, color:T.textSecondary, cursor:'pointer' }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ padding:'9px 18px', fontSize:'14px', fontWeight:600, border:`1px solid ${T.redDeep}`, borderRadius:T.radiusSm, background:T.red, color:'#fff', cursor:'pointer', opacity:submitting?0.7:1 }}>
              {submitting ? 'Adding…' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [employees, setEmployees] = useState([]);
  const [status, setStatus]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteId, setDeleteId]   = useState(null);

  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    document.title = 'DPCS Employee Portal — IPP Demo';
    return () => document.head.removeChild(el);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, healthRes] = await Promise.allSettled([
        fetch(`${BACKEND_URL}/api/employees`),
        fetch(`${BACKEND_URL}/health`),
      ]);
      if (empRes.status === 'fulfilled' && empRes.value.ok) {
        const data = await empRes.value.json();
        setEmployees(Array.isArray(data) ? data : []);
      } else {
        throw new Error('Failed to fetch employee data');
      }
      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        setStatus(await healthRes.value.json());
      }
    } catch(err) {
      setError(err.message || 'Unable to connect to backend');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEmployeeAdded = useCallback(emp => setEmployees(prev => [...prev, emp]), []);

  async function handleDelete(emp) {
    if (!window.confirm(`Remove ${emp.name} from the directory?\n\nThis action cannot be undone.`)) return;
    setDeleteId(emp.id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/employees/${emp.id}`, { method:'DELETE' });
      if (res.ok || res.status === 204) {
        setEmployees(prev => prev.filter(e => e.id !== emp.id));
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Failed to delete employee.');
      }
    } catch {
      alert('Network error — could not reach backend.');
    } finally {
      setDeleteId(null);
    }
  }

  const backendOnline = status !== null;
  const dbOnline = status?.database === 'connected';
  const dbDemo = status?.database === 'demo';
  const deptCounts = employees.reduce((acc, e) => { acc[e.department] = (acc[e.department]||0)+1; return acc; }, {});
  const topDept = Object.entries(deptCounts).sort((a,b) => b[1]-a[1])[0];

  const thStyle = {
    padding:'10px 20px', textAlign:'left', fontSize:'11px', fontWeight:700,
    color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap',
    background: T.yellowSurface,
  };

  return (
    <div style={{ background:T.bg, minHeight:'100vh', color:T.text }}>
      {showAddModal && <AddEmployeeModal onClose={() => setShowAddModal(false)} onAdded={handleEmployeeAdded} />}

      {/* ── Header — DHL yellow brand bar ── */}
      <header style={{ background:T.yellow, borderBottom:`3px solid ${T.red}`, boxShadow:'0 2px 8px rgba(0,0,0,0.12)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 24px', height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'18px' }}>
            {/* DHL official logo */}
            <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
              <DhlLogo height={32} />
              <span style={{ width:'1px', height:'28px', background:'rgba(0,0,0,0.2)' }}/>
            </div>
            <div>
              <div style={{ fontSize:'15px', fontWeight:800, color:T.black, lineHeight:1.2, letterSpacing:'-0.01em' }}>DPCS Employee Portal</div>
              <div style={{ fontSize:'11px', color:T.charcoal, lineHeight:1, fontWeight:500, opacity:0.75 }}>
                DHL Public &amp; Private Cloud Services · Provisioned via Crossplane · Argo CD
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', justifyContent:'flex-end' }}>
            {STACK_BADGES.map(b => (
              <span key={b.label} style={{ padding:'3px 8px', borderRadius:'999px', fontSize:'11px', fontWeight:600, background:'rgba(0,0,0,0.08)', color:T.black, border:'1px solid rgba(0,0,0,0.15)' }}>
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ maxWidth:'1280px', margin:'0 auto', padding:'28px 24px' }}>

        {/* Metrics Row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'14px', marginBottom:'24px', animation:'fadeIn .3s ease' }}>
          <MetricCard label="Namespace"       value={status?.namespace||'employee-portal'} sub="Kubernetes namespace" accentColor={T.yellow} />
          <MetricCard label="Backend API"     value={<StatusBadge online={backendOnline} label={backendOnline?'Online':'Offline'} />} sub={`v${status?.version||'1.0.0'}`} accentColor={backendOnline?T.success:T.danger} />
          <MetricCard label="Database"        value={<StatusBadge online={dbOnline||dbDemo} label={dbOnline?'Connected':dbDemo?'Demo Mode':status?.database||'Unknown'} />} sub="PostgreSQL 16" accentColor={dbOnline?T.success:dbDemo?T.yellow:T.warning} />
          <MetricCard label="Total Employees" value={loading?'—':employees.length} sub={topDept?`Largest: ${topDept[0]}`:'Loading…'} accentColor={T.red} />
          <MetricCard label="Platform"        value="KIND / k8s" sub="idp-demo cluster" accentColor={T.charcoal} />
        </div>

        {/* Table Card */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'10px', boxShadow:T.shadow, overflow:'hidden', animation:'fadeIn .35s ease' }}>
          {/* Card header — yellow accent */}
          <div style={{ padding:'14px 20px', borderBottom:`2px solid ${T.yellow}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:T.surface }}>
            <div>
              <div style={{ fontSize:'15px', fontWeight:700, color:T.text }}>Employee Directory</div>
              {!loading && !error && (
                <div style={{ fontSize:'12px', color:T.textSecondary, marginTop:'2px' }}>
                  {employees.length} {employees.length===1?'record':'records'} · PostgreSQL backend
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <button onClick={fetchData} title="Refresh" style={{ padding:'7px', background:T.yellowSurface, border:`1px solid ${T.yellowBorder}`, borderRadius:T.radiusSm, cursor:'pointer', display:'flex', alignItems:'center', color:T.charcoal }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
              </button>
              <button className="add-btn" onClick={() => setShowAddModal(true)} style={{ padding:'7px 14px', fontSize:'13px', fontWeight:600, background:T.yellow, color:T.black, border:`1px solid ${T.yellowBorder}`, borderRadius:T.radiusSm, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', transition:'background .15s, color .15s, border-color .15s' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Employee
              </button>
            </div>
          </div>

          {loading && (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:T.yellowSurface, borderBottom:`1px solid ${T.border}` }}>
                  {['Name','Department','Role','Email','Start Date',''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>{[...Array(5)].map((_,i) => <SkeletonRow key={i}/>)}</tbody>
            </table>
          )}

          {error && !loading && (
            <div style={{ padding:'40px 24px' }}>
              <div style={{ background:T.dangerLight, border:`1px solid ${T.dangerBorder}`, borderRadius:T.radius, padding:'20px 24px', maxWidth:'480px', margin:'0 auto' }}>
                <div style={{ fontWeight:700, color:T.danger, marginBottom:'6px', fontSize:'14px' }}>Backend Unreachable — Action Required</div>
                <div style={{ color:T.danger, fontSize:'13px', marginBottom:'10px' }}>{error}</div>
                <div style={{ fontSize:'12px', color:T.textSecondary }}>
                  Verify the backend deployment is healthy:{' '}
                  <code style={{ fontFamily:T.fontMono, background:T.surfaceAlt, padding:'2px 5px', borderRadius:'4px' }}>
                    kubectl get pods -n employee-portal
                  </code>
                </div>
                <button onClick={fetchData} style={{ marginTop:'12px', padding:'7px 14px', fontSize:'13px', background:T.red, color:'#fff', border:'none', borderRadius:T.radiusSm, cursor:'pointer', fontWeight:600 }}>Retry</button>
              </div>
            </div>
          )}

          {!loading && !error && employees.length === 0 && (
            <div style={{ padding:'60px 24px', textAlign:'center', color:T.textSecondary }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'6px', color:T.text }}>No employees found</div>
              <div style={{ fontSize:'13px' }}>Add the first employee to get started.</div>
              <button onClick={() => setShowAddModal(true)} style={{ marginTop:'16px', padding:'9px 18px', fontSize:'13px', fontWeight:600, background:T.red, color:'#fff', border:'none', borderRadius:T.radiusSm, cursor:'pointer' }}>Add First Employee</button>
            </div>
          )}

          {!loading && !error && employees.length > 0 && (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:T.yellowSurface, borderBottom:`1px solid ${T.border}` }}>
                    {['Name','Department','Role','Email','Start Date',''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="emp-row">
                      <td style={{ padding:'13px 20px', borderBottom:`1px solid ${T.borderLight}` }}>
                        <div style={{ fontWeight:600, fontSize:'14px', color:T.text }}>{emp.name}</div>
                        <div style={{ fontSize:'11px', color:T.textMuted, fontFamily:T.fontMono }}>ID #{emp.id}</div>
                      </td>
                      <td style={{ padding:'13px 20px', borderBottom:`1px solid ${T.borderLight}` }}>
                        <span style={{ ...getDeptStyle(emp.department), display:'inline-block', padding:'3px 9px', borderRadius:'999px', fontSize:'12px', fontWeight:600 }}>
                          {emp.department}
                        </span>
                      </td>
                      <td style={{ padding:'13px 20px', borderBottom:`1px solid ${T.borderLight}`, fontSize:'14px', color:T.textSecondary }}>{emp.role}</td>
                      <td style={{ padding:'13px 20px', borderBottom:`1px solid ${T.borderLight}` }}>
                        <a href={`mailto:${emp.email}`} className="action-link" style={{ color:T.red, fontSize:'13px', textDecoration:'none', fontFamily:T.fontMono }}>{emp.email}</a>
                      </td>
                      <td style={{ padding:'13px 20px', borderBottom:`1px solid ${T.borderLight}`, fontSize:'13px', color:T.textSecondary, whiteSpace:'nowrap' }}>{emp.start_date}</td>
                      <td style={{ padding:'13px 20px', borderBottom:`1px solid ${T.borderLight}`, textAlign:'right' }}>
                        <button className="delete-btn" onClick={() => handleDelete(emp)} disabled={deleteId===emp.id} style={{ padding:'5px 12px', fontSize:'12px', fontWeight:600, background:T.surfaceAlt, color:T.textSecondary, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, cursor:'pointer', transition:'all .15s', opacity:deleteId===emp.id?0.5:1 }}>
                          {deleteId===emp.id?'…':'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Platform Info Row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'14px', marginTop:'20px', animation:'fadeIn .4s ease' }}>
          {/* End-to-end flow */}
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:'18px 20px', boxShadow:T.shadow, borderTop:`3px solid ${T.yellow}` }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'12px' }}>Platform Flow</div>
            <div style={{ display:'flex', alignItems:'center', gap:'4px', flexWrap:'wrap' }}>
              {['Backstage','→','Git','→','Argo CD','→','Crossplane','→','K8s'].map((item,i) =>
                item==='→'
                  ? <span key={i} style={{ color:T.textMuted, fontSize:'12px' }}>→</span>
                  : <span key={i} style={{ padding:'2px 8px', borderRadius:'4px', background:T.yellowSurface, color:T.black, fontSize:'12px', fontWeight:600, border:`1px solid ${T.yellowBorder}` }}>{item}</span>
              )}
            </div>
            <div style={{ fontSize:'12px', color:T.textSecondary, marginTop:'10px' }}>
              Provisioned via Crossplane claim from the IPP Backstage portal.
            </div>
          </div>

          {/* Security posture */}
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:'18px 20px', boxShadow:T.shadow, borderTop:`3px solid ${T.red}` }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'12px' }}>Security Posture</div>
            {[
              'SPIFFE/SPIRE Workload Identity',
              'Cilium Network Policy Enforced',
              'OPA + Kyverno Policy Checks',
              'mTLS Between Services',
            ].map(item => (
              <div key={item} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${T.borderLight}` }}>
                <span style={{ fontSize:'13px', color:T.textSecondary }}>{item}</span>
                <span style={{ color:T.success, fontSize:'12px', fontWeight:600 }}>✓ Active</span>
              </div>
            ))}
          </div>

          {/* Platform links */}
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:'18px 20px', boxShadow:T.shadow, borderTop:`3px solid ${T.charcoal}` }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'12px' }}>Platform Links</div>
            {[
              { label:'Backstage IPP',  url:'http://backstage.dpcs.local', desc:'Infrastructure Platform Portal' },
              { label:'Argo CD',        url:'http://argocd.dpcs.local',    desc:'GitOps dashboard' },
              { label:'Grafana',        url:'http://grafana.dpcs.local',   desc:'Metrics & observability' },
              { label:'Hubble UI',      url:'http://hubble.dpcs.local',    desc:'Network flow visibility' },
            ].map(link => (
              <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="action-link"
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${T.borderLight}`, textDecoration:'none' }}>
                <div>
                  <span style={{ fontSize:'13px', color:T.red, fontWeight:600 }}>{link.label}</span>
                  <div style={{ fontSize:'11px', color:T.textMuted }}>{link.desc}</div>
                </div>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop:`3px solid ${T.yellow}`, padding:'14px 24px', marginTop:'40px', background:T.black }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
          <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)', fontWeight:500 }}>
            DPCS Employee Portal &mdash; DHL Public &amp; Private Cloud Services — IPP
          </span>
          <span style={{ fontSize:'12px', color:'rgba(255,204,0,0.8)', fontFamily:T.fontMono }}>
            v{status?.version||'1.0.0'} &nbsp;·&nbsp; {status?.namespace||'employee-portal'}
          </span>
        </div>
      </footer>
    </div>
  );
}
