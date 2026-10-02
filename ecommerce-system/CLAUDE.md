# E-commerce (projeto de estudo)

Loja virtual em Node.js + Express + SQLite, com API REST e front-end em HTML/CSS/JS puro (sem framework e sem build).
O usuário é iniciante e prefere respostas em **português**, com passo a passo e explicações simples.

## Como rodar
```
npm install      # só na primeira vez (ou após clonar)
npm run dev      # servidor com nodemon em http://localhost:3000
```
- Rodar os comandos **dentro da pasta `ecommerce-system`** (onde está o package.json).
- Loja: http://localhost:3000 · Testes da API: `requests.http` (extensão REST Client).

## Estrutura
```
backend/
  server.js          # Express: serve frontend/ e monta as rotas em /api/...
  middleware/auth.js # JWT (requireAuth, requireAdmin, createToken)
  routes/            # só liga URL → controller: auth, estoque, carrinho, pedidos, pagamentos, dashboard
  controllers/       # valida a requisição e responde (status HTTP, mensagens de erro)
  models/            # acesso ao banco (SQL). db.js = conexão, migrações e transaction()
frontend/
  index.html         # Loja (vitrine) → pages/loja/loja.js
  pages/             # carrinho/, pedidos/, estoque/ (admin), dashboard/ (admin): index.html + .js
  components/        # módulos ES compartilhados: api.js (sessão + fetch), ui.js, layout.js (menu, login, guard), productDialog.js
  css/style.css
database/
  schema.sql         # CREATE TABLE IF NOT EXISTS (roda a cada início)
  seed.sql           # 3 produtos de exemplo (só se a tabela estiver vazia)
```
- `ecommerce.db` (raiz): o banco, **fora do Git**. Apagar esse arquivo zera os dados.
- Banco com `node:sqlite` (embutido no Node 22.5+; aqui é o Node 24).
- Coluna nova numa tabela existente: adicionar no `schema.sql` **e** uma migração `ALTER TABLE` em `models/db.js`.
- Front-end usa `<script type="module">` e caminhos absolutos (`/components/...`, `/css/...`).

## Regras / decisões
- O **primeiro usuário cadastrado vira admin**; os demais são `customer`.
- Estoque (produtos): leitura pública; criar, editar, repor (`POST /api/estoque/:id/repor`) e excluir só para admin.
- Produtos têm `category` (padrão `Geral`) e `description`; `GET /api/estoque` aceita `q`, `category`, `minPrice`, `maxPrice`.
- Carrinho e pedidos são por usuário e exigem login (`Authorization: Bearer <token>`).
- Finalizar o pedido (`POST /api/pedidos`) roda numa transação: cria o pedido, baixa o estoque e limpa o carrinho.
- Status do pedido: `criado → pago → enviado → entregue` ou `cancelado`. Admin muda (`PATCH /api/pedidos/:id/status`); cancelar devolve o estoque, estorna o pagamento e é definitivo.
- Pagamento é **simulado** (pix, cartão, boleto): `POST /api/pagamentos` só pelo dono, só em pedido `criado`; aprova na hora e marca como `pago`.
- Página de pedidos: admin tem abas Pedidos (criado) / A entregar (pago, enviado) / Concluídos / Cancelados; cliente tem Em andamento / Concluídos e **não vê cancelados**.
- Variáveis de ambiente opcionais: `PORT`, `DB_PATH` (útil para testar com um banco temporário), `JWT_SECRET` (obrigatória em produção).
- Para testes automatizados, usar `DB_PATH` apontando para um arquivo temporário e outra `PORT`, para não sujar o banco real do usuário.

## Ideias de próximos passos
- Imagens dos produtos (upload)
- Testes automatizados
- Publicar o projeto na internet (deploy)
