#!/usr/bin/env node
// Measures WCAG contrast ratios from the real design tokens in src/index.css,
// for every colour theme. Run from client/: node scripts/contrast-report.js
// Exits non-zero if any checked pair is below its WCAG AA threshold.

const fs = require("fs");
const path = require("path");

const css = fs.readFileSync(path.join(__dirname, "../src/index.css"), "utf8");

// Collect "--name: r g b;" declarations per selector block.
function blockVars(selectorRe) {
  const m = css.match(new RegExp(`${selectorRe}[^{]*\\{([^}]*)\\}`));
  if (!m) return {};
  const vars = {};
  for (const [, k, v] of m[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[k] = v.trim();
  return vars;
}
const base = blockVars(":root");
const THEMES = { blue: "Electric Blue", violet: "Royal Violet", crimson: "Crimson Red", emerald: "Emerald Green", amber: "Amber Gold" };

const rgbOf = (v) => {
  const m = String(v).match(/(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+))?/);
  return m ? { c: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null;
};
const blend = (fg, bg) => fg.c.map((x, i) => Math.round(x * fg.a + bg[i] * (1 - fg.a)));
const lum = (c) => {
  const [r, g, b] = c.map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const surfaces = ["surface-canvas", "surface-sunken", "surface-raised", "surface-overlay"];
const results = [];
let failures = 0;
const check = (theme, what, fg, bg, min) => {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failures += 1;
  results.push({ theme, what, ratio: r.toFixed(2), min, ok });
};

Object.entries(THEMES).forEach(([key, name]) => {
  const vars = { ...base, ...blockVars(`:root\\[data-color-theme="${key}"\\]`) };
  const get = (k) => rgbOf(vars[k]);
  // Text roles on every surface (AA body text: 4.5:1).
  if (key === "blue") {
    ["fg-strong", "fg-body", "fg-secondary", "fg-muted", "fg-subtle"].forEach((fg) =>
      surfaces.forEach((s) => check("all themes", `${fg} on ${s}`, get(fg).c, get(s).c, 4.5))
    );
    // Control borders (non-text, WCAG 1.4.11: 3:1) on the sunken input background.
    surfaces.forEach((s) => {
      const bg = get(s).c;
      check("all themes", `line-control (input border) on ${s}`, blend(get("line-control"), bg), bg, 3);
    });
  }
  check(name, "on-brand text on brand-solid", get("on-brand").c, get("brand-solid").c, 4.5);
  surfaces.forEach((s) => check(name, `brand-300 link text on ${s}`, get("brand-300").c, get(s).c, 4.5));
  // Focus ring (brand-400 outline) against the page: non-text 3:1.
  surfaces.forEach((s) => check(name, `brand-400 focus ring on ${s}`, get("brand-400").c, get(s).c, 3));
});

const width = Math.max(...results.map((r) => r.what.length));
results.forEach((r) => console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.theme.padEnd(14)} ${r.what.padEnd(width)}  ${r.ratio}:1 (needs ${r.min}:1)`));
console.log(`\n${results.length - failures}/${results.length} pairs meet WCAG AA.`);
process.exit(failures ? 1 : 0);
