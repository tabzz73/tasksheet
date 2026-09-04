import React, { useEffect, useMemo, useState } from 'react';
import { BedDouble, Building2, CheckCircle2, Plus, Search } from 'lucide-react';
import { db } from '../../db';
import { sortRoomNumbers } from '../../services/generator';
import { Modal } from '../common/Modal';
import { OccupancyPosition } from '../../types';

interface RoomSetupTabProps { onShowFeedback?: (type: 'success' | 'error', message: string) => void }

export const RoomSetupTab: React.FC<RoomSetupTabProps> = ({ onShowFeedback }) => {
  const [revision, setRevision] = useState(0);
  const [renamingPosition, setRenamingPosition] = useState<OccupancyPosition | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [mode, setMode] = useState<'single' | 'multi' | 'range'>('single');
  const [singleLabel, setSingleLabel] = useState('');
  const [singleWing, setSingleWing] = useState('');
  const [singleFloor, setSingleFloor] = useState('');
  const [baseRoom, setBaseRoom] = useState('');
  const [positions, setPositions] = useState('A, B');
  const [multiWing, setMultiWing] = useState('');
  const [multiFloor, setMultiFloor] = useState('');
  const [prefix, setPrefix] = useState('');
  const [rangeStart, setRangeStart] = useState('101');
  const [rangeEnd, setRangeEnd] = useState('110');
  const [rangePositions, setRangePositions] = useState('');
  const [rangeWing, setRangeWing] = useState('');
  const [rangeFloor, setRangeFloor] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => db.subscribe(() => setRevision(value => value + 1)), []);
  const state = db.getState(); void revision;
  const occupants = new Map(state.residents.filter(resident => resident.occupancyPositionId).map(resident => [resident.occupancyPositionId!, resident]));
  const rows = state.occupancyPositions
    .filter(position => position.displayLabel.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortRoomNumbers(a.displayLabel, b.displayLabel));
  const parsedPositions = positions.split(',').map(value => value.trim()).filter(Boolean);
  const parsedRangePositions = rangePositions.split(',').map(value => value.trim()).filter(Boolean);
  const knownWings = [...new Set(state.rooms.map(room => room.wing).filter(Boolean))] as string[];
  const knownFloors = [...new Set(state.rooms.map(room => room.floor).filter(Boolean))] as string[];
  const rangePreview = useMemo(() => {
    const start = Number(rangeStart); const end = Number(rangeEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end) || end < start || end - start > 200) return [];
    return Array.from({ length: end - start + 1 }, (_, index) => `${prefix}${start + index}`)
      .flatMap(base => parsedRangePositions.length ? parsedRangePositions.map(position => `${base}${position}`) : [base]);
  }, [prefix, rangeStart, rangeEnd, rangePositions]);

  const feedback = (type: 'success' | 'error', message: string) => onShowFeedback?.(type, message);
  const submitRename = (event: React.FormEvent) => {
    event.preventDefault();
    if (!renamingPosition) return;
    const label = renameValue.trim();
    if (!label || label === renamingPosition.displayLabel) { setRenamingPosition(null); return; }
    try {
      db.updateOccupancyPosition(renamingPosition.id, { displayLabel: label });
      feedback('success', 'Display label updated everywhere.');
      setRenamingPosition(null);
    } catch (error) { feedback('error', (error as Error).message); }
  };
  const submitSingle = (event: React.FormEvent) => { event.preventDefault(); try { db.addRoom(singleLabel, { wing: singleWing, floor: singleFloor }); setSingleLabel(''); feedback('success', 'Room / bed added.'); } catch (error) { feedback('error', (error as Error).message); } };
  const submitMulti = (event: React.FormEvent) => { event.preventDefault(); try { const created = db.addMultiOccupancyRoom(baseRoom, parsedPositions, multiWing, multiFloor); setBaseRoom(''); feedback('success', `${created.length} occupancy positions added.`); } catch (error) { feedback('error', (error as Error).message); } };
  const submitRange = (event: React.FormEvent) => { event.preventDefault(); try {
    if (!rangePreview.length) throw new Error('Enter a valid numeric range of up to 201 rooms.');
    const existing = new Set(state.occupancyPositions.map(position => position.displayLabel.toLowerCase()));
    const duplicate = rangePreview.find(label => existing.has(label.toLowerCase())); if (duplicate) throw new Error(`${duplicate} already exists. Nothing was added.`);
    const start = Number(rangeStart); const end = Number(rangeEnd);
    for (let number = start; number <= end; number++) { const base = `${prefix}${number}`; if (parsedRangePositions.length) db.addMultiOccupancyRoom(base, parsedRangePositions, rangeWing, rangeFloor); else db.addRoom(base, { wing: rangeWing, floor: rangeFloor }); }
    feedback('success', `${rangePreview.length} room / bed labels added.`);
  } catch (error) { feedback('error', (error as Error).message); } };

  return <div className="space-y-5">
    <div className="rounded-surface border border-hairline-strong bg-panel p-5">
      <div className="flex items-start gap-3"><div className="rounded-control bg-accent-soft p-2 text-accent-strong"><BedDouble className="h-5 w-5" /></div><div><h3 className="font-black text-ink">Room / Occupancy Setup</h3><p className="mt-1 text-xs text-muted">Configure the exact labels used throughout TaskSheet. Letters, prefixes, suffixes and custom formats are preserved.</p></div></div>
      <div className="mt-4 flex flex-wrap gap-2">{(['single','multi','range'] as const).map(item => <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-control px-3 py-2 text-xs font-bold ${mode === item ? 'bg-ink text-white' : 'bg-panel-sunken text-ink-soft'}`}>{item === 'single' ? 'Add Single Room' : item === 'multi' ? 'Multi-Occupancy Room' : 'Create Room Range'}</button>)}</div>
      <datalist id="wing-options">{knownWings.map(wing => <option key={wing} value={wing} />)}</datalist>
      <datalist id="floor-options">{knownFloors.map(floor => <option key={floor} value={floor} />)}</datalist>
      {mode === 'single' && <form onSubmit={submitSingle} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><input required value={singleLabel} onChange={event => setSingleLabel(event.target.value)} placeholder="Display label, e.g. L101 or 101LF" className="rounded-control border border-hairline-strong px-3 py-2 text-sm"/><input value={singleWing} onChange={event => setSingleWing(event.target.value)} list="wing-options" placeholder="Wing (optional)" className="rounded-control border border-hairline-strong px-3 py-2 text-sm"/><input value={singleFloor} onChange={event => setSingleFloor(event.target.value)} list="floor-options" placeholder="Floor (optional)" className="rounded-control border border-hairline-strong px-3 py-2 text-sm"/><button className="inline-flex items-center justify-center gap-2 rounded-control bg-accent-strong px-4 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4"/>Add</button></form>}
      {mode === 'multi' && <form onSubmit={submitMulti} className="mt-4 space-y-3"><div className="grid gap-3 sm:grid-cols-4"><input required value={baseRoom} onChange={event => setBaseRoom(event.target.value)} placeholder="Physical room, e.g. 101" className="rounded-control border border-hairline-strong px-3 py-2 text-sm"/><input required value={positions} onChange={event => setPositions(event.target.value)} placeholder="Positions: A, B or LF, RF" className="rounded-control border border-hairline-strong px-3 py-2 text-sm"/><input value={multiWing} onChange={event => setMultiWing(event.target.value)} list="wing-options" placeholder="Wing (optional)" className="rounded-control border border-hairline-strong px-3 py-2 text-sm"/><input value={multiFloor} onChange={event => setMultiFloor(event.target.value)} list="floor-options" placeholder="Floor (optional)" className="rounded-control border border-hairline-strong px-3 py-2 text-sm"/></div><p className="text-xs text-muted">Preview: {parsedPositions.map(label => `${baseRoom || '101'}${label}`).join(', ') || 'Add position labels'}</p><button className="rounded-control bg-accent-strong px-4 py-2 text-sm font-bold text-white">Add Occupancy Positions</button></form>}
      {mode === 'range' && <form onSubmit={submitRange} className="mt-4 space-y-3"><div className="grid gap-3 sm:grid-cols-3"><input value={prefix} onChange={event => setPrefix(event.target.value)} placeholder="Prefix (optional)" className="rounded-control border border-hairline-strong px-3 py-2 text-sm"/><input required inputMode="numeric" value={rangeStart} onChange={event => setRangeStart(event.target.value)} placeholder="Start" className="rounded-control border border-hairline-strong px-3 py-2 text-sm"/><input required inputMode="numeric" value={rangeEnd} onChange={event => setRangeEnd(event.target.value)} placeholder="End" className="rounded-control border border-hairline-strong px-3 py-2 text-sm"/></div><div className="grid gap-3 sm:grid-cols-3"><input value={rangePositions} onChange={event => setRangePositions(event.target.value)} placeholder="Positions, e.g. A, B" className="rounded-control border border-hairline-strong px-3 py-2 text-sm"/><input value={rangeWing} onChange={event => setRangeWing(event.target.value)} list="wing-options" placeholder="Wing (optional)" className="rounded-control border border-hairline-strong px-3 py-2 text-sm"/><input value={rangeFloor} onChange={event => setRangeFloor(event.target.value)} list="floor-options" placeholder="Floor (optional)" className="rounded-control border border-hairline-strong px-3 py-2 text-sm"/></div><p className="text-xs text-muted">Preview ({rangePreview.length}): {rangePreview.slice(0, 12).join(', ')}{rangePreview.length > 12 ? '…' : ''}</p><button className="rounded-control bg-accent-strong px-4 py-2 text-sm font-bold text-white">Create Range</button></form>}
    </div>
    <div className="overflow-hidden rounded-surface border border-hairline-strong bg-panel"><div className="flex items-center justify-between border-b border-hairline-strong p-4"><div><h3 className="text-sm font-black text-ink">Occupancy Directory</h3><p className="text-xs text-muted">{state.occupancyPositions.length} configured · {occupants.size} occupied · {state.occupancyPositions.filter(position => position.active && !occupants.has(position.id)).length} available</p></div><label className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-faint"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find room…" className="rounded-control border border-hairline-strong py-2 pl-8 pr-3 text-sm"/></label></div>
      <div className="max-h-[440px] divide-y divide-hairline overflow-y-auto">{rows.map(position => { const room = state.rooms.find(item => item.id === position.roomId); const occupant = occupants.get(position.id); return <div key={position.id} className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><div><div className="font-mono text-sm font-black text-ink">{position.displayLabel}</div><div className="text-[11px] text-muted">Physical room {room?.physicalRoomLabel || position.displayLabel}{position.positionLabel ? ` · Position ${position.positionLabel}` : ''}</div></div><div className="text-xs text-ink-soft">{[room?.wing, room?.floor ? `Floor ${room.floor}` : null].filter(Boolean).join(' · ') || 'No wing/floor assigned'}</div><div className={`text-xs font-bold ${occupant ? 'text-ink-soft' : 'text-positive'}`}>{occupant ? `${occupant.firstName} ${occupant.lastName}` : 'Available'}</div><div className="flex gap-1"><button type="button" onClick={() => { setRenamingPosition(position); setRenameValue(position.displayLabel); }} className="rounded-control border border-hairline-strong px-2 py-1 text-[11px] font-bold">Rename</button><button type="button" disabled={Boolean(occupant)} onClick={() => { try { db.updateOccupancyPosition(position.id, { active: !position.active }); feedback('success', `${position.displayLabel} ${position.active ? 'deactivated' : 'activated'}.`); } catch(error) { feedback('error', (error as Error).message); } }} className="rounded-control border border-hairline-strong px-2 py-1 text-[11px] font-bold disabled:opacity-40">{position.active ? 'Deactivate' : 'Activate'}</button></div></div>; })}{!rows.length && <div className="p-8 text-center text-sm text-muted"><Building2 className="mx-auto mb-2 h-6 w-6"/>No rooms match this search.</div>}</div>
    </div>
    <div className="flex items-start gap-2 rounded-control border border-positive bg-positive-soft p-3 text-xs text-positive"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/><span>Hospital, pass and hold residents retain their room. Permanent inactive or discharged residents release it for reuse.</span></div>

    <Modal isOpen={!!renamingPosition} onClose={() => setRenamingPosition(null)} title="Rename Room / Bed" maxWidth="sm">
      <form onSubmit={submitRename} className="space-y-4">
        <div>
          <label htmlFor="rename-position-label" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-soft">Display Label</label>
          <input id="rename-position-label" autoFocus value={renameValue} onChange={event => setRenameValue(event.target.value)} className="w-full rounded-control border border-hairline-strong px-3.5 py-2.5 text-sm" />
          <p className="mt-1 text-[11px] text-muted">This label is used everywhere in TaskSheet, including printed TaskSheets.</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-hairline-strong pt-3">
          <button type="button" onClick={() => setRenamingPosition(null)} className="rounded-control border border-hairline-strong px-4 py-2 text-xs font-medium text-ink-soft hover:bg-panel-sunken">Cancel</button>
          <button type="submit" className="rounded-control bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent-strong">Save Label</button>
        </div>
      </form>
    </Modal>
  </div>;
};
