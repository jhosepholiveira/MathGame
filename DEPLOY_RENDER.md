# Deploy na Render (Blueprint)

## 1) Subir o repositório
- Envie este projeto para GitHub/GitLab.

## 2) Criar Blueprint na Render
- Render Dashboard -> `New` -> `Blueprint`.
- Conecte o repositório.
- A Render vai ler o arquivo [`render.yaml`](/d:/ANTIGRAVITY/MathGame/render.yaml).

## 3) Conferir nomes dos serviços
- Backend: `mathgame-backend`
- Frontend: `mathgame-frontend`

Se mudar o nome do backend, atualize no frontend:
- variável `VITE_BACKEND_URL`
- exemplo: `https://<nome-do-backend>.onrender.com`

## 4) Deploy
- Clique em `Apply`.
- Aguarde os 2 serviços ficarem `Live`.

## 5) Teste
- Abra a URL do frontend da Render.
- Entre em `#/host`, crie sala e conecte jogadores.

## Observações
- No plano free, a Render pode hibernar quando ficar sem uso.
- O backend já tem health check em `/health`.
