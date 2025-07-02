import {
  Events,
  makeSchema,
  Schema,
  State,
  queryDb,
} from "@livestore/livestore";

// Simple User Store - tracks workspaces only
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

const userMaterializers = State.SQLite.materializers(userEvents, {
  WorkspaceCreated: ({ id, name, emoji, createdAt }) => {
    console.log("USER STORE: Creating workspace:", { id, name, emoji });
    return userTables.workspaces.insert({
      id,
      name,
      emoji,
      createdAt,
    });
  },
});

const userState = State.SQLite.makeState({
  tables: userTables,
  materializers: userMaterializers,
});

// Query for user workspaces
export const allWorkspaces$ = queryDb(() => userTables.workspaces, {
  label: "allWorkspaces",
});

export const simpleUserSchema = makeSchema({
  events: userEvents,
  state: userState,
});

// Export as 'schema' for devtools compatibility
export const schema = simpleUserSchema;

export { userTables, userEvents };