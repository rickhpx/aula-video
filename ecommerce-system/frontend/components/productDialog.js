// Janela de detalhes do produto, com escolha de quantidade para o carrinho

import { api, isLogged, isAdmin } from './api.js';
import { $, money, productIcon, toast } from './ui.js';
import { openAuth, updateCartCount } from './layout.js';

const HTML = `
  <dialog id="product-dialog">
    <div class="product-detail">
      <button type="button" id="pd-close" class="close">✕</button>
      <div class="thumb" id="pd-thumb"></div>
      <span class="category" id="pd-category"></span>
      <h2 id="pd-name"></h2>
      <p id="pd-description" class="description"></p>
      <span class="price" id="pd-price"></span>
      <span class="stock" id="pd-stock"></span>
      <form id="pd-buy" class="inline-form">
        <label>Quantidade <input name="quantity" type="number" min="1" value="1" required></label>
        <button class="btn">Adicionar ao carrinho</button>
      </form>
      <a id="pd-admin" class="btn btn-outline" href="/pages/estoque/">Gerenciar no estoque</a>
    </div>
  </dialog>`;

let current = null;

function setup() {
  document.body.insertAdjacentHTML('beforeend', HTML);
  $('#pd-close').addEventListener('click', () => $('#product-dialog').close());

  $('#pd-buy').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isLogged()) {
      $('#product-dialog').close();
      return openAuth();
    }
    const quantity = Number(new FormData(e.target).get('quantity'));
    try {
      await api('/carrinho', { method: 'POST', body: { productId: current.id, quantity } });
      toast(`${quantity}× ${current.name} no carrinho!`);
      updateCartCount();
      $('#product-dialog').close();
    } catch (err) {
      toast(err.message);
    }
  });
}

export async function openProduct(id) {
  if (!$('#product-dialog')) setup();
  const p = await api(`/estoque/${id}`);
  current = p;

  $('#pd-thumb').textContent = productIcon(p);
  $('#pd-category').textContent = p.category;
  $('#pd-name').textContent = p.name;
  $('#pd-description').textContent = p.description || 'Sem descrição.';
  $('#pd-price').textContent = money(p.price);
  $('#pd-stock').textContent = p.stock > 0 ? `${p.stock} em estoque` : 'Esgotado';

  const qty = $('#pd-buy input[name="quantity"]');
  qty.value = 1;
  qty.max = p.stock;
  $('#pd-buy').classList.toggle('hidden', p.stock === 0);
  $('#pd-admin').classList.toggle('hidden', !isAdmin());

  $('#product-dialog').showModal();
}
