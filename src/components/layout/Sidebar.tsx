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

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#081D3A] text-slate-200 border-r border-[#152E52] no-print flex-shrink-0 h-screen sticky top-0">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#152E52] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-400/40 flex items-center justify-center text-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.2)] shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M7 8h4" />
              <path d="M7 12h4" />
              <path d="M7 16h2" />
              <path d="M15 15h4" />
              <path d="M17 13v4" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-tight">TaskSheet</h1>
            <p className="max-w-[150px] text-[10px] leading-tight text-teal-300 font-medium">{TASKSHEET_TAGLINE}</p>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#0E3D4D] text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Divider & Settings */}
        <div className="p-4 border-t border-[#152E52] space-y-2">
          <button
            type="button"
            onClick={() => onTabChange('settings')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              currentTab === 'settings'
                ? 'bg-[#0E3D4D] text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5 text-slate-400" />
            <span>Settings</span>
          </button>

          <div className="pt-2 border-t border-[#152E52] text-xs text-slate-400 space-y-2">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Organize care. Generate shift sheets. Print fast.
            </p>
            <div className="flex items-center space-x-2 text-slate-300 font-semibold text-xs pt-1">
              <svg className="w-4 h-4 text-teal-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 12l10 10 10-10L12 2zm0 4.5l5.5 5.5-5.5 5.5-5.5-5.5L12 6.5z" />
              </svg>
              <span>SoftVibeSolutions</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#081D3A] border-t border-[#152E52] px-3 flex items-center justify-around z-40 no-print">
        <button
          type="button"
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center justify-center p-1 ${currentTab === 'dashboard' ? 'text-teal-400 font-bold' : 'text-slate-400'}`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('shifts')}
          className={`flex flex-col items-center justify-center p-1 ${currentTab === 'shifts' ? 'text-teal-400 font-bold' : 'text-slate-400'}`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Shifts</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('residents')}
          className={`flex flex-col items-center justify-center p-1 ${currentTab === 'residents' ? 'text-teal-400 font-bold' : 'text-slate-400'}`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Residents</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('fyi-binder')}
          className={`flex flex-col items-center justify-center p-1 ${currentTab === 'fyi-binder' ? 'text-teal-400 font-bold' : 'text-slate-400'}`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">FYI Binder</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center p-1 text-slate-400"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </div>

      {/* Mobile More Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-[#081D3A] border-t border-[#152E52] rounded-t-2xl p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#152E52] pb-3">
              <h3 className="text-base font-bold text-white">More Options</h3>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => { onTabChange('reports-print'); setMobileMenuOpen(false); }}
                className="w-full flex items-center space-x-3 px-4 py-3 bg-[#0E2C52] rounded-xl text-slate-200 text-sm font-medium"
              >
                <Printer className="w-5 h-5 text-teal-400" />
                <span>Print Center</span>
              </button>

              <button
                type="button"
                onClick={() => { onTabChange('settings'); setMobileMenuOpen(false); }}
                className="w-full flex items-center space-x-3 px-4 py-3 bg-[#0E2C52] rounded-xl text-slate-200 text-sm font-medium"
              >
                <Settings className="w-5 h-5 text-slate-400" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
