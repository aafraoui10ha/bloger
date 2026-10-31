import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "src/generated/**", ".pgdata/**", ".pgdata-test/**", "playwright-report/**", "test-results/**", "next-env.d.ts", "public/models/**", "desktop/.next/**", "desktop/out/**", "desktop/next-env.d.ts", "src-tauri/target/**", "src-tauri/gen/**"],
  },
];

export default config;
