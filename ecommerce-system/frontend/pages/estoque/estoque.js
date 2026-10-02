// Página de estoque (só admin): cadastrar, editar, repor e excluir produtos

import { api } from '../../components/api.js';
import { $, money, escape, productIcon, toast } from '../../components/ui.js';
import { initLayout, guard } from '../../components/layout.js';

// Abaixo deste número o estoque aparece destacado
const LOW_STOCK = 5;

let products = [];
let editingId = null; // null = cadastrando um produto novo

function renderRows() {
  const term = $('#search').value.trim().toLowerCase();
  const visible = products.filter((p) => p.name.toLowerCase().includes(term));

  $('#stock-rows').innerHTML = visible.length
    ? visible.map((p) => `
        <tr>
          <td><span class="row-icon">${productIcon(p)}</span> ${escape(p.name)}</td>
          <td>${escape(p.category)}</td>
          <td>${money(p.price)}</td>
          <td><span class="stock-pill ${p.stock === 0 ? 'out' : p.stock <= LOW_STOCK ? 'low' : ''}">
            ${p.stock}</span></td>
          <td>
            <form class="restock" data-id="${p.id}">
              <input name="amount" type="number" min="1" value="1" required>
              <button class="btn btn-outline">+ Repor</button>
            </form>
          </td>
          <td class="actions">
            <button class="btn btn-outline" data-edit="${p.id}">Editar</button>
            <button class="btn btn-danger" data-delete="${p.id}">Excluir</button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="6" class="empty">Nenhum produto encontrado.</td></tr>';
}

async function loadStock() {
  if (!guard({ admin: true })) return;
  products = await api('/estoque');
  renderRows();
  const categories = await api('/estoque/categorias');
  $('#category-list').innerHTML = categories.map((c) => `<option value="${escape(c)}">`).join('');
}

$('#search').addEventListener('input', renderRows);

// Repor estoque: soma a quantidade digitada
$('#stock-rows').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = e.target.dataset.id;
  const amount = Number(new FormData(e.target).get('amount'));
  try {
    const p = await api(`/estoque/${id}/repor`, { method: 'POST', body: { amount } });
    toast(`+${amount} ${p.name} (agora ${p.stock})`);
    loadStock();
  } catch (err) {
    toast(err.message);
  }
});

$('#stock-rows').addEventListener('click', async (e) => {
  const { edit, delete: deleteId } = e.target.dataset;
  if (edit) openForm(products.find((p) => p.id === Number(edit)));
  if (deleteId && confirm('Excluir este produto?')) {
    try {
      await api(`/estoque/${deleteId}`, { method: 'DELETE' });
      toast('Produto excluído');
      loadStock();
    } catch (err) {
      toast(err.message);
    }
  }
});

// ---------- Cadastro / edição ----------
function openForm(product = null) {
  const form = $('#product-form');
  form.reset();
  editingId = product?.id ?? null;
  $('#form-title').textContent = product ? 'Editar produto' : 'Novo produto';
  if (product) {
    for (const field of ['name', 'price', 'category', 'description', 'stock']) {
      form.elements[field].value = product[field];
    }
  }
  $('#product-form-dialog').showModal();
}

$('#new-btn').addEventListener('click', () => openForm());
$('#form-close').addEventListener('click', () => $('#product-form-dialog').close());

$('#product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = {
    name: form.get('name'),
    price: Number(form.get('price')),
    category: form.get('category'),
    description: form.get('description'),
    stock: Number(form.get('stock')),
  };
  try {
    if (editingId) {
      await api(`/estoque/${editingId}`, { method: 'PUT', body });
      toast('Produto atualizado!');
    } else {
      await api('/estoque', { method: 'POST', body });
      toast('Produto cadastrado!');
    }
    $('#product-form-dialog').close();
    loadStock();
  } catch (err) {
    toast(err.message);
  }
});

initLayout('estoque', loadStock);
