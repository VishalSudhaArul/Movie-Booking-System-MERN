import { useCallback, useEffect, useState } from "react";
import API from "../../api";
import AdminLayout from "../../components/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import Icon from "../../components/ui/Icon";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Feedback";
import { useToast } from "../../components/ui/Toast";
import { formatDate, formatPrice, getErrorMessage } from "../../lib/format";

const EMPTY = { code: "", description: "", discountType: "FIXED", discountValue: "", minBookingAmount: "" };
const describe = (c) => (c.discountType === "PERCENTAGE" ? `${c.discountValue}% off` : `${formatPrice(c.discountValue)} off`) + (c.minBookingAmount ? ` over ${formatPrice(c.minBookingAmount)}` : "");

/** Promo codes and review moderation. */
export default function AdminPromotions() {
  const toast = useToast();
  const [coupons, setCoupons] = useState({ saved: [], builtIn: [] });
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState("loading");
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [removeReview, setRemoveReview] = useState(null);
  const [removing, setRemoving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [c, r] = await Promise.all([API.get("/api/coupons/admin"), API.get("/api/reviews/admin/recent")]);
      setCoupons(c.data || { saved: [], builtIn: [] });
      setReviews(Array.isArray(r.data) ? r.data : []);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
    }
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/api/coupons", { ...form, discountValue: Number(form.discountValue), minBookingAmount: form.minBookingAmount === "" ? 0 : Number(form.minBookingAmount) });
      toast.success(`${form.code.toUpperCase()} is live.`);
      setForm(EMPTY);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't create the code."));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c) => {
    setBusyId(c._id);
    try {
      await API.put(`/api/coupons/${c._id}/active`, { isActive: !c.isActive });
      toast.success(`${c.code} ${c.isActive ? "switched off" : "switched on"}.`);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't update the code."));
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemove = async () => {
    setRemoving(true);
    try {
      await API.delete(`/api/reviews/${removeReview._id}`);
      toast.success("Review removed.");
      setRemoveReview(null);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, "We couldn't remove the review."));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader eyebrow="Marketing" title="Promotions & reviews" subtitle="Promo codes customers can apply at checkout, and recent movie reviews." icon="star" />

      {status === "error" ? (
        <div className="mt-8"><ErrorState title="We couldn't load promotions" onRetry={fetchData} /></div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="card p-5" aria-labelledby="promo-title">
            <h2 id="promo-title" className="text-lg font-bold text-white">Promo codes</h2>
            <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field id="c-code" label="Code" required hint="3–20 letters or digits">
                <input id="c-code" className="input uppercase" maxLength={20} value={form.code} onChange={set("code")} />
              </Field>
              <Field id="c-type" label="Discount">
                <select id="c-type" className="select" value={form.discountType} onChange={set("discountType")}>
                  <option value="FIXED">Fixed amount (₹)</option>
                  <option value="PERCENTAGE">Percentage (%)</option>
                </select>
              </Field>
              <Field id="c-value" label={form.discountType === "PERCENTAGE" ? "Percent off" : "Amount off"} required>
                <input id="c-value" type="number" min={1} className="input" value={form.discountValue} onChange={set("discountValue")} />
              </Field>
              <Field id="c-min" label="Minimum order (₹)">
                <input id="c-min" type="number" min={0} className="input" value={form.minBookingAmount} onChange={set("minBookingAmount")} />
              </Field>
              <Field id="c-desc" label="Description" className="sm:col-span-2">
                <input id="c-desc" className="input" maxLength={120} value={form.description} onChange={set("description")} />
              </Field>
              <div className="sm:col-span-2">
                <button type="submit" className="btn-primary" disabled={saving || !form.code || !form.discountValue}>
                  {saving ? <><Spinner className="h-4 w-4" /> Creating…</> : <><Icon name="plus" className="h-4 w-4" /> Create code</>}
                </button>
              </div>
            </form>

            {status === "loading" ? (
              <div className="mt-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
            ) : (
              <ul className="mt-5 space-y-2" aria-label="Promo codes">
                {coupons.saved.map((c) => (
                  <li key={c._id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-white">{c.code} {!c.isActive && <span className="badge ml-1">Off</span>}</p>
                      <p className="text-xs text-gray-400">{describe(c)}{c.description ? ` · ${c.description}` : ""}</p>
                    </div>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => toggle(c)} disabled={busyId === c._id} aria-pressed={c.isActive} aria-label={`${c.code}: ${c.isActive ? "switch off" : "switch on"}`}>
                      {busyId === c._id ? <Spinner className="h-4 w-4" /> : c.isActive ? "Switch off" : "Switch on"}
                    </button>
                  </li>
                ))}
                {coupons.builtIn.map((c) => (
                  <li key={c.code} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line p-3">
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-white">{c.code} <span className="badge-brand ml-1">Built-in</span></p>
                      <p className="text-xs text-gray-400">{describe(c)} · create a code with the same name to replace it</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5" aria-labelledby="reviews-title">
            <h2 id="reviews-title" className="text-lg font-bold text-white">Recent reviews</h2>
            {status === "loading" ? (
              <div className="mt-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
            ) : reviews.length === 0 ? (
              <div className="mt-4"><EmptyState icon="star" title="No reviews yet" message="Customer reviews show up here as they're posted." /></div>
            ) : (
              <ul className="mt-4 max-h-[560px] space-y-2 overflow-y-auto" aria-label="Reviews">
                {reviews.map((r) => (
                  <li key={r._id} className="rounded-xl border border-line p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{r.movie} · <span className="text-gold-300" aria-label={`${r.rating} out of 5 stars`}>{"★".repeat(r.rating)}</span></p>
                        <p className="text-xs text-gray-400">{r.userName} · {formatDate(r.createdAt)}</p>
                      </div>
                      <button type="button" className="btn-ghost btn-sm text-danger-300" onClick={() => setRemoveReview(r)} aria-label={`Remove the review by ${r.userName}`}>Remove</button>
                    </div>
                    <p className="mt-1.5 break-words text-sm text-gray-300">{r.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!removeReview}
        title="Remove this review?"
        message={removeReview ? `${removeReview.userName}'s review of ${removeReview.movie} will be deleted and its rating no longer counted.` : ""}
        confirmLabel="Remove review"
        danger
        loading={removing}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveReview(null)}
      />
    </AdminLayout>
  );
}
