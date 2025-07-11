# LiveStore Expo Adapter Boot Synchronization Patch

## Problem
The LiveStore Expo adapter has an issue where schema tables created during the boot phase are not synchronized to the in-memory database used at runtime. This causes "no such table" errors when performing operations after boot completes.

## Solution
This patch adds synchronization code that exports the latest state from the leader thread after boot and imports it into the in-memory SQLite database, ensuring boot-time changes are available at runtime.

## Files Modified
- `@livestore/adapter-expo@0.3.1/src/index.ts` (lines 123-126)

## Changes Made
Added the following code after client session creation:

```typescript
// After client session is created and boot callback has run, update the in-memory database
// with the latest state from the leader thread to ensure boot-time changes are synchronized
const postBootSnapshot = yield* leaderThread.export
sqliteDb.import(postBootSnapshot)
```

## How to Apply

### Option 1: Using patch-package (Recommended)
1. Install patch-package:
   ```bash
   npm install -D patch-package
   # or
   pnpm add -D patch-package
   ```

2. Add to your package.json scripts:
   ```json
   {
     "scripts": {
       "postinstall": "patch-package"
     }
   }
   ```

3. Copy the patch file to your project:
   ```bash
   mkdir -p patches
   cp patches/@livestore+adapter-expo+0.3.1.patch patches/
   ```

4. The patch will be automatically applied after `npm install` or `pnpm install`

### Option 2: Manual Application
1. Navigate to the adapter-expo source:
   ```bash
   cd node_modules/@livestore/adapter-expo/src
   ```

2. Edit `index.ts` and add the synchronization code after line 121:
   ```typescript
   // After client session is created and boot callback has run, update the in-memory database
   // with the latest state from the leader thread to ensure boot-time changes are synchronized
   const postBootSnapshot = yield* leaderThread.export
   sqliteDb.import(postBootSnapshot)
   ```

## Testing
After applying the patch:
1. Run your React Native app with nested LiveStore providers
2. Verify that operations work both during boot and at runtime
3. Check that "no such table" errors no longer occur

## Impact
This patch ensures that any data created during the boot phase (like initial workspaces or default data) is properly synchronized to the runtime database, eliminating the boot vs runtime inconsistency.