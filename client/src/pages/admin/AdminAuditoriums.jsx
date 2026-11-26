import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API from "../../api";
import AdminLayout from "../../components/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import Icon from "../../components/ui/Icon";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import HallPreview from "../../components/HallPreview";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Feedback";
import { useToast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../lib/format";

const SECTIONS = ["Second Class", "First Class", "Balcony"];
const MAX_ROWS = 25;
const ROW_LETTERS = "ABCDEFGHJKLMNOPQRSTUVWXYZ";

// A sensible starting hall: 10 rows, three blocks, cheaper seats at the front.
const starterRows = () =>
  Array.from({ length: 10 }, (_, i) => ({
    blocks: [4, 8, 4],
    section: i < 3 ? "Second Class" : i < 8 ? "First Class" : "Balcony",
    seatType: "standard",
  }));

// Editable rows from a saved layout (blocks from its aisles).
const rowsFromLayout = (layout) =>
  layout.rows.map((r) => {
    const cuts = [0, ...(r.aisleAfter || []), r.seats];
    const blocks = r.blocks || cuts.slice(1).map((c, i) => c - cuts[i]).filter((n) => n > 0);
    return { blocks: blocks.slice(0, 3), section: r.section, seatType: r.seatType === "recliner" ? "recliner" : "standard" };
  });

export default function AdminAuditoriums() {
  const toast = useToast();
  const [layouts, setLayouts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [openId, setOpenId] = useState(null);
  const [openLayout, setOpenLayout] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  // Editor
  const [name, setName] = useState("");
  const [wheelchair, setWheelchair] = useState(true);
  const [rows, setRows] = useState(starterRows);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const previewSeq = useRef(0);

  const fetchLayouts = useCallback(async () => {
    try {
      const { data } = await API.get("/api/layouts");
      setLayouts(Array.isArray(data) ? data : []);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
    }
  }, []);
  useEffect(() => {
    fetchLayouts();
  }, [fetchLayouts]);

  // Build the preview on the server (the same code that saves it), shortly after each edit.
  const spec = useMemo(() => ({ name: name.trim() || "Untitled hall", wheelchairSpaces: wheelchair, rows }), [name, wheelchair, rows]);
  useEffect(() => {
    const seq = ++previewSeq.current;
    setPreviewing(true);
    const t = setTimeout(() => {
      API.post("/api/layouts/preview", spec)
        .then(({ data }) => {
          if (seq !== previewSeq.current) return;
          setPreview(data);
          setPreviewError("");
        })
        .catch((err) => {
          if (seq !== previewSeq.current) return;
          setPreview(null);
          setPreviewError(getErrorMessage(err, "This hall can't be built."));
        })
        .finally(() => seq === previewSeq.current && setPreviewing(false));
    }, 400);
    return () => clearTimeout(t);
  }, [spec]);

  const openPreview = async (id) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    setOpenLayout(null);
    try {
      const { data } = await API.get(`/api/layouts/${id}`);
      setOpenLayout(data);
    } catch (e) {
      toast.error("We couldn't load that hall.");
      setOpenId(null);
    }
  };

  const startFrom = async (id) => {
    try {
      const { data } = await API.get(`/api/layouts/${id}`);
      setRows(rowsFromLayout(data).slice(0, MAX_ROWS));
      setName(`${data.name.replace(/ · \d+ seats$/, "")} (copy)`.slice(0, 60));
      toast.info("Loaded into the editor. Saving creates a new hall; the original is unchanged.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error("We couldn't load that hall.");
    }
  };

  const setRow = (i, patch) => setRows((list) => list.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const setBlock = (i, b, value) => {
    const n = Math.max(0, Math.min(24, parseInt(value, 10) || 0));
    setRows((list) =>
      list.map((r, k) => {
        if (k !== i) return r;
        const blocks = [...r.blocks];
        blocks[b] = n;
        return { ...r, blocks: blocks.filter((x, j) => x > 0 || j === 0) };
      })
    );
  };

  const save = async () => {
    if (name.trim().length < 3) {
      toast.error("Give the hall a name of at least 3 characters.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await API.post("/api/layouts", { ...spec, name: name.trim() });
      toast.success(`${data.name} saved with ${data.totalSeats} seats. You can now schedule showtimes in it.`);
      setName("");
      setRows(starterRows());
      fetchLayouts();
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't save the hall."));
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    setRemoving(true);
    try {
      await API.delete(`/api/layouts/${removeTarget.id}`);
      toast.success("Hall removed.");
      setRemoveTarget(null);
      fetchLayouts();
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't remove the hall."));
    } finally {
      setRemoving(false);
    }
  };

  const total = rows.reduce((a, r) => a + r.blocks.reduce((x, y) => x + y, 0), 0);

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Venue setup"
        title="Auditoriums"
        subtitle="Halls showtimes can use. Design a new hall row by row and preview it before saving. Saved halls never change, so existing seats and bookings stay correct."
        icon="grid"
      />

      {/* ───────── Editor ───────── */}
      <section className="card mt-8 p-5" aria-labelledby="editor-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="editor-title" className="text-lg font-bold text-white">Design a hall</h2>
          <p className="text-sm text-gray-400" aria-live="polite">
            {rows.length} rows · <span className="font-semibold text-white">{total}</span> seats
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field id="hall-name" label="Hall name" required hint="3 to 60 characters, e.g. Studio 7">
            <input id="hall-name" className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Studio 7" />
          </Field>
          <label className="flex items-center gap-3 self-end rounded-xl border border-line p-3 text-sm text-gray-200">
            <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={wheelchair} onChange={(e) => setWheelchair(e.target.checked)} />
            Wheelchair spaces at both ends of row A (flat floor by the step-free front doors), with companion seats
          </label>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Rows, from the screen backwards</caption>
            <thead className="text-xs text-gray-400">
              <tr>
                <th scope="col" className="py-2 pr-2 font-medium">Row</th>
                <th scope="col" className="py-2 pr-2 font-medium">Left block</th>
                <th scope="col" className="py-2 pr-2 font-medium">Centre block</th>
                <th scope="col" className="py-2 pr-2 font-medium">Right block</th>
                <th scope="col" className="py-2 pr-2 font-medium">Price category</th>
                <th scope="col" className="py-2 pr-2 font-medium">Chairs</th>
                <th scope="col" className="py-2 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r, i) => (
                <tr key={i}>
                  <th scope="row" className="py-1.5 pr-2 font-mono text-gray-300">{ROW_LETTERS[i]}</th>
                  {[0, 1, 2].map((b) => (
                    <td key={b} className="py-1.5 pr-2">
                      <input
                        type="number"
                        min={b === 0 ? 1 : 0}
                        max={24}
                        className="input w-20 py-1.5"
                        aria-label={`Row ${ROW_LETTERS[i]}, block ${b + 1} seats`}
                        value={r.blocks[b] ?? 0}
                        disabled={b > r.blocks.length}
                        onChange={(e) => setBlock(i, b, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="py-1.5 pr-2">
                    <select className="select py-1.5" aria-label={`Row ${ROW_LETTERS[i]} price category`} value={r.section} onChange={(e) => setRow(i, { section: e.target.value })}>
                      {SECTIONS.map((sct) => <option key={sct}>{sct}</option>)}
                    </select>
                  </td>
                  <td className="py-1.5 pr-2">
                    <select className="select py-1.5" aria-label={`Row ${ROW_LETTERS[i]} chair type`} value={r.seatType} onChange={(e) => setRow(i, { seatType: e.target.value })}>
                      <option value="standard">Standard</option>
                      <option value="recliner">Recliner</option>
                    </select>
                  </td>
                  <td className="whitespace-nowrap py-1.5">
                    <button type="button" className="btn-icon h-8 w-8" aria-label={`Duplicate row ${ROW_LETTERS[i]}`} disabled={rows.length >= MAX_ROWS} onClick={() => setRows((l) => [...l.slice(0, i + 1), { ...r, blocks: [...r.blocks] }, ...l.slice(i + 1)])}>
                      <Icon name="plus" className="h-4 w-4" />
                    </button>
                    <button type="button" className="btn-icon h-8 w-8" aria-label={`Remove row ${ROW_LETTERS[i]}`} disabled={rows.length <= 1} onClick={() => setRows((l) => l.filter((_, k) => k !== i))}>
                      <Icon name="close" className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-2xs text-gray-500">Row A is nearest the screen. Letters skip I. Rows rise progressively towards the back, like a stadium hall. Up to 25 rows and 600 seats.</p>

        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
            Preview {previewing && <Spinner className="h-4 w-4 text-brand-300" />}
          </div>
          {previewError ? (
            <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 p-3 text-sm text-danger-300" role="alert">{previewError}</p>
          ) : preview ? (
            <>
              <HallPreview layout={preview} />
              <p className="mt-2 text-xs text-gray-400" data-testid="editor-stats">
                {preview.totalSeats} seats · room {preview.room.width} × {preview.room.depth} m · screen {preview.screen.width} m wide · {preview.doors.length} doors ·{" "}
                {preview.accessibility.wheelchair.length ? `wheelchair spaces ${preview.accessibility.wheelchair.join(", ")}` : "no wheelchair spaces"}
              </p>
            </>
          ) : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={save} disabled={saving || !!previewError || !preview}>
            {saving ? <><Spinner className="h-4 w-4" /> Saving…</> : <><Icon name="check" className="h-4 w-4" /> Save hall</>}
          </button>
          <button type="button" className="btn-ghost" onClick={() => { setRows(starterRows()); setName(""); }}>Start over</button>
        </div>
      </section>

      {/* ───────── Halls ───────── */}
      <section className="mt-8" aria-labelledby="halls-title">
        <h2 id="halls-title" className="text-lg font-bold text-white">Halls</h2>
        {status === "loading" ? (
          <div className="mt-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
        ) : status === "error" ? (
          <div className="mt-4"><ErrorState title="We couldn't load the halls" onRetry={fetchLayouts} /></div>
        ) : layouts.length === 0 ? (
          <div className="mt-4"><EmptyState icon="grid" title="No halls" message="Built-in halls appear here once the server is running." /></div>
        ) : (
          <ul className="mt-4 space-y-2">
            {layouts.map((l) => (
              <li key={l.id} className="card p-4" data-testid="hall-row">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">
                      {l.name} {l.custom ? <span className="badge-accent ml-1">Custom</span> : <span className="badge-brand ml-1">Built-in</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {l.totalSeats} seats · {l.rows} rows · used by {l.shows} showtime{l.shows === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" className="btn-secondary btn-sm" onClick={() => openPreview(l.id)} aria-expanded={openId === l.id}>
                      <Icon name="eye" className="h-4 w-4" /> {openId === l.id ? "Hide plan" : "Plan"}
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => startFrom(l.id)}>Copy to editor</button>
                    {l.custom && (
                      <button
                        type="button"
                        className="btn-ghost btn-sm text-danger-300"
                        disabled={l.shows > 0}
                        title={l.shows > 0 ? "Used by showtimes, so it can't be removed" : "Remove this hall"}
                        onClick={() => setRemoveTarget(l)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                {openId === l.id && (
                  <div className="mt-3">
                    {openLayout ? <HallPreview layout={openLayout} /> : <div className="skeleton h-40 rounded-xl" />}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        isOpen={!!removeTarget}
        title="Remove this hall?"
        message={removeTarget ? `${removeTarget.name} isn't used by any showtime. Removing it can't be undone.` : ""}
        confirmLabel="Remove hall"
        danger
        loading={removing}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </AdminLayout>
  );
}
