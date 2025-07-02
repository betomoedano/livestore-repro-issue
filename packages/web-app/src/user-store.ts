import {
  Events,
  makeSchema,
  Schema,
  State,
  queryDb,
} from "@livestore/livestore";

// Simple User Store - tracks workspaces only
console.log("📋 === DEFINING USER TABLES ===");

const userTables = {
  workspaces: State.SQLite.table({
    name: "workspaces",
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text(),
      emoji: State.SQLite.text(),
      createdAt: State.SQLite.datetime(),
    },
  }),
};

console.log("📋 User tables defined:", Object.keys(userTables));
console.log("📋 Workspaces table:", userTables.workspaces);

const userEvents = {
  workspaceCreated: Events.synced({
    name: "WorkspaceCreated",
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      emoji: Schema.String,
      createdAt: Schema.Date,
    }),
  }),
};

console.log("⚙️ === DEFINING USER MATERIALIZERS ===");

const userMaterializers = State.SQLite.materializers(userEvents, {
  WorkspaceCreated: ({ id, name, emoji, createdAt }) => {
    console.log("💾 USER MATERIALIZER: Creating workspace:", { id, name, emoji });
    console.log("💾 USER MATERIALIZER: Using table:", userTables.workspaces);
    try {
      const result = userTables.workspaces.insert({
        id,
        name,
        emoji,
        createdAt,
      });
      console.log("💾 USER MATERIALIZER: Insert operation created:", result);
      return result;
    } catch (error) {
      console.error("💾 USER MATERIALIZER ERROR:", error);
      throw error;
    }
  },
});

console.log("⚙️ User materializers defined:", Object.keys(userMaterializers));

console.log("🏗️ === CREATING USER STATE ===");

const userState = State.SQLite.makeState({
  tables: userTables,
  materializers: userMaterializers,
});

console.log("🏗️ User state created:", userState);

// Query for user workspaces
console.log("🔍 === DEFINING USER QUERIES ===");

export const allWorkspaces$ = queryDb(() => userTables.workspaces, {
  label: "allWorkspaces",
});

console.log("🔍 allWorkspaces$ query defined:", allWorkspaces$);

console.log("📦 === CREATING USER SCHEMA ===");

export const simpleUserSchema = makeSchema({
  events: userEvents,
  state: userState,
});

console.log("📦 User schema created:", simpleUserSchema);
console.log("📦 Schema eventsDefsMap:", simpleUserSchema.eventsDefsMap);
console.log("📦 Schema state:", simpleUserSchema.state);

// Export as 'schema' for devtools compatibility
export const schema = simpleUserSchema;

export { userTables, userEvents };