# Cuberto — local React frontend capture

Node.js 22+ required.

```bash
npm ci
npm run dev
```

Open http://127.0.0.1:5173. `npm run build` creates dist; `npm run preview` serves it on port 4173.

Read **docs/ENGINEERING-GUIDE.md** for the four-step workflow, capture automation, computed CSS export, motion measurement, secure local asset/worker setup and verification limits. **docs/assets.json** records asset retrieval outcomes.

This is a React host for captured public frontend markup and native Astro modules, not recovered original React source. Only routes captured in src/route-loaders.js are local. Other links remain upstream. Browser layout/motion fidelity has not been verified. No production backend is included.
