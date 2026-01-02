# Contributing to Gr8hopper

Thank you for considering contributing to Gr8hopper! This document outlines how to contribute effectively.

## Development Setup

1. **Fork and clone** the repository
2. **Install dependencies**: `npm install`
3. **Run locally**: `npm run dev:node` (Node.js) or `npm run dev` (Cloudflare Workers)

## Code Style

- TypeScript with strict mode enabled
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Keep functions small and focused

## Making Changes

### Before You Start

- Check existing issues and PRs to avoid duplicate work
- For significant changes, open an issue first to discuss the approach

### Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run type checking: `npx tsc --noEmit`
4. Test locally with both Node.js and Cloudflare Workers dev servers
5. Commit with clear messages

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add support for regex-based route matching
fix: handle empty params array correctly
docs: update deployment instructions
refactor: simplify template substitution logic
```

## Pull Requests

1. Update documentation if needed
2. Ensure TypeScript compiles without errors
3. Test on both platforms (Node.js and CF Workers) if possible
4. Describe what your PR does and why

## Project Structure

```
src/
├── index.ts           # CF Workers entry - routes requests
├── server.ts          # Node.js entry - HTTP server setup
├── types.ts           # Shared TypeScript interfaces
├── handlers/          # Request handlers
├── storage/           # Storage adapters (KV, JSON file)
└── middleware/        # Auth and other middleware
```

## Adding Features

### New Storage Adapter

1. Implement the `StorageAdapter` interface from `src/storage/adapter.ts`
2. Add the adapter to `src/storage/`
3. Update the storage selection logic in entry points

### New Middleware

1. Create middleware in `src/middleware/`
2. Follow Hono middleware conventions
3. Apply to appropriate routes in entry points

## Questions?

Open an issue for questions or discussions about contributing.
