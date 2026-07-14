import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, X } from 'lucide-react';
import { tokens as ds } from '../../design-system/tokens';

// ── Persona credential store ──────────────────────────────────────────────────

export type PersonaId = 'developer' | 'platform' | 'operations' | 'security' | 'provider' | 'any';

export interface PersonaCredential {
  userId: string;
  password: string;
  displayName: string;
  email: string;
  route: string;
  color: string;
  bg: string;
  border: string;
  iconPath: string;
  role: string;
  tagline: string;
}

export const PERSONA_CREDENTIALS: Record<Exclude<PersonaId, 'any'>, PersonaCredential> = {
  developer: {
    userId: 'dev.user', password: 'Dev@IPP2025',
    displayName: 'Alex Rivera', email: 'dev.user@acme.local', route: '/developer',
    color: 'var(--ds-chip-info-text)', bg: 'var(--ds-chip-info-bg)', border: 'var(--ds-chip-info-border)',
    iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    role: 'Software Engineer',
    tagline: 'Self-service provisioning · GitOps deployments · AI-assisted operations',
  },
  platform: {
    userId: 'platform.engineer', password: 'Platform@IPP2025',
    displayName: 'Jordan Kim', email: 'platform.engineer@acme.local', route: '/platform',
    color: 'var(--clr-compose)', bg: 'var(--ds-chip-info-bg)', border: 'var(--ds-chip-info-border)',
    iconPath: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    role: 'Platform Engineer',
    tagline: 'Crossplane control plane · Argo CD sync · Drift detection · Day-2 ops',
  },
  operations: {
    userId: 'ops.support', password: 'Ops@IPP2025',
    displayName: 'Sam Patel', email: 'ops.support@acme.local', route: '/operations',
    color: 'var(--ds-chip-warn-text)', bg: 'var(--ds-chip-warn-bg)', border: 'var(--ds-chip-warn-border)',
    iconPath: 'M22 12h-4l-3 9L9 3l-3 9H2',
    role: 'Operations Engineer',
    tagline: 'AIOps agents · Incident management · Cost governance · Reliability',
  },
  security: {
    userId: 'security.analyst', password: 'Security@IPP2025',
    displayName: 'Morgan Chen', email: 'security.analyst@acme.local', route: '/security',
    color: '#dc2626', bg: 'var(--ds-chip-error-bg)', border: '#fecaca',
    iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    role: 'Security Analyst',
    tagline: 'Zero-trust posture · Policy enforcement · Workload identity · Audit',
  },
  provider: {
    userId: 'tech.provider', password: 'Provider@IPP2025',
    displayName: 'Taylor Brooks', email: 'tech.provider@acme.local', route: '/provider',
    color: '#D40511', bg: 'var(--ds-chip-info-bg)', border: 'var(--ds-chip-info-border)',
    iconPath: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
    role: 'Private Cloud Infrastructure Provider',
    tagline: 'Provisioning queue · Crossplane fulfillment · SLA tracking · Capacity',
  },
};

// ── Session management ────────────────────────────────────────────────────────

const SESSION_KEY = 'idp_persona_session';

export interface PersonaSession {
  persona: Exclude<PersonaId, 'any'>;
  displayName: string;
  email: string;
  loginAt: number;
}

export function getSession(): PersonaSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: PersonaSession = JSON.parse(raw);
    if (Date.now() - s.loginAt > 8 * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function setSession(persona: Exclude<PersonaId, 'any'>, cred: PersonaCredential): void {
  const session: PersonaSession = { persona, displayName: cred.displayName, email: cred.email, loginAt: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ color }: { color: string }) {
  return (
    <span style={{ display: 'inline-block', width: 18, height: 18, border: `2.5px solid rgba(255,255,255,0.35)`, borderTopColor: '#fff', borderRadius: '50%', animation: 'ds-spin 0.7s linear infinite' }} />
  );
}

// ── LoginModal ────────────────────────────────────────────────────────────────

interface LoginModalProps {
  persona: Exclude<PersonaId, 'any'>;
  onSuccess: () => void;
  onSwitchPersona: () => void;
}

const LoginModal = ({ persona, onSuccess, onSwitchPersona }: LoginModalProps) => {
  const cred = PERSONA_CREDENTIALS[persona];
  const [userId, setUserId]     = useState(cred.userId);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    if (userId === cred.userId && password === cred.password) {
      setSession(persona, cred);
      onSuccess();
    } else {
      setError('Invalid credentials. See the hint below for demo login details.');
    }
    setLoading(false);
  }, [userId, password, cred, persona, onSuccess]);

  // Use CSS variable references so the login modal respects the active (dark) theme
  const css = ds.color.css;

  // DHL yellow-light palette constants for this dialog
  const DHL_BG        = '#FFF4CC';
  const DHL_BORDER    = '#F1E3A3';
  const DHL_INPUT_BG  = 'rgba(255,255,255,0.72)';
  const DHL_INPUT_BDR = '#E8D87A';
  const DHL_RED       = '#D40511';
  const DHL_RED_DEEP  = '#B0000B';

  return (
    <div style={{ fontFamily: ds.font.sans, width: 420, background: DHL_BG, borderRadius: 14, border: `1.5px solid ${DHL_BORDER}`, boxShadow: '0 32px 80px rgba(0,0,0,0.55)', overflow: 'hidden' }}>
      {/* DHL signature stripe — red → yellow, matches topbar */}
      <div style={{ height: 5, background: `linear-gradient(90deg, ${DHL_RED} 0%, #FFCC00 100%)` }} />

      {/* Header */}
      <div style={{ padding: '24px 24px 0', position: 'relative' }}>
        <button onClick={onSwitchPersona} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.6)', border: `1px solid ${DHL_BORDER}`, cursor: 'pointer', color: css.textSecondary, padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} strokeWidth={2} />
        </button>
        {/* Icon badge — DHL yellow tint background */}
        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(255,204,0,0.28)', border: `1.5px solid rgba(255,204,0,0.55)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={DHL_RED_DEEP} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={cred.iconPath} />
          </svg>
        </div>
        {/* Role chip */}
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10, background: 'rgba(212,5,17,0.10)', color: DHL_RED, border: `1px solid rgba(212,5,17,0.25)` }}>
          {cred.role}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: css.textPrimary, lineHeight: 1.2, marginBottom: 5, letterSpacing: '-0.02em' }}>Sign in as {cred.displayName}</div>
        <div style={{ fontSize: 13, color: css.textSecondary, lineHeight: 1.55, marginBottom: 20 }}>{cred.tagline}</div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 24px 24px' }}>
        {/* Credentials hint box */}
        <div style={{ background: 'rgba(255,255,255,0.60)', border: `1px solid ${DHL_BORDER}`, borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: css.textSecondary, lineHeight: 1.5, fontFamily: ds.font.mono }}>
          Demo credentials — User ID: <strong style={{ color: css.textPrimary }}>{cred.userId}</strong> · Password: <strong style={{ color: css.textPrimary }}>{cred.password}</strong>
        </div>

        <form onSubmit={handleLogin} autoComplete="off">
          {error && (
            <div style={{ background: 'rgba(212,5,17,0.08)', border: '1px solid rgba(212,5,17,0.25)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: DHL_RED, fontWeight: 500 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: css.textSecondary, marginBottom: 5 }}>User ID</label>
            <input
              type="text"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              disabled={loading}
              autoFocus
              style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${DHL_INPUT_BDR}`, borderRadius: 8, fontSize: 14, fontFamily: ds.font.sans, background: DHL_INPUT_BG, color: css.textPrimary, outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>

          <div style={{ marginBottom: 16, position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: css.textSecondary, marginBottom: 5 }}>Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              style={{ width: '100%', padding: '9px 36px 9px 12px', border: `1.5px solid ${DHL_INPUT_BDR}`, borderRadius: 8, fontSize: 14, fontFamily: ds.font.sans, background: DHL_INPUT_BG, color: css.textPrimary, outline: 'none', boxSizing: 'border-box' as const }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 10, top: 30, background: 'none', border: 'none', cursor: 'pointer', color: css.textTertiary, padding: 2, display: 'flex', alignItems: 'center' }}
            >
              {showPw ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
            </button>
          </div>

          {/* Submit — DHL red primary action */}
          <button
            type="submit"
            disabled={loading || !userId || !password}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 8, border: 'none',
              cursor: loading || !userId || !password ? 'not-allowed' : 'pointer',
              fontSize: 15, fontWeight: 700, color: '#ffffff', background: DHL_RED,
              letterSpacing: '0.01em', opacity: loading || !userId || !password ? 0.5 : 1,
              transition: 'opacity 0.12s, transform 0.1s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: ds.font.sans,
            }}
          >
            {loading ? <Spinner color={DHL_RED} /> : `Sign in as ${cred.role} →`}
          </button>
        </form>

        <div style={{ marginTop: 14, textAlign: 'center' as const, fontSize: 12, color: css.textTertiary }}>
          <span onClick={onSwitchPersona} style={{ color: DHL_RED, cursor: 'pointer', fontWeight: 600 }}>← Switch persona</span>
        </div>
      </div>
    </div>
  );
};

// ── PersonaLoginGate ──────────────────────────────────────────────────────────

interface PersonaLoginGateProps {
  persona: PersonaId;
  children: React.ReactNode;
}

export const PersonaLoginGate = ({ persona, children }: PersonaLoginGateProps) => {
  const navigate = useNavigate();
  const [session, setSessionState] = useState<PersonaSession | null>(getSession);
  const [open, setOpen] = useState(false);

  const requiredPersona = persona === 'any' ? null : persona;
  const hasAccess = session !== null && (requiredPersona === null || session.persona === requiredPersona);

  useEffect(() => {
    if (!hasAccess) setOpen(true);
  }, [hasAccess]);

  const handleSuccess = useCallback(() => {
    setSessionState(getSession());
    setOpen(false);
  }, []);

  const handleSwitch = useCallback(() => {
    setOpen(false);
    navigate('/');
  }, [navigate]);

  const loginPersona: Exclude<PersonaId, 'any'> = requiredPersona ?? (session?.persona ?? 'developer');

  if (hasAccess) return <>{children}</>;

  return (
    <>
      <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.35 }}>
        {children}
      </div>
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <LoginModal persona={loginPersona} onSuccess={handleSuccess} onSwitchPersona={handleSwitch} />
        </div>
      )}
    </>
  );
};
