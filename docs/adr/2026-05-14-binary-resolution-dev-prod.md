# ADR-002: Platform-Aware Binary Resolution for Dev and Production

**Date**: 2026-05-14
**Status**: Accepted

## Context

The application targets Windows exclusively for production (portable `.exe`), bundling `yt-dlp.exe` and `ffmpeg.exe` via `electron-builder` `extraResources`. However, development takes place in a Linux environment (Codespace), where Windows `.exe` binaries cannot execute.

We needed a strategy to:
1. In production: reliably locate bundled binaries in `resources/bin/`.
2. In development: fall back to system PATH when bundled Windows binaries are unavailable.

## Decision

Implement a `getBinaryPath(base: string)` utility that resolves binaries differently based on environment:

1. **Production (`app.isPackaged`)**: Use `path.join(process.resourcesPath, 'bin', base + '.exe')`.
2. **Development**: First check `resources/bin/` in the project root (for local testing with copied binaries), then fall back to bare binary name (`yt-dlp`, `ffmpeg`) which resolves via system PATH.

Binary extension is automatically appended for Windows (`process.platform === 'win32'`) and omitted for Linux/macOS.

## Consequences

- **Local development works**: Developers on Linux/macOS can install `yt-dlp` via package manager or pip and test the full download flow without Windows binaries.
- **Production behavior is predictable**: Always uses the bundled `.exe` files shipped with the portable build.
- **No cross-platform build complexity**: `electron-builder` only needs to package Windows binaries; no multi-platform matrix required.
- **Risk**: If a developer on Windows forgets to place binaries in `resources/bin/`, the app will silently fall back to PATH, potentially using an incompatible version. Mitigated by CI/build verification.
