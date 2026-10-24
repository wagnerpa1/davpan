import { bindings, defineConfig, defineWorker } from "cf/config";
import { createWorkersResponseStoreServiceBindingConfig } from "@vinext/cloudflare/cache/config";

const responseStore = await createWorkersResponseStoreServiceBindingConfig({
  worker: {
    name: "davpan-response-store",
    compatibilityDate: "2026-10-24",
    compatibilityFlags: ["nodejs_compat"],
  },
  bucket: "davpan-response-store-cache-bodies",
});

export const responseStoreServiceBinding = responseStore.serviceBindingWorker;

export default defineConfig({
  worker: defineWorker({
    ...responseStore.applicationWorker,
    name: "davpan",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-24",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ...responseStore.applicationWorker.env,
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
    },
  }),
});
