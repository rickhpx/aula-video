// Dashboard (só admin): números gerais da loja

import { api } from '../../components/api.js';
import { $, money, escape, STATUS_LABELS } from '../../components/ui.js';
import { initLayout, guard } from '../../components/layout.js';

// Lista de barras horizontais: [{ label, value, text }]
function bars(rows, emptyText) {
  if (!rows.length) return `<p class="empty">${emptyText}</p>`;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return rows.map((r) => `
    <div class="bar-row">
      <span class="bar-label">${r.label}</span>
      <div class="bar"><div class="bar-fill ${r.className || ''}" style="width: ${(r.value / max) * 100}%"></div></div>
      <span class="bar-value">${r.text ?? r.value}</span>
    </div>`).join('');
}

async function loadDashboard() {
  if (!guard({ admin: true })) return;
  const d = await api('/dashboard');

  const stats = [
    { label: 'Faturamento', value: money(d.revenue), hint: 'pedidos pagos, enviados e entregues' },
    { label: 'Vendas', value: d.paidOrders, hint: 'pedidos pagos' },
    { label: 'Ticket médio', value: money(d.averageTicket), hint: 'valor médio por venda' },
    { label: 'Clientes', value: d.customers, hint: 'contas cadastradas' },
    { label: 'Produtos', value: d.products, hint: `${d.units} unidades em estoque` },
  ];
  $('#stats').innerHTML = stats.map((s) => `
    <div class="card stat">
      <span class="stat-label">${s.label}</span>
      <strong class="stat-value">${s.value}</strong>
      <span class="stat-hint">${s.hint}</span>
    </div>`).join('');

  $('#by-status').innerHTML = bars(
    Object.entries(STATUS_LABELS)
      .map(([status, label]) => ({ label, value: d.byStatus[status] || 0, className: `fill-${status}` })),
    'Nenhum pedido ainda.'
  );

  $('#top-products').innerHTML = bars(
    d.topProducts.map((p) => ({ label: escape(p.name), value: p.quantity, text: `${p.quantity} un.` })),
    'Nenhuma venda ainda.'
  );

  $('#low-stock').innerHTML = d.lowStock.length
    ? `<ul class="low-list">${d.lowStock.map((p) => `
        <li>
          <span>${escape(p.name)}</span>
          <span class="stock-pill ${p.stock === 0 ? 'out' : 'low'}">${p.stock === 0 ? 'Esgotado' : p.stock}</span>
        </li>`).join('')}</ul>
       <a class="btn btn-outline" href="/pages/estoque/">Repor no estoque</a>`
    : `<p class="empty">Todos os produtos têm mais de ${d.lowStockLimit} unidades. 👍</p>`;
}

initLayout('dashboard', loadDashboard);
