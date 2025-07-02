# LiveStore Nested Providers Monorepo

This is a monorepo with both web and mobile apps demonstrating LiveStore's nested providers pattern and reproducing/fixing schema isolation issues.

## Project Structure

```
├── packages/
│   ├── web-app/          # Vite + React web app (✅ FIXED)
│   └── mobile-app/       # Expo React Native app (⚠️ May still reproduce issue)
```

## Apps Overview

### 🌐 Web App (FIXED)
- **Status**: ✅ Working with nested providers
- **Solution**: Separate workers for user and workspace schemas
- **Features**: Full workspace management with isolated stores

### 📱 Mobile App 
- **Status**: ⚠️ May still reproduce the original "no such table" issue
- **Purpose**: Original reproduction case for debugging

## Quick Start

### 1. Install Dependencies
```bash
# From repository root
pnpm install
```

### 2. Run the Apps

#### Web App (Fixed Implementation)
```bash
# Option 1: From root
cd packages/web-app
pnpm dev

# Option 2: Using workspace filter
pnpm --filter web-app dev
```
Then open http://localhost:60001

#### Mobile App (Original Reproduction)
```bash
# Option 1: From root  
cd packages/mobile-app
pnpm start

# Option 2: Using workspace script
pnpm mobile start
```
Then press 'i' for iOS or 'a' for Android

## The Issue & Solution

### 🐛 Original Problem
When using nested LiveStore providers with different schemas:
- **Boot time**: Creating workspaces/items worked perfectly
- **Runtime**: Same operations failed with "no such table" errors
- **Cause**: Multiple stores sharing the same worker with conflicting schemas

### ✅ Web App Solution
**Separate Workers Approach**:
1. **User Worker** (`livestore.worker.ts`) - Handles user schema (workspaces table)
2. **Workspace Worker** (`workspace.worker.ts`) - Handles workspace schema (items table)
3. **Schema Isolation** - Each store type gets its own dedicated worker
4. **No Conflicts** - Workers can't interfere with each other's schemas

### 🔧 Implementation Details

**Web App Architecture**:
```typescript
// User Provider - manages workspaces
<LiveStoreProvider 
  schema={userSchema} 
  worker={LiveStoreUserWorker} />

// Workspace Provider - manages items  
<LiveStoreProvider 
  schema={workspaceSchema} 
  worker={LiveStoreWorkspaceWorker} />
```

**File Structure**:
```
packages/web-app/src/
├── Root.tsx                 # Nested providers implementation
├── user-store.ts           # User schema (workspaces)
├── workspace-store.ts      # Workspace schema (items)  
├── livestore.worker.ts     # User worker
└── workspace.worker.ts     # Workspace worker
```

## Features Demonstrated

### ✅ Working Features (Web App)
- **Workspace Creation**: Create new workspaces via UI
- **Workspace Switching**: Switch between workspaces with isolated data
- **Item Management**: Add items to specific workspaces
- **Schema Isolation**: Each workspace has its own SQLite database
- **Nested Providers**: UserProvider → WorkspaceProvider pattern

### 🎯 Test Scenarios
1. **Create Workspaces**: Click "Create Workspace" button
2. **Switch Workspaces**: Click different workspace buttons  
3. **Add Items**: Click "Create Item" in different workspaces
4. **Verify Isolation**: Items only appear in their respective workspaces

## Code Structure

### Core Files

#### User Store (`user-store.ts`)
```typescript
// Tracks workspaces only
const userTables = {
  workspaces: State.SQLite.table({...})
}
```

#### Workspace Store (`workspace-store.ts`) 
```typescript
// Tracks items only
const workspaceTables = {
  items: State.SQLite.table({...})
}
```

#### Root Component (`Root.tsx`)
- **UserProvider**: Creates user store for workspace management
- **WorkspaceProvider**: Creates isolated stores for each workspace
- **Context Separation**: Prevents store reference conflicts

## Development Notes

### Web App
- Uses Vite for fast development
- TypeScript with strict mode
- React 19 with modern patterns

### Mobile App
- Expo SDK 53
- React Native 0.79.4
- Original LiveStore Expo adapter

### Key Dependencies
- `@livestore/adapter-web` (web app)
- `@livestore/adapter-expo` (mobile app)  
- `@livestore/react` (both apps)
- `@livestore/livestore` (core library)

## Debugging

### Web App Logs
Watch for these console messages:
```
🔧 === WORKER SETUP === (user worker)
🔧 === WORKSPACE WORKER SETUP === (workspace worker)
=== USER STORE BOOT ===
=== WORKSPACE STORE BOOT ===
```

### Mobile App Logs
May still show the original error:
```
❌ SQLiteErrorException: Error code 1: no such table: workspaces
```

## Contributing

This monorepo serves as both a reproduction case and a working solution demonstration. The web app shows the fix, while the mobile app preserves the original issue for debugging purposes.