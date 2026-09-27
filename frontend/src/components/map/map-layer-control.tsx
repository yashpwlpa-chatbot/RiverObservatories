export interface OverlayState {
  rivers: boolean;
  stations: boolean;
  states: boolean;
  districts: boolean;
}

export interface OverlayCounts {
  rivers: number;
  stations: number;
  states: number;
  districts: number;
}

function Toggle({ checked, onChange, swatch, label, count }: { checked: boolean; onChange: () => void; swatch: React.ReactNode; label: string; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-0.5 text-xs text-foreground">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 accent-[#007F40]" />
      {swatch}
      <span>{label}</span>
      {count !== undefined ? <span className="ml-auto text-muted-foreground">{count}</span> : null}
    </label>
  );
}

export function MapLayerControl({
  overlays,
  counts,
  onToggle,
  basemap,
  onBasemap,
}: {
  overlays: OverlayState;
  counts: OverlayCounts;
  onToggle: (key: keyof OverlayState) => void;
  basemap: 'vector' | 'satellite';
  onBasemap: (b: 'vector' | 'satellite') => void;
}) {
  return (
    <div className="w-44 rounded-lg border border-border bg-white/95 p-2.5 text-xs shadow-card">
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Base map</p>
      <div className="mb-2 flex gap-1 px-1">
        {(['vector', 'satellite'] as const).map((b) => (
          <button
            key={b}
            onClick={() => onBasemap(b)}
            className={`flex-1 rounded border px-1.5 py-1 capitalize transition-colors ${
              basemap === b ? 'border-primary bg-brand-50 font-medium text-primary' : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {b === 'vector' ? 'Map' : 'Satellite'}
          </button>
        ))}
      </div>

      <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Overlays</p>
      <div className="px-1">
        <Toggle checked={overlays.rivers} onChange={() => onToggle('rivers')} swatch={<span className="inline-block h-0.5 w-4 rounded bg-primary" />} label="Rivers" count={counts.rivers} />
        <Toggle checked={overlays.stations} onChange={() => onToggle('stations')} swatch={<span className="inline-block h-2.5 w-2.5 rounded-full bg-[#334155]" />} label="Stations" count={counts.stations} />
        <Toggle checked={overlays.states} onChange={() => onToggle('states')} swatch={<span className="inline-block h-2.5 w-2.5 rounded-sm border border-[#94a3b8] bg-[#eef2f7]" />} label="States" count={counts.states} />
        <Toggle checked={overlays.districts} onChange={() => onToggle('districts')} swatch={<span className="inline-block h-2.5 w-2.5 rounded-sm border border-[#cbd5e1] bg-[#f4f7fa]" />} label="Districts" count={counts.districts} />
      </div>
    </div>
  );
}
