// combos.js
// Snack combos offered at every theatre. The server owns these prices;
// checkout reads them from GET /api/snacks/combos.

const COMBOS = [
  {
    id: "combo-1",
    name: "Movie Night Duo",
    description: "Jumbo butter popcorn + 2 large cold drinks",
    originalPrice: 460,
    comboPrice: 380,
    badge: "Best seller",
  },
  {
    id: "combo-2",
    name: "Gourmet Feast",
    description: "XL popcorn + loaded cheese nachos + 2 large cold drinks",
    originalPrice: 680,
    comboPrice: 550,
    badge: "Save ₹130",
  },
];

const findCombo = (id) => COMBOS.find((c) => c.id === id) || null;

module.exports = { COMBOS, findCombo };
