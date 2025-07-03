# LiveStore Mobile Schema Issue Reproduction

This monorepo demonstrates a schema-related issue in LiveStore when using nested providers on React Native (Expo), which we were unable to reproduce on web.

## The Issue

### What's happening?
When using nested LiveStore providers with different schemas in a React Native app:

1. **During boot** ✅ - Everything works perfectly:
   - Tables are created successfully
   - Initial data is inserted without issues
   - Queries work as expected

2. **After boot** ❌ - The same operations fail:
   - Error: `SQLiteErrorException: no such table: workspaces`
   - This happens when users interact with the app (e.g., clicking buttons)
   - The exact same code that worked during boot now fails

### Why is this confusing?
- The **same store ID** is used in both scenarios
- The **same code** is executed during boot and runtime
- It only affects **runtime operations** after the initial boot phase

### Platform Differences
- **Mobile (Expo)** ❌: Reproduces the issue consistently
- **Web (Vite)** ✅: Works perfectly - we couldn't reproduce the issue

## Quick Start

```bash
# Install dependencies
pnpm install

# Run the mobile app (reproduces issue)
cd packages/mobile-app
pnpm start
# Press 'i' for iOS or 'a' for Android

# Run the web app (works correctly)
cd packages/web-app
pnpm dev
# Open http://localhost:60001
```

## Understanding the Architecture

### Nested Providers Pattern
Our app uses two separate LiveStore instances:

1. **User Store**: Manages workspaces
   - Table: `workspaces`
   - Schema: `userSchema`
   
2. **Workspace Store**: Manages items within each workspace
   - Table: `items`
   - Schema: `workspaceSchema`

```
App
├── UserProvider (LiveStore #1)
│   └── WorkspaceProvider (LiveStore #2)
│       └── Your UI Components
```

### The Mobile Issue in Detail

Here's what happens in the mobile app:

```typescript
// This WORKS during boot ✅
boot={(store) => {
  store.commit(userEvents.workspaceCreated({
    id: "workspace-1",
    name: "My Workspace"
  }));
  // Success! Workspace created
}}

// This FAILS at runtime ❌
const handleCreateWorkspace = () => {
  store.commit(userEvents.workspaceCreated({
    id: "workspace-2", 
    name: "Another Workspace"
  }));
  // Error: no such table: workspaces
};
```

## Project Structure

```
├── packages/
│   ├── mobile-app/    # React Native app that reproduces the issue
│   │   ├── App.tsx    # Main app with nested providers
│   │   ├── user-store.ts      # User schema (workspaces)
│   │   └── workspace-store.ts  # Workspace schema (items)
│   │
│   └── web-app/       # Web app where issue doesn't occur
│       └── src/
│           ├── Root.tsx        # Working implementation
│           ├── user-store.ts   # Same schemas as mobile
│           └── workspace-store.ts
```

## Reproduction Steps (Mobile)

1. **Start the app** - You'll see an initial workspace created during boot
2. **Click "Create Workspace"** - This will fail with "no such table" error
3. **Check the logs** - You'll see the same store ID but different behavior

### Expected Logs

```
✅ Boot time (works):
LOG  === USER STORE BOOT ===
LOG  User store ID: USER_STORE_debug-123
LOG  USER STORE: Creating workspace: {"id": "workspace-1", "name": "Personal"}
LOG  ✅ Initial workspace created!

❌ Runtime (fails):
LOG  === Creating new workspace ===
LOG  User store ID: USER_STORE_debug-123  // Same ID!
ERROR  SQLiteErrorException: Error code 1: no such table: workspaces
```

## Why Web Works But Mobile Doesn't

The web implementation uses a different adapter (`@livestore/adapter-web`) which handles schema initialization differently than the Expo adapter (`@livestore/adapter-expo`).

### Our Solution for Web
On web, we implemented separate workers for each schema:
- `livestore.worker.ts` - For user schema
- `workspace.worker.ts` - For workspace schema

This ensures complete schema isolation and prevents conflicts.

### Mobile Still Needs Investigation
The Expo adapter appears to have issues with:
- Schema persistence between boot and runtime
- Multiple stores with different schemas
- The dual database architecture (persistent + in-memory)

## Key Files to Review

### Mobile App (Issue)
- `packages/mobile-app/App.tsx` - See the nested providers setup
- Look for `USER STORE BOOT` and `WORKSPACE SELECTOR` sections

### Web App (Working)
- `packages/web-app/src/Root.tsx` - Compare the implementation
- Note the separate worker files for schema isolation

## Next Steps

This reproduction demonstrates that:
1. The issue is specific to the React Native/Expo adapter
2. The same architecture works perfectly on web
3. The problem appears to be related to how schemas are persisted/loaded

The mobile app serves as a minimal reproduction case for debugging the Expo adapter's schema handling.