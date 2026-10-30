import { useRef, useState } from 'react';
import { Download, FileUp, Plug, PlugZap, RefreshCw, Trash2, X } from 'lucide-react';
import { CSV_TEMPLATE, downloadText, readImportFile } from '../lib/importers.js';
import { fmtRelative } from '../lib/time.js';

export default function SyncHub({ open, onClose, bridge, onRequestSync, importedCount, onImport, onClearImported, onClearExtension, extensionCount, exportJson }) {
  const [drag, setDrag] = useState(false);
  const [msg, setMsg] = useState(null);
  const inputRef = useRef(null);

  if (!open) return null;

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const records = await readImportFile(file);
      onImport(records);
      setMsg({ ok: true, text: `Imported ${records.length} site${records.length === 1 ? '' : 's'} from ${file.name}.` });
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'Could not read that file.' });
    }
  };

  const connected = bridge.connected;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-scrim/50 p-4 pt-16 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Data import and sync hub"
        className="w-full max-w-2xl rounded-2xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Data Import / Sync Hub</h2>
            <p className="text-xs text-muted">Live data from the tracker via the Chrome extension, or a manual file import.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-sunken hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Extension status */}
          <section className={`rounded-xl border p-4 ${connected ? 'border-good/30 bg-good/5' : 'border-line bg-canvas/40'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {connected ? <PlugZap className="h-5 w-5 text-good" /> : <Plug className="h-5 w-5 text-faint" />}
                <div>
                  <div className={`text-sm font-medium ${connected ? 'text-good' : 'text-ink-soft'}`}>
                    {connected ? 'Connected to Scraping Extension' : 'Extension offline'}
                  </div>
                  <div className="text-xs text-muted">
                    {connected
                      ? `v${bridge.version ?? '?'} · ${extensionCount} live record${extensionCount === 1 ? '' : 's'} · last sync ${fmtRelative(bridge.lastSync)}`
                      : 'Install the Control Tower extension, then open this dashboard in the same Chrome profile.'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={!connected} onClick={onRequestSync}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40">
                  <RefreshCw className="h-4 w-4" /> Pull latest
                </button>
                {extensionCount > 0 && (
                  <button type="button" onClick={onClearExtension}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-sunken hover:text-ink">
                    <Trash2 className="h-4 w-4" /> Clear live
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Manual import */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-ink-soft">Import daily CSV / JSON export</h3>
              <button type="button" onClick={() => downloadText('control-tower-template.csv', CSV_TEMPLATE)}
                className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent">
                <Download className="h-3.5 w-3.5" /> CSV template
              </button>
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
                drag ? 'border-accent bg-accent/10' : 'border-line-strong hover:border-line-strong'
              }`}
            >
              <FileUp className="h-7 w-7 text-muted" />
              <div className="text-sm text-ink-soft">Drop a .csv or .json file, or click to browse</div>
              <div className="text-xs text-faint">Rows are matched by site ID and merged over existing data.</div>
              <input ref={inputRef} type="file" accept=".csv,.json,text/csv,application/json" className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
            </div>
            {msg && <p className={`mt-2 text-xs ${msg.ok ? 'text-good' : 'text-bad'}`}>{msg.text}</p>}
            {importedCount > 0 && (
              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span>{importedCount} imported record{importedCount === 1 ? '' : 's'} in this browser.</span>
                <button type="button" onClick={onClearImported} className="text-muted underline hover:text-ink-soft">Remove imported</button>
              </div>
            )}
          </section>

          {/* Export */}
          <section className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
            <button type="button" onClick={exportJson}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm text-ink-soft hover:bg-sunken">
              <Download className="h-4 w-4" /> Export current view (JSON)
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
