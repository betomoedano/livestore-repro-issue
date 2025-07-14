import {
  Events,
  makeSchema,
  Schema,
  State,
  queryDb,
} from "@livestore/livestore";

// Simple Workspace Store - tracks items only
const workspaceTables = {
  items: State.SQLite.table({
    name: "items",
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text(),
      emoji: State.SQLite.text(),
      createdAt: State.SQLite.datetime(),
    },
  }),
};

const workspaceEvents = {
  itemCreated: Events.synced({
    name: "ItemCreated",
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      emoji: Schema.String,
      createdAt: Schema.Date,
    }),
  }),
};

const workspaceMaterializers = State.SQLite.materializers(workspaceEvents, {
  ItemCreated: ({ id, name, emoji, createdAt }) => {
    console.log("WORKSPACE STORE: Creating item:", { id, name, emoji });
    return workspaceTables.items.insert({
      id,
      name,
      emoji,
      createdAt,
    });
  },
});

const workspaceState = State.SQLite.makeState({
  tables: workspaceTables,
  materializers: workspaceMaterializers,
});

// Query for workspace items
export const allItems$ = queryDb(() => workspaceTables.items, {
  label: "allItems",
});

export const schema = makeSchema({
  events: workspaceEvents,
  state: workspaceState,
  devtools: {
    alias: "workspace",
  },
});

export { workspaceTables, workspaceEvents };
