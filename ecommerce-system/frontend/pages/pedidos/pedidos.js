// Página de pedidos.
// Cliente: vê os pedidos em andamento e concluídos, e paga os que estão aguardando.
// Admin: vê todos os pedidos separados por status e muda o status.

import { api, isAdmin } from '../../components/api.js';
import { $, money, escape, formatDate, toast, STATUS_LABELS, statusBadge } from '../../components/ui.js';
import { initLayout, guard } from '../../components/layout.js';

// Abas: cada pedido aparece só na aba do seu status.
// O cliente não tem aba de cancelados, então eles somem da tela dele.
const ORDER_TABS = {
  admin: {
    novos: { label: 'Pedidos', statuses: ['criado'], empty: 'Nenhum pedido novo.' },
    entrega: { label: 'A entregar', statuses: ['pago', 'enviado'], empty: 'Nenhum pedido aguardando entrega.' },
    concluidos: { label: 'Concluídos', statuses: ['entregue'], empty: 'Nenhum pedido entregue ainda.' },
    cancelados: { label: 'Cancelados', statuses: ['cancelado'], empty: 'Nenhum pedido cancelado.' },
  },
  customer: {
    andamento: { label: 'Em andamento', statuses: ['criado', 'pago', 'enviado'], empty: 'Nenhum pedido em andamento.' },
    concluidos: { label: 'Concluídos', statuses: ['entregue'], empty: 'Nenhum pedido concluído ainda.' },
  },
};
let orderTab = null;
let orders = [];
let methods = {};

// Admin vê um seletor para mudar o status; cliente vê a etiqueta (e o botão Pagar)
function statusView(o) {
  if (!isAdmin()) {
    return o.status === 'criado'
      ? `${statusBadge(o.status)} <button class="btn" data-pay="${o.id}">Pagar</button>`
      : statusBadge(o.status);
  }
  if (o.status === 'cancelado') return statusBadge(o.status);
  return `
    <select class="status-select" data-order="${o.id}">
      ${Object.entries(STATUS_LABELS).map(([value, label]) =>
        `<option value="${value}" ${value === o.status ? 'selected' : ''}>${label}</option>`).join('')}
    </select>`;
}

function paymentInfo(o) {
  if (!o.payment) return '';
  const method = methods[o.payment.method] || o.payment.method;
  return o.payment.status === 'estornado'
    ? `<p class="stock">Pagamento via ${method} estornado</p>`
    : `<p class="stock">Pago via ${method} em ${formatDate(o.payment.createdAt)}</p>`;
}

async function loadOrders() {
  if (!guard()) return;
  if (!Object.keys(methods).length) methods = await api('/pagamentos/formas');
  orders = await api('/pedidos');

  const admin = isAdmin();
  const tabs = ORDER_TABS[admin ? 'admin' : 'customer'];
  if (!tabs[orderTab]) orderTab = Object.keys(tabs)[0];

  $('#orders-title').textContent = admin ? 'Gerenciar pedidos' : 'Meus pedidos';
  $('#order-tabs').innerHTML = Object.entries(tabs).map(([key, tab]) => {
    const count = orders.filter((o) => tab.statuses.includes(o.status)).length;
    return `<button data-tab="${key}" class="tab ${key === orderTab ? 'active' : ''}">
      ${tab.label} <span class="badge">${count}</span></button>`;
  }).join('');

  const visible = orders.filter((o) => tabs[orderTab].statuses.includes(o.status));
  $('#orders-list').innerHTML = visible.length
    ? visible.slice().reverse().map((o) => `
        <div class="card order">
          <div class="order-header">
            <strong>Pedido #${o.id}${admin && o.userName ? ` · ${escape(o.userName)}` : ''}</strong>
            <span>${formatDate(o.createdAt)}</span>
          </div>
          <ul>
            ${o.items.map((i) => `<li>${i.quantity}× ${escape(i.name)} — ${money(i.subtotal)}</li>`).join('')}
          </ul>
          ${paymentInfo(o)}
          <div class="order-footer">
            <strong>Total: ${money(o.total)}</strong>
            <div>${statusView(o)}</div>
          </div>
        </div>`).join('')
    : `<p class="empty">${tabs[orderTab].empty}</p>`;
}

$('#order-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  orderTab = btn.dataset.tab;
  loadOrders();
});

// Admin muda o status
$('#orders-list').addEventListener('change', async (e) => {
  const id = e.target.dataset.order;
  if (!id) return;
  const status = e.target.value;
  if (status === 'cancelado' && !confirm('Cancelar o pedido? Os itens voltam para o estoque.')) {
    return loadOrders();
  }
  try {
    await api(`/pedidos/${id}/status`, { method: 'PATCH', body: { status } });
    const moved = { pago: 'A entregar', enviado: 'A entregar', entregue: 'Concluídos', cancelado: 'Cancelados (estoque devolvido)' };
    toast(moved[status] ? `Pedido #${id} movido para ${moved[status]}` : `Pedido #${id}: ${STATUS_LABELS[status]}`);
  } catch (err) {
    toast(err.message);
  }
  loadOrders();
});

// ---------- Pagamento ----------
let payingId = null;

function openPayment(id) {
  const order = orders.find((o) => o.id === id && o.status === 'criado');
  if (!order) return;
  payingId = id;
  $('#pay-summary').innerHTML = `Pedido #${id} · <strong>${money(order.total)}</strong>`;
  $('#pay-methods').innerHTML = '<legend>Forma de pagamento</legend>' +
    Object.entries(methods).map(([value, label], i) => `
      <label class="radio"><input type="radio" name="method" value="${value}" ${i === 0 ? 'checked' : ''}> ${label}</label>
    `).join('');
  $('#pay-dialog').showModal();
}

$('#orders-list').addEventListener('click', (e) => {
  const id = e.target.dataset.pay;
  if (id) openPayment(Number(id));
});

$('#pay-close').addEventListener('click', () => $('#pay-dialog').close());

$('#pay-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const method = new FormData(e.target).get('method');
  try {
    await api('/pagamentos', { method: 'POST', body: { orderId: payingId, method } });
    $('#pay-dialog').close();
    toast(`Pagamento aprovado! Pedido #${payingId} pago 🎉`);
    loadOrders();
  } catch (err) {
    toast(err.message);
  }
});

initLayout('pedidos', async () => {
  await loadOrders();
  // Vindo do carrinho (?pagar=ID): já abre a janela de pagamento
  const payId = Number(new URLSearchParams(location.search).get('pagar'));
  if (payId && !isAdmin()) {
    history.replaceState(null, '', location.pathname);
    openPayment(payId);
  }
});
