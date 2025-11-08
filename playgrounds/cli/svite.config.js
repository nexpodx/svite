import { defineConfig } from "svite";
import { foo } from "./test";

export default defineConfig((env) => {
  foo();
  console.log(env, import.meta.url);
  return {
    dev: {
      port: 8088,
      host: true,
    },
    base: "//",
  };
});
