(() => {
  const config = window.APP_CONFIG?.firebase;
  if (!config) throw new Error("Configuração Firebase ausente. Execute node generate-config.mjs.");
  if (!window.firebase.apps.length) window.firebase.initializeApp(config);
  window.ASSET_ALLOWED_USERS = {
    "david@netz.com": "David",
    "matheus@netz.com": "Matheus",
  };
})();