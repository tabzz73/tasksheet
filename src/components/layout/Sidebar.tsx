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

const RAIL_BG = '#15181c';
const RAIL_LINE = '#282b30';
const RAIL_TEXT_MUTED = '#8b9096';
// Brighter than --color-accent (#0d6e6e) on purpose: the screen accent is
// too dark to read as an "active" indicator against RAIL_BG.
const RAIL_ACCENT = '#3fb8b0';

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
  ];

  const railRow = (isActive: boolean) =>
    `group relative w-full flex items-center gap-3 pl-4 pr-3.5 h-10 text-[13px] font-semibold transition-colors ${
      isActive ? 'text-white' : 'hover:text-white'
    }`;

  return (
    <>
      {/* Desktop Permanent Sidebar — flat structured rail, not floating pills */}
      <aside
        className="hidden md:flex flex-col w-56 no-print flex-shrink-0 h-screen sticky top-0"
        style={{ background: RAIL_BG, borderRight: `1px solid ${RAIL_LINE}`, color: RAIL_TEXT_MUTED }}
      >
        {/* Brand mark */}
        <div className="h-14 px-4 flex items-center gap-2.5 shrink-0" style={{ borderBottom: `1px solid ${RAIL_LINE}` }}>
          <div className="w-6 h-6 flex items-center justify-center shrink-0" style={{ color: RAIL_ACCENT }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="1.5" />
              <path d="M7 8h10" />
              <path d="M7 12h10" />
              <path d="M7 16h6" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-[13px] font-bold text-white tracking-tight leading-none">TaskSheet</h1>
          </div>
        </div>

        {/* Primary Navigation — flat rows, left accent stripe marks active */}
        <nav className="flex-1 py-2 overflow-y-auto">
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
                style={isActive ? { background: 'rgba(63,184,176,0.10)' } : undefined}
              >
                <span
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ background: isActive ? RAIL_ACCENT : 'transparent' }}
                  aria-hidden="true"
                />
                <Icon className="w-[17px] h-[17px] shrink-0" style={{ color: isActive ? RAIL_ACCENT : RAIL_TEXT_MUTED }} />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.badge && (
                  <span className="badge badge-warning shrink-0">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom utility area */}
        <div style={{ borderTop: `1px solid ${RAIL_LINE}` }}>
          <button
            type="button"
            onClick={() => onTabChange('settings')}
            aria-current={currentTab === 'settings' ? 'page' : undefined}
            className={railRow(currentTab === 'settings')}
            style={currentTab === 'settings' ? { background: 'rgba(63,184,176,0.10)' } : undefined}
          >
            <span
              className="absolute left-0 top-0 bottom-0 w-[3px]"
              style={{ background: currentTab === 'settings' ? RAIL_ACCENT : 'transparent' }}
              aria-hidden="true"
            />
            <Settings className="w-[17px] h-[17px] shrink-0" style={{ color: currentTab === 'settings' ? RAIL_ACCENT : RAIL_TEXT_MUTED }} />
            <span className="flex-1 text-left">Settings</span>
          </button>

          <div className="px-4 py-3 space-y-1" style={{ borderTop: `1px solid ${RAIL_LINE}` }}>
            <p className="text-[10.5px] leading-snug" style={{ color: RAIL_TEXT_MUTED }}>{TASKSHEET_TAGLINE}</p>
            <p className="text-[10.5px] font-semibold" style={{ color: RAIL_TEXT_MUTED }}>SoftVibeSolutions</p>
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
          className="flex flex-col items-center justify-center gap-0.5 px-1 py-1"
          style={{ color: currentTab === 'dashboard' ? RAIL_ACCENT : RAIL_TEXT_MUTED }}
        >
          <LayoutGrid className="w-[18px] h-[18px]" />
          <span className="text-[9.5px] font-semibold">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('shifts')}
          className="flex flex-col items-center justify-center gap-0.5 px-1 py-1"
          style={{ color: currentTab === 'shifts' ? RAIL_ACCENT : RAIL_TEXT_MUTED }}
        >
          <Clock className="w-[18px] h-[18px]" />
          <span className="text-[9.5px] font-semibold">Shifts</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('residents')}
          className="flex flex-col items-center justify-center gap-0.5 px-1 py-1"
          style={{ color: currentTab === 'residents' ? RAIL_ACCENT : RAIL_TEXT_MUTED }}
        >
          <Users className="w-[18px] h-[18px]" />
          <span className="text-[9.5px] font-semibold">Residents</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('fyi-binder')}
          className="flex flex-col items-center justify-center gap-0.5 px-1 py-1"
          style={{ color: currentTab === 'fyi-binder' ? RAIL_ACCENT : RAIL_TEXT_MUTED }}
        >
          <BookOpen className="w-[18px] h-[18px]" />
          <span className="text-[9.5px] font-semibold">FYI Binder</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 px-1 py-1"
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
                className="w-full flex items-center gap-3 px-3 h-11 rounded-control text-sm font-semibold hover:bg-white/5"
              >
                <Printer className="w-[18px] h-[18px]" style={{ color: RAIL_ACCENT }} />
                <span>Print Center</span>
              </button>

              <button
                type="button"
                onClick={() => { onTabChange('settings'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 h-11 rounded-control text-sm font-semibold hover:bg-white/5"
              >
                <Settings className="w-[18px] h-[18px]" style={{ color: RAIL_TEXT_MUTED }} />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
