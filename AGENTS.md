# ai-avatar-course

Landing page for the "AI Avatar Course" — a purely static website (HTML/CSS/JS) served as-is via GitHub Pages.

## Cursor Cloud specific instructions

### Project type
- This is a **static site with no build system, no backend, and no dependencies**. There is no `package.json`, `requirements.txt`, Makefile, or bundler config — the HTML files are served directly.
- All JavaScript is inline inside the HTML (primarily `index.html`); there are no external JS/CSS build steps.
- Because there are no dependencies, the environment update script is a no-op. Nothing needs to be installed beyond the preinstalled `python3` (3.12) / `node` (22).

### Running it (development)
- Serve the repository root with any static file server and open it in a browser. `python3` is preinstalled, so the simplest option is: `python3 -m http.server 8000` run from the repo root (`/workspace`), then open `http://localhost:8000/`.
- Pages: `index.html` (main landing page), `checklist.html`, `success.html`, `privacy.html`, `terms.html`. Static assets live at the repo root and in `avatars/`.

### Lint / test / build
- There are **no lint, test, or build commands** in this repo. "Building" is just serving the files; there is nothing to compile.

### Non-obvious notes
- Core interactive features (all client-side, inline JS in `index.html`): a **RU/UA language switcher** (i18n driven by `data-i18n` attributes; the chosen language is persisted in `localStorage` and can be forced via the `?lang=ua` URL param), a **FAQ accordion**, an exit-intent popup, and hero/video animations.
- The purchase call-to-action buttons ("Получить за $49") link to an **external Stripe checkout** (`buy.stripe.com`). These are external links — they open a third-party page and are not exercisable in an offline/local environment, but the links themselves are valid.
- The page defaults to Russian (`ru`); the UA translation swaps text for elements carrying `data-i18n`.
