// Página do carrinho: mudar quantidades, remover itens e finalizar a compra

import { api } from '../../components/api.js';
import { $, money, escape, toast } from '../../components/ui.js';
import { initLayout, guard } from '../../components/layout.js';

function render({ items, total }) {
  $('#cart-items').innerHTML = items.length
    ? items.map((i) => `
        <div class="card cart-row">
          <div>
            <strong>${escape(i.name)}</strong><br>
            <span class="stock">${money(i.price)} cada</span>
          </div>
          <div class="qty">
            <button class="btn btn-outline" data-qty="${i.productId}" data-value="${i.quantity - 1}"
              ${i.quantity <= 1 ? 'disabled' : ''}>−</button>
            <span>${i.quantity}</span>
            <button class="btn btn-outline" data-qty="${i.productId}" data-value="${i.quantity + 1}"
              ${i.quantity >= i.stock ? 'disabled' : ''}>+</button>
          </div>
          <div>
            <strong>${money(i.subtotal)}</strong>
            <button class="btn btn-danger" data-remove="${i.productId}">Remover</button>
          </div>
        </div>`).join('')
    : '<p class="empty">Seu carrinho está vazio. <a href="/">Ver produtos</a></p>';
  $('#cart-total').textContent = money(total);
  $('#checkout-btn').disabled = items.length === 0;
  $('#cart-count').textContent = items.reduce((sum, i) => sum + i.quantity, 0);
}

async function loadCart() {
  if (!guard()) return;
  render(await api('/carrinho'));
}

$('#cart-items').addEventListener('click', async (e) => {
  const { qty, value, remove } = e.target.dataset;
  try {
    if (qty) {
      render(await api(`/carrinho/${qty}`, { method: 'PUT', body: { quantity: Number(value) } }));
    }
    if (remove) {
      render(await api(`/carrinho/${remove}`, { method: 'DELETE' }));
    }
  } catch (err) {
    toast(err.message);
  }
});

$('#checkout-btn').addEventListener('click', async () => {
  try {
    const order = await api('/pedidos', { method: 'POST' });
    // Vai para a página de pedidos já abrindo o pagamento
    location.href = `/pages/pedidos/?pagar=${order.id}`;
  } catch (err) {
    toast(err.message);
  }
});

initLayout('carrinho', loadCart);
