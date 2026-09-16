# Contributing to FixGrid

Thank you for your interest in contributing to **FixGrid**! FixGrid is an open-source trust and warranty platform supporting the Right-to-Repair movement, hardware circular economy, and transparent repair diagnostics.

We welcome contributions from developers, designers, technical writers, and domain specialists of all skill levels.

---

## Code of Conduct

All contributors and maintainers are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md) to ensure an inclusive, welcoming, and harassment-free environment for everyone.

---

## Getting Started

### Prerequisites

Make sure you have the following installed locally:
- **Node.js**: `v20.x` or later (LTS recommended)
- **npm**: `v10.x` or later
- **Git**: For version control

### Repository Setup

1. **Fork the Repository:**
   Click the **Fork** button at the top right of [github.com/rishitjindal2011/FixGrid](https://github.com/rishitjindal2011/FixGrid).

2. **Clone Your Fork:**
   ```bash
   git clone https://github.com/<your-username>/FixGrid.git
   cd FixGrid
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Environment Setup:**
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   Fill in any required Supabase or public URL values for local testing.

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Monorepo Architecture

FixGrid is organized into targeted sub-applications:
- **`/` (Root):** Consumer-facing repair discovery platform & programmatic SEO directory.
- **`/admin`:** Platform administration console (tenant management, claim verification).
- **`/seo-admin`:** CMS & programmatic landing page dashboard.
- **`/hiring-fixgrid`:** Repair technician job board portal.
- **`/parts-fixgrid`:** OEM & third-party component catalogue.

When working on a sub-app, navigate to its directory or run its specific dev port (e.g. `cd admin && npm run dev`).

---

## Development Workflow

### 1. Create a Branch

Create a descriptive feature branch starting from `main`:
```bash
git checkout -b feat/your-feature-name
# or for bug fixes:
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- Keep changes focused and atomic.
- Maintain existing coding conventions and file structure.
- Adhere to TypeScript strict mode — avoid `any` where possible.

### 3. Verification & Quality Checks

Before committing, ensure all automated checks pass cleanly:

```bash
# 1. Typecheck the codebase:
npm run typecheck

# 2. Lint code style:
npm run lint

# 3. Test production build:
npm run build
```

### 4. Commit Guidelines

We encourage [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: add verified warranty status badge to expert card`
- `fix: correct mobile menu clipping on iOS Safari`
- `docs: update API documentation for webhook handlers`
- `refactor: clean up Supabase query in claims service`
- `chore: update npm dependencies`

---

## Submitting a Pull Request (PR)

1. **Push to Your Fork:**
   ```bash
   git push origin feat/your-feature-name
   ```
2. **Open a Pull Request:**
   Go to [github.com/rishitjindal2011/FixGrid/pulls](https://github.com/rishitjindal2011/FixGrid/pulls) and click **New Pull Request**.
3. **Fill out the PR Template:**
   - Summarize the change and motivation.
   - Reference any related issues (`Fixes #12`).
   - Include screenshots or recordings for UI updates.
4. **Continuous Integration (CI):**
   - Ensure GitHub Actions checks (CodeQL, OpenSSF Scorecard, and build verification) pass.

---

## Ways to Contribute

Not all contributions require writing backend code! You can help by:
- **Translations / i18n:** Adding or refining localized strings in `/messages`.
- **Documentation:** Improving setup guides, architecture documentation, or API docs.
- **UI / Accessibility (a11y):** Enhancing contrast, screen reader support, or mobile layout responsiveness.
- **Reporting Issues:** Submitting clear, reproducible bug reports via GitHub Issues.

---

## Security Vulnerabilities

If you discover a security vulnerability, **please do not open a public issue**. Refer to our [Security Policy](SECURITY.md) to report it privately and securely.
