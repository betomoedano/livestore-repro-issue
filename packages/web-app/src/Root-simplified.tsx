import React from 'react'
import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import { LiveStoreProvider, useStore } from '@livestore/react'
import { nanoid } from '@livestore/livestore'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'

import LiveStoreWorker from './livestore.worker?worker'
import {
  simpleUserSchema,
  userTables,
  userEvents,
  allWorkspaces$,
} from './user-store'

/**
 * SIMPLIFIED TEST - Just one store, no nested providers
 * This will help us isolate if the issue is with schema application itself
 */
function SimpleTest() {
  const { store } = useStore();
  
  console.log("=== SIMPLE TEST COMPONENT ===");
  console.log("Store ID:", store.storeId);
  
  // Try to query workspaces - this should work if schema is applied correctly
  let workspaces;
  let error = null;
  
  try {
    workspaces = store.useQuery(allWorkspaces$);
    console.log("SUCCESS: Got workspaces:", workspaces);
  } catch (e) {
    error = e;
    console.error("ERROR: Failed to query workspaces:", e);
  }
  
  const createWorkspace = () => {
    console.log("=== ATTEMPTING TO CREATE WORKSPACE ===");
    console.log("Store ID:", store.storeId);
    
    try {
      // First, try to count existing workspaces
      const count = store.query(userTables.workspaces.count());
      console.log("Current workspaces count:", count);
      
      // Then create a new workspace
      const id = nanoid();
      store.commit(
        userEvents.workspaceCreated({
          id,
          name: "Test Workspace",
          emoji: "🧪",
          createdAt: new Date(),
        })
      );
      console.log("SUCCESS: Created workspace with ID:", id);
    } catch (error) {
      console.error("ERROR: Failed to create workspace:", error);
    }
  };
  
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>🔬 LiveStore Schema Debug Test</h1>
      
      <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: "#f0f0f0" }}>
        <h3>Store Info</h3>
        <p><strong>Store ID:</strong> {store.storeId}</p>
        <p><strong>Schema Applied:</strong> {error ? "❌ NO" : "✅ YES"}</p>
      </div>
      
      {error && (
        <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: "#ffebee", border: "1px solid #f44336" }}>
          <h3>❌ Schema Error</h3>
          <pre style={{ fontSize: "12px", color: "#d32f2f" }}>
            {error.toString()}
          </pre>
        </div>
      )}
      
      {!error && (
        <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: "#e8f5e8", border: "1px solid #4caf50" }}>
          <h3>✅ Schema Working</h3>
          <p><strong>Workspaces found:</strong> {workspaces?.length || 0}</p>
          {workspaces?.map((ws) => (
            <div key={ws.id} style={{ margin: "5px 0", padding: "5px", backgroundColor: "white" }}>
              {ws.emoji} {ws.name} (ID: {ws.id})
            </div>
          ))}
        </div>
      )}
      
      <button
        onClick={createWorkspace}
        style={{
          padding: "10px 20px",
          backgroundColor: "#2196f3",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "16px"
        }}
      >
        🧪 Test Create Workspace
      </button>
      
      <div style={{ marginTop: "20px", fontSize: "12px", color: "#666" }}>
        <p>Check browser console for detailed logs</p>
      </div>
    </div>
  );
}

/**
 * MINIMAL ROOT APP - Single provider only
 */
export const App: React.FC = () => {
  const userId = "DEBUG_USER_STORE";
  const adapter = makePersistedAdapter({
    storage: { type: 'opfs' },
    worker: LiveStoreWorker,
    sharedWorker: LiveStoreSharedWorker,
  });

  return (
    <LiveStoreProvider
      schema={simpleUserSchema}
      adapter={adapter}
      storeId={userId}
      renderLoading={(stage) => {
        console.log("🔄 LOADING:", stage);
        return <div style={{ padding: "20px" }}>Loading LiveStore ({stage.stage})...</div>;
      }}
      renderError={(error) => {
        console.error("💥 PROVIDER ERROR:", error);
        return (
          <div style={{ padding: "20px", color: "red" }}>
            <h2>LiveStore Provider Error</h2>
            <pre>{error.toString()}</pre>
          </div>
        );
      }}
      boot={(store) => {
        console.log("🚀 === BOOT CALLBACK ===");
        console.log("Store ID:", store.storeId);
        console.log("Schema:", simpleUserSchema);
        
        try {
          console.log("🔍 Testing table access during boot...");
          const count = store.query(userTables.workspaces.count());
          console.log("✅ Boot table access SUCCESS - count:", count);
          
          if (count === 0) {
            console.log("🆕 Creating initial workspace during boot...");
            store.commit(
              userEvents.workspaceCreated({
                id: "BOOT_WORKSPACE_1",
                name: "Boot Workspace",
                emoji: "🚀",
                createdAt: new Date(),
              })
            );
            console.log("✅ Boot workspace creation SUCCESS");
          }
        } catch (error) {
          console.error("💥 BOOT ERROR:", error);
          console.error("This means the schema is not being applied correctly!");
        }
      }}
      batchUpdates={batchUpdates}
      syncPayload={undefined}
    >
      <SimpleTest />
    </LiveStoreProvider>
  );
};