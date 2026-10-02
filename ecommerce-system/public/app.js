// ---------- Estado ----------
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let registering = false;

const $ = (sel) => document.querySelector(sel);
const money = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// ---------- Comunicação com a API ----------
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });

  if (res.status === 401 && token) {
    logout();
    openAuth();
  }
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro inesperado');
  return data;
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ---------- Navegação ----------
function showView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
  $(`#view-${name}`).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.view === name)
  );
  if (name === 'shop') {
    loadCategories();
    loadProducts();
  }
  if (name === 'cart') loadCart();
  if (name === 'orders') loadOrders();
}

document.querySelectorAll('.nav-btn').forEach((btn) =>
  btn.addEventListener('click', () => showView(btn.dataset.view))
);

// ---------- Produtos ----------
const icons = ['👕', '👖', '👟', '🧢', '🎒', '⌚', '🕶️', '👜'];

async function loadProducts() {
  // Monta a URL com os filtros preenchidos, ex.: /products?q=cami&category=Roupas
  const params = new URLSearchParams();
  for (const [key, value] of new FormData($('#filters'))) {
    if (value) params.set(key, value);
  }
  const products = await api(`/products?${params}`);
  $('#products').innerHTML = products.length
    ? products.map((p) => `
        <div class="card product" data-open="${p.id}" title="Ver detalhes">
          <div class="thumb">${icons[(p.id - 1) % icons.length]}</div>
          <span class="category">${escape(p.category)}</span>
          <h3>${escape(p.name)}</h3>
          <span class="price">${money(p.price)}</span>
          <span class="stock">${p.stock > 0 ? `${p.stock} em estoque` : 'Esgotado'}</span>
          <button class="btn" data-add="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>
            Adicionar ao carrinho
          </button>
          ${user?.role === 'admin'
            ? `<button class="btn btn-danger" data-delete="${p.id}">Excluir</button>`
            : ''}
        </div>`).join('')
    : '<p class="empty">Nenhum produto encontrado.</p>';
}

// Preenche o select de categorias (e as sugestões do formulário de admin)
async function loadCategories() {
  const categories = await api('/products/categories');
  const select = $('#filters select[name="category"]');
  const current = select.value;
  select.innerHTML = '<option value="">Todas as categorias</option>' +
    categories.map((c) => `<option value="${escape(c)}">${escape(c)}</option>`).join('');
  select.value = current;
  $('#category-list').innerHTML = categories.map((c) => `<option value="${escape(c)}">`).join('');
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
  const deleteId = e.target.dataset.delete;
  try {
    if (addId) {
      if (!token) return openAuth();
      await api('/cart', { method: 'POST', body: JSON.stringify({ productId: Number(addId), quantity: 1 }) });
      toast('Adicionado ao carrinho!');
      updateCartCount();
    }
    if (deleteId && confirm('Excluir este produto?')) {
      await api(`/products/${deleteId}`, { method: 'DELETE' });
      toast('Produto excluído');
      loadProducts();
    }
    // Clicou no card (fora dos botões): abre os detalhes
    const card = e.target.closest('[data-open]');
    if (card && !e.target.closest('button')) openProduct(Number(card.dataset.open));
  } catch (err) {
    toast(err.message);
  }
});

// ---------- Detalhes do produto ----------
let currentProduct = null;

async function openProduct(id) {
  const p = await api(`/products/${id}`);
  currentProduct = p;
  $('#pd-thumb').textContent = icons[(p.id - 1) % icons.length];
  $('#pd-category').textContent = p.category;
  $('#pd-name').textContent = p.name;
  $('#pd-description').textContent = p.description || 'Sem descrição.';
  $('#pd-price').textContent = money(p.price);
  $('#pd-stock').textContent = p.stock > 0 ? `${p.stock} em estoque` : 'Esgotado';

  // Cliente: quantidade limitada ao estoque
  const qty = $('#pd-buy input[name="quantity"]');
  qty.value = 1;
  qty.max = p.stock;
  $('#pd-buy').classList.toggle('hidden', p.stock === 0);

  // Admin: preenche o formulário de edição
  const edit = $('#pd-edit');
  for (const field of ['name', 'price', 'category', 'description', 'stock']) {
    edit.elements[field].value = p[field];
  }
  $('#pd-restock input[name="amount"]').value = 1;

  if (!$('#product-dialog').open) $('#product-dialog').showModal();
}

async function saveProduct(changes, message) {
  try {
    await api(`/products/${currentProduct.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...currentProduct, ...changes }),
    });
    toast(message);
    await openProduct(currentProduct.id);
    loadProducts();
    loadCategories();
  } catch (err) {
    toast(err.message);
  }
}

$('#product-close').addEventListener('click', () => $('#product-dialog').close());

$('#pd-buy').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!token) {
    $('#product-dialog').close();
    return openAuth();
  }
  const quantity = Number(new FormData(e.target).get('quantity'));
  try {
    await api('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId: currentProduct.id, quantity }),
    });
    toast(`${quantity}× ${currentProduct.name} no carrinho!`);
    updateCartCount();
    $('#product-dialog').close();
  } catch (err) {
    toast(err.message);
  }
});

$('#pd-restock').addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = Number(new FormData(e.target).get('amount'));
  // Busca o estoque atual antes de somar (alguém pode ter comprado nesse meio-tempo)
  const { stock } = await api(`/products/${currentProduct.id}`);
  saveProduct({ stock: stock + amount }, `+${amount} no estoque`);
});

$('#pd-edit').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  saveProduct({
    name: form.get('name'),
    price: Number(form.get('price')),
    category: form.get('category'),
    description: form.get('description'),
    stock: Number(form.get('stock')),
  }, 'Produto atualizado!');
});

// ---------- Carrinho ----------
async function updateCartCount() {
  if (!token) return;
  const { items } = await api('/cart');
  $('#cart-count').textContent = items.reduce((sum, i) => sum + i.quantity, 0);
}

async function loadCart() {
  const { items, total } = await api('/cart');
  $('#cart-items').innerHTML = items.length
    ? items.map((i) => `
        <div class="card cart-row">
          <div>
            <strong>${escape(i.name)}</strong><br>
            <span class="stock">${i.quantity} × ${money(i.price)}</span>
          </div>
          <div>
            <strong>${money(i.subtotal)}</strong>
            <button class="btn btn-danger" data-remove="${i.productId}">Remover</button>
          </div>
        </div>`).join('')
    : '<p class="empty">Seu carrinho está vazio.</p>';
  $('#cart-total').textContent = money(total);
  $('#checkout-btn').disabled = items.length === 0;
  $('#cart-count').textContent = items.reduce((sum, i) => sum + i.quantity, 0);
}

$('#cart-items').addEventListener('click', async (e) => {
  const id = e.target.dataset.remove;
  if (!id) return;
  await api(`/cart/${id}`, { method: 'DELETE' });
  loadCart();
});

$('#checkout-btn').addEventListener('click', async () => {
  try {
    const order = await api('/orders', { method: 'POST' });
    toast(`Pedido #${order.id} realizado! 🎉`);
    $('#cart-count').textContent = 0;
    showView('orders');
  } catch (err) {
    toast(err.message);
  }
});

// ---------- Pedidos ----------
const STATUS_LABELS = {
  criado: 'Aguardando pagamento',
  pago: 'Pago',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

// Admin vê um seletor para mudar o status; cliente vê só a etiqueta
function statusView(o) {
  if (user?.role !== 'admin' || o.status === 'cancelado') {
    return `<span class="status status-${o.status}">${STATUS_LABELS[o.status] || escape(o.status)}</span>`;
  }
  return `
    <select class="status-select" data-order="${o.id}">
      ${Object.entries(STATUS_LABELS).map(([value, label]) =>
        `<option value="${value}" ${value === o.status ? 'selected' : ''}>${label}</option>`).join('')}
    </select>`;
}

// Abas de pedidos: cada pedido aparece só na aba do seu status.
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

$('#order-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  orderTab = btn.dataset.tab;
  loadOrders();
});

async function loadOrders() {
  const orders = await api('/orders');
  const isAdmin = user?.role === 'admin';
  const tabs = ORDER_TABS[isAdmin ? 'admin' : 'customer'];
  if (!tabs[orderTab]) orderTab = Object.keys(tabs)[0];

  $('#orders-title').textContent = isAdmin ? 'Gerenciar pedidos' : 'Meus pedidos';
  $('#order-tabs').innerHTML = Object.entries(tabs).map(([key, tab]) => {
    const count = orders.filter((o) => tab.statuses.includes(o.status)).length;
    return `<button data-tab="${key}" class="tab ${key === orderTab ? 'active' : ''}">
      ${tab.label} <span class="badge">${count}</span></button>`;
  }).join('');

  const visible = orders.filter((o) => tabs[orderTab].statuses.includes(o.status));
  const empty = tabs[orderTab].empty;

  $('#orders-list').innerHTML = visible.length
    ? visible.slice().reverse().map((o) => `
        <div class="card order">
          <div class="order-header">
            <strong>Pedido #${o.id}${isAdmin && o.userName ? ` · ${escape(o.userName)}` : ''}</strong>
            <span>${new Date(o.createdAt).toLocaleString('pt-BR')}</span>
          </div>
          <ul>
            ${o.items.map((i) => `<li>${i.quantity}× ${escape(i.name)} — ${money(i.subtotal)}</li>`).join('')}
          </ul>
          <div class="order-footer">
            <strong>Total: ${money(o.total)}</strong>
            ${statusView(o)}
          </div>
        </div>`).join('')
    : `<p class="empty">${empty}</p>`;
}

$('#orders-list').addEventListener('change', async (e) => {
  const id = e.target.dataset.order;
  if (!id) return;
  const status = e.target.value;
  if (status === 'cancelado' && !confirm('Cancelar o pedido? Os itens voltam para o estoque.')) {
    return loadOrders();
  }
  try {
    await api(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    const moved = { pago: 'A entregar', enviado: 'A entregar', entregue: 'Concluídos', cancelado: 'Cancelados (estoque devolvido)' };
    toast(moved[status] ? `Pedido #${id} movido para ${moved[status]}` : `Pedido #${id}: ${STATUS_LABELS[status]}`);
  } catch (err) {
    toast(err.message);
  }
  loadOrders();
});

// ---------- Admin ----------
$('#product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    await api('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: form.get('name'),
        price: Number(form.get('price')),
        stock: Number(form.get('stock')),
        category: form.get('category'),
        description: form.get('description'),
      }),
    });
    toast('Produto cadastrado!');
    e.target.reset();
    showView('shop');
  } catch (err) {
    toast(err.message);
  }
});

// ---------- Login / Cadastro ----------
function openAuth() {
  $('#auth-error').textContent = '';
  $('#auth-dialog').showModal();
}

function setAuthMode(isRegister) {
  registering = isRegister;
  $('#auth-title').textContent = isRegister ? 'Criar conta' : 'Entrar';
  $('#auth-submit').textContent = isRegister ? 'Cadastrar' : 'Entrar';
  $('#auth-switch-text').textContent = isRegister ? 'Já tem conta?' : 'Não tem conta?';
  $('#auth-switch').textContent = isRegister ? 'Entrar' : 'Cadastre-se';
  $('#name-field').classList.toggle('hidden', !isRegister);
  $('#name-field input').required = isRegister;
  $('#auth-error').textContent = '';
}

$('#login-btn').addEventListener('click', openAuth);
$('#auth-close').addEventListener('click', () => $('#auth-dialog').close());
$('#auth-switch').addEventListener('click', (e) => {
  e.preventDefault();
  setAuthMode(!registering);
});

$('#auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = { email: form.get('email'), password: form.get('password') };
  if (registering) body.name = form.get('name');
  try {
    const data = await api(registering ? '/auth/register' : '/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    token = data.token;
    user = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    $('#auth-dialog').close();
    e.target.reset();
    setAuthMode(false);
    toast(`Olá, ${user.name}!`);
    renderUser();
  } catch (err) {
    $('#auth-error').textContent = err.message;
  }
});

function logout() {
  token = null;
  user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  renderUser();
}

$('#logout-btn').addEventListener('click', () => {
  logout();
  toast('Você saiu da conta');
});

// Mostra/esconde elementos conforme quem está logado
function renderUser() {
  const logged = Boolean(token);
  document.querySelectorAll('.auth-only').forEach((el) => el.classList.toggle('hidden', !logged));
  document.querySelectorAll('.admin-only').forEach((el) =>
    el.classList.toggle('hidden', user?.role !== 'admin')
  );
  $('#login-btn').classList.toggle('hidden', logged);
  $('#user-name').textContent = logged ? `Olá, ${user.name}${user.role === 'admin' ? ' (admin)' : ''}` : '';
  showView('shop');
  updateCartCount();
}

renderUser();
