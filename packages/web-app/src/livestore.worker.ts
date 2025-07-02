import { makeWorker } from "@livestore/adapter-web/worker";

import { simpleUserSchema } from "./user-store.js";

console.log("🔧 === WORKER SETUP ===");
console.log("User Schema:", simpleUserSchema);
console.log("User Schema State:", simpleUserSchema.state);

// For debugging - use only the user schema
makeWorker({
  schema: simpleUserSchema,
});

console.log("✅ Worker registered with user schema");
