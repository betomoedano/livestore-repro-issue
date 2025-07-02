import React, { createContext, useState } from "react";
import { makePersistedAdapter } from "@livestore/adapter-web";
import LiveStoreSharedWorker from "@livestore/adapter-web/shared-worker?sharedworker";
import { LiveStoreProvider, useStore } from "@livestore/react";
import { nanoid } from "@livestore/livestore";
import { unstable_batchedUpdates as batchUpdates } from "react-dom";

import LiveStoreUserWorker from "./livestore.worker?worker";
import LiveStoreWorkspaceWorker from "./workspace.worker?worker";
import {
  simpleUserSchema,
  userTables,
  userEvents,
  allWorkspaces$,
} from "./user-store";
import {
  simpleWorkspaceSchema,
  workspaceTables,
  workspaceEvents,
  allItems$,
} from "./workspace-store";

// Simple workspace templates for debugging
const WORKSPACE_TEMPLATES = [
  { name: "Personal", emoji: "💰" },
  { name: "Business", emoji: "🏢" },
  { name: "Family", emoji: "👨‍👩‍👧‍👦" },
];

const ITEM_EMOJIS = ["📝", "✅", "🔥", "⭐", "🎯"];

let workspaceCounter = 0;

// Simple user context - only functions and state, no store references
const UserContext = createContext<
  | {
      createWorkspace: () => string;
      workspaces: ReadonlyArray<{
        id: string;
        name: string;
        emoji: string;
        createdAt: Date;
      }>;
      selectedWorkspaceId: string | null;
      setSelectedWorkspaceId: (id: string) => void;
    }
  | undefined
>(undefined);

// Simple workspace context - only functions and state, no store references
const WorkspaceContext = createContext<
  | {
      createItem: () => string;
      items: ReadonlyArray<{
        id: string;
        name: string;
        emoji: string;
        createdAt: Date;
      }>;
      workspaceStoreId: string;
    }
  | undefined
>(undefined);

/**
 * USER PROVIDER
 * Creates a LiveStore with user schema that tracks workspaces
 */
function UserProvider({ children }: { children: React.ReactNode }) {
  const userId = "USER_STORE_debug-1234";
  const userAdapter = makePersistedAdapter({
    storage: { type: "opfs" },
    worker: LiveStoreUserWorker,
    sharedWorker: LiveStoreSharedWorker,
  });

  return (
    <LiveStoreProvider
      schema={simpleUserSchema}
      adapter={userAdapter}
      storeId={userId}
      renderLoading={(stage) => {
        console.log("USER STORE loading:", stage);
        return <div>Loading user store... ({stage.stage})</div>;
      }}
      renderError={(error) => {
        console.error("USER STORE error:", error);
        return <div>User store error: {error.toString()}</div>;
      }}
      boot={(store) => {
        console.log("=== USER STORE BOOT ===");
        console.log("User store ID:", store.storeId);

        try {
          console.log("USER STORE: Testing table access...");
          const workspaceCount = store.query(userTables.workspaces.count());
          console.log("USER STORE: Existing workspaces count:", workspaceCount);

          if (workspaceCount === 0) {
            // Create an initial workspace
            const initialWorkspaceId = "WORKSPACE_STORE_debug-1";
            const template = WORKSPACE_TEMPLATES[0];

            console.log("USER STORE: Creating initial workspace:", {
              id: initialWorkspaceId,
              name: template.name,
              emoji: template.emoji,
            });

            store.commit(
              userEvents.workspaceCreated({
                id: initialWorkspaceId,
                name: template.name,
                emoji: template.emoji,
                createdAt: new Date(),
              })
            );
            console.log("USER STORE: Initial workspace created during boot!");
          }
        } catch (error) {
          console.error("USER STORE boot error:", error);
          console.log("USER STORE: This might be normal if the schema is still being applied.");
        }
      }}
      batchUpdates={batchUpdates}
      syncPayload={undefined}
    >
      <UserStoreOperations userId={userId}>{children}</UserStoreOperations>
    </LiveStoreProvider>
  );
}

/**
 * USER STORE OPERATIONS
 * This component has direct access to the user store via useStore()
 * All user store operations happen here to avoid stale store references
 */
function UserStoreOperations({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string;
}) {
  const { store: userStore } = useStore(); // This MUST be the user store since we're inside UserProvider
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    "WORKSPACE_STORE_debug-1"
  );

  // Get workspaces from user store
  const workspaces = userStore.useQuery(allWorkspaces$);

  console.log("=== USER STORE OPERATIONS ===");
  console.log("User store ID from useStore():", userStore.storeId);
  console.log("Expected user store ID:", userId);

  const createWorkspace = () => {
    const workspaceId = nanoid();
    const template =
      WORKSPACE_TEMPLATES[workspaceCounter % WORKSPACE_TEMPLATES.length];
    workspaceCounter++;

    console.log("=== USER STORE OPERATIONS: Creating workspace ===");
    console.log("User store ID:", userStore.storeId);
    console.log("New workspace ID:", workspaceId);
    console.log("Template:", template);

    // Debug: Check existing workspaces count
    try {
      const count = userStore.query(userTables.workspaces.count());
      console.log("USER STORE: Current workspaces count:", count);
    } catch (e) {
      console.log("USER STORE: Could not count workspaces:", e);
    }

    try {
      // Create a workspace in user store - THIS FAILS with "no such table: workspaces"
      console.log("USER STORE: About to commit workspaceCreated event");
      userStore.commit(
        userEvents.workspaceCreated({
          id: workspaceId,
          name: template.name,
          emoji: template.emoji,
          createdAt: new Date(),
        })
      );
      console.log("USER STORE: Workspace created successfully!");
      return workspaceId;
    } catch (error) {
      console.error("USER STORE: Error creating workspace:", error);
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        createWorkspace,
        workspaces,
        selectedWorkspaceId,
        setSelectedWorkspaceId,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

/**
 * WORKSPACE PROVIDER
 * Creates a LiveStore with dynamic storeId based on selected workspace.
 * Each workspace gets its own isolated SQLite database.
 */
function WorkspaceProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: React.ReactNode;
}) {
  const workspaceAdapter = makePersistedAdapter({
    storage: { type: "opfs" },
    worker: LiveStoreWorkspaceWorker,
    sharedWorker: LiveStoreSharedWorker,
  });

  return (
    <LiveStoreProvider
      schema={simpleWorkspaceSchema}
      adapter={workspaceAdapter}
      storeId={workspaceId}
      renderLoading={(stage) => {
        console.log("WORKSPACE STORE loading:", stage);
        return <div>Loading workspace store... ({stage.stage})</div>;
      }}
      renderError={(error: unknown) => {
        console.error("WORKSPACE STORE error:", error);
        return <div>Workspace store error: {String(error)}</div>;
      }}
      boot={(store) => {
        console.log("=== WORKSPACE STORE BOOT ===");
        console.log("Workspace store ID:", store.storeId);

        // Verify we're in the right store context
        if (store.storeId !== workspaceId) {
          console.error(
            "WORKSPACE STORE MISMATCH! Expected:",
            workspaceId,
            "Got:",
            store.storeId
          );
          return;
        }

        try {
          // Test if we can access the items table - if not, it means the schema hasn't been applied yet
          console.log("WORKSPACE STORE: Testing table access...");
          const itemCount = store.query(workspaceTables.items.count());
          console.log("WORKSPACE STORE: Existing items count:", itemCount);

          if (itemCount === 0) {
            console.log("WORKSPACE STORE: Creating initial items");
            // Create 2 initial items
            for (let i = 0; i < 2; i++) {
              const emoji = ITEM_EMOJIS[i % ITEM_EMOJIS.length];
              const itemId = nanoid();
              const itemName = `Item ${i + 1}`;

              console.log(`WORKSPACE STORE: Creating item ${i + 1}:`, {
                itemId,
                itemName,
                emoji,
              });

              store.commit(
                workspaceEvents.itemCreated({
                  id: itemId,
                  name: itemName,
                  emoji: emoji,
                  createdAt: new Date(),
                })
              );
            }
            console.log("WORKSPACE STORE: Initial items created!");
          }
        } catch (error) {
          console.error("WORKSPACE STORE boot error:", error);
          console.log("WORKSPACE STORE: This might be normal if the schema is still being applied.");
          // Don't throw the error - let the component handle it gracefully
        }
      }}
      batchUpdates={batchUpdates}
      syncPayload={undefined}
    >
      <WorkspaceStoreOperations workspaceId={workspaceId}>
        {children}
      </WorkspaceStoreOperations>
    </LiveStoreProvider>
  );
}

/**
 * WORKSPACE STORE OPERATIONS
 * This component has direct access to the workspace store via useStore()
 * All workspace store operations happen here to avoid stale store references
 */
function WorkspaceStoreOperations({
  children,
  workspaceId,
}: {
  children: React.ReactNode;
  workspaceId: string;
}) {
  const { store: workspaceStore } = useStore(); // This MUST be the workspace store since we're inside WorkspaceProvider

  // Get items from workspace store
  const items = workspaceStore.useQuery(allItems$);

  console.log("=== WORKSPACE STORE OPERATIONS ===");
  console.log("Workspace store ID from useStore():", workspaceStore.storeId);
  console.log("Expected workspace store ID:", workspaceId);

  const createItem = () => {
    const randomEmoji =
      ITEM_EMOJIS[Math.floor(Math.random() * ITEM_EMOJIS.length)];
    const itemNumber = items.length + 1;
    const id = nanoid();
    const name = `Item ${itemNumber}`;

    console.log("=== WORKSPACE STORE OPERATIONS: Creating item ===");
    console.log("Workspace store ID:", workspaceStore.storeId);
    console.log("Item data:", { id, name, emoji: randomEmoji });

    try {
      workspaceStore.commit(
        workspaceEvents.itemCreated({
          id,
          name,
          emoji: randomEmoji,
          createdAt: new Date(),
        })
      );
      console.log("WORKSPACE STORE: Item created successfully!");
      return id;
    } catch (error) {
      console.error("WORKSPACE STORE: Error creating item:", error);
      throw error;
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        createItem,
        items,
        workspaceStoreId: workspaceStore.storeId,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * WORKSPACE SELECTOR
 * This component uses the USER store operations
 */
function WorkspaceSelector() {
  const userContext = React.useContext(UserContext);
  if (!userContext) {
    throw new Error("WorkspaceSelector must be used within UserProvider");
  }

  const {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    createWorkspace,
  } = userContext;

  return (
    <div style={{ padding: "20px", borderBottom: "1px solid #ccc" }}>
      <h2>🏢 Workspaces</h2>
      <div style={{ marginBottom: "10px" }}>
        {workspaces.map((workspace) => (
          <button
            key={workspace.id}
            onClick={() => setSelectedWorkspaceId(workspace.id)}
            style={{
              margin: "5px",
              padding: "10px",
              backgroundColor:
                selectedWorkspaceId === workspace.id ? "#007bff" : "#f0f0f0",
              color: selectedWorkspaceId === workspace.id ? "white" : "black",
              border: "1px solid #ccc",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            {workspace.emoji} {workspace.name}
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          try {
            const newWorkspaceId = createWorkspace();
            console.log(
              "WORKSPACE SELECTOR: New workspace ID:",
              newWorkspaceId
            );
          } catch (error) {
            console.error(
              "WORKSPACE SELECTOR: Failed to create workspace:",
              error
            );
          }
        }}
        style={{
          padding: "10px 20px",
          backgroundColor: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        ➕ Create Workspace
      </button>
    </div>
  );
}

/**
 * WORKSPACE CONTENT
 * This component uses the WORKSPACE store operations
 */
function WorkspaceContent() {
  const workspaceContext = React.useContext(WorkspaceContext);
  if (!workspaceContext) {
    throw new Error("WorkspaceContent must be used within WorkspaceProvider");
  }

  const { items, createItem, workspaceStoreId } = workspaceContext;

  return (
    <div style={{ padding: "20px" }}>
      <h3>📝 Items in Workspace ({workspaceStoreId})</h3>
      <div style={{ marginBottom: "20px" }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              padding: "10px",
              margin: "5px 0",
              backgroundColor: "#f9f9f9",
              border: "1px solid #ddd",
              borderRadius: "5px",
            }}
          >
            {item.emoji} {item.name}
            <small style={{ color: "#666", marginLeft: "10px" }}>
              {item.createdAt.toLocaleString()}
            </small>
          </div>
        ))}
      </div>
      <button
        onClick={() => {
          try {
            const newItemId = createItem();
            console.log("WORKSPACE CONTENT: New item ID:", newItemId);
          } catch (error) {
            console.error("WORKSPACE CONTENT: Failed to create item:", error);
          }
        }}
        style={{
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        ➕ Create Item
      </button>
    </div>
  );
}

/**
 * WORKSPACE CONTENT WRAPPER
 * Handles the workspace selection and creates WorkspaceProvider when needed
 */
function WorkspaceContentWrapper() {
  const userContext = React.useContext(UserContext);
  if (!userContext) {
    throw new Error("WorkspaceContentWrapper must be used within UserProvider");
  }

  const { selectedWorkspaceId } = userContext;

  if (!selectedWorkspaceId) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Please select a workspace to view its items.</p>
      </div>
    );
  }

  // Key is important here - it forces React to unmount/remount the WorkspaceProvider
  // when the workspace changes, ensuring we get a fresh store instance
  return (
    <WorkspaceProvider
      key={selectedWorkspaceId}
      workspaceId={selectedWorkspaceId}
    >
      <WorkspaceContent />
    </WorkspaceProvider>
  );
}

/**
 * MAIN CONTENT
 * The main UI component that combines workspace selection and content
 */
function MainContent() {
  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ textAlign: "center", color: "#333" }}>
        📱 LiveStore Nested Providers Test
      </h1>
      <WorkspaceSelector />
      <WorkspaceContentWrapper />
    </div>
  );
}

/**
 * ROOT APP
 * Entry point that sets up the nested provider architecture
 */
export const App: React.FC = () => {
  return (
    <UserProvider>
      <MainContent />
    </UserProvider>
  );
};
