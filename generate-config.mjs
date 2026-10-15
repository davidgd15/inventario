import { readFile, writeFile } from "node:fs/promises";

const env = {};
for (const rawLine of (await readFile(".env", "utf8")).split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const separator = line.indexOf("=");
  if (separator < 1) continue;
  const key = line.slice(0, separator).trim();
  let value = line.slice(separator + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  env[key] = value;
}

const required = ["FIREBASE_API_KEY", "FIREBASE_AUTH_DOMAIN", "FIREBASE_PROJECT_ID", "FIREBASE_APP_ID", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"];
const missing = required.filter((key) => !env[key]);
if (missing.length) throw new Error(`Preencha no .env: ${missing.join(", ")}`);

const config = {
  firebase: {
    apiKey: env.FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN,
    projectId: env.FIREBASE_PROJECT_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
    appId: env.FIREBASE_APP_ID,
  },
  supabase: {
    url: env.SUPABASE_URL,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
  },
};
await writeFile("runtime-config.js", `// Gerado de .env. Este arquivo é carregado pelo navegador; não coloque chaves administrativas aqui.\nwindow.APP_CONFIG = Object.freeze(${JSON.stringify(config, null, 2)});\n`, "utf8");
console.log("runtime-config.js gerado. Ele contém somente configurações públicas do cliente.");