// Funções de exibição usadas por várias páginas

export const $ = (sel, root = document) => root.querySelector(sel);

export const money = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatDate = (iso) => new Date(iso).toLocaleString('pt-BR');

// Evita que textos digitados por usuários virem HTML (proteção contra XSS)
export const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const ICONS = ['👕', '👖', '👟', '🧢', '🎒', '⌚', '🕶️', '👜'];
export const productIcon = (p) => ICONS[(p.id - 1) % ICONS.length];

export const STATUS_LABELS = {
  criado: 'Aguardando pagamento',
  pago: 'Pago',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const statusBadge = (status) =>
  `<span class="status status-${status}">${STATUS_LABELS[status] || escape(status)}</span>`;

// Mensagem rápida no canto da tela
export function toast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.append(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2500);
}
