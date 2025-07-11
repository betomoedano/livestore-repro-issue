import "./polyfill";
import { useState, useCallback, createContext, useContext } from "react";
import {
  View,
  Text,
  Button,
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

const WORKSPACE_TEMPLATES = [
  { name: "Personal", emoji: "💰" },
  { name: "Business", emoji: "🏢" },
  { name: "Family", emoji: "👨‍👩‍👧‍👦" },
];

const ITEM_EMOJIS = ["📝", "✅", "🔥", "⭐", "🎯"];

let workspaceCounter = 0;

// Create adapters outside components to prevent recreation on every render
const userAdapter = makePersistedAdapter({});
const workspaceAdapter = makePersistedAdapter({});

// Create contexts for accessing stores from anywhere in the component tree
const UserStoreContext = createContext<any>(null);
const WorkspaceStoreContext = createContext<any>(null);

// Custom hooks to access specific stores
const useUserStore = () => {
  const store = useContext(UserStoreContext);
  if (!store) {
    throw new Error("useUserStore must be used within a UserProvider");
  }
  return store;
};

const useWorkspaceStore = () => {
  const store = useContext(WorkspaceStoreContext);
  if (!store) {
    throw new Error("useWorkspaceStore must be used within a WorkspaceProvider");
  }
  return store;
};

function UserProvider({ children }: { children: React.ReactNode }) {
  const userId = "USER_STORE_debug-123";

  const renderLoading = useCallback(() => <></>, []);

  const renderError = useCallback(
    (error: any) => <Text>User store error: {String(error)}</Text>,
    []
  );

  const bootFunction = useCallback((store: any) => {
    const workspaceCount = store.query(userTables.workspaces.count());
    if (workspaceCount === 0) {
      const template = WORKSPACE_TEMPLATES[0];
      store.commit(
        userEvents.workspaceCreated({
          id: "WORKSPACE_STORE_debug-1",
          name: template.name,
          emoji: template.emoji,
          createdAt: new Date(),
        })
      );
    }
  }, []);

  return (
    <LiveStoreProvider
      schema={simpleUserSchema}
      adapter={userAdapter}
      storeId={userId}
      renderLoading={renderLoading}
      renderError={renderError}
      boot={bootFunction}
      batchUpdates={unstable_batchedUpdates}
    >
      <UserStoreProvider>{children}</UserStoreProvider>
    </LiveStoreProvider>
  );
}

// Component that exposes the user store via context
function UserStoreProvider({ children }: { children: React.ReactNode }) {
  const { store } = useStore(); // Get the user store from LiveStoreProvider

  return (
    <UserStoreContext.Provider value={store}>
      {children}
    </UserStoreContext.Provider>
  );
}

function WorkspaceProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: React.ReactNode;
}) {
  const renderLoading = useCallback(() => <></>, []);

  const renderError = useCallback(
    (error: any) => <Text>Workspace error: {String(error)}</Text>,
    []
  );

  const bootFunction = useCallback((store: any) => {
    const itemCount = store.query(workspaceTables.items.count());
    if (itemCount === 0) {
      for (let i = 0; i < 2; i++) {
        store.commit(
          workspaceEvents.itemCreated({
            id: nanoid(),
            name: `Item ${i + 1}`,
            emoji: ITEM_EMOJIS[i],
            createdAt: new Date(),
          })
        );
      }
    }
  }, []);

  return (
    <LiveStoreProvider
      schema={simpleWorkspaceSchema}
      adapter={workspaceAdapter}
      storeId={workspaceId}
      renderLoading={renderLoading}
      renderError={renderError}
      boot={bootFunction}
      batchUpdates={unstable_batchedUpdates}
    >
      <WorkspaceStoreProvider>{children}</WorkspaceStoreProvider>
    </LiveStoreProvider>
  );
}

// Component that exposes the workspace store via context
function WorkspaceStoreProvider({ children }: { children: React.ReactNode }) {
  const { store } = useStore(); // Get the workspace store from LiveStoreProvider

  return (
    <WorkspaceStoreContext.Provider value={store}>
      {children}
    </WorkspaceStoreContext.Provider>
  );
}

function WorkspaceSelector({
  selectedWorkspaceId,
  setSelectedWorkspaceId,
}: {
  selectedWorkspaceId: string | null;
  setSelectedWorkspaceId: (id: string) => void;
}) {
  const userStore = useUserStore(); // Now uses custom hook
  const workspaces = userStore.useQuery(allWorkspaces$);

  const createNewWorkspace = () => {
    const workspaceId = nanoid();
    const template =
      WORKSPACE_TEMPLATES[workspaceCounter % WORKSPACE_TEMPLATES.length];
    workspaceCounter++;

    userStore.commit(
      userEvents.workspaceCreated({
        id: workspaceId,
        name: template.name,
        emoji: template.emoji,
        createdAt: new Date(),
      })
    );
    setSelectedWorkspaceId(workspaceId);
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>Workspaces</Text>

      {workspaces.map((workspace) => (
        <TouchableOpacity
          key={workspace.id}
          onPress={() => setSelectedWorkspaceId(workspace.id)}
          style={{
            padding: 10,
            marginBottom: 5,
            backgroundColor:
              selectedWorkspaceId === workspace.id ? "#007AFF" : "#f5f5f5",
          }}
        >
          <Text
            style={{
              color: selectedWorkspaceId === workspace.id ? "white" : "black",
            }}
          >
            {workspace.emoji} {workspace.name}
          </Text>
        </TouchableOpacity>
      ))}

      <View style={{ marginTop: 10 }}>
        <Button title="Add Workspace" onPress={createNewWorkspace} />
      </View>
    </View>
  );
}

function WorkspaceContent() {
  const workspaceStore = useWorkspaceStore(); // Now uses custom hook
  const items = workspaceStore.useQuery(allItems$);

  const createItem = () => {
    const emoji = ITEM_EMOJIS[Math.floor(Math.random() * ITEM_EMOJIS.length)];
    workspaceStore.commit(
      workspaceEvents.itemCreated({
        id: nanoid(),
        name: `Item ${items.length + 1}`,
        emoji: emoji,
        createdAt: new Date(),
      })
    );
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>Items</Text>

      {items.map((item) => (
        <ItemComponent key={item.id} item={item} />
      ))}

      <View style={{ marginTop: 10 }}>
        <Button title="Add Item" onPress={createItem} />
      </View>
    </View>
  );
}

// Demo component that can access BOTH stores from anywhere in the tree
function ItemComponent({ item }: { item: any }) {
  const userStore = useUserStore(); // Access user store
  const workspaceStore = useWorkspaceStore(); // Access workspace store
  
  const workspaces = userStore.useQuery(allWorkspaces$);
  
  return (
    <View style={{ padding: 10, marginBottom: 5, backgroundColor: "#f0f0f0" }}>
      <Text>
        {item.emoji} {item.name}
      </Text>
      <Text style={{ fontSize: 12, color: "#666" }}>
        From workspace store: {workspaceStore.storeId}
      </Text>
      <Text style={{ fontSize: 12, color: "#666" }}>
        Total workspaces from user store: {workspaces.length}
      </Text>
    </View>
  );
}

function MainContent() {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    "WORKSPACE_STORE_debug-1"
  );

  return (
    <ScrollView style={{ flex: 1 }} contentInsetAdjustmentBehavior="automatic">
      <WorkspaceSelector
        selectedWorkspaceId={selectedWorkspaceId}
        setSelectedWorkspaceId={setSelectedWorkspaceId}
      />

      {selectedWorkspaceId && (
        <WorkspaceProvider
          key={selectedWorkspaceId}
          workspaceId={selectedWorkspaceId}
        >
          <WorkspaceContent />
        </WorkspaceProvider>
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
