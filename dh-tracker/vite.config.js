import { defineConfig } from 'vite';

// Deployed to GitHub Pages as a project site (fthrgasp.github.io/dh-companion/,
// not the domain root), so asset URLs need this prefix or the built JS/CSS/
// font files 404 in production. `npm run dev` is unaffected — Vite only
// applies `base` to the production build, not the dev server.
export default defineConfig({
  base: '/dh-companion/dh-tracker'
});
