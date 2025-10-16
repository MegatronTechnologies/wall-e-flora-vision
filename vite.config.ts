import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const fallbackPort = 43173;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const portFromEnv = Number(process.env.VITE_PORT ?? process.env.PORT);
  const port = Number.isNaN(portFromEnv) ? fallbackPort : portFromEnv;
  const host = process.env.VITE_HOST ?? "::";

  return {
    server: {
      host,
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
