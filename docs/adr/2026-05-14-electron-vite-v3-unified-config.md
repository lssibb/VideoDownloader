# ADR-001: Unified electron-vite v3 Configuration

**Date**: 2026-05-14
**Status**: Accepted

## Context

During Phase 1 skeleton implementation, the initial plan assumed `electron-vite` v3 supported separate config files (`vite.main.config.ts`, `vite.preload.config.ts`, `vite.renderer.config.ts`) with helpers like `getBuildConfig`, `getBuildDefine`, `external`, and `pluginHotRestart` (common in v2 patterns).

Upon installation and inspection of the actual `electron-vite` v3.1.0 API, these exports did not exist. The available exports were:

- `defineConfig`, `mergeConfig`
- `externalizeDepsPlugin`
- `bytecodePlugin`, `swcPlugin`

## Decision

Use a **single unified config file** (`electron.vite.config.ts`) with `main`, `preload`, and `renderer` sections, which is the native v3 configuration pattern.

This replaces the planned three separate config files and simplifies build scripts from:

```json
"build": "npm run build:main && npm run build:preload && npm run build:renderer"
```

To:

```json
"build": "electron-vite build"
```

## Consequences

- **Simpler maintenance**: One config file instead of three.
- **Aligned with upstream**: Uses the officially supported v3 API.
- **Path aliases**: Resolved consistently per section (`main`, `preload`, `renderer`) using `resolve()`.
- **Build output**: `out/main/`, `out/preload/`, `out/renderer/` — matching `electron-builder` expectations.
