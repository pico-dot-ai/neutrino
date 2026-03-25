import { createOpenAIProvider } from "@neutrino/ai-gateway";
import { loadEnv } from "./env";
import { createHttpServer } from "./http";

const env = loadEnv();
const aiProvider = createOpenAIProvider(env.OPENAI_API_KEY);
const server = createHttpServer({
  aiProvider,
  env
});

server.listen(env.PORT, () => {
  console.log(`Neutrino API listening on http://127.0.0.1:${env.PORT}`);
});
