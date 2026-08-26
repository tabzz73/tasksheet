import React from 'react';

// --- Data Model ----------------------------------------------------------------

export interface BinderFacility {
  siteName: string;
  street: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  mainPhone?: string;
  unitPhone?: string;
  fax?: string;
}

export interface BinderFyiEntry {
  id: string;
  category: string;
  importance: 'normal' | 'high' | 'urgent';
  text: string;
  effectiveDate: string;
  expiryDate?: string;
}

export interface BinderResidentGroup {
  roomNumber: string;
  residentName: string;
  fyis: BinderFyiEntry[];
}

export interface BinderShiftGroup {
  shiftId: string;
  shiftCode: string;
  shiftName: string;
  shiftTime: string;
  sharedFyis: BinderFyiEntry[];
  residentGroups: BinderResidentGroup[];
}

export interface BinderRoleSection {
  roleId: string;
  roleName: string;
  roleCode: string;
  allShiftsFyis: BinderFyiEntry[];
  allShiftsResidentGroups: BinderResidentGroup[];
  shiftGroups: BinderShiftGroup[];
}

export interface FyiBinderPrintDocumentModel {
  facility: BinderFacility;
  binderVersion: number;
  generatedAt: string;
  scopeLabel: string;
  binderStatus: 'current' | 'update_required';
  confirmedCurrentAt?: string;
  sharedFyis: BinderFyiEntry[];
  sharedResidentGroups: BinderResidentGroup[];
  roleSections: BinderRoleSection[];
  developerFooter?: string;
}

// --- Formatting Helpers --------------------------------------------------------

function formatDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-CA', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function formatDateRange(effective: string, expiry?: string): string {
  if (!expiry) return `Effective ${formatDate(effective)}`;
  return `Effective ${formatDate(effective)} \u2013 ${formatDate(expiry)}`;
}

function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });
    const timePart = d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
    return `${datePart} at ${timePart}`;
  } catch {
    return iso;
  }
}

function categoryLabel(cat: string): string {
  switch (cat) {
    case 'preference': return 'PREFERENCE';
    case 'safety': return 'SAFETY';
    case 'protocol': return 'PROTOCOL';
    case 'communication': return 'COMMUNICATION';
    case 'medical': return 'MEDICAL / CLINICAL INFORMATION';
    case 'general': return 'GENERAL INFORMATION';
    default: return cat.toUpperCase();
  }
}

// --- Sub-components ------------------------------------------------------------

const FyiBlock: React.FC<{ fyi: BinderFyiEntry }> = ({ fyi }) => {
  const isImportant = fyi.importance === 'high' || fyi.importance === 'urgent';
  return (
    <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid', marginBottom: '10pt' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6pt', marginBottom: '3pt' }}>
        {isImportant && (
          <span style={{
            fontSize: '7.5pt', fontWeight: 800, letterSpacing: '0.08em',
            border: '1.5pt solid black', padding: '1pt 4pt', marginRight: '4pt', textTransform: 'uppercase' as const,
          }}>! IMPORTANT</span>
        )}
        <span style={{
          fontSize: '7.5pt', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase' as const, color: '#374151',
        }}>{categoryLabel(fyi.category)}</span>
      </div>
      <p style={{ fontSize: '9.5pt', lineHeight: '1.45', color: '#111827', marginBottom: '2pt' }}>
        {fyi.text}
      </p>
      <p style={{ fontSize: '8pt', color: '#6B7280', fontStyle: 'italic' }}>
        {formatDateRange(fyi.effectiveDate, fyi.expiryDate)}
      </p>
    </div>
  );
};

const ResidentFyiGroup: React.FC<{ group: BinderResidentGroup }> = ({ group }) => (
  <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid', marginBottom: '14pt' }}>
    <div style={{
      borderBottom: '1pt solid #9CA3AF', paddingBottom: '4pt', marginBottom: '7pt',
      display: 'flex', alignItems: 'baseline', gap: '10pt',
    }}>
      <span style={{ fontSize: '11pt', fontWeight: 800, letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums', color: '#111827' }}>
        ROOM {group.roomNumber}
      </span>
      <span style={{ fontSize: '10pt', fontWeight: 600, color: '#374151' }}>
        {group.residentName}
      </span>
    </div>
    {group.fyis.map(fyi => <FyiBlock key={fyi.id} fyi={fyi} />)}
  </div>
);

const SectionDivider: React.FC<{ label: string; isRole?: boolean }> = ({ label, isRole }) => (
  <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid', marginTop: isRole ? '18pt' : '12pt', marginBottom: '10pt' }}>
    <div style={{ borderBottom: `${isRole ? '2pt' : '1pt'} solid #111827`, paddingBottom: '4pt' }}>
      <span style={{ fontSize: isRole ? '13pt' : '11pt', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' as const, color: '#111827' }}>
        {label}
      </span>
    </div>
  </div>
);

const HorizontalRule: React.FC = () => (
  <hr style={{ border: 'none', borderTop: '0.5pt solid #D1D5DB', margin: '10pt 0' }} />
);

// --- Main Document -------------------------------------------------------------

interface FyiBinderPrintDocumentProps {
  model: FyiBinderPrintDocumentModel;
}

export const FyiBinderPrintDocument: React.FC<FyiBinderPrintDocumentProps> = ({ model }) => {
  const f = model.facility;
  const hasAnyContent =
    model.sharedFyis.length > 0 ||
    model.sharedResidentGroups.length > 0 ||
    model.roleSections.some(r =>
      r.allShiftsFyis.length > 0 ||
      r.allShiftsResidentGroups.length > 0 ||
      r.shiftGroups.some(s => s.sharedFyis.length > 0 || s.residentGroups.length > 0)
    );

  const formattedAddress = [
    f.street,
    f.addressLine2,
    `${f.city}, ${f.province} ${f.postalCode}`,
  ].filter(Boolean).join(', ');

  return (
    <div style={{
      fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
      fontSize: '10pt', color: '#111827', background: '#ffffff', lineHeight: '1.4',
    }}>
      {/* DOCUMENT HEADER */}
      <div style={{ borderBottom: '2pt solid #111827', paddingBottom: '10pt', marginBottom: '12pt' }}>
        <div style={{ marginBottom: '6pt' }}>
          <div style={{ fontSize: '16pt', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
            TASKSHEET
          </div>
          <div style={{ fontSize: '10pt', fontWeight: 700, letterSpacing: '0.06em', color: '#374151', textTransform: 'uppercase' as const, marginTop: '1pt' }}>
            FYI / Standing Information Binder
          </div>
        </div>

        <div style={{ borderTop: '0.75pt solid #9CA3AF', paddingTop: '6pt', marginTop: '6pt' }}>
          <div style={{ fontSize: '11pt', fontWeight: 700 }}>{f.siteName}</div>
          <div style={{ fontSize: '9.5pt', color: '#374151', marginTop: '1pt' }}>{formattedAddress}</div>
          {(f.mainPhone || f.unitPhone || f.fax) && (
            <div style={{ fontSize: '9pt', color: '#374151', marginTop: '2pt' }}>
              {f.mainPhone && <span>Main: {f.mainPhone}</span>}
              {f.unitPhone && <span style={{ marginLeft: '12pt' }}>Nursing/Unit: {f.unitPhone}</span>}
              {f.fax && <span style={{ marginLeft: '12pt' }}>Fax: {f.fax}</span>}
            </div>
          )}
        </div>

        <div style={{
          marginTop: '8pt', padding: '5pt 8pt', background: '#F3F4F6', border: '0.75pt solid #D1D5DB',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '4pt',
        }}>
          <span style={{ fontSize: '8.5pt', fontWeight: 700 }}>Binder Version {model.binderVersion}</span>
          <span style={{ fontSize: '8.5pt', color: '#374151' }}>Generated: {formatGeneratedAt(model.generatedAt)}</span>
          <span style={{ fontSize: '8.5pt', color: '#374151' }}>Scope: {model.scopeLabel}</span>
          {model.confirmedCurrentAt && (
            <span style={{ fontSize: '8pt', color: '#374151' }}>
              Confirmed Current: {formatDate(model.confirmedCurrentAt.split('T')[0])}
            </span>
          )}
        </div>
      </div>

      {/* EMPTY STATE */}
      {!hasAnyContent && (
        <div style={{ padding: '24pt 0', textAlign: 'center' as const, color: '#6B7280', fontStyle: 'italic', fontSize: '10pt' }}>
          No active standing information is currently configured for this Binder scope.
        </div>
      )}

      {/* SHARED / ALL STAFF */}
      {(model.sharedFyis.length > 0 || model.sharedResidentGroups.length > 0) && (
        <div>
          <SectionDivider label="SHARED / ALL STAFF" isRole={true} />
          {model.sharedFyis.length > 0 && (
            <div style={{ marginBottom: '10pt' }}>
              {model.sharedFyis.map(fyi => <FyiBlock key={fyi.id} fyi={fyi} />)}
            </div>
          )}
          {model.sharedResidentGroups.length > 0 && (
            <>
              {model.sharedFyis.length > 0 && <HorizontalRule />}
              {model.sharedResidentGroups.map((group, i) => (
                <div key={group.roomNumber + group.residentName}>
                  {i > 0 && <HorizontalRule />}
                  <ResidentFyiGroup group={group} />
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ROLE SECTIONS */}
      {model.roleSections.map(role => {
        const roleHasContent =
          role.allShiftsFyis.length > 0 ||
          role.allShiftsResidentGroups.length > 0 ||
          role.shiftGroups.some(s => s.sharedFyis.length > 0 || s.residentGroups.length > 0);
        if (!roleHasContent) return null;

        return (
          <div key={role.roleId}>
            <SectionDivider label={role.roleName.toUpperCase()} isRole={true} />

            {role.allShiftsFyis.length > 0 && (
              <div style={{ marginBottom: '10pt' }}>
                {role.allShiftsFyis.map(fyi => <FyiBlock key={fyi.id} fyi={fyi} />)}
              </div>
            )}

            {role.allShiftsResidentGroups.length > 0 && (
              <>
                {role.allShiftsFyis.length > 0 && <HorizontalRule />}
                {role.allShiftsResidentGroups.map((group, i) => (
                  <div key={group.roomNumber + group.residentName}>
                    {i > 0 && <HorizontalRule />}
                    <ResidentFyiGroup group={group} />
                  </div>
                ))}
              </>
            )}

            {role.shiftGroups.map(shift => {
              if (shift.sharedFyis.length === 0 && shift.residentGroups.length === 0) return null;
              return (
                <div key={shift.shiftId}>
                  <SectionDivider label={`${shift.shiftCode} \u2014 ${shift.shiftName} \u00B7 ${shift.shiftTime}`} />
                  {shift.sharedFyis.length > 0 && (
                    <div style={{ marginBottom: '10pt' }}>
                      {shift.sharedFyis.map(fyi => <FyiBlock key={fyi.id} fyi={fyi} />)}
                    </div>
                  )}
                  {shift.residentGroups.length > 0 && (
                    <>
                      {shift.sharedFyis.length > 0 && <HorizontalRule />}
                      {shift.residentGroups.map((group, i) => (
                        <div key={group.roomNumber + group.residentName}>
                          {i > 0 && <HorizontalRule />}
                          <ResidentFyiGroup group={group} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* FOOTER */}
      <div style={{
        marginTop: '20pt', paddingTop: '6pt', borderTop: '0.75pt solid #9CA3AF',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8pt', color: '#6B7280',
      }}>
        <span>TaskSheet &#xB7; FYI Binder &#xB7; Version {model.binderVersion}</span>
        <span>Generated {formatGeneratedAt(model.generatedAt)}</span>
        {model.developerFooter && <span>{model.developerFooter}</span>}
      </div>
    </div>
  );
};
