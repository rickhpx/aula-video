// Cabeçalho (menu), janela de login/cadastro e proteção das páginas.
// Toda página chama initLayout('nome-da-pagina', funcaoQueDesenhaAPagina).

import { api, session, setSession, logout, isLogged, isAdmin } from './api.js';
import { $, toast } from './ui.js';

const LINKS = [
  { id: 'loja', href: '/', label: 'Loja' },
  { id: 'carrinho', href: '/pages/carrinho/', label: 'Carrinho <span id="cart-count" class="badge">0</span>', login: true },
  { id: 'pedidos', href: '/pages/pedidos/', label: 'Pedidos', login: true },
  { id: 'estoque', href: '/pages/estoque/', label: 'Estoque', admin: true },
  { id: 'dashboard', href: '/pages/dashboard/', label: 'Dashboard', admin: true },
];

const HEADER = `
  <header class="topbar">
    <a href="/" class="logo">🛍️ Minha Loja</a>
    <nav id="nav"></nav>
    <div class="user-area">
      <span id="user-name"></span>
      <button id="login-btn" class="btn">Entrar</button>
      <button id="logout-btn" class="btn btn-outline">Sair</button>
    </div>
  </header>`;

const AUTH_DIALOG = `
  <dialog id="auth-dialog">
    <form id="auth-form" class="form">
      <h2 id="auth-title">Entrar</h2>
      <label id="name-field" class="hidden">Nome <input name="name"></label>
      <label>E-mail <input name="email" type="email" required></label>
      <label>Senha <input name="password" type="password" minlength="6" required></label>
      <p id="auth-error" class="error"></p>
      <button class="btn" id="auth-submit">Entrar</button>
      <p class="switch">
        <span id="auth-switch-text">Não tem conta?</span>
        <a href="#" id="auth-switch">Cadastre-se</a>
      </p>
      <button type="button" id="auth-close" class="close">✕</button>
    </form>
  </dialog>`;

let registering = false;

export function openAuth() {
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

export async function updateCartCount() {
  const badge = $('#cart-count');
  if (!badge || !isLogged()) return;
  const { items } = await api('/carrinho');
  badge.textContent = items.reduce((sum, i) => sum + i.quantity, 0);
}

function renderHeader(active) {
  $('#nav').innerHTML = LINKS
    .filter((l) => (!l.login || isLogged()) && (!l.admin || isAdmin()))
    .map((l) => `<a href="${l.href}" class="nav-btn ${l.id === active ? 'active' : ''}">${l.label}</a>`)
    .join('');
  const { user } = session;
  $('#user-name').textContent = user ? `Olá, ${user.name}${isAdmin() ? ' (admin)' : ''}` : '';
  $('#login-btn').classList.toggle('hidden', isLogged());
  $('#logout-btn').classList.toggle('hidden', !isLogged());
  updateCartCount();
}

// Mostra o conteúdo da página só para quem pode ver.
// Se não puder, esconde #content e mostra um aviso no lugar.
export function guard({ admin = false } = {}) {
  const content = $('#content');
  let notice = $('#guard');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'guard';
    content.before(notice);
  }

  let message = '';
  if (!isLogged()) {
    message = `<p>Faça login para ver esta página.</p>
      <button class="btn" id="guard-login">Entrar</button>`;
  } else if (admin && !isAdmin()) {
    message = '<p>Esta página é só para administradores.</p><a class="btn" href="/">Voltar para a loja</a>';
  }

  notice.className = message ? 'card notice' : 'hidden';
  notice.innerHTML = message;
  $('#guard-login')?.addEventListener('click', openAuth);
  content.classList.toggle('hidden', Boolean(message));
  return !message;
}

export function initLayout(active, render) {
  document.body.insertAdjacentHTML('afterbegin', HEADER);
  document.body.insertAdjacentHTML('beforeend', AUTH_DIALOG);

  $('#login-btn').addEventListener('click', openAuth);
  $('#logout-btn').addEventListener('click', () => {
    logout();
    toast('Você saiu da conta');
  });
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
      const data = await api(registering ? '/auth/register' : '/auth/login', { method: 'POST', body });
      $('#auth-dialog').close();
      e.target.reset();
      setAuthMode(false);
      toast(`Olá, ${data.user.name}!`);
      setSession(data.token, data.user);
    } catch (err) {
      $('#auth-error').textContent = err.message;
    }
  });

  // Sempre que entrar/sair da conta, redesenha o menu e a página
  const refresh = () => {
    renderHeader(active);
    render?.();
  };
  window.addEventListener('session', refresh);
  window.addEventListener('auth-required', openAuth);
  refresh();
}
