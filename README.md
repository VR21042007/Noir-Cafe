# NOIR — Café for Two

Shareable Vite + React concept website with a real-time 3D scene (three.js via @react-three/fiber).

A romantic, light café: sage and cream linen, bottle green and apricot, sunlight through a lace curtain, a gold-rimmed porcelain cup, rose petals and a candle. A copper gooseneck kettle pours into the cup on the first screen; scrolling through "The pour" draws a latte-art heart, and the menu swaps the drink in 3D.

Code map:
- `src/App.jsx` — page content and the scroll state that drives the scene
- `src/scene/CoffeeScene.jsx` — cup, kettle pour, glass, latte-art shader, steam, candle, petals, lighting, camera rig
- `src/scene/stage.js` — shared scroll/drink state and drink colours

## Run it
1. Install Node.js.
2. Extract this ZIP.
3. Open a terminal in the extracted `noir-cafe-share` folder.
4. Run `npm install`
5. Run `npm run dev`
6. Open the local URL shown in the terminal, usually http://localhost:5173.

Images and fonts load from the internet. Update placeholder address/contact information before using this as a real business site.
