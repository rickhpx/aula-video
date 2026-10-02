// Página inicial: vitrine com busca e filtros

import { api, isLogged } from '../../components/api.js';
import { $, money, escape, productIcon, toast } from '../../components/ui.js';
import { initLayout, openAuth, updateCartCount } from '../../components/layout.js';
import { openProduct } from '../../components/productDialog.js';

async function loadProducts() {
  // Monta a URL com os filtros preenchidos, ex.: /estoque?q=cami&category=Roupas
  const params = new URLSearchParams();
  for (const [key, value] of new FormData($('#filters'))) {
    if (value) params.set(key, value);
  }
  const products = await api(`/estoque?${params}`);
  $('#products').innerHTML = products.length
    ? products.map((p) => `
        <div class="card product" data-open="${p.id}" title="Ver detalhes">
          <div class="thumb">${productIcon(p)}</div>
          <span class="category">${escape(p.category)}</span>
          <h3>${escape(p.name)}</h3>
          <span class="price">${money(p.price)}</span>
          <span class="stock">${p.stock > 0 ? `${p.stock} em estoque` : 'Esgotado'}</span>
          <button class="btn" data-add="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>
            Adicionar ao carrinho
          </button>
        </div>`).join('')
    : '<p class="empty">Nenhum produto encontrado.</p>';
}

async function loadCategories() {
  const categories = await api('/estoque/categorias');
  const select = $('#filters select[name="category"]');
  const current = select.value;
  select.innerHTML = '<option value="">Todas as categorias</option>' +
    categories.map((c) => `<option value="${escape(c)}">${escape(c)}</option>`).join('');
  select.value = current;
}

// Filtra enquanto digita (espera 300 ms depois da última tecla)
let filterTimer;
$('#filters').addEventListener('input', () => {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(loadProducts, 300);
});
$('#filters').addEventListener('reset', () => setTimeout(loadProducts));
$('#filters').addEventListener('submit', (e) => e.preventDefault());

$('#products').addEventListener('click', async (e) => {
  const addId = e.target.dataset.add;
  if (addId) {
    if (!isLogged()) return openAuth();
    try {
      await api('/carrinho', { method: 'POST', body: { productId: Number(addId), quantity: 1 } });
      toast('Adicionado ao carrinho!');
      updateCartCount();
    } catch (err) {
      toast(err.message);
    }
    return;
  }
  // Clicou no card (fora do botão): abre os detalhes
  const card = e.target.closest('[data-open]');
  if (card) openProduct(Number(card.dataset.open));
});

initLayout('loja', () => {
  loadCategories();
  loadProducts();
});
