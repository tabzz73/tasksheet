import React from 'react';
import { TASKSHEET_TAGLINE } from '../../constants/branding';
import {
  LayoutGrid,
  Clock,
  Users,
  BookOpen,
  Printer,
  Settings,
  Menu,
  X
} from 'lucide-react';

export type NavigationTab =
  | 'dashboard'
  | 'shifts'
  | 'residents'
  | 'fyi-binder'
  | 'reports-print'
  | 'settings'
  | 'welcome';

interface SidebarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenQuickAdd: () => void;
  binderUpdateRequired?: boolean;
  facilityName?: string;
  isDemoMode?: boolean;
}

// One shared dark-navy identity for both the desktop rail and the
// mobile bottom bar/drawer — deliberately separate from the screen
// tokens (documented in DESIGN.md), since nothing else in the inherited
// style chain provides a legible color against this background.
const RAIL_BG = '#12141A';
const RAIL_LINE = 'rgba(255,255,255,0.08)';
const RAIL_TEXT_MUTED = '#A8A296';
const RAIL_HOVER_TINT = 'rgba(255,255,255,0.06)';
const RAIL_ACTIVE_TINT = 'rgba(255,255,255,0.1)';

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  binderUpdateRequired = false,
  facilityName,
  isDemoMode = false
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard' as NavigationTab, label: 'Dashboard', icon: LayoutGrid },
    { id: 'shifts' as NavigationTab, label: 'Shifts', icon: Clock },
    { id: 'residents' as NavigationTab, label: 'Residents', icon: Users },
    {
      id: 'fyi-binder' as NavigationTab,
      label: 'FYI Binder',
      icon: BookOpen,
      badge: binderUpdateRequired ? 'Update' : undefined
    },
    { id: 'reports-print' as NavigationTab, label: 'Print Center', icon: Printer },
    { id: 'settings' as NavigationTab, label: 'Settings', icon: Settings },
  ];

  const railRow = (isActive: boolean) =>
    `w-full flex items-center gap-[11px] h-10 px-3 rounded-control text-[13.5px] font-semibold transition-colors ${
      isActive ? 'text-white' : 'hover:text-white'
    }`;

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside
        data-testid="app-sidebar"
        className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 no-print"
        style={{ background: RAIL_BG, color: RAIL_TEXT_MUTED }}
      >
        {/* Brand mark */}
        <div className="h-16 px-4 flex items-center gap-2.5 shrink-0">
          <div
            className="w-8 h-8 rounded-control flex items-center justify-center shrink-0 font-heading font-extrabold text-[15px]"
            style={{ background: 'var(--color-signature)', color: 'var(--color-ink)' }}
          >
            T
          </div>
          <div className="min-w-0">
            <p className="font-heading font-bold text-white text-[14.5px] leading-tight tracking-[-0.01em] truncate">TaskSheet</p>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] truncate" style={{ color: '#7c869a' }}>SoftVibeSolutions</p>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-2 py-1.5 space-y-0.5 overflow-y-auto" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = RAIL_HOVER_TINT; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                className={railRow(isActive)}
                style={{ background: isActive ? RAIL_ACTIVE_TINT : 'transparent' }}
              >
                <Icon className="w-[17px] h-[17px] shrink-0" strokeWidth={1.75} />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.badge && (
                  <span className="badge badge-warning shrink-0">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3.5 flex items-center gap-[7px] shrink-0">
          <span
            className="w-[7px] h-[7px] rounded-full shrink-0"
            style={{ background: isDemoMode ? 'var(--color-signature)' : 'var(--color-accent)' }}
          />
          <div className="min-w-0">
            {isDemoMode ? (
              <div className="text-[10.5px] font-bold uppercase tracking-[0.05em]" style={{ color: 'var(--color-signature)' }}>DEMO MODE</div>
            ) : (
              <div className="text-[10.5px] font-bold uppercase tracking-[0.05em]" style={{ color: RAIL_TEXT_MUTED }}>{TASKSHEET_TAGLINE}</div>
            )}
            <div className="text-[11px] truncate" style={{ color: '#7c869a' }}>{facilityName || 'Facility Not Configured'}</div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 h-14 px-2 flex items-center justify-around z-40 no-print"
        style={{ background: RAIL_BG, borderTop: `1px solid ${RAIL_LINE}` }}
      >
        <button
          type="button"
          onClick={() => onTabChange('dashboard')}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-control"
          style={{ color: currentTab === 'dashboard' ? '#ffffff' : RAIL_TEXT_MUTED, background: currentTab === 'dashboard' ? RAIL_ACTIVE_TINT : 'transparent' }}
        >
          <LayoutGrid className="w-[18px] h-[18px]" />
          <span className="text-[10.5px] font-semibold">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('shifts')}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-control"
          style={{ color: currentTab === 'shifts' ? '#ffffff' : RAIL_TEXT_MUTED, background: currentTab === 'shifts' ? RAIL_ACTIVE_TINT : 'transparent' }}
        >
          <Clock className="w-[18px] h-[18px]" />
          <span className="text-[10.5px] font-semibold">Shifts</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('residents')}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-control"
          style={{ color: currentTab === 'residents' ? '#ffffff' : RAIL_TEXT_MUTED, background: currentTab === 'residents' ? RAIL_ACTIVE_TINT : 'transparent' }}
        >
          <Users className="w-[18px] h-[18px]" />
          <span className="text-[10.5px] font-semibold">Residents</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('fyi-binder')}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-control"
          style={{ color: currentTab === 'fyi-binder' ? '#ffffff' : RAIL_TEXT_MUTED, background: currentTab === 'fyi-binder' ? RAIL_ACTIVE_TINT : 'transparent' }}
        >
          <BookOpen className="w-[18px] h-[18px]" />
          <span className="text-[10.5px] font-semibold">FYI Binder</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-control"
          style={{ color: RAIL_TEXT_MUTED }}
        >
          <Menu className="w-[18px] h-[18px]" />
          <span className="text-[10.5px] font-semibold">More</span>
        </button>
      </div>

      {/* Mobile More Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 flex flex-col justify-end">
          <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto" style={{ background: RAIL_BG, borderTop: `1px solid ${RAIL_LINE}`, color: RAIL_TEXT_MUTED }}>
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${RAIL_LINE}` }}>
              <h3 className="text-sm font-bold text-white">More</h3>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-control hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => { onTabChange('reports-print'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 h-11 rounded-control text-sm font-semibold hover:bg-white/5 hover:text-white transition-colors"
              >
                <Printer className="w-[18px] h-[18px]" />
                <span>Print Center</span>
              </button>

              <button
                type="button"
                onClick={() => { onTabChange('settings'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 h-11 rounded-control text-sm font-semibold hover:bg-white/5 hover:text-white transition-colors"
              >
                <Settings className="w-[18px] h-[18px]" />
                <span>Settings</span>
              </button>
            </div>
            <p className="text-[10.5px] leading-snug pt-1" style={{ color: RAIL_TEXT_MUTED }}>{TASKSHEET_TAGLINE}</p>
          </div>
        </div>
      )}
    </>
  );
};
