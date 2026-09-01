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

type ResidentsViewMode = 'list' | 'cards' | 'rooms';
const VIEW_MODE_KEY = 'tasksheet_residents_view_mode';
const RESIDENT_MENU_WIDTH = 192;
const RESIDENT_MENU_ESTIMATED_HEIGHT = 270;

interface ResidentMenuPosition {
  top?: number;
  bottom?: number;
  left: number;
  maxHeight: number;
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
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold text-[11px]">Active</span>;
      case 'in_hospital':
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded font-semibold text-[11px]">In Hospital</span>;
      case 'out_on_pass':
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-semibold text-[11px]">Out on Pass</span>;
      case 'on_hold':
        return <span className="px-2 py-0.5 bg-violet-50 text-violet-800 border border-violet-200 rounded font-semibold text-[11px]">On Hold</span>;
      case 'discharged':
      case 'deceased':
      case 'inactive':
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold text-[11px]">Former</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold text-[11px]">{status}</span>;
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

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-2xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {allResidents.some(resident => resident.roomAssignmentNeedsReview) && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950"><div className="flex items-center gap-2 font-black"><AlertTriangle className="h-4 w-4"/>Room assignment needs correction</div><p className="mt-1">{allResidents.filter(resident => resident.roomAssignmentNeedsReview).length} imported or migrated resident record(s) have a missing or conflicting occupancy assignment and are withheld from operational TaskSheets. Use Move Room to assign an available position.</p></div>}

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center space-x-2">
            <span>Residents</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Facility Directory · Care Profiles & Room Assignments
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          {/* View Switcher */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 space-x-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                viewMode === 'list'
                  ? 'bg-white shadow text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Compact list view"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white shadow text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Cards view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('rooms')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                viewMode === 'rooms'
                  ? 'bg-white shadow text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Rooms & wings directory"
            >
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
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Add ▾</span>
            </button>

            {quickAddMenuOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddMenuOpen(false);
                    onOpenAddResident();
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-bold text-slate-800 flex items-center space-x-2"
                >
                  <Users className="w-4 h-4 text-teal-600" />
                  <span>+ Add Resident</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddMenuOpen(false);
                    if (onOpenAddCareTask) onOpenAddCareTask();
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-medium text-slate-700 flex items-center space-x-2"
                >
                  <HeartHandshake className="w-4 h-4 text-teal-600" />
                  <span>+ Care Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddMenuOpen(false);
                    if (onOpenAddFYI) onOpenAddFYI();
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-medium text-slate-700 flex items-center space-x-2"
                >
                  <Info className="w-4 h-4 text-teal-600" />
                  <span>+ FYI Note</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddMenuOpen(false);
                    if (onOpenAddWound) onOpenAddWound();
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-medium text-slate-700 flex items-center space-x-2"
                >
                  <Bandage className="w-4 h-4 text-rose-600" />
                  <span>+ Wound Protocol</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER BAR ── */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by room or resident..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Lightweight Filter Pills */}
        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto text-xs pb-1 sm:pb-0">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === f.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {filteredResidents.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h4 className="text-base font-bold text-slate-800">No residents match your search</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Try adjusting your room or name search query.' : 'Add your first resident to begin configuring daily care.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={onOpenAddResident}
              className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold"
            >
              + Add Resident
            </button>
          )}
        </div>
      )}

      {/* ── 1. LIST VIEW (DEFAULT) ── */}
      {viewMode === 'list' && filteredResidents.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredResidents.map(res => {
              const tasksCount = residentTasks.filter(t => t.residentId === res.id && t.isActive).length;
              const woundsCount = wounds.filter(w => w.residentId === res.id && w.status !== 'resolved').length;
              const fyisCount = fyis.filter(f => f.residentId === res.id && f.status === 'active').length;
              const isPaused = isResidentCarePaused(res.status);

              return (
                <div
                  key={res.id}
                  className="relative flex items-center px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                >
                  <CardNavigationButton
                    label={`Open resident ${res.firstName} ${res.lastName}`}
                    onActivate={() => onOpenResidentProfile(res.id)}
                    roundedClassName="rounded-none"
                  />
                  {/* Room badge */}
                  <div className="w-16 shrink-0">
                    <span className="inline-block px-2.5 py-1 bg-slate-900 text-white rounded-md font-mono font-black text-xs tabular-nums group-hover:bg-teal-700 transition-colors">
                      {res.roomNumber}
                    </span>
                  </div>

                  {/* Name + Status */}
                  <div className="flex-1 min-w-0 pl-2">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {res.firstName} {res.lastName}
                      </span>
                      {getStatusBadge(res.status)}
                    </div>
                    
                    {/* Metrics / Context */}
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center space-x-2">
                      {isPaused ? (
                        <span className="text-amber-700 font-semibold flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span>Care generation paused ({getResidentStatusLabel(res.status)})</span>
                        </span>
                      ) : (
                        <>
                          <span className="text-slate-700 font-semibold">{tasksCount} Care Task{tasksCount !== 1 ? 's' : ''}</span>
                          <span className="text-slate-300">·</span>
                          <span className={woundsCount > 0 ? 'text-rose-700 font-semibold' : 'text-slate-500'}>
                            {woundsCount} Wound{woundsCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className={fyisCount > 0 ? 'text-teal-700 font-semibold' : 'text-slate-500'}>
                            {fyisCount} FYI{fyisCount !== 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenQuickCareSetup(res);
                      }}
                      className="relative z-20 hidden sm:flex items-center space-x-1 px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      title="Set up routine care tasks"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Care Setup</span>
                    </button>

                    {/* ⋯ Overflow Menu */}
                    <div className="relative z-20">
                      <button
                        type="button"
                        onClick={(e) => toggleResidentMenu(e, res.id)}
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
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
                          className="fixed w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-[100] text-xs overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
                          style={residentMenuPosition}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuResidentId(null);
                              onOpenResidentProfile(res.id);
                            }}
                            className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-bold text-slate-800 flex items-center space-x-2"
                          >
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            <span>View Full Profile</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuResidentId(null);
                              setMoveRoomResident(res);
                              setNewRoomInput(res.roomNumber);
                            }}
                            className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-medium text-slate-700 flex items-center space-x-2"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
                            <span>Move Room</span>
                          </button>

                          <div className="border-t border-slate-100 my-1" />
                          <div className="px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Change Status
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(res.id, 'active')}
                            className={`w-full px-3.5 py-1.5 text-left hover:bg-slate-50 text-xs font-semibold ${res.status === 'active' ? 'text-emerald-700 bg-emerald-50/60 font-bold' : 'text-slate-700'}`}
                          >
                            Active in Facility
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(res.id, 'in_hospital')}
                            className={`w-full px-3.5 py-1.5 text-left hover:bg-slate-50 text-xs font-semibold ${res.status === 'in_hospital' ? 'text-rose-700 bg-rose-50/60 font-bold' : 'text-slate-700'}`}
                          >
                            In Hospital (Pause Care)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(res.id, 'out_on_pass')}
                            className={`w-full px-3.5 py-1.5 text-left hover:bg-slate-50 text-xs font-semibold ${res.status === 'out_on_pass' ? 'text-amber-700 bg-amber-50/60 font-bold' : 'text-slate-700'}`}
                          >
                            Out on Pass (Pause Care)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(res.id, 'on_hold')}
                            className={`w-full px-3.5 py-1.5 text-left hover:bg-slate-50 text-xs font-semibold ${res.status === 'on_hold' ? 'text-violet-700 bg-violet-50/60 font-bold' : 'text-slate-700'}`}
                          >
                            On Hold (Pause Care)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(res.id, 'discharged')}
                            className={`w-full px-3.5 py-1.5 text-left hover:bg-slate-50 text-xs font-semibold ${res.status === 'discharged' ? 'text-slate-900 bg-slate-100 font-bold' : 'text-slate-500'}`}
                          >
                            Discharged / Former
                          </button>
                        </div>,
                        document.body
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
                className="relative bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between group"
              >
                <CardNavigationButton
                  label={`Open resident ${res.firstName} ${res.lastName}`}
                  onActivate={() => onOpenResidentProfile(res.id)}
                />
                <div>
                  {/* Top Bar: Room & Status */}
                  <div className="flex items-start justify-between mb-2.5">
                    <div className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-mono font-black text-sm tabular-nums group-hover:bg-teal-700 transition-colors">
                      {res.roomNumber}
                    </div>
                    {getStatusBadge(res.status)}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight">
                    {res.firstName} {res.lastName}
                  </h3>

                  {/* Metrics grid */}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[11px] text-slate-500 font-medium block">Care</span>
                      <span className="text-sm font-bold text-slate-900 tabular-nums">{tasksCount}</span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[11px] text-slate-500 font-medium block">Wounds</span>
                      <span className={`text-sm font-bold tabular-nums ${woundsCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{woundsCount}</span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[11px] text-slate-500 font-medium block">FYIs</span>
                      <span className={`text-sm font-bold tabular-nums ${fyisCount > 0 ? 'text-teal-700' : 'text-slate-900'}`}>{fyisCount}</span>
                    </div>
                  </div>

                  {isPaused && (
                    <p className="text-[11px] text-amber-700 font-semibold mt-2.5 bg-amber-50 p-1.5 rounded text-center">
                      Care generation paused ({getResidentStatusLabel(res.status)})
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenQuickCareSetup(res);
                    }}
                    className="relative z-20 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-teal-600" />
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
            <div key={wingTitle} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building className="w-4 h-4 text-slate-500" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{wingTitle}</h3>
                </div>
                <span className="text-xs text-slate-500 font-medium tabular-nums">
                  {wingResidents.length} room{wingResidents.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
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
                      className="w-full flex items-center px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600"
                    >
                      <div className="w-16 shrink-0">
                        <span className="inline-block px-2.5 py-1 bg-slate-900 text-white rounded font-mono font-bold text-xs tabular-nums group-hover:bg-teal-700 transition-colors">
                          {res.roomNumber}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 pl-2">
                        <span className="text-sm font-bold text-slate-900 truncate block">
                          {res.firstName} {res.lastName}
                        </span>
                      </div>

                      <div className="mr-4">
                        {getStatusBadge(res.status)}
                      </div>

                      <div className="hidden sm:flex items-center space-x-3 text-xs text-slate-500 mr-4 shrink-0 font-medium">
                        <span>{tasksCount} tasks</span>
                        {woundsCount > 0 && <span className="text-rose-600 font-semibold">{woundsCount} wound</span>}
                        {fyisCount > 0 && <span className="text-teal-700 font-semibold">{fyisCount} FYI</span>}
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MOVE ROOM MODAL ── */}
      {moveRoomResident && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900">Move Resident Room</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Change room assignment for {moveRoomResident.firstName} {moveRoomResident.lastName}.
            </p>

            <form onSubmit={handleMoveRoomSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Room / Occupancy Location
                </label>
                <select
                  required
                  value={newRoomInput}
                  onChange={(e) => setNewRoomInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold font-mono focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  autoFocus
                ><option value={moveRoomResident.roomNumber}>{moveRoomResident.roomNumber} — Current</option>{state.occupancyPositions.filter(position => position.active !== false && !state.residents.some(resident => resident.id !== moveRoomResident.id && resident.occupancyPositionId === position.id && ['active','in_hospital','out_on_pass','on_hold'].includes(resident.status))).sort((a,b) => sortRoomNumbers(a.displayLabel,b.displayLabel)).filter(position => position.displayLabel !== moveRoomResident.roomNumber).map(position => <option key={position.id} value={position.displayLabel}>{position.displayLabel} — Available</option>)}</select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMoveRoomResident(null)}
                  className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold"
                >
                  Save New Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
