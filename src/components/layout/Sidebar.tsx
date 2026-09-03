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
// Brighter than --color-accent (#5980a6) on purpose: the screen accent
// reads as too muted for an "active" indicator against RAIL_BG.
const RAIL_ACCENT = '#7fa8d4';

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

  const navTab = (isActive: boolean) =>
    `inline-flex items-center gap-1.5 h-full shrink-0 px-2.5 border-0 border-b-[3px] font-heading font-bold text-[12.5px] whitespace-nowrap transition-colors ${
      isActive ? '' : 'hover:text-ink'
    }`;

  return (
    <>
      {/* Desktop top navigation bar — brand mark, horizontal tabs, publisher */}
      <header
        data-testid="app-header"
        className="hidden md:flex items-center gap-3.5 h-[52px] px-6 border-b border-hairline bg-panel no-print sticky top-0 z-30 overflow-x-auto"
      >
        <div
          className="w-[26px] h-[26px] flex items-center justify-center shrink-0"
          style={{ border: '1.5px solid var(--color-accent)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.75" strokeLinecap="round">
            <path d="M12 3v18" />
            <path d="M3 12h18" />
          </svg>
        </div>
        <span className="font-heading font-semibold text-[16px] text-ink whitespace-nowrap shrink-0">TaskSheet</span>
        <span className="sr-only">{TASKSHEET_TAGLINE}</span>
        <span className="w-px h-5 bg-hairline shrink-0" aria-hidden="true" />

        <nav className="flex gap-1 h-full shrink-0" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={navTab(isActive)}
                style={{
                  color: isActive ? 'var(--color-accent-strong)' : 'var(--color-muted)',
                  background: isActive ? 'var(--color-accent-soft)' : 'transparent',
                  borderBottomColor: isActive ? 'var(--color-accent)' : 'transparent',
                }}
              >
                {item.label}
                {item.badge && (
                  <span className="badge badge-warning shrink-0">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3 shrink-0">
          <span className="max-[900px]:hidden text-[11px] text-faint whitespace-nowrap" title={TASKSHEET_TAGLINE}>
            SoftVibeSolutions
          </span>
        </div>
      </header>

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
            <p className="text-[10.5px] leading-snug pt-1" style={{ color: RAIL_TEXT_MUTED }}>{TASKSHEET_TAGLINE}</p>
          </div>
        </div>
      )}
    </>
  );
};
