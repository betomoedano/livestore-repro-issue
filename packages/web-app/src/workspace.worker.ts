import { makeWorker } from "@livestore/adapter-web/worker";

import { simpleWorkspaceSchema } from "./workspace-store.js";

console.log("🔧 === WORKSPACE WORKER SETUP ===");
console.log("Workspace Schema:", simpleWorkspaceSchema);
console.log("Workspace Schema State:", simpleWorkspaceSchema.state);

// For debugging - use only the workspace schema
makeWorker({
  schema: simpleWorkspaceSchema,
});

console.log("✅ Worker registered with workspace schema");