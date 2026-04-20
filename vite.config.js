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
  server: {
    // Proxy API calls to the .NET backend during development
    proxy: {
      "/api": {
        // target: "http://localhost:5001", 
        target: "https://greeleaf-dnfqcpgthydgb9da.southeastasia-01.azurewebsites.net/",
        changeOrigin: true,
      },
    },
  },
  // Ensure Vite resolves clean URLs like /admin → admin.html
  appType: "mpa",
});
