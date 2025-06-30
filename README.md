# LiveStore Bug Reproduction

This is a minimal reproduction project for the LiveStore "no such table" bug when using nested providers.

## Issue Summary

When using LiveStore with the Expo adapter, we encounter a "no such table: workspaces" error during user-triggered operations, even though the same operations work perfectly during the boot phase. This reproduction now includes **nested providers** to demonstrate the full workspace pattern where each workspace has its own isolated store.

## Setup Instructions

1. **Install dependencies**:
   ```bash
   cd packages/livestore-repro-issue
   pnpm install
   ```

2. **Run the app**:
   ```bash
   pnpm start
   # Then press 'i' for iOS or 'a' for Android
   ```

## Expected Behavior vs Actual Behavior

### ✅ What Works (Boot Time)
- During the `boot` callback in `LiveStoreProvider`, creating workspaces works perfectly
- The initial workspace is created successfully
- Workspace store operations (creating items) work fine
- Schema appears to be applied correctly during boot

### ❌ What Doesn't Work (Runtime)
- When pressing the "Create New Workspace" button, the same operation fails
- Error: `SQLiteErrorException: Error code 1: no such table: workspaces`
- Same store ID is logged, but the table doesn't exist

### 🔧 App Features
- **Workspace Selection**: Click on workspaces to switch between them
- **Nested Providers**: Each workspace gets its own LiveStore provider with isolated data
- **Item Management**: Add items to the selected workspace
- **Clear Separation**: User operations vs workspace operations are clearly separated

## Code Structure

- **user-store.ts**: Simple schema with `workspaces` table and `workspaceCreated` event
- **workspace-store.ts**: Simple schema with `items` table and `itemCreated` event
- **App.tsx**: Full nested providers reproduction with workspace selection
- **UserStoreOperations**: Handles all user store operations within the provider context
- **WorkspaceStoreOperations**: Handles all workspace store operations within their provider context

## Key Observations

1. **Same Store ID**: Boot and runtime operations log the same store ID
2. **Same Code Path**: Both operations use identical event and materializer code
3. **Timing Issue**: The problem only occurs after the boot phase completes
4. **Expo Adapter Specific**: This appears related to the dual database architecture in the Expo adapter

## Hypothesis

Based on analysis of the Expo adapter source code, the issue seems to be:

1. **Boot operations** may execute on the persistent `dbState` database (has schema)
2. **Runtime operations** execute on the in-memory `sqliteDb` that imports a snapshot
3. **The import process** may transfer data but not the schema structure
4. **When materializers run**, they can't find tables in the in-memory database

## Logs to Watch

When running the app, you'll see:

```
✅ Boot time (works):
LOG  === USER STORE BOOT ===
LOG  User store ID: USER_STORE_debug-123
LOG  USER STORE: Creating workspace: {"emoji": "💰", "id": "WORKSPACE_STORE_debug-1", "name": "Personal"}

❌ Runtime (fails):
LOG  === WORKSPACE SELECTOR: Button clicked ===
LOG  User store ID: USER_STORE_debug-123
ERROR SQLiteErrorException: Error code 1: no such table: workspaces
```

## Files Overview

- `App.tsx` - Main app with reproduction code
- `user-store.ts` - Simple LiveStore schema
- `polyfill.ts` - Crypto polyfill for LiveStore
- `metro.config.js` - Metro configuration for LiveStore
- `babel.config.js` - Babel configuration
- `package.json` - Dependencies including LiveStore packages

This reproduction isolates the issue to its simplest form - a single store with a single table and event, demonstrating the boot vs runtime behavior difference.