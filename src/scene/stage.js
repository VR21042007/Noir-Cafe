// Shared, mutable scroll/interaction state. The DOM writes it, the 3D scene reads it every frame.
// Kept outside React state so scrolling never triggers re-renders.
export const stage = {
  s: 0, // 0 = hero, 1 = the pour (top-down), 2 = menu
  pour: 0, // 0..1 progress of the latte-art pour
  drink: 0, // index into DRINKS
  pointer: { x: 0, y: 0 },
  anchors: { hero: null, story: null, menu: null },
  anchorFrames: {},
  reducedMotion: false,
};

// dust: flecks sprinkled over the top (dried rose petals on the latte)
export const DRINKS = [
  { name: "Velvet Cappuccino", vessel: "cup", crema: "#7a4320", rim: "#3d1d0c", foam: "#f6ece0", dust: 0, dustColor: "#b8384f", art: 1 },
  { name: "Rose Cardamom Latte", vessel: "cup", crema: "#a8644a", rim: "#6a3424", foam: "#f4cdd3", dust: 1, dustColor: "#b8384f", art: 0.9 },
  { name: "Golden Cold Brew", vessel: "glass", crema: "#7a4320", rim: "#3d1d0c", foam: "#f6ece0", dust: 0, dustColor: "#b8384f", art: 1 },
];
