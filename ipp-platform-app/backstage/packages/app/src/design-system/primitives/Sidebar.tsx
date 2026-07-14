import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { tokens, dhl } from '../tokens';
import { ChevronDown } from 'lucide-react';
import dhlLogoSvg from '../../assets/dhl-logo.png';

export interface SidebarItemDef {
  label: string;
  path: string;
  icon: React.ReactNode;
  /** If set, clicking opens this URL in a new tab instead of navigating internally. */
  href?: string;
}

export interface SidebarProps {
  items: SidebarItemDef[];
  dividerAfter?: number[];
  sectionHeaders?: Record<number, string>;
  collapsedByDefault?: string[];
  /** Section name that receives DHL yellow accent treatment (the "Start Here" section). */
  featuredSection?: string;
  logo?: React.ReactNode;
  wordmark?: string;
  className?: string;
  style?: React.CSSProperties;
  footer?: React.ReactNode;
}

const NavItem: React.FC<{ item: SidebarItemDef }> = ({ item }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const nav = (theme.palette as any).navigation;
  const active = !item.href && (
    location.pathname === item.path ||
    (item.path !== '/' && location.pathname.startsWith(item.path))
  );
  const [hovered, setHovered] = React.useState(false);

  const handleClick = () => {
    if (item.href) {
      window.open(item.href, '_blank', 'noopener,noreferrer');
    } else {
      navigate(item.path);
    }
  };

  // Light mode: solid DHL yellow bg, black text (WCAG AA: 1A1A1A on FFCC00 = 8.6:1)
  // Dark mode: deep yellow-tinted bg, yellow text
  const isDarkMode = theme.palette.mode === 'dark';
  const activeBg    = isDarkMode ? '#3D3200' : dhl.yellow;
  const activeText  = isDarkMode ? dhl.yellow : dhl.black;
  const hoverBg     = isDarkMode ? 'rgba(255,204,0,0.10)' : 'rgba(255,204,0,0.18)';

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={item.label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '7px 12px 7px 11px',
        border: 'none',
        borderRadius: '8px',
        boxShadow: 'none',
        background: active
          ? activeBg
          : hovered
          ? hoverBg
          : 'transparent',
        color: active
          ? activeText
          : `var(--ds-text-secondary, ${nav?.color ?? theme.palette.text.secondary})`,
        fontSize: '13.5px',
        fontWeight: active ? 700 : 500,
        fontFamily: tokens.font.sans,
        letterSpacing: '-0.005em',
        cursor: 'pointer',
        textAlign: 'left',
        transition: `background ${tokens.motion.duration} ${tokens.motion.standard}, color ${tokens.motion.duration} ${tokens.motion.standard}`,
        boxSizing: 'border-box',
      }}
      aria-current={active ? 'page' : undefined}
    >
      <span style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        color: active ? activeText : `var(--ds-text-tertiary, ${theme.palette.text.disabled})`,
        transition: `color ${tokens.motion.duration} ${tokens.motion.standard}`,
      }}>
        {item.icon}
      </span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.label}
      </span>
    </button>
  );
};

// ── DHL Logo Mark ─────────────────────────────────────────────────────────────
const DhlLogoMark: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
    <img
      src={dhlLogoSvg}
      alt="DHL"
      height={22}
      style={{ display: 'block', flexShrink: 0 }}
    />
    <span style={{
      fontSize: '13px',
      fontWeight: 700,
      color: dhl.redDeep,
      letterSpacing: '0.12em',
      fontFamily: tokens.font.sans,
      textTransform: 'uppercase',
      lineHeight: 1,
    }}>
      IPP
    </span>
  </div>
);

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ items, dividerAfter = [], sectionHeaders = {}, collapsedByDefault = [], featuredSection, logo, wordmark: _wordmark, className, style, footer }, ref) => {
    const theme = useTheme();
    const p = theme.palette;
    const isDark = theme.palette.mode === 'dark';

    const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(
      () => new Set(collapsedByDefault),
    );

    const toggleSection = React.useCallback((name: string) => {
      setCollapsedSections(prev => {
        const next = new Set(prev);
        if (next.has(name)) { next.delete(name); } else { next.add(name); }
        return next;
      });
    }, []);

    const itemSection = React.useMemo(() => {
      const map: Record<number, string> = {};
      let current = '';
      for (let i = 0; i < items.length; i++) {
        if (sectionHeaders[i] !== undefined) current = sectionHeaders[i];
        map[i] = current;
      }
      return map;
    }, [items, sectionHeaders]);

    return (
      <aside
        ref={ref}
        className={`apple-sidebar ${className ?? ''}`}
        style={style}
        aria-label="Main navigation"
      >
        {/* DHL Logo / wordmark — yellow brand strip */}
        <div style={{
          height: tokens.topbar.height,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          flexShrink: 0,
          backgroundColor: dhl.yellow,
          borderBottom: `2px solid ${dhl.red}`,
        }}>
          {logo ?? <DhlLogoMark />}
        </div>

        {/* Nav items */}
        <nav
          style={{ flex: 1, padding: '8px 6px 12px', overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}
          aria-label="Navigation"
        >
          {items.map((item, i) => {
            const sectionName = sectionHeaders[i];
            const isCollapsible = sectionName !== undefined && collapsedByDefault.includes(sectionName);
            const isSectionCollapsed = collapsedSections.has(itemSection[i]);
            const showItem = !isSectionCollapsed || sectionName !== undefined;
            const isFeatured = sectionName === featuredSection;
            const currentSectionFeatured = itemSection[i] === featuredSection;

            return (
              <React.Fragment key={item.path}>
                {sectionName !== undefined && (
                  <>
                    {/* Section spacer — skip for first section */}
                    {i > 0 && <div style={{ height: 4 }} />}
                    <button
                      onClick={isCollapsible ? () => toggleSection(sectionName) : undefined}
                      tabIndex={isCollapsible ? 0 : -1}
                      aria-expanded={isCollapsible ? !collapsedSections.has(sectionName) : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: isFeatured ? '10px 12px 5px' : '10px 12px 4px',
                        background: isFeatured
                          ? (isDark ? 'rgba(255,204,0,0.07)' : 'rgba(255,204,0,0.12)')
                          : 'none',
                        borderRadius: isFeatured ? '7px 7px 0 0' : 0,
                        border: 'none',
                        cursor: isCollapsible ? 'pointer' : 'default',
                        fontFamily: tokens.font.sans,
                      }}
                    >
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: isFeatured
                          ? (isDark ? dhl.yellow : dhl.redDeep)
                          : 'var(--ds-text-tertiary)',
                      }}>
                        {sectionName}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isFeatured && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            color: isDark ? dhl.yellow : dhl.red,
                            background: isDark ? 'rgba(255,204,0,0.15)' : 'rgba(212,5,17,0.1)',
                            padding: '1px 5px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                          }}>
                            Start
                          </span>
                        )}
                        {isCollapsible && (
                          <span style={{
                            color: 'var(--ds-text-tertiary)',
                            display: 'flex',
                            transition: `transform ${tokens.motion.duration} ${tokens.motion.standard}`,
                            transform: collapsedSections.has(sectionName) ? 'rotate(-90deg)' : 'rotate(0deg)',
                          }}>
                            <ChevronDown size={12} strokeWidth={2.5} />
                          </span>
                        )}
                      </span>
                    </button>
                    {/* Featured section — subtle yellow left-rail */}
                    {isFeatured && !isSectionCollapsed && (
                      <div style={{
                        marginLeft: 12,
                        marginBottom: 1,
                        width: 2,
                        height: 0,
                        display: 'none', // handled via wrapper below
                      }} />
                    )}
                  </>
                )}
                {showItem && !isSectionCollapsed && (
                  <div style={currentSectionFeatured ? {
                    borderLeft: `2px solid ${isDark ? 'rgba(255,204,0,0.3)' : 'rgba(255,204,0,0.6)'}`,
                    marginLeft: 6,
                    paddingLeft: 2,
                    background: isDark ? 'rgba(255,204,0,0.03)' : 'rgba(255,204,0,0.05)',
                    borderRadius: '0 6px 6px 0',
                  } : {}}>
                    <NavItem item={item} />
                  </div>
                )}
                {dividerAfter.includes(i) && !isSectionCollapsed && (
                  <div style={{ height: '1px', background: p.divider, margin: '6px 8px' }} />
                )}
                {dividerAfter.includes(i) && isSectionCollapsed && (
                  <div style={{ height: '1px', background: p.divider, margin: '4px 8px' }} />
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '10px 14px',
          borderTop: `1px solid ${p.divider}`,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {footer ?? (
            <>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#22C55E',
                flexShrink: 0,
                boxShadow: '0 0 4px rgba(34,197,94,0.6)',
              }} />
              <span style={{
                fontSize: '11px',
                color: 'var(--ds-text-tertiary)',
                fontFamily: tokens.font.sans,
                letterSpacing: '0.01em',
              }}>
                Platform live
              </span>
            </>
          )}
        </div>
      </aside>
    );
  },
);

Sidebar.displayName = 'Sidebar';
