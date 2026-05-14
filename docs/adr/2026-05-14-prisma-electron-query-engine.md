# ADR-003: Prisma Query Engine Binary Handling in Electron Production

**Date**: 2026-05-14
**Status**: Accepted

## Context

Prisma Client relies on a native Rust query engine binary (`libquery_engine-*.so.node` / `.dll.node`) to execute database queries. In a standard Node.js application, this binary is loaded from `node_modules/.prisma/client/`.

Electron packages applications into `app.asar`, a read-only archive. Native binaries inside `app.asar` cannot be loaded by Prisma's Rust engine, causing runtime errors in production builds.

Additionally, the development environment is Linux (Codespace), but the production target is Windows. Prisma's `prisma generate` command, by default, only generates the query engine for the current platform. Without explicit configuration, the Windows query engine would be missing from the production build.

## Decision

1. **Multi-platform binary targets**: Update `prisma/schema.prisma` to specify `binaryTargets = ["native", "windows"]`, ensuring both Linux (dev) and Windows (production) query engines are generated.

2. **asarUnpack**: Configure `electron-builder.yml` to unpack Prisma's `.node` binaries from `app.asar` so they remain as regular files on disk at runtime:

```yaml
asarUnpack:
  - 'node_modules/.prisma/client/*.node'
  - 'node_modules/@prisma/client/**/*.node'
```

## Consequences

- **Production builds work**: Prisma can locate and load the query engine binary in the packaged Windows app.
- **Cross-platform development**: Developers on Linux can still run the app locally while the packaged app targets Windows.
- **Larger bundle size**: Including multiple query engine binaries increases the final package size by ~10-20MB per platform.
- **Build requirement**: `prisma generate` must be run after any schema change, and before `electron-builder` packaging.
