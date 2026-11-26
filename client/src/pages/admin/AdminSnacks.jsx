import { useCallback, useEffect, useState } from "react";
import { SearchInput } from "../../components/ui/Input";
import API from "../../api";
import AdminLayout from "../../components/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import Icon from "../../components/ui/Icon";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Feedback";
import { useToast } from "../../components/ui/Toast";
import { formatPrice, getErrorMessage } from "../../lib/format";

export default function AdminSnacks() {
  const toast = useToast();
  const [snacks, setSnacks] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [status, setStatus] = useState("loading");

  const [form, setForm] = useState({ name: "", price: "", theatre: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSnacks = useCallback(async () => {
    try {
      // Theatres come from both the menus and the showtimes, so a theatre with
      // shows but no menu yet can still get one.
      const [snackRes, metaRes] = await Promise.all([
        API.get("/api/snacks/all"),
        API.get("/api/snack-orders/meta/theatres-movies").catch(() => ({ data: { theatres: [] } })),
      ]);
      const list = Array.isArray(snackRes.data) ? snackRes.data : [];
      setSnacks(list);
      setTheatres([...new Set([...list.map((s) => s.theatre), ...(metaRes.data?.theatres || [])])].sort());
      setStatus("ready");
    } catch (err) {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchSnacks();
  }, [fetchSnacks]);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: "" }));
  };

  const addSnack = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = "Enter a name.";
    if (form.price === "" || !(Number(form.price) >= 0)) next.price = "Enter a price.";
    if (!form.theatre.trim()) next.theatre = "Choose or type a theatre.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await API.post("/api/snacks", { name: form.name.trim(), price: Number(form.price), theatre: form.theatre.trim() });
      toast.success(`Added ${form.name.trim()} to ${form.theatre.trim()}.`);
      setForm((f) => ({ ...f, name: "", price: "" }));
      fetchSnacks();
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't add the item."));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/api/snacks/${deleteTarget._id}`);
      toast.success(`Removed ${deleteTarget.name}.`);
      setDeleteTarget(null);
      fetchSnacks();
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't remove the item."));
    } finally {
      setDeleting(false);
    }
  };

  const query = search.trim().toLowerCase();
  const filtered = snacks.filter((s) => !query || s.name.toLowerCase().includes(query) || s.theatre.toLowerCase().includes(query));
  const grouped = filtered.reduce((acc, snack) => {
    (acc[snack.theatre] = acc[snack.theatre] || []).push(snack);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="space-y-8">
        <PageHeader
          breadcrumbs={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Snacks" }]}
          title="Snacks"
          subtitle="Each theatre's food and drinks menu, shown at checkout and on the Food & Drinks page."
          icon="popcorn"
          actions={<span className="badge">{snacks.length} items</span>}
        />

        <form onSubmit={addSnack} className="card p-5 sm:p-6" noValidate aria-labelledby="snack-form-title">
          <h2 id="snack-form-title" className="mb-4 text-lg font-semibold text-white">Add an item</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field id="sn-name" label="Name" required error={errors.name}>
              <input id="sn-name" className={`input ${errors.name ? "input-error" : ""}`} placeholder="e.g. Cheese Popcorn" value={form.name} onChange={update("name")} />
            </Field>
            <Field id="sn-price" label="Price (₹)" required error={errors.price}>
              <input id="sn-price" type="number" min="0" inputMode="numeric" className={`input ${errors.price ? "input-error" : ""}`} value={form.price} onChange={update("price")} />
            </Field>
            <Field id="sn-theatre" label="Theatre" required error={errors.theatre} hint="Pick one or type a new theatre">
              <input id="sn-theatre" list="sn-theatres" className={`input ${errors.theatre ? "input-error" : ""}`} value={form.theatre} onChange={update("theatre")} autoComplete="off" />
              <datalist id="sn-theatres">
                {theatres.map((t) => <option key={t} value={t} />)}
              </datalist>
            </Field>
            <div className="flex items-start sm:pt-[22px]">
              <button type="submit" className="btn-primary w-full" disabled={saving}>
                {saving ? <><Spinner className="h-4 w-4" /> Adding…</> : <><Icon name="plus" className="h-4 w-4" /> Add item</>}
              </button>
            </div>
          </div>
        </form>

        <SearchInput
          id="snack-search"
          wrapperClassName="sm:w-80"
          label="Search snacks"
          placeholder="Search by item or theatre"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {status === "loading" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
          </div>
        ) : status === "error" ? (
          <ErrorState title="We couldn't load snacks" onRetry={fetchSnacks} />
        ) : Object.keys(grouped).length === 0 ? (
          <EmptyState icon="popcorn" title={snacks.length ? "No items match" : "No snacks yet"} message={snacks.length ? "Try a different search." : "Add the first item with the form above."} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {Object.keys(grouped).sort().map((theatreName) => (
              <section key={theatreName} className="card overflow-hidden" aria-label={`${theatreName} menu`}>
                <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                  <h3 className="font-semibold text-white">{theatreName}</h3>
                  <span className="badge">{grouped[theatreName].length} items</span>
                </header>
                <ul className="divide-y divide-white/[0.06]">
                  {grouped[theatreName].map((snack) => (
                    <li key={snack._id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <span className="min-w-0 truncate text-sm text-gray-200">{snack.name}</span>
                      <span className="ml-auto font-semibold text-white">{formatPrice(snack.price)}</span>
                      <button onClick={() => setDeleteTarget(snack)} className="btn-icon h-8 w-8 hover:border-danger-500/40 hover:text-danger-300" aria-label={`Remove ${snack.name} from ${theatreName}`}>
                        <Icon name="trash" className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remove this item?"
        message={`${deleteTarget?.name} will no longer be offered at ${deleteTarget?.theatre}.`}
        confirmLabel="Remove item"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}
