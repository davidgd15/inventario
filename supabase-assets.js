// Cliente Supabase criado a partir da configuração local gerada.
// A chave publishable é pública; o RLS valida token Firebase e usuários autorizados.
(() => {
  const config = window.APP_CONFIG?.supabase;
  if (!config?.url || !config?.publishableKey) {
    throw new Error("Configuração Supabase ausente. Execute node generate-config.mjs.");
  }
  window.assetsDb = window.supabase.createClient(config.url, config.publishableKey, {
    accessToken: async () =>
      (await window.firebase?.auth?.().currentUser?.getIdToken()) ?? null,
  });
})();