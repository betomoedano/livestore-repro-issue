import "./polyfill";
import { useState } from "react";
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

function UserProvider({ children }: { children: React.ReactNode }) {
  const userId = "USER_STORE_debug-123";
  const userAdapter = makePersistedAdapter({});

  return (
    <LiveStoreProvider
      schema={simpleUserSchema}
      adapter={userAdapter}
      storeId={userId}
      renderLoading={() => <Text>Loading user store...</Text>}
      renderError={(error) => <Text>User store error: {String(error)}</Text>}
      boot={(store) => {
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
      }}
      batchUpdates={unstable_batchedUpdates}
    >
      {children}
    </LiveStoreProvider>
  );
}

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
      renderLoading={() => <Text>Loading workspace...</Text>}
      renderError={(error) => <Text>Workspace error: {String(error)}</Text>}
      boot={(store) => {
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
      }}
      batchUpdates={unstable_batchedUpdates}
    >
      {children}
    </LiveStoreProvider>
  );
}

function WorkspaceSelector({
  selectedWorkspaceId,
  setSelectedWorkspaceId,
}: {
  selectedWorkspaceId: string | null;
  setSelectedWorkspaceId: (id: string) => void;
}) {
  const { store: userStore } = useStore();
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
              selectedWorkspaceId === workspace.id ? "#e0e0e0" : "#f5f5f5",
          }}
        >
          <Text>
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
  const { store: workspaceStore } = useStore();
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
    <View style={{ padding: 20, backgroundColor: "#f0f0f0" }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>Items</Text>

      {items.map((item) => (
        <View
          key={item.id}
          style={{ padding: 10, marginBottom: 5, backgroundColor: "white" }}
        >
          <Text>
            {item.emoji} {item.name}
          </Text>
        </View>
      ))}

      <View style={{ marginTop: 10 }}>
        <Button title="Add Item" onPress={createItem} />
      </View>
    </View>
  );
}

function MainContent() {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    "WORKSPACE_STORE_debug-1"
  );

  return (
    <ScrollView style={{ flex: 1 }}>
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
