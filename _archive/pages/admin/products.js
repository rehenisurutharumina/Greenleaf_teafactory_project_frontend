import "../../style.css";
import "../../auth-styles.css";
import { requireAuth, getUser, logout, apiFetch } from "../../auth.js";

if (!requireAuth(["Admin"])) throw new Error("Access denied");

const user = getUser();
document.getElementById("userName").textContent = user.fullName;
document.getElementById("userAvatar").textContent = user.fullName.charAt(0).toUpperCase();
document.getElementById("logoutBtn").addEventListener("click", logout);

let categories = [];

init();

async function init() {
  await loadCategories();
  await loadProducts();

  document.getElementById("addProductBtn").addEventListener("click", () => openModal());
  document.getElementById("cancelModal").addEventListener("click", closeModal);
  document.getElementById("productModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById("productForm").addEventListener("submit", saveProduct);
}

async function loadCategories() {
  try {
    const res = await apiFetch("/categories");
    if (res && res.ok) {
      categories = await res.json();
      const sel = document.getElementById("pCategory");
      sel.innerHTML = '<option value="">None</option>';
      categories.forEach((c) => {
        sel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
    }
  } catch (e) {
    // ignore
  }
}

async function loadProducts() {
  try {
    const res = await apiFetch("/products/all");
    if (!res || !res.ok) return;
    const products = await res.json();
    renderProducts(products);
  } catch (e) {
    document.getElementById("productsBody").innerHTML =
      '<tr><td colspan="6" class="table-empty">Error loading products</td></tr>';
  }
}

function renderProducts(products) {
  const tbody = document.getElementById("productsBody");
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No products yet</td></tr>';
    return;
  }

  tbody.innerHTML = products
    .map(
      (p) => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.categoryName || "-"}</td>
      <td>${p.grade || "-"}</td>
      <td>$${p.pricePerKg.toFixed(2)}</td>
      <td><span class="status-badge ${p.isAvailable ? "confirmed" : "cancelled"}">${p.isAvailable ? "Active" : "Inactive"}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-action edit" data-id="${p.id}">Edit</button>
          <button class="btn-action delete" data-id="${p.id}" data-name="${p.name}">Delete</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");

  tbody.querySelectorAll(".btn-action.edit").forEach((btn) => {
    btn.addEventListener("click", () => editProduct(parseInt(btn.dataset.id, 10)));
  });

  tbody.querySelectorAll(".btn-action.delete").forEach((btn) => {
    btn.addEventListener("click", () => deleteProduct(parseInt(btn.dataset.id, 10), btn.dataset.name));
  });
}

function openModal(product = null) {
  const modal = document.getElementById("productModal");
  document.getElementById("modalTitle").textContent = product ? "Edit Product" : "Add Product";
  document.getElementById("pId").value = product?.id || "";
  document.getElementById("pName").value = product?.name || "";
  document.getElementById("pDesc").value = product?.description || "";
  document.getElementById("pGrade").value = product?.grade || "";
  document.getElementById("pPrice").value = product?.pricePerKg || "";
  document.getElementById("pBadge").value = product?.badge || "";
  document.getElementById("pCategory").value = product?.categoryId || "";
  document.getElementById("pAvailable").checked = product?.isAvailable ?? true;
  document.getElementById("formMsg").textContent = "";
  modal.classList.add("active");
}

function closeModal() {
  document.getElementById("productModal").classList.remove("active");
}

async function editProduct(id) {
  const res = await apiFetch(`/products/${id}`);
  if (res && res.ok) {
    const product = await res.json();
    openModal(product);
  }
}

async function saveProduct(e) {
  e.preventDefault();
  const msg = document.getElementById("formMsg");
  const id = document.getElementById("pId").value;
  const data = {
    name: document.getElementById("pName").value,
    description: document.getElementById("pDesc").value,
    grade: document.getElementById("pGrade").value,
    pricePerKg: parseFloat(document.getElementById("pPrice").value),
    badge: document.getElementById("pBadge").value,
    categoryId: parseInt(document.getElementById("pCategory").value, 10) || null,
    isAvailable: document.getElementById("pAvailable").checked,
  };

  const url = id ? `/products/${id}` : "/products";
  const method = id ? "PUT" : "POST";

  const res = await apiFetch(url, { method, body: JSON.stringify(data) });

  if (res && (res.ok || res.status === 201)) {
    closeModal();
    loadProducts();
  } else {
    const err = await res?.json();
    msg.textContent = err?.message || Object.values(err?.errors || {}).flat().join(" ") || "Save failed.";
    msg.className = "auth-msg error";
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? It will be marked as unavailable.`)) return;
  await apiFetch(`/products/${id}`, { method: "DELETE" });
  loadProducts();
}
