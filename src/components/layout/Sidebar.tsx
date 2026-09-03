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
}

// One shared dark-surface identity for both the desktop rail and the
// mobile bottom bar/drawer — deliberately separate from the screen
// tokens (documented in DESIGN.md), since nothing else in the inherited
// style chain provides a legible color against this background.
const RAIL_BG = '#1d2d3d';
const RAIL_LINE = 'rgba(255,255,255,0.08)';
const RAIL_TEXT_MUTED = '#8b9096';
const RAIL_ACTIVE_TINT = 'rgba(94,170,160,0.12)';

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  binderUpdateRequired = false
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
    `w-full flex items-center gap-3 pl-2.5 pr-3 py-2 border-l-[3px] rounded-r-control text-sm font-medium transition-colors ${
      isActive ? 'text-white' : 'border-transparent hover:text-white hover:bg-white/5'
    }`;

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside
        data-testid="app-sidebar"
        className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 no-print"
        style={{ background: RAIL_BG, color: RAIL_TEXT_MUTED }}
      >
        {/* Brand mark */}
        <div className="px-4 py-4 flex items-center gap-2.5 shrink-0" style={{ borderBottom: `1px solid ${RAIL_LINE}` }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" className="shrink-0">
            <path d="M12 2v20" />
            <path d="M2 12h20" />
            <circle cx="12" cy="12" r="9" opacity="0.35" />
          </svg>
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-white text-[15px] leading-tight truncate">TaskSheet</h1>
            <p className="text-[10px] font-semibold uppercase tracking-wider truncate" style={{ color: RAIL_TEXT_MUTED }}>SoftVibeSolutions</p>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={railRow(isActive)}
                style={isActive ? { background: RAIL_ACTIVE_TINT, borderLeftColor: 'var(--color-accent)' } : undefined}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.badge && (
                  <span className="badge badge-warning shrink-0">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 space-y-1 shrink-0" style={{ borderTop: `1px solid ${RAIL_LINE}` }}>
          <p className="text-[10.5px] leading-snug" style={{ color: RAIL_TEXT_MUTED }}>{TASKSHEET_TAGLINE}</p>
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
          <span className="text-[9.5px] font-semibold">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('shifts')}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-control"
          style={{ color: currentTab === 'shifts' ? '#ffffff' : RAIL_TEXT_MUTED, background: currentTab === 'shifts' ? RAIL_ACTIVE_TINT : 'transparent' }}
        >
          <Clock className="w-[18px] h-[18px]" />
          <span className="text-[9.5px] font-semibold">Shifts</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('residents')}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-control"
          style={{ color: currentTab === 'residents' ? '#ffffff' : RAIL_TEXT_MUTED, background: currentTab === 'residents' ? RAIL_ACTIVE_TINT : 'transparent' }}
        >
          <Users className="w-[18px] h-[18px]" />
          <span className="text-[9.5px] font-semibold">Residents</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('fyi-binder')}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-control"
          style={{ color: currentTab === 'fyi-binder' ? '#ffffff' : RAIL_TEXT_MUTED, background: currentTab === 'fyi-binder' ? RAIL_ACTIVE_TINT : 'transparent' }}
        >
          <BookOpen className="w-[18px] h-[18px]" />
          <span className="text-[9.5px] font-semibold">FYI Binder</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-control"
          style={{ color: RAIL_TEXT_MUTED }}
        >
          <Menu className="w-[18px] h-[18px]" />
          <span className="text-[9.5px] font-semibold">More</span>
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
                className="p-1.5 rounded-control hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => { onTabChange('reports-print'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 h-11 rounded-control text-sm font-semibold hover:bg-white/5 hover:text-white"
              >
                <Printer className="w-[18px] h-[18px]" />
                <span>Print Center</span>
              </button>

              <button
                type="button"
                onClick={() => { onTabChange('settings'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 h-11 rounded-control text-sm font-semibold hover:bg-white/5 hover:text-white"
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
