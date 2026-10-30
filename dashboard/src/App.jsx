import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, Moon, Plug, PlugZap, Sun } from 'lucide-react';
import MetricsHeader from './components/MetricsHeader.jsx';
import FilterBar, { applyFilters, EMPTY_FILTERS } from './components/FilterBar.jsx';
import SiteTable from './components/SiteTable.jsx';
import SiteDrawer from './components/SiteDrawer.jsx';
import SyncHub from './components/SyncHub.jsx';
import ZoneStrip from './components/ZoneStrip.jsx';
import { mergeSites } from './lib/schema.js';
import { useExtensionBridge } from './lib/useExtensionBridge.js';
import { downloadText } from './lib/importers.js';
import { load, save } from './lib/storage.js';
import { fmtRelative } from './lib/time.js';

function usePersisted(key, initial) {
  const [v, setV] = useState(() => load(key, initial));
  useEffect(() => save(key, v), [key, v]);
  return [v, setV];
}

export default function App() {
  const [imported, setImported] = usePersisted('imported', []);
  const [extensionRecords, setExtensionRecords] = usePersisted('extension', []);
  const [logOverrides, setLogOverrides] = usePersisted('logOverrides', {});
  const [pocOverrides, setPocOverrides] = usePersisted('pocOverrides', {});
  const [theme, setTheme] = usePersisted('theme', 'light');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [quick, setQuick] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [hubOpen, setHubOpen] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const { status: bridge, requestData, clearExtensionData } = useExtensionBridge(
    useCallback((records) => setExtensionRecords(records), [setExtensionRecords]),
  );

  const sites = useMemo(() => {
    const overrides = [
      ...Object.entries(logOverrides).map(([id, logStatus]) => ({ id, logStatus })),
      ...Object.entries(pocOverrides).map(([id, poc]) => ({ id, poc })),
    ];
    const merged = mergeSites(extensionRecords, imported, overrides);
    // Overrides alone (for a site no longer loaded) shouldn't create ghost rows.
    const known = new Set([...extensionRecords, ...imported].map((r) => String(r.id ?? r.site_id ?? r.uid)));
    return merged.filter((s) => known.has(s.id));
  }, [extensionRecords, imported, logOverrides, pocOverrides]);

  const options = useMemo(() => {
    const uniq = (f) => [...new Set(sites.map(f).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return { zones: uniq((s) => s.zone), locations: uniq((s) => s.city), statuses: uniq((s) => s.status), kitHolders: uniq((s) => s.kitHolder) };
  }, [sites]);
  const visible = useMemo(() => applyFilters(sites, filters, quick), [sites, filters, quick]);
  const selected = sites.find((s) => s.id === selectedId) ?? null;

  const onLogChange = (id, v) => setLogOverrides((o) => ({ ...o, [id]: v }));
  const onPocUpdate = (id, patch) => setPocOverrides((o) => ({ ...o, [id]: { ...(o[id] ?? {}), ...patch } }));
  const onImport = (records) =>
    setImported((prev) => {
      const map = new Map(prev.map((r) => [String(r.id ?? r.site_id), r]));
      records.forEach((r) => map.set(String(r.id ?? r.site_id ?? r.uid), r));
      return [...map.values()];
    });

  const exportJson = () => {
    const clean = visible.map(({ derived, ...rest }) => ({ ...rest, flags: derived.flags.map((f) => f.text) }));
    downloadText(`control-tower-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ records: clean }, null, 2), 'application/json');
  };

  const h2 = 'text-[17px] font-bold text-ink';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas">
        <div className="flex min-h-[61px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
          <div>
            <div className="text-sm font-bold leading-tight">Operations Control Tower</div>
            <div className="font-mono text-[11px] text-muted">field deployment monitoring · {today}</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setHubOpen(true)} title="Extension status"
              className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium ring-1 ring-inset ${
                bridge.connected ? 'bg-good/10 text-good ring-good/30' : 'bg-faint/10 text-muted ring-faint/40'
              }`}>
              {bridge.connected ? <PlugZap className="h-3 w-3" aria-hidden /> : <Plug className="h-3 w-3" aria-hidden />}
              {bridge.connected ? `Live · synced ${fmtRelative(bridge.lastSync)}` : 'Extension offline'}
            </button>
            <button type="button" onClick={() => setHubOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-ink hover:bg-sunken">
              <Database className="h-4 w-4" aria-hidden /> Import / Sync
            </button>
            <button type="button" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface text-ink hover:bg-sunken"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 py-8">
        <h1 className="text-[26px] font-bold leading-tight">Control Tower</h1>
        {sites.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-line-strong p-10 text-center text-sm text-muted">
            <p className="text-ink">No sites loaded yet.</p>
            <p className="mt-1">Open the tracker with the extension installed, or import a CSV / JSON file.</p>
            <button type="button" onClick={() => setHubOpen(true)}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover">
              <Database className="h-4 w-4" /> Import / Sync
            </button>
          </div>
        ) : (
          <>
            <section className="mt-6 space-y-3">
              <h2 className={h2}>Overview</h2>
              <MetricsHeader sites={sites} quickFilter={quick} onQuickFilter={setQuick} />
              <ZoneStrip sites={sites} activeZone={filters.zone} onPick={(z) => setFilters((f) => ({ ...f, zone: f.zone === z ? 'all' : z }))} />
            </section>
            <section className="mt-8 space-y-4">
              <h2 className={h2}>Sites</h2>
              <FilterBar filters={filters} setFilters={setFilters} options={options} shown={visible.length} total={sites.length} />
              <SiteTable sites={visible} onOpen={setSelectedId} selectedId={selectedId} onLogChange={onLogChange} logOverrides={logOverrides} />
            </section>
          </>
        )}
      </main>

      <SiteDrawer site={selected} onClose={() => setSelectedId(null)} onLogChange={onLogChange}
        logOverridden={selected ? logOverrides[selected.id] != null : false} onPocUpdate={onPocUpdate} />

      <SyncHub
        open={hubOpen}
        onClose={() => setHubOpen(false)}
        bridge={bridge}
        onRequestSync={requestData}
        importedCount={imported.length}
        onImport={onImport}
        onClearImported={() => setImported([])}
        extensionCount={extensionRecords.length}
        onClearExtension={() => { clearExtensionData(); setExtensionRecords([]); }}
        exportJson={exportJson}
      />
    </div>
  );
}
