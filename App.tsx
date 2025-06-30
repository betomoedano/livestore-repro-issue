import "./polyfill";
import React, { createContext, use, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  unstable_batchedUpdates,
} from "react-native";
import { LiveStoreProvider, useStore } from "@livestore/react";
import { nanoid } from "@livestore/livestore";
import { makePersistedAdapter } from "@livestore/adapter-expo";
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
  const userId = "USER_STORE_debug-123";
  const userAdapter = makePersistedAdapter({});

  return (
    <LiveStoreProvider
      schema={simpleUserSchema}
      adapter={userAdapter}
      storeId={userId}
      renderLoading={(stage) => {
        console.log("USER STORE loading:", stage);
        return <Text>Loading user store... ({stage.stage})</Text>;
      }}
      renderError={(error) => {
        console.error("USER STORE error:", error);
        return <Text>User store error: {error.toString()}</Text>;
      }}
      boot={(store) => {
        console.log("=== USER STORE BOOT ===");
        console.log("User store ID:", store.storeId);

        try {
          const workspaceCount = store.query(userTables.workspaces.count());
          console.log("USER STORE: Existing workspaces count:", workspaceCount);

          if (workspaceCount === 0) {
            // Create an initial workspace - THIS WORKS
            const initialWorkspaceId = "WORKSPACE_STORE_debug-1";
            const template = WORKSPACE_TEMPLATES[0];

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
        }
      }}
      batchUpdates={unstable_batchedUpdates}
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
  const workspaceAdapter = makePersistedAdapter({});

  return (
    <LiveStoreProvider
      schema={simpleWorkspaceSchema}
      adapter={workspaceAdapter}
      storeId={workspaceId}
      renderLoading={(stage) => {
        console.log("WORKSPACE STORE loading:", stage);
        return <Text>Loading workspace store... ({stage.stage})</Text>;
      }}
      renderError={(error: unknown) => {
        console.error("WORKSPACE STORE error:", error);
        return <Text>Workspace store error: {String(error)}</Text>;
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
        }
      }}
      batchUpdates={unstable_batchedUpdates}
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
  const userContext = use(UserContext)!;
  const {
    workspaces,
    createWorkspace,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
  } = userContext;

  const createNewWorkspace = () => {
    console.log("=== WORKSPACE SELECTOR: Button clicked ===");

    try {
      const newWorkspaceId = createWorkspace();
      console.log("WORKSPACE SELECTOR: New workspace created!");
      setSelectedWorkspaceId(newWorkspaceId);
    } catch (error) {
      console.error("WORKSPACE SELECTOR: Error creating workspace:", error);
    }
  };

  console.log("=== WORKSPACE SELECTOR DEBUG ===");
  console.log("Total workspaces:", workspaces.length);
  console.log("Selected workspace ID:", selectedWorkspaceId);
  console.log(
    "Workspace data:",
    workspaces.map((w) => ({ id: w.id, name: w.name, emoji: w.emoji }))
  );

  return (
    <View style={styles.section}>
      <Text style={styles.title}>LiveStore Bug Reproduction</Text>
      <Text style={styles.subtitle}>Select Workspace:</Text>
      <Text style={styles.info}>Total workspaces: {workspaces.length}</Text>

      {workspaces.map((workspace) => (
        <TouchableOpacity
          key={workspace.id}
          style={[
            styles.workspaceSelector,
            selectedWorkspaceId === workspace.id && styles.selectedWorkspace,
          ]}
          onPress={() => {
            console.log(
              "WORKSPACE SELECTOR: Selecting workspace:",
              workspace.id,
              workspace.name
            );
            setSelectedWorkspaceId(workspace.id);
          }}
        >
          <Text style={styles.workspaceName}>
            {workspace.emoji} {workspace.name}
          </Text>
          <Text style={styles.workspaceId}>
            ID: {workspace.id.slice(0, 8)}...
          </Text>
          {selectedWorkspaceId === workspace.id && (
            <Text style={styles.selectedIndicator}>✓ SELECTED</Text>
          )}
        </TouchableOpacity>
      ))}

      <Button title="+ Create New Workspace" onPress={createNewWorkspace} />

      <View style={styles.explanation}>
        <Text style={styles.explanationTitle}>Expected Behavior:</Text>
        <Text style={styles.explanationText}>
          • Boot time workspace creation works ✅{"\n"}• Button-triggered
          workspace creation should work ❌{"\n"}• Error: "no such table:
          workspaces"
        </Text>
      </View>
    </View>
  );
}

/**
 * WORKSPACE CONTENT
 * Uses the WORKSPACE context to show workspace-specific items.
 */
function WorkspaceContent() {
  const workspaceContext = use(WorkspaceContext)!;
  const { items, createItem, workspaceStoreId } = workspaceContext;

  const createWorkspaceItem = () => {
    console.log("=== WORKSPACE CONTENT: Button clicked ===");

    try {
      createItem();
      console.log("WORKSPACE CONTENT: New item created!");
    } catch (error) {
      console.error("WORKSPACE CONTENT: Error creating item:", error);
    }
  };

  console.log("=== WORKSPACE CONTENT DEBUG ===");
  console.log("Workspace Store ID:", workspaceStoreId);
  console.log("Total items:", items.length);
  console.log(
    "Item data:",
    items.map((i) => ({ id: i.id, name: i.name, emoji: i.emoji }))
  );

  return (
    <View style={styles.section}>
      <Text style={styles.subtitle}>Workspace Items:</Text>
      <Text style={styles.info}>Store ID: {workspaceStoreId}</Text>
      <Text style={styles.info}>Items count: {items.length}</Text>

      {items.map((item) => (
        <View key={item.id} style={styles.workspaceItem}>
          <Text style={styles.itemName}>
            {item.emoji} {item.name}
          </Text>
          <Text style={styles.itemId}>ID: {item.id.slice(0, 8)}...</Text>
        </View>
      ))}

      <Button
        title="+ Add Item to This Workspace"
        onPress={createWorkspaceItem}
      />
    </View>
  );
}

/**
 * WORKSPACE CONTENT WRAPPER
 * Wraps workspace content in its own provider to isolate from user store
 */
function WorkspaceContentWrapper({ workspaceId }: { workspaceId: string }) {
  return (
    <WorkspaceProvider workspaceId={workspaceId}>
      <WorkspaceContent />
    </WorkspaceProvider>
  );
}

/**
 * MAIN CONTENT
 * Keeps workspace selector separate from workspace provider to avoid conflicts
 */
function MainContent() {
  const userContext = use(UserContext)!;
  const { selectedWorkspaceId } = userContext;

  return (
    <ScrollView
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Workspace selector stays at USER store level - never nested */}
      <WorkspaceSelector />

      {/* Workspace content gets its own isolated provider with key for proper unmounting */}
      {selectedWorkspaceId ? (
        <WorkspaceContentWrapper
          key={selectedWorkspaceId}
          workspaceId={selectedWorkspaceId}
        />
      ) : (
        <View style={styles.section}>
          <Text style={styles.subtitle}>No Workspace Selected</Text>
          <Text style={styles.info}>
            Select a workspace above to see its items
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

export default function App() {
  return (
    <UserProvider>
      <MainContent />
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  info: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },
  section: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
  },
  workspaceSelector: {
    padding: 15,
    backgroundColor: "#e8f5e8",
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#c8e6c9",
    minHeight: 60,
    justifyContent: "center",
  },
  selectedWorkspace: {
    backgroundColor: "#c8e6c9",
    borderColor: "#4caf50",
    borderWidth: 3,
  },
  workspaceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2e7d32",
  },
  workspaceId: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  selectedIndicator: {
    fontSize: 14,
    color: "#4caf50",
    fontWeight: "bold",
    marginTop: 4,
  },
  workspaceItem: {
    padding: 8,
    backgroundColor: "#f3e5f5",
    marginBottom: 5,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: "#9c27b0",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
  },
  itemId: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  explanation: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#ffc107",
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#856404",
  },
  explanationText: {
    fontSize: 14,
    color: "#856404",
    lineHeight: 20,
  },
});
