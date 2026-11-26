import { useCallback, useEffect, useState } from "react";
import API from "../../api";
import AdminLayout from "../../components/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import Icon from "../../components/ui/Icon";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Feedback";
import { useToast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../lib/format";

const KINDS = [
  ["entrance", "Entrance"],
  ["auditorium", "Auditorium"],
  ["food", "Food counter"],
  ["restroom", "Restrooms"],
  ["exit", "Emergency exit"],
  ["accessible", "Accessible route"],
  ["parking", "Parking"],
  ["info", "Information"],
];
const EMPTY = { name: "", address: "", mapUrl: "", entryInstructions: "", points: [] };

/**
 * Venue wayfinding: what customers see under "Finding your seat" on their
 * tickets and as pickup instructions for food. Only what's entered here is shown.
 */
export default function AdminVenues() {
  const toast = useToast();
  const [venues, setVenues] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [status, setStatus] = useState("loading");
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [v, s] = await Promise.all([API.get("/api/venues"), API.get("/api/shows", { params: { lite: 1 } })]);
      setVenues(Array.isArray(v.data) ? v.data : []);
      setTheatres([...new Set((s.data || []).map((x) => x.theatre))].sort());
      setStatus("ready");
    } catch (e) {
      setStatus("error");
    }
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setPoint = (i, key, value) => setForm((f) => ({ ...f, points: f.points.map((p, k) => (k === i ? { ...p, [key]: value } : p)) }));
  const reset = () => {
    setForm(EMPTY);
    setEditId(null);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, points: form.points.filter((p) => p.label.trim()) };
      if (editId) await API.put(`/api/venues/${editId}`, body);
      else await API.post("/api/venues", body);
      toast.success(editId ? "Venue updated." : "Venue published.");
      reset();
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't save the venue."));
    } finally {
      setSaving(false);
    }
  };

  const edit = (v) => {
    setEditId(v._id);
    setForm({ name: v.name, address: v.address || "", mapUrl: v.mapUrl || "", entryInstructions: v.entryInstructions || "", points: (v.points || []).map((p) => ({ ...p })) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/api/venues/${deleteTarget._id}`);
      toast.success("Venue removed.");
      setDeleteTarget(null);
      if (editId === deleteTarget._id) reset();
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't remove the venue."));
    } finally {
      setDeleting(false);
    }
  };

  const missing = theatres.filter((t) => !venues.some((v) => v.name.toLowerCase() === t.toLowerCase()));

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Venue setup"
        title="Venues & directions"
        subtitle="Entrances, food counters, restrooms and exits customers see on their tickets. Nothing is shown for a theatre until you publish it."
        icon="pin"
      />

      <form onSubmit={save} className="card mt-8 space-y-4 p-5" aria-labelledby="venue-form-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="venue-form-title" className="text-lg font-bold text-white">{editId ? "Edit venue" : "Publish a venue"}</h2>
          {editId && <button type="button" onClick={reset} className="btn-ghost btn-sm">Cancel editing</button>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="v-name" label="Theatre name" required hint="Exactly as on showtimes (case doesn't matter).">
            <input id="v-name" className="input" list="v-theatres" maxLength={120} value={form.name} onChange={set("name")} />
            <datalist id="v-theatres">{theatres.map((t) => <option key={t} value={t} />)}</datalist>
          </Field>
          <Field id="v-address" label="Address">
            <input id="v-address" className="input" maxLength={200} value={form.address} onChange={set("address")} />
          </Field>
          <Field id="v-map" label="Map link" hint="https://...">
            <input id="v-map" className="input" type="url" maxLength={500} value={form.mapUrl} onChange={set("mapUrl")} />
          </Field>
          <Field id="v-entry" label="Entry instructions" hint="Up to 500 characters.">
            <textarea id="v-entry" className="input min-h-[76px]" maxLength={500} value={form.entryInstructions} onChange={set("entryInstructions")} />
          </Field>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-white">Places in the building</legend>
          {form.points.length === 0 && <p className="mt-1 text-xs text-gray-400">No places yet. Add the entrance, auditoriums, food counter, restrooms and exits.</p>}
          <ul className="mt-2 space-y-2">
            {form.points.map((p, i) => (
              <li key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[160px_1fr_2fr_auto]">
                <select className="select" aria-label={`Place ${i + 1} type`} value={p.kind} onChange={(e) => setPoint(i, "kind", e.target.value)}>
                  {KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
                <input className="input" aria-label={`Place ${i + 1} name`} maxLength={60} placeholder="Name, e.g. Main gate" value={p.label} onChange={(e) => setPoint(i, "label", e.target.value)} />
                <input className="input" aria-label={`Place ${i + 1} directions`} maxLength={300} placeholder="How to find it" value={p.directions} onChange={(e) => setPoint(i, "directions", e.target.value)} />
                <button type="button" className="btn-icon" aria-label={`Remove place ${i + 1}`} onClick={() => setForm((f) => ({ ...f, points: f.points.filter((_, k) => k !== i) }))}>
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-secondary btn-sm mt-2" disabled={form.points.length >= 30} onClick={() => setForm((f) => ({ ...f, points: [...f.points, { kind: "entrance", label: "", directions: "" }] }))}>
            <Icon name="plus" className="h-4 w-4" /> Add a place
          </button>
        </fieldset>

        <button type="submit" className="btn-primary" disabled={saving || !form.name.trim()}>
          {saving ? <><Spinner className="h-4 w-4" /> Saving…</> : editId ? "Save changes" : "Publish venue"}
        </button>
      </form>

      <section className="mt-8" aria-labelledby="venues-title">
        <h2 id="venues-title" className="text-lg font-bold text-white">Published venues</h2>
        {missing.length > 0 && status === "ready" && (
          <p className="mt-1 text-xs text-gray-400">No directions yet for: {missing.join(", ")}.</p>
        )}
        {status === "loading" ? (
          <div className="mt-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
        ) : status === "error" ? (
          <div className="mt-4"><ErrorState title="We couldn't load venues" onRetry={fetchData} /></div>
        ) : venues.length === 0 ? (
          <div className="mt-4"><EmptyState icon="pin" title="No venues published" message="Customers see a note asking them to follow staff directions until you publish one." /></div>
        ) : (
          <ul className="mt-4 space-y-2">
            {venues.map((v) => (
              <li key={v._id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{v.name}</p>
                  <p className="text-xs text-gray-400">{v.points?.length || 0} places{v.address ? ` · ${v.address}` : ""}</p>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" className="btn-secondary btn-sm" onClick={() => edit(v)}>Edit</button>
                  <button type="button" className="btn-ghost btn-sm text-danger-300" onClick={() => setDeleteTarget(v)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remove this venue?"
        message={deleteTarget ? `Tickets for ${deleteTarget.name} will no longer show directions.` : ""}
        confirmLabel="Remove venue"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}
