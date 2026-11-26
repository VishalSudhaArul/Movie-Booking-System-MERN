import { useCallback, useEffect, useState } from "react";
import API from "../../api";
import AdminLayout from "../../components/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import Icon from "../../components/ui/Icon";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Feedback";
import { useToast } from "../../components/ui/Toast";
import { formatPrice, getErrorMessage } from "../../lib/format";

const EMPTY_FORM = { theatre: "", priceBike: "", priceCar: "" };

export default function AdminParking() {
  const toast = useToast();
  const [parkingList, setParkingList] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [revenueMap, setRevenueMap] = useState({});
  const [status, setStatus] = useState("loading");

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [parkingRes, showRes, revRes] = await Promise.all([
        API.get("/api/parking/all"),
        API.get("/api/shows", { params: { lite: 1 } }),
        API.get("/api/bookings/parking-revenue"),
      ]);
      setParkingList(Array.isArray(parkingRes.data) ? parkingRes.data : []);
      setTheatres([...new Set((showRes.data || []).map((s) => s.theatre))].sort());
      setRevenueMap(revRes.data || {});
      setStatus("ready");
    } catch (err) {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: "" }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditId(null);
  };

  const save = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.theatre.trim()) next.theatre = "Choose or type a theatre.";
    if (form.priceBike === "" || !(Number(form.priceBike) >= 0)) next.priceBike = "Enter a price.";
    if (form.priceCar === "" || !(Number(form.priceCar) >= 0)) next.priceCar = "Enter a price.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    const payload = { theatre: form.theatre.trim(), priceBike: Number(form.priceBike), priceCar: Number(form.priceCar) };
    try {
      if (editId) {
        await API.put(`/api/parking/${editId}`, payload);
        toast.success(`Updated parking prices for ${payload.theatre}.`);
      } else {
        await API.post("/api/parking", payload);
        toast.success(`Added parking for ${payload.theatre}.`);
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't save parking prices."));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (p) => {
    setEditId(p._id);
    setErrors({});
    setForm({ theatre: p.theatre, priceBike: String(p.priceBike ?? ""), priceCar: String(p.priceCar ?? "") });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/api/parking/${deleteTarget._id}`);
      toast.success(`Removed parking for ${deleteTarget.theatre}.`);
      if (editId === deleteTarget._id) resetForm();
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't remove parking."));
    } finally {
      setDeleting(false);
    }
  };

  const unconfigured = theatres.filter((t) => !parkingList.some((p) => p.theatre.toLowerCase() === t.toLowerCase()));

  return (
    <AdminLayout>
      <div className="space-y-8">
        <PageHeader
          breadcrumbs={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Parking" }]}
          title="Parking"
          subtitle="Bike and car parking prices offered at checkout, per theatre."
          icon="car"
          actions={<span className="badge">{parkingList.length} theatres</span>}
        />

        <form onSubmit={save} className="card p-5 sm:p-6" noValidate aria-labelledby="parking-form-title">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="parking-form-title" className="text-lg font-semibold text-white">
              {editId ? "Edit parking prices" : "Add parking for a theatre"}
            </h2>
            {editId && (
              <button type="button" onClick={resetForm} className="btn-ghost btn-sm">Cancel editing</button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field id="p-theatre" label="Theatre" required error={errors.theatre} hint={!editId && unconfigured.length ? `${unconfigured.length} theatre(s) without parking` : undefined}>
              <input id="p-theatre" list="p-theatres" className={`input ${errors.theatre ? "input-error" : ""}`} value={form.theatre} onChange={update("theatre")} disabled={!!editId} autoComplete="off" />
              <datalist id="p-theatres">
                {unconfigured.map((t) => <option key={t} value={t} />)}
              </datalist>
            </Field>
            <Field id="p-bike" label="Bike price (₹)" required error={errors.priceBike}>
              <input id="p-bike" type="number" min="0" inputMode="numeric" className={`input ${errors.priceBike ? "input-error" : ""}`} value={form.priceBike} onChange={update("priceBike")} />
            </Field>
            <Field id="p-car" label="Car price (₹)" required error={errors.priceCar}>
              <input id="p-car" type="number" min="0" inputMode="numeric" className={`input ${errors.priceCar ? "input-error" : ""}`} value={form.priceCar} onChange={update("priceCar")} />
            </Field>
            <div className="flex items-start sm:pt-[22px]">
              <button type="submit" className="btn-primary w-full" disabled={saving}>
                {saving ? <><Spinner className="h-4 w-4" /> Saving…</> : editId ? "Save prices" : <><Icon name="plus" className="h-4 w-4" /> Add parking</>}
              </button>
            </div>
          </div>
        </form>

        {status === "loading" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
          </div>
        ) : status === "error" ? (
          <ErrorState title="We couldn't load parking" onRetry={fetchData} />
        ) : parkingList.length === 0 ? (
          <EmptyState icon="car" title="No parking set up" message="Add parking prices for a theatre with the form above." />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {parkingList.map((p) => (
              <li key={p._id} className={`card p-5 ${editId === p._id ? "ring-2 ring-brand-500" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-white">{p.theatre}</h3>
                  <span className="badge" title="Total parking value of bookings (demo checkout, not collected)">
                    {formatPrice(revenueMap[p.theatre] || 0)} booked
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div className="card-muted p-3">
                    <dt className="text-xs text-gray-400">Bike</dt>
                    <dd className="mt-0.5 font-display text-lg font-bold text-white">{formatPrice(p.priceBike)}</dd>
                  </div>
                  <div className="card-muted p-3">
                    <dt className="text-xs text-gray-400">Car</dt>
                    <dd className="mt-0.5 font-display text-lg font-bold text-white">{formatPrice(p.priceCar)}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => startEdit(p)} className="btn-secondary btn-sm flex-1" aria-label={`Edit parking for ${p.theatre}`}>Edit</button>
                  <button onClick={() => setDeleteTarget(p)} className="btn-icon h-8 w-8 hover:border-danger-500/40 hover:text-danger-300" aria-label={`Remove parking for ${p.theatre}`}>
                    <Icon name="trash" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remove parking?"
        message={`Customers at ${deleteTarget?.theatre} won't be offered parking at checkout.`}
        confirmLabel="Remove parking"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}
