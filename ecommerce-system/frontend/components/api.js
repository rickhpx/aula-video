// Sessão do usuário (token de login) e comunicação com a API.
// Ao mudar a sessão, dispara o evento "session" para as páginas se atualizarem.

export const session = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
};

export const isLogged = () => Boolean(session.token);
export const isAdmin = () => session.user?.role === 'admin';

export function setSession(token, user) {
  session.token = token;
  session.user = user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  window.dispatchEvent(new Event('session'));
}

export function logout() {
  session.token = null;
  session.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('session'));
}

// Chama a API. Ex.: api('/estoque') ou api('/carrinho', { method: 'POST', body: {...} })
export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (session.token) headers.Authorization = `Bearer ${session.token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // Token vencido: sai da conta e pede login de novo
  if (res.status === 401 && session.token) {
    logout();
    window.dispatchEvent(new Event('auth-required'));
  }
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro inesperado');
  return data;
}
