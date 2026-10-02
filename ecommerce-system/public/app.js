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
  if (name === 'shop') loadProducts();
  if (name === 'cart') loadCart();
  if (name === 'orders') loadOrders();
}

document.querySelectorAll('.nav-btn').forEach((btn) =>
  btn.addEventListener('click', () => showView(btn.dataset.view))
);

// ---------- Produtos ----------
const icons = ['👕', '👖', '👟', '🧢', '🎒', '⌚', '🕶️', '👜'];

async function loadProducts() {
  const products = await api('/products');
  $('#products').innerHTML = products.length
    ? products.map((p) => `
        <div class="card product">
          <div class="thumb">${icons[(p.id - 1) % icons.length]}</div>
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
    : '<p class="empty">Nenhum produto cadastrado.</p>';
}

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
  } catch (err) {
    toast(err.message);
  }
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
async function loadOrders() {
  const orders = await api('/orders');
  $('#orders-list').innerHTML = orders.length
    ? orders.slice().reverse().map((o) => `
        <div class="card order">
          <div class="order-header">
            <strong>Pedido #${o.id}</strong>
            <span>${new Date(o.createdAt).toLocaleString('pt-BR')}</span>
          </div>
          <ul>
            ${o.items.map((i) => `<li>${i.quantity}× ${escape(i.name)} — ${money(i.subtotal)}</li>`).join('')}
          </ul>
          <p><strong>Total: ${money(o.total)}</strong> · ${escape(o.status)}</p>
        </div>`).join('')
    : '<p class="empty">Você ainda não fez nenhum pedido.</p>';
}

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
