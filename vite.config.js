import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin.html"),
        staff: resolve(__dirname, "staff.html"),
        customer: resolve(__dirname, "customer.html"),
      },
    },
  },
});
