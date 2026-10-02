# E-commerce (projeto de estudo)

Loja virtual em Node.js + Express + SQLite, com API REST e front-end simples.
O usuário é iniciante e prefere respostas em **português**, com passo a passo e explicações simples.

## Como rodar
```
npm install      # só na primeira vez (ou após clonar)
npm run dev      # servidor com nodemon em http://localhost:3000
```
- Rodar os comandos **dentro da pasta `ecommerce-system`** (onde está o package.json).
- Loja: http://localhost:3000 · Testes da API: `requests.http` (extensão REST Client).

## Estrutura
- `index.js`: servidor Express; serve `public/` e monta as rotas.
- `src/data/db.js`: banco SQLite com `node:sqlite` (embutido no Node 22.5+; aqui é o Node 24), criação de tabelas, migrações simples e a função `transaction()`.
- `src/middleware/auth.js`: JWT (`requireAuth`, `requireAdmin`, `createToken`).
- `src/routes/`: `auth.js`, `products.js`, `cart.js`, `orders.js`.
- `public/`: front-end em HTML/CSS/JS puro (`index.html`, `style.css`, `app.js`).
- `ecommerce.db`: o banco, **fora do Git**. Apagar esse arquivo zera os dados, e ele é recriado com 3 produtos de exemplo.

## Regras / decisões
- O **primeiro usuário cadastrado vira admin**; os demais são `customer`.
- Produtos: leitura pública; criar, editar e excluir só para admin.
- Carrinho e pedidos são por usuário e exigem login (`Authorization: Bearer <token>`).
- Finalizar o pedido (`POST /orders`) roda numa transação: cria o pedido, baixa o estoque e limpa o carrinho.
- Variáveis de ambiente opcionais: `PORT`, `DB_PATH` (útil para testar com um banco temporário), `JWT_SECRET` (obrigatória em produção).
- Para testes automatizados, usar `DB_PATH` apontando para um arquivo temporário e outra `PORT`, para não sujar o banco real do usuário.

## Ideias de próximos passos
- Categorias de produtos, busca e filtro por preço
- Imagens dos produtos (upload)
- Status do pedido (pago, enviado, entregue) gerenciado pelo admin
- Editar quantidade no carrinho pelo front-end
- Testes automatizados
- Publicar o projeto na internet (deploy)
