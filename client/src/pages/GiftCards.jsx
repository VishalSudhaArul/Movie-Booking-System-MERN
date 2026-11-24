import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/ui/Icon";
import PageHeader from "../components/ui/PageHeader";
import Field from "../components/ui/Field";
import { formatPrice } from "../lib/format";

const THEMES = [
  { id: "classic", name: "Midnight", className: "from-brand-600 via-ink-800 to-ink-950" },
  { id: "violet", name: "Premiere", className: "from-accent-600 via-ink-800 to-ink-950" },
  { id: "aurora", name: "Aurora", className: "from-brand-500 via-accent-600 to-ink-950" },
];
const AMOUNTS = [250, 500, 1000, 2000];

/**
 * Gift cards aren't sold yet. This page lets visitors preview a card design and
 * says so plainly: nothing is charged, no code is issued and no email is sent.
 */
export default function GiftCards() {
  const [theme, setTheme] = useState(THEMES[0].id);
  const [amount, setAmount] = useState(500);
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const active = THEMES.find((t) => t.id === theme);

  return (
    <main id="main" className="container-page space-y-8 py-8 sm:py-10">
      <PageHeader
        eyebrow="Gift cards"
        title="Gift a night at the movies"
        subtitle="Digital gift cards are coming soon. Design one below to see how it will look."
        icon="gift"
        actions={<span className="badge-accent">Coming soon</span>}
      />

      <div className="alert-info">
        <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Gift cards can't be bought yet. This is a preview: nothing is charged, no code is created and nothing is sent.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Live preview */}
        <div className="space-y-4">
          <div
            className={`relative aspect-[1.6/1] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${active.className} p-6 shadow-glow sm:p-8`}
            role="img"
            aria-label={`Gift card preview: ${active.name} design, ${formatPrice(amount)}${recipientName ? `, for ${recipientName}` : ""}`}
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="flex items-center gap-2 font-display text-lg font-bold text-white">
                  <Icon name="ticket" className="h-5 w-5" /> CineBook
                </span>
                <span className="font-display text-3xl font-bold text-white">{formatPrice(amount)}</span>
              </div>
              <div>
                {message && <p className="mb-3 line-clamp-2 max-w-sm text-sm italic text-white/80">“{message}”</p>}
                <p className="text-xs uppercase tracking-wider text-white/60">For</p>
                <p className="text-lg font-semibold text-white">{recipientName || "Someone special"}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Card design">
            {THEMES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={theme === t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm transition ${theme === t.id ? "border-brand-500 bg-brand-500/10 text-white" : "border-white/10 text-gray-400 hover:text-white"}`}
              >
                <span className={`h-6 w-6 shrink-0 rounded-md bg-gradient-to-br ${t.className}`} aria-hidden="true" />
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Designer */}
        <div className="card space-y-5 p-5 sm:p-6">
          <fieldset>
            <legend className="label">Amount</legend>
            <div className="grid grid-cols-4 gap-2">
              {AMOUNTS.map((v) => (
                <button key={v} type="button" onClick={() => setAmount(v)} aria-pressed={amount === v} className={`chip justify-center ${amount === v ? "chip-active" : ""}`}>
                  {formatPrice(v)}
                </button>
              ))}
            </div>
          </fieldset>
          <Field id="g-name" label="Recipient's name">
            <input id="g-name" className="input" maxLength={40} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
          </Field>
          <Field id="g-message" label="Message">
            <textarea id="g-message" rows="3" maxLength={120} className="input" value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <button type="button" className="btn-primary w-full" disabled>
            <Icon name="gift" className="h-4 w-4" /> Gift cards coming soon
          </button>
          <p className="text-center text-xs text-gray-500">
            Want to treat someone today? <Link to="/movies" className="font-semibold text-brand-300 hover:text-brand-200">Book tickets together</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
