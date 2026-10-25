import { app } from "./app.js";
import { env } from "./config/env.js";
import { D365Service } from "./services/d365.service.js";
import { DeepwikiService } from "./services/deepwiki.service.js";

const server = app.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${env.PORT}`);
});

const shutdown = async () => {
  server.close();
  await Promise.all([DeepwikiService.close(), D365Service.close()]);
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
