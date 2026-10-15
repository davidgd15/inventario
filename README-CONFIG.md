# Configuração local

1. Mantenha os valores locais em `.env` (arquivo ignorado pelo Git).
2. Gere o arquivo consumido pelo site com `node generate-config.mjs`.
3. Sirva/publique o projeto incluindo o `runtime-config.js` gerado.

`runtime-config.js` é enviado ao navegador e seus valores podem ser vistos por qualquer visitante. Os valores atuais são configurações públicas: Firebase Web config e chave Supabase publishable. Não coloque Firebase Admin/service-account credentials, Supabase `service_role` ou Supabase secret key neste arquivo nem em código de navegador. Para proteger segredos de verdade é necessário um backend.

Para GitHub Pages, configure variáveis no ambiente de build e gere `runtime-config.js` na Action antes de publicar o artefato. Não faça commit do `.env` nem do `runtime-config.js` gerado.