import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  Search, 
  Plus, 
  Sparkles, 
  ChevronRight, 
  HeartHandshake, 
  Bandage, 
  Info,
  Building,
  Filter,
  LayoutList,
  LayoutGrid,
  DoorOpen,
  MoreVertical,
  Edit,
  ArrowRightLeft,
  Activity,
  Printer,
  CheckCircle2,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { db } from '../../db';
import { Resident, ResidentStatus } from '../../types';
import { getResidentStatusLabel, isResidentCarePaused } from '../../services/residentStatus';
import { sortRoomNumbers } from '../../services/generator';
import { CardNavigationButton } from '../common/CardNavigationButton';
import { Modal } from '../common/Modal';
import { ViewHeader } from '../common/ViewHeader';

type ResidentsViewMode = 'list' | 'cards' | 'rooms';
const VIEW_MODE_KEY = 'tasksheet_residents_view_mode';
const RESIDENT_MENU_WIDTH = 192;
const RESIDENT_MENU_ESTIMATED_HEIGHT = 270;

interface ResidentMenuPosition {
  top?: number;
  bottom?: number;
  left: number;
  maxHeight: number;
  transformOrigin: string;
}

interface ResidentsViewProps {
  onOpenResidentProfile: (residentId: string) => void;
  onOpenAddResident: () => void;
  onOpenQuickCareSetup: (resident: Resident) => void;
  onOpenAddCareTask?: (residentId?: string) => void;
  onOpenAddFYI?: (residentId?: string) => void;
  onOpenAddWound?: (residentId?: string) => void;
}

export const ResidentsView: React.FC<ResidentsViewProps> = ({
  onOpenResidentProfile,
  onOpenAddResident,
  onOpenQuickCareSetup,
  onOpenAddCareTask,
  onOpenAddFYI,
  onOpenAddWound
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [quickAddMenuOpen, setQuickAddMenuOpen] = useState(false);
  const [activeMenuResidentId, setActiveMenuResidentId] = useState<string | null>(null);
  const [residentMenuPosition, setResidentMenuPosition] = useState<ResidentMenuPosition | null>(null);
  const [moveRoomResident, setMoveRoomResident] = useState<Resident | null>(null);
  const [newRoomInput, setNewRoomInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ResidentsViewMode>(() => {
    try {
      return (localStorage.getItem(VIEW_MODE_KEY) as ResidentsViewMode) || 'list';
    } catch {
      return 'list';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // ignore
    }
  }, [viewMode]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setQuickAddMenuOpen(false);
      setActiveMenuResidentId(null);
      setResidentMenuPosition(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveMenuResidentId(null);
        setResidentMenuPosition(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!activeMenuResidentId) return;
    const closePositionedMenu = () => {
      setActiveMenuResidentId(null);
      setResidentMenuPosition(null);
    };
    window.addEventListener('resize', closePositionedMenu);
    window.addEventListener('scroll', closePositionedMenu, true);
    return () => {
      window.removeEventListener('resize', closePositionedMenu);
      window.removeEventListener('scroll', closePositionedMenu, true);
    };
  }, [activeMenuResidentId]);

  const toggleResidentMenu = (event: React.MouseEvent<HTMLButtonElement>, residentId: string) => {
    event.stopPropagation();
    if (activeMenuResidentId === residentId) {
      setActiveMenuResidentId(null);
      setResidentMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const viewportPadding = 8;
    const menuGap = 4;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openUpwards = spaceBelow < RESIDENT_MENU_ESTIMATED_HEIGHT && spaceAbove > spaceBelow;
    const availableHeight = Math.max(160, openUpwards ? spaceAbove - menuGap : spaceBelow - menuGap);
    const maxLeft = Math.max(viewportPadding, window.innerWidth - RESIDENT_MENU_WIDTH - viewportPadding);
    const left = Math.min(
      maxLeft,
      Math.max(viewportPadding, rect.right - RESIDENT_MENU_WIDTH)
    );

    setResidentMenuPosition({
      top: openUpwards ? undefined : rect.bottom + menuGap,
      bottom: openUpwards ? window.innerHeight - rect.top + menuGap : undefined,
      left,
      maxHeight: availableHeight,
      transformOrigin: `${openUpwards ? 'bottom' : 'top'} right`,
    });
    setActiveMenuResidentId(residentId);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const state = db.getState();
  const allResidents = state.residents;
  const residentTasks = state.residentTasks;
  const wounds = state.wounds;
  const fyis = state.fyis;

  const filteredResidents = allResidents
    .filter(r => {
      if (statusFilter === 'active' && r.status !== 'active') return false;
      if (statusFilter === 'in_hospital' && r.status !== 'in_hospital') return false;
      if (statusFilter === 'out_on_pass' && r.status !== 'out_on_pass') return false;
      if (statusFilter === 'on_hold' && r.status !== 'on_hold') return false;
      if (statusFilter === 'former' && r.status !== 'discharged' && r.status !== 'deceased' && r.status !== 'inactive') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchRoom = r.roomNumber.toLowerCase().includes(q);
      const matchName = `${r.firstName} ${r.lastName}`.toLowerCase().includes(q);
      return matchRoom || matchName;
    })
    .sort((a, b) => sortRoomNumbers(a.roomNumber, b.roomNumber));

  const getStatusBadge = (status: ResidentStatus) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-positive">Active</span>;
      case 'in_hospital':
        return <span className="badge badge-danger">In Hospital</span>;
      case 'out_on_pass':
        return <span className="badge badge-warning">Out on Pass</span>;
      case 'on_hold':
        return <span className="badge badge-warning">On Hold</span>;
      case 'discharged':
      case 'deceased':
      case 'inactive':
        return <span className="badge badge-neutral">Former</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const handleStatusChange = (residentId: string, newStatus: ResidentStatus) => {
    try {
      db.updateResident(residentId, { status: newStatus });
      setActiveMenuResidentId(null); setResidentMenuPosition(null);
      showToast(`Resident status updated to ${getResidentStatusLabel(newStatus)}.`);
    } catch (error) { showToast((error as Error).message); }
  };

  const handleMoveRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveRoomResident || !newRoomInput.trim()) return;
    try {
      db.updateResident(moveRoomResident.id, { roomNumber: newRoomInput.trim() });
      showToast(`Moved ${moveRoomResident.firstName} ${moveRoomResident.lastName} to Room ${newRoomInput.trim()}.`);
      setMoveRoomResident(null); setNewRoomInput('');
    } catch (error) { showToast((error as Error).message); }
  };

  // Group rooms for the "Rooms" view
  const groupResidentsByWing = () => {
    const wingsMap: Record<string, Resident[]> = {};
    filteredResidents.forEach(res => {
      const roomNum = res.roomNumber.trim();
      let wingLabel = 'Wing A · 100s';
      const firstDigit = roomNum.charAt(0);
      if (firstDigit === '1') wingLabel = 'Wing A · 100s';
      else if (firstDigit === '2') wingLabel = 'Wing B · 200s';
      else if (firstDigit === '3') wingLabel = 'Wing C · 300s';
      else if (firstDigit === '4') wingLabel = 'Wing D · 400s';
      else wingLabel = 'Other Rooms';

      if (!wingsMap[wingLabel]) wingsMap[wingLabel] = [];
      wingsMap[wingLabel].push(res);
    });
    return wingsMap;
  };

  const activeCount = allResidents.filter(r => r.status === 'active').length;
  const inHospitalCount = allResidents.filter(r => r.status === 'in_hospital').length;
  const outOnPassCount = allResidents.filter(r => r.status === 'out_on_pass').length;

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-ink text-white rounded-surface shadow-elevated text-xs font-semibold flex items-center space-x-2 animate-toast-in">
          <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {allResidents.some(resident => resident.roomAssignmentNeedsReview) && <div className="rounded-surface border border-warning bg-warning-soft p-3.5 text-[12px] text-ink"><div className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4 text-warning"/>Room assignment needs correction</div><p className="mt-1 text-ink-soft">{allResidents.filter(resident => resident.roomAssignmentNeedsReview).length} imported or migrated resident record(s) have a missing or conflicting occupancy assignment and are withheld from operational TaskSheets. Use Move Room to assign an available position.</p></div>}

      {/* ── HEADER ── */}
      <ViewHeader
        kicker="Care"
        title="Residents"
        subtitle={`${activeCount} active · ${inHospitalCount} in hospital · ${outOnPassCount} out on pass`}
        action={
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {/* View Switcher */}
            <div className="flex items-center border border-hairline-strong rounded-control overflow-hidden">
              <button type="button" onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'} className={`flex items-center gap-1.5 px-2.5 h-8 text-[12px] font-semibold transition-colors ${viewMode === 'list' ? 'bg-ink text-white' : 'text-ink-soft hover:bg-panel-sunken'}`} title="Compact list view">
                <LayoutList className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <div className="w-px self-stretch bg-hairline-strong" />
              <button type="button" onClick={() => setViewMode('cards')} aria-pressed={viewMode === 'cards'} className={`flex items-center gap-1.5 px-2.5 h-8 text-[12px] font-semibold transition-colors ${viewMode === 'cards' ? 'bg-ink text-white' : 'text-ink-soft hover:bg-panel-sunken'}`} title="Cards view">
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <div className="w-px self-stretch bg-hairline-strong" />
              <button type="button" onClick={() => setViewMode('rooms')} aria-pressed={viewMode === 'rooms'} className={`flex items-center gap-1.5 px-2.5 h-8 text-[12px] font-semibold transition-colors ${viewMode === 'rooms' ? 'bg-ink text-white' : 'text-ink-soft hover:bg-panel-sunken'}`} title="Rooms & wings directory">
                <DoorOpen className="w-3.5 h-3.5" />
                <span>Rooms</span>
              </button>
            </div>

            {/* Quick Add Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuickAddMenuOpen(!quickAddMenuOpen);
                }}
                className="btn btn-accent"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quick Add</span>
              </button>

              {quickAddMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-1.5 w-52 bg-panel rounded-surface border border-hairline-strong shadow-elevated py-1 z-40 text-[13px]"
                >
                  <button type="button" onClick={() => { setQuickAddMenuOpen(false); onOpenAddResident(); }} className="w-full px-3.5 h-9 text-left hover:bg-panel-sunken font-bold text-ink flex items-center gap-2.5">
                    <Users className="w-3.5 h-3.5 text-accent" />
                    <span>Add Resident</span>
                  </button>
                  <div className="border-t border-hairline my-1" />
                  <button type="button" onClick={() => { setQuickAddMenuOpen(false); if (onOpenAddCareTask) onOpenAddCareTask(); }} className="w-full px-3.5 h-9 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center gap-2.5">
                    <HeartHandshake className="w-3.5 h-3.5 text-accent" />
                    <span>Care Task</span>
                  </button>
                  <button type="button" onClick={() => { setQuickAddMenuOpen(false); if (onOpenAddFYI) onOpenAddFYI(); }} className="w-full px-3.5 h-9 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center gap-2.5">
                    <Info className="w-3.5 h-3.5 text-accent" />
                    <span>FYI Note</span>
                  </button>
                  <button type="button" onClick={() => { setQuickAddMenuOpen(false); if (onOpenAddWound) onOpenAddWound(); }} className="w-full px-3.5 h-9 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center gap-2.5">
                    <Bandage className="w-3.5 h-3.5 text-danger" />
                    <span>Wound Protocol</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* ── SEARCH & FILTER BAR ── */}
      <div className="title-block rounded-surface px-3.5 h-12 flex items-center gap-3">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by room or resident…"
            className="w-full pl-8 pr-3 h-8 bg-panel-sunken border border-hairline rounded-control text-[12px] font-medium focus:bg-panel focus:ring-1 focus:ring-accent focus:outline-none transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-faint absolute left-2.5 top-2.25" />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'in_hospital', label: 'Hospital' },
            { id: 'out_on_pass', label: 'Pass' },
            { id: 'on_hold', label: 'Hold' },
            { id: 'former', label: 'Former' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              aria-pressed={statusFilter === f.id}
              className={`px-2.5 h-7 rounded-control text-[11.5px] font-bold transition-colors ${
                statusFilter === f.id ? 'bg-ink text-white' : 'text-ink-soft hover:bg-panel-sunken'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {filteredResidents.length === 0 && (
        <div className="title-block rounded-surface p-12 text-center text-muted">
          <Users className="w-9 h-9 mx-auto text-faint mb-3" />
          <h4 className="text-[14px] font-bold text-ink">
            {searchQuery || statusFilter !== 'all' ? 'No residents match your search' : 'No residents yet'}
          </h4>
          <p className="text-[12px] text-muted mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' ? 'Try adjusting your room or name search query.' : 'Add your first resident to begin configuring daily care.'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button type="button" onClick={onOpenAddResident} className="btn btn-accent mt-4">
              Add Resident
            </button>
          )}
        </div>
      )}

      {/* ── 1. LIST VIEW (DEFAULT) — schedule-table visual language, div-based rows so the
          full-row navigation control (CardNavigationButton) never nests inside a `role="button"` row ── */}
      {viewMode === 'list' && filteredResidents.length > 0 && (
        <div className="title-block rounded-surface overflow-hidden">
          <div className="overflow-x-auto">
          <div
            className="grid px-3.5 h-9 items-center border-b border-hairline-strong text-[10.5px] font-bold uppercase tracking-wide text-muted min-w-[640px]"
            style={{ gridTemplateColumns: '9% 1fr 12% 22% 20%' }}
          >
            <div className="min-w-0 truncate">Room</div>
            <div className="min-w-0 truncate">Resident</div>
            <div className="min-w-0 truncate">Status</div>
            <div className="min-w-0 truncate">Care / Wounds / FYI</div>
            <div className="min-w-0 truncate text-right">Actions</div>
          </div>
          <div className="min-w-[640px]">
            {filteredResidents.map(res => {
              const tasksCount = residentTasks.filter(t => t.residentId === res.id && t.isActive).length;
              const woundsCount = wounds.filter(w => w.residentId === res.id && w.status !== 'resolved').length;
              const fyisCount = fyis.filter(f => f.residentId === res.id && f.status === 'active').length;
              const isPaused = isResidentCarePaused(res.status);

              return (
                <div
                  key={res.id}
                  className="relative grid px-3.5 h-12 items-center border-b border-hairline last:border-b-0 hover:bg-panel-sunken transition-colors"
                  style={{ gridTemplateColumns: '9% 1fr 12% 22% 20%' }}
                >
                  <CardNavigationButton
                    label={`Open resident ${res.firstName} ${res.lastName}`}
                    onActivate={() => onOpenResidentProfile(res.id)}
                    roundedClassName="rounded-none"
                  />
                  <div className="relative z-20 pointer-events-none">
                    <span className="inline-flex items-center justify-center px-2 h-6 bg-ink text-white rounded-control font-mono font-bold text-[11px] tabular-nums">
                      {res.roomNumber}
                    </span>
                  </div>
                  <div className="relative z-20 pointer-events-none min-w-0">
                    <span className="font-semibold text-ink text-[13px] truncate">{res.firstName} {res.lastName}</span>
                  </div>
                  <div className="relative z-20 pointer-events-none text-[11.5px]">{getStatusBadge(res.status)}</div>
                  <div className="relative z-20 pointer-events-none text-[11.5px]">
                    {isPaused ? (
                      <span className="text-warning font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Paused ({getResidentStatusLabel(res.status)})</span>
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 text-ink-soft">
                        <span>{tasksCount} care</span>
                        <span className="text-hairline-strong">·</span>
                        <span className={woundsCount > 0 ? 'text-danger font-semibold' : ''}>{woundsCount} wound{woundsCount !== 1 ? 's' : ''}</span>
                        <span className="text-hairline-strong">·</span>
                        <span className={fyisCount > 0 ? 'text-accent font-semibold' : ''}>{fyisCount} FYI</span>
                      </div>
                    )}
                  </div>
                  <div className="relative z-20 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenQuickCareSetup(res);
                      }}
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 h-8 bg-accent-soft hover:bg-accent/20 text-accent-strong rounded-control text-[11.5px] font-semibold transition-colors"
                      title="Set up routine care tasks"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Care Setup</span>
                    </button>

                    {/* ⋯ Overflow Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => toggleResidentMenu(e, res.id)}
                        className="hit-target-44 inline-flex items-center justify-center w-8 h-8 rounded-control border border-hairline-strong text-ink-soft hover:bg-panel-sunken hover:text-ink transition-colors"
                        aria-label={`Actions for ${res.firstName} ${res.lastName}`}
                        aria-expanded={activeMenuResidentId === res.id}
                        aria-haspopup="menu"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuResidentId === res.id && residentMenuPosition && createPortal(
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          role="menu"
                          aria-label={`Resident actions for ${res.firstName} ${res.lastName}`}
                          className="fixed w-48 bg-panel rounded-surface shadow-elevated border border-hairline-strong py-1.5 z-[100] text-xs overflow-y-auto animate-popover-in"
                          style={residentMenuPosition}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuResidentId(null);
                              onOpenResidentProfile(res.id);
                            }}
                            className="w-full px-3.5 py-2 text-left hover:bg-panel-sunken font-bold text-ink flex items-center space-x-2"
                          >
                            <Users className="w-3.5 h-3.5 text-muted" />
                            <span>View Full Profile</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuResidentId(null);
                              setMoveRoomResident(res);
                              setNewRoomInput(res.roomNumber);
                            }}
                            className="w-full px-3.5 py-2 text-left hover:bg-panel-sunken font-medium text-ink-soft flex items-center space-x-2"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-muted" />
                            <span>Move Room</span>
                          </button>

                          <div className="border-t border-hairline my-1" />
                          <div className="px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-faint">
                            Change Status
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(res.id, 'active')}
                            className={`w-full px-3.5 py-1.5 text-left hover:bg-panel-sunken text-xs font-semibold ${res.status === 'active' ? 'text-positive bg-positive-soft/60 font-bold' : 'text-ink-soft'}`}
                          >
                            Active in Facility
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(res.id, 'in_hospital')}
                            className={`w-full px-3.5 py-1.5 text-left hover:bg-panel-sunken text-xs font-semibold ${res.status === 'in_hospital' ? 'text-danger bg-danger-soft/60 font-bold' : 'text-ink-soft'}`}
                          >
                            In Hospital (Pause Care)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(res.id, 'out_on_pass')}
                            className={`w-full px-3.5 py-1.5 text-left hover:bg-panel-sunken text-xs font-semibold ${res.status === 'out_on_pass' ? 'text-warning bg-warning-soft/60 font-bold' : 'text-ink-soft'}`}
                          >
                            Out on Pass (Pause Care)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(res.id, 'on_hold')}
                            className={`w-full px-3.5 py-1.5 text-left hover:bg-panel-sunken text-xs font-semibold ${res.status === 'on_hold' ? 'text-ink-soft bg-panel-sunken/60 font-bold' : 'text-ink-soft'}`}
                          >
                            On Hold (Pause Care)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(res.id, 'discharged')}
                            className={`w-full px-3.5 py-1.5 text-left hover:bg-panel-sunken text-xs font-semibold ${res.status === 'discharged' ? 'text-ink bg-panel-sunken font-bold' : 'text-muted'}`}
                          >
                            Discharged / Former
                          </button>
                        </div>,
                        document.body
                      )}
                    </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {/* ── 2. CARDS VIEW ── */}
      {viewMode === 'cards' && filteredResidents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResidents.map(res => {
            const tasksCount = residentTasks.filter(t => t.residentId === res.id && t.isActive).length;
            const woundsCount = wounds.filter(w => w.residentId === res.id && w.status !== 'resolved').length;
            const fyisCount = fyis.filter(f => f.residentId === res.id && f.status === 'active').length;
            const isPaused = isResidentCarePaused(res.status);

            return (
              <div
                key={res.id}
                className="relative bg-panel rounded-surface border border-hairline-strong p-5 hover:shadow-elevated hover:border-accent transition-all flex flex-col justify-between group"
              >
                <CardNavigationButton
                  label={`Open resident ${res.firstName} ${res.lastName}`}
                  onActivate={() => onOpenResidentProfile(res.id)}
                />
                <div>
                  {/* Top Bar: Room & Status */}
                  <div className="flex items-start justify-between mb-2.5">
                    <div className="px-3 py-1.5 bg-ink text-white rounded-control font-mono font-black text-sm tabular-nums group-hover:bg-accent-strong transition-colors">
                      {res.roomNumber}
                    </div>
                    {getStatusBadge(res.status)}
                  </div>

                  <h3 className="text-base font-bold text-ink group-hover:text-accent-strong transition-colors leading-tight">
                    {res.firstName} {res.lastName}
                  </h3>

                  {/* Metrics grid */}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-panel-sunken p-2 rounded-control border border-hairline">
                      <span className="text-[11px] text-muted font-medium block">Care</span>
                      <span className="text-sm font-bold text-ink tabular-nums">{tasksCount}</span>
                    </div>

                    <div className="bg-panel-sunken p-2 rounded-control border border-hairline">
                      <span className="text-[11px] text-muted font-medium block">Wounds</span>
                      <span className={`text-sm font-bold tabular-nums ${woundsCount > 0 ? 'text-danger' : 'text-ink'}`}>{woundsCount}</span>
                    </div>

                    <div className="bg-panel-sunken p-2 rounded-control border border-hairline">
                      <span className="text-[11px] text-muted font-medium block">FYIs</span>
                      <span className={`text-sm font-bold tabular-nums ${fyisCount > 0 ? 'text-accent-strong' : 'text-ink'}`}>{fyisCount}</span>
                    </div>
                  </div>

                  {isPaused && (
                    <p className="text-[11px] text-warning font-semibold mt-2.5 bg-warning-soft p-1.5 rounded text-center">
                      Care generation paused ({getResidentStatusLabel(res.status)})
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-5 pt-3.5 border-t border-hairline flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenQuickCareSetup(res);
                    }}
                    className="relative z-20 px-2.5 py-1 bg-accent-soft hover:bg-accent-soft text-accent-strong rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-accent" />
                    <span>Setup</span>
                  </button>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. ROOMS VIEW ── */}
      {viewMode === 'rooms' && filteredResidents.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupResidentsByWing()).map(([wingTitle, wingResidents]) => (
            <div key={wingTitle} className="bg-panel rounded-surface border border-hairline-strong overflow-hidden">
              <div className="px-5 py-3 bg-panel-sunken border-b border-hairline-strong flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building className="w-4 h-4 text-muted" />
                  <h3 className="text-xs font-black text-ink uppercase tracking-widest">{wingTitle}</h3>
                </div>
                <span className="text-xs text-muted font-medium tabular-nums">
                  {wingResidents.length} room{wingResidents.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="divide-y divide-hairline">
                {wingResidents.map(res => {
                  const tasksCount = residentTasks.filter(t => t.residentId === res.id && t.isActive).length;
                  const woundsCount = wounds.filter(w => w.residentId === res.id && w.status !== 'resolved').length;
                  const fyisCount = fyis.filter(f => f.residentId === res.id && f.status === 'active').length;

                  return (
                    <button
                      type="button"
                      key={res.id}
                      onClick={() => onOpenResidentProfile(res.id)}
                      aria-label={`Open resident ${res.firstName} ${res.lastName}`}
                      className="w-full flex items-center px-5 py-3 hover:bg-panel-sunken cursor-pointer transition-colors group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    >
                      <div className="w-16 shrink-0">
                        <span className="inline-block px-2.5 py-1 bg-ink text-white rounded font-mono font-bold text-xs tabular-nums group-hover:bg-accent-strong transition-colors">
                          {res.roomNumber}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 pl-2">
                        <span className="text-sm font-bold text-ink truncate block">
                          {res.firstName} {res.lastName}
                        </span>
                      </div>

                      <div className="mr-4">
                        {getStatusBadge(res.status)}
                      </div>

                      <div className="hidden sm:flex items-center space-x-3 text-xs text-muted mr-4 shrink-0 font-medium">
                        <span>{tasksCount} tasks</span>
                        {woundsCount > 0 && <span className="text-danger font-semibold">{woundsCount} wound</span>}
                        {fyisCount > 0 && <span className="text-accent-strong font-semibold">{fyisCount} FYI</span>}
                      </div>

                      <ChevronRight className="w-4 h-4 text-faint group-hover:text-accent transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MOVE ROOM MODAL ── */}
      <Modal isOpen={!!moveRoomResident} onClose={() => setMoveRoomResident(null)} title="Move Resident Room" subtitle={moveRoomResident ? `Change room assignment for ${moveRoomResident.firstName} ${moveRoomResident.lastName}.` : undefined} maxWidth="sm">
        {moveRoomResident && (
          <form onSubmit={handleMoveRoomSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                New Room / Occupancy Location
              </label>
              <select
                required
                value={newRoomInput}
                onChange={(e) => setNewRoomInput(e.target.value)}
                className="w-full px-3 h-9 bg-panel-sunken border border-hairline-strong rounded-control text-[13px] font-bold font-mono focus:bg-panel focus:ring-1 focus:ring-accent focus:outline-none"
                autoFocus
              ><option value={moveRoomResident.roomNumber}>{moveRoomResident.roomNumber} — Current</option>{state.occupancyPositions.filter(position => position.active !== false && !state.residents.some(resident => resident.id !== moveRoomResident.id && resident.occupancyPositionId === position.id && ['active','in_hospital','out_on_pass','on_hold'].includes(resident.status))).sort((a,b) => sortRoomNumbers(a.displayLabel,b.displayLabel)).filter(position => position.displayLabel !== moveRoomResident.roomNumber).map(position => <option key={position.id} value={position.displayLabel}>{position.displayLabel} — Available</option>)}</select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-hairline">
              <button type="button" onClick={() => setMoveRoomResident(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-accent">
                Save New Room
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
