# Cuberto frontend capture and local reconstruction

## Delivery contract

This is a React/Vite host around captured production DOM, CSS and browser modules, not the recovered Cuberto repository or a hand-translated React component library. Public pages directly linked from the captured homepage are included when their requests succeed. Deeper routes, CMS/backend services, forms, private source maps and server-side behavior are not recovered. Original intellectual-property ownership remains unchanged; this package grants no commercial redistribution rights. See `assets.json` for request outcomes. A successful build does not establish pixel-perfect or motion-perfect equivalence. Browser visual QA was unavailable in the delivery environment.

## STEP 1: CHROMIUM EXTENSION LAYER & COMPUTED CSS ISOLATION

1. Open the target in Opera GX (Chromium), Chrome or Edge. Use the same browser version, OS font rasterizer, browser zoom (100%), viewport dimensions and DPR for source and local comparisons. In DevTools Device Toolbar set an explicit 1440×1000 viewport at DPR 1, then repeat at 390×844 and the site's actual breakpoint boundaries. Disable extensions that modify content.
2. Network: enable Preserve log and Disable cache. Reload. Wait for fonts and images; record scroll position, pointer coordinates, hover/focus state, reduced-motion preference and video time. Capture screenshots before scrolling and after lazy sections load.
3. Elements: select the real page root, not an arbitrary visually similar container. Inspect ancestors up to `html` for font size, custom properties, width, overflow, smooth-scroll transforms and containment. Right-click the root → Copy → Copy outerHTML. Preserve SVG IDs, data attributes, classes, ARIA attributes and hidden menu/modal markup.
4. CSS Used: use the author repository https://github.com/painty/CSS-Used-ChromeExt to reach its extension listing. After installation reopen DevTools with F12, select the root in Elements, activate the CSS Used panel, and copy/save the generated matching rules for the selected node and its descendants. Excompt: install from the listing linked by https://excompt.com/, activate its element selection workflow, select the desired container, and export HTML/React/Vue as appropriate. Its advertised Tailwind conversion is a reconstruction rather than an exact preserved CSS cascade; compare against the computed snapshot before using it. Exact Excompt control labels were not exercised here. An extension is optional: the included Puppeteer capture exports a complete computed tree without it.
5. Use Elements → Computed with Show all. Record grid-template-columns/rows, gap, align/justify properties, flex basis/shrink/grow, box sizing, margins, padding, line height, letter spacing, font variations, transforms and transform origin. Layout overlays expose grid tracks and flex alignment. Preserve decimal values. `getBoundingClientRect()` reports painted/transformed fractional geometry; `offsetWidth` rounds and is insufficient.
6. Run the console exporter below. It includes all computed properties and pseudo-elements. The included capture script additionally records CDP paint order/DOM rectangles. A snapshot does not include JS listeners, a canvas command stream, closed shadow roots, or the native input state.
7. Do not replace responsive CSS with thousands of frozen pixel inline styles. Keep authored matched rules, cascade layers, variables, media/container queries, keyframes, font-face and pseudo-elements. Prune only after recording all routes, breakpoints, hover/focus states, menus and scroll states. CSS coverage from one session is evidence of usage during that session, not proof a rule is unnecessary.

```js
await document.fonts.ready;
const root = document.querySelector('main') || document.body;
const styles = el => Object.fromEntries([...getComputedStyle(el)]
  .map(k => [k, getComputedStyle(el).getPropertyValue(k)]));
const tree = [root, ...root.querySelectorAll('*')].map((el, index) => {
  const r = el.getBoundingClientRect();
  const pseudo = p => {
    const s = getComputedStyle(el, p);
    return Object.fromEntries([...s].map(k => [k, s.getPropertyValue(k)]));
  };
  return { index, tag: el.tagName, class: el.getAttribute('class'),
    rect: {x:r.x,y:r.y,width:r.width,height:r.height}, style: styles(el),
    before: pseudo('::before'), after: pseudo('::after') };
});
copy(JSON.stringify({viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},tree}));
```

Typography must use the exact loaded font files, weight, language and font-feature settings. A fallback font changes line breaks even when every other dimension matches. Computed styles cannot reconstruct breakpoint logic from one viewport.

## STEP 2: JS TIMELINE PIPELINE & DE-MINIFICATION LOGIC

Network and Sources are separate DevTools panels. Network → JS lists downloaded responses; open a response in Sources, click `{}` to pretty-print. Enable JavaScript source maps and inspect a map only when the server publicly supplies it. Pretty printing restores indentation, not original identifiers, comments, module boundaries or source code.

The fetched homepage uses `/_astro/` ES modules. Search all loaded Sources for `ScrollTrigger`, `gsap`, `registerPlugin`, `requestAnimationFrame`, `IntersectionObserver`, `astro:page-load`, `createTimeline`, `WebGLRenderingContext`, `getContext`, and `new Worker`. Framer Motion must be demonstrated by actual imports/signatures; do not assume it is used. Follow ES module imports recursively, preserving their relative path relationships. Network Initiator identifies dynamically loaded chunks and shaders/media. DevTools Event Listener Breakpoints → Animation, Mouse and Control help find the actual handler; pause on the native callback and inspect its scope. Performance recordings reveal frame activity; they do not recreate source timelines.

Format copied bundles separately:

```bash
npm run pretty
```

Keep pristine bundles for comparison; formatting is not a semantic transformation. Do not inject a second GSAP instance over the original. If the original exposes GSAP/ScrollTrigger globally, run:

```js
const st = window.ScrollTrigger || window.gsap?.plugins?.ScrollTrigger;
const triggers = st?.getAll().map(t => ({
  id:t.vars.id, start:t.start, end:t.end, progress:t.progress,
  scrub:t.vars.scrub, pin:!!t.pin,
  trigger:t.trigger?.getAttribute('class'),
  duration:t.animation?.duration(),
  tweens:t.animation?.getChildren?.(true,true,true).map(a=>({
    start:a.startTime(), duration:a.duration(), vars:a.vars,
    targets:a.targets?.().map(n=>n.id || n.getAttribute?.('class'))
  }))
}));
console.log(triggers);
```

These objects contain functions, DOM nodes and circular references: inspect and deliberately normalize them rather than blindly JSON.stringify-ing vars. Bundled GSAP often is NOT on `window`; absent globals do not mean absent animation. Set a breakpoint immediately after module-local registration/creation and use its scoped instance. Runtime instrumentation must happen before the first animation is constructed; intercepting a global property does not intercept lexical ES imports. Do not claim a universal interception snippet can recover arbitrary custom timelines.

For a controlled application where you own the GSAP instance, an early instrumentation hook can log trigger construction:

```js
export function instrumentScrollTrigger(ScrollTrigger, sink) {
  const original = ScrollTrigger.create;
  ScrollTrigger.create = function(vars, animation) {
    const instance = original.call(this, vars, animation);
    sink({instance, vars, animation});
    return instance;
  };
  return () => { ScrollTrigger.create = original; };
}
```

This only observes calls through that method after installation. Plugin-internal creation paths and earlier triggers may bypass it. Restore hooks after measurement. Never attach original and reconstructed handlers to the same nodes.

`src/motion-template.js` supplies an opt-in GSAP binding and teardown template. Example measured-spec shape (illustrative values, not extracted Cuberto values):

```js
const dispose = bindMotion(root, [{
  trigger:'.section', target:'.visual',
  start:'top bottom', end:'bottom top', scrub:0.6, pin:false,
  from:{y:80, opacity:0}, to:{y:0, opacity:1, ease:'none'}
}]);
// React effect cleanup:
return dispose;
```

Record nested timeline offsets, durations, repeats/yoyo, immediateRender, stagger, easing parameters, pin spacing, scroller and refresh behavior. Numerical start/end measurements are viewport-specific; reconstruct their semantic expressions where possible. Smooth-scroll instances require their actual integration contract, potentially scrollerProxy, not an assumed native window scroller. Refresh after fonts/media decode and layout changes; rebuild on responsive conditions with matchMedia.

For Canvas/WebGL, save shaders, textures, model buffers, worker modules and renderer dependencies. DOM serialization does not contain framebuffer pixels or draw calls. A canvas PNG is a single raster frame and cannot preserve interaction. WebGL readback may fail or return cleared buffers without preserveDrawingBuffer, and cross-origin taint restricts exports. Reconstruct or replay the authorized renderer with identical camera, dimensions, DPR, timing and input uniforms.

## STEP 3: PUPPETEER/PLAYWRIGHT RUNTIME SERIALIZATION SCRIPT

The complete implementation is `scripts/capture.mjs`, using Puppeteer. It installs request interception BEFORE navigation, blocks a bounded analytics hostname list, records response bodies, waits for strict network idleness with timeout reporting, scrolls incrementally with a document-height stabilization check, returns to the top, waits for font/image decode and two paint frames, and exports HTML, computed styles, CDP snapshot, full-page PNG and URL-to-file manifest.

```bash
npm install
npx puppeteer browsers install chrome
npm run capture -- https://cuberto.com ./capture/desktop
```

On a Linux host missing Chromium system dependencies, install the dependencies appropriate for the distribution or use Puppeteer's supported browser-install dependency option with administrator rights. Run without disabling Chromium's security sandbox on a normal host. The script intentionally does not use `--disable-web-security`.

`networkidle0` means zero active network connections for at least 500 ms, not permanent network silence. Video streaming, polling and websockets can prevent a successful strict wait. The script uses the equivalent zero-concurrency wait and reports bounded timeouts. Network interception cannot ensure that every possible asset is loaded: only assets requested during exercised states are captured. Interact with menus, hover cards and play controls in additional scripted passes to capture their states. Video response bodies may be partial byte ranges; manifest response headers expose this. Obtain complete media files separately where authorized.

`painted.html` retains original URL references. The manifest maps them to hashed files; it is an archive, not an automatically executable rewritten clone. CSS url(), imports, srcset, script-relative URLs, Worker URLs and runtime fetch strings need syntax-aware rewriting. This project's delivered local files instead preserve original same-origin paths under public/, avoiding those import-path changes. CSS/JS dynamic paths still need investigation.

Use the PNG as a measurement artifact; do not confuse a static picture of the entire page with its real animated states. Compare viewport screenshots at fixed scroll/frame/pointer states, not a stitched full-page image of continuously animating elements.

## STEP 4: ISOLATED DEVELOPMENT RUNTIME PLATFORM

Prerequisites: Node 22+ and npm, VS Code, Chromium-based browser. Unzip, open the project folder (the one containing package.json), and run:

```bash
npm ci
npm run dev
# open http://127.0.0.1:5173
npm run build
npm run preview
# production build preview: http://127.0.0.1:4173
```

Dependencies are declared in package.json and locked in package-lock.json. node_modules is excluded. Puppeteer browser installation is needed only for capture. React mounts the preserved shell before appending native module entrypoints; Astro navigation is excluded to avoid navigating into unrecorded page state. Captured route links use full-page reloads, so modules initialize against the next route's DOM. External links retain their upstream destination. There is no recovered production contact backend.

Exact Vite configuration is included in vite.config.js. All mirrored CSS, font, image, media and browser-module assets retain root-relative routing in public/. Build copies these files without re-bundling third-party production modules. Avoid importing the original Astro entrypoints into Vite's source dependency graph: preserved relative imports are designed to run as native browser modules.

CORS is a response-header policy, not something HTTP or HTTPS bypasses. Serving from 127.0.0.1 makes loopback a potentially trustworthy origin in modern browsers; it does not grant access to arbitrary origins. Use downloaded same-origin files first. For authorized remaining upstream requests, request `/upstream/path` in development: the fixed-target Vite proxy forwards server-side to Cuberto. `changeOrigin` changes the upstream Host header; it does not recover missing permissions or fix arbitrary WebGL media. The proxy is development-only and deliberately is not an open proxy. Do not set `cors:true`, disable web security or use browser security-bypass flags. A public production proxy requires separate deployment, authorization, bounded paths, timeouts, response-size limits and caching.

Module workers:

```js
const worker = new Worker(new URL('./render.worker.js', import.meta.url), {type:'module'});
// Or a captured worker preserved in public/:
const capturedWorker = new Worker('/assets/workers/render.js', {type:'module'});
```

Create a worker only if that file exists and its dependencies are captured. Keep script MIME types correct; a missing worker returning the SPA HTML fallback produces a MIME error, not a CORS error. Worklet scripts similarly require valid module paths. WASM streaming requires application/wasm. Cross-origin isolated SharedArrayBuffer use additionally requires COOP/COEP on all appropriate resources; do not enable isolation blindly because external media can then be blocked. For a fully same-origin renderer requiring it, add these server/preview headers:

```js
headers: {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp'
}
```

If HTTPS is necessary for a specific API rather than loopback trust, create locally trusted certificates with mkcert, then add `https:{key:readFileSync('./certs/127.0.0.1-key.pem'),cert:readFileSync('./certs/127.0.0.1.pem')}` to Vite server options. Keep private keys out of source archives. That changes the URL to https://127.0.0.1:5173 and does not override CORS.

### Verification gate

Validate each captured route at each target viewport, with identical DPR, fonts, pointer and scroll/video states. Record 404s, failed module requests, console errors and broken local navigation. Test menu open/close, FAQ keyboard behavior, project hover/playback, showreel, reduced motion and resize. Compare screenshot differences and measured bounding rectangles. Check pin regions at start, mid-scrub and end; repeat with high- and low-refresh displays. Explicitly track differences before describing any result as pixel-perfect. This delivery passed its build check only; no pixel or motion equivalence is certified.

### Primary references

- https://github.com/painty/CSS-Used-ChromeExt
- https://excompt.com/
- https://developer.chrome.com/docs/devtools/css/reference
- https://pptr.dev/api/puppeteer.page.waitfornetworkidle
- https://pptr.dev/api/puppeteer.puppeteerlifecycleevent
- https://vite.dev/config/server-options
- https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- Live source: https://cuberto.com (captured October 14, 2026 UTC)
