import "../../style.css";
import "../../auth-styles.css";
import { requireAuth, getUser, logout, apiFetch } from "../../auth.js";

if (!requireAuth(["Admin"])) throw new Error("Access denied");

const user = getUser();
document.getElementById("userName").textContent = user.fullName;
document.getElementById("userAvatar").textContent = user.fullName.charAt(0).toUpperCase();
document.getElementById("logoutBtn").addEventListener("click", logout);

let categories = [];
const modal = document.getElementById("categoryModal");

init();

function init() {
  loadCategories();
  document.getElementById("addCategoryBtn").addEventListener("click", () => openModal());
  document.getElementById("cancelCategoryModal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.getElementById("categoryForm").addEventListener("submit", saveCategory);
}

async function loadCategories() {
  try {
    const res = await apiFetch("/categories");
    if (!res || !res.ok) throw new Error("Failed");
    categories = await res.json();
    renderCategories();
  } catch {
    document.getElementById("categoriesBody").innerHTML = '<tr><td colspan="4" class="table-empty">Could not load categories</td></tr>';
  }
}

function renderCategories() {
  const body = document.getElementById("categoriesBody");
  if (categories.length === 0) {
    body.innerHTML = '<tr><td colspan="4" class="table-empty">No categories available</td></tr>';
    return;
  }

  body.innerHTML = categories
    .map(
      (c) => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.description || "-"}</td>
        <td>${c.productCount}</td>
        <td>
          <div class="table-actions">
            <button class="btn-action edit" data-id="${c.id}">Edit</button>
            <button class="btn-action delete" data-id="${c.id}" data-name="${c.name}">Delete</button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");

  body.querySelectorAll(".edit").forEach((btn) => {
    btn.addEventListener("click", () => openModal(categories.find((x) => x.id === parseInt(btn.dataset.id, 10))));
  });
  body.querySelectorAll(".delete").forEach((btn) => {
    btn.addEventListener("click", () => deleteCategory(parseInt(btn.dataset.id, 10), btn.dataset.name));
  });
}

function openModal(category = null) {
  document.getElementById("catId").value = category?.id || "";
  document.getElementById("catName").value = category?.name || "";
  document.getElementById("catDesc").value = category?.description || "";
  document.getElementById("catImage").value = category?.imageUrl || "";
  document.getElementById("categoryModalTitle").textContent = category ? "Edit Category" : "Add Category";
  document.getElementById("categoryMsg").textContent = "";
  modal.classList.add("active");
}

function closeModal() {
  modal.classList.remove("active");
}

async function saveCategory(e) {
  e.preventDefault();
  const id = document.getElementById("catId").value;
  const msg = document.getElementById("categoryMsg");
  const payload = {
    name: document.getElementById("catName").value.trim(),
    description: document.getElementById("catDesc").value.trim() || null,
    imageUrl: document.getElementById("catImage").value.trim() || null,
  };

  const endpoint = id ? `/categories/${id}` : "/categories";
  const method = id ? "PUT" : "POST";

  const res = await apiFetch(endpoint, {
    method,
    body: JSON.stringify(payload),
  });

  if (res && res.ok) {
    closeModal();
    loadCategories();
  } else {
    const err = await res?.json();
    msg.className = "auth-msg error";
    msg.textContent = err?.message || "Could not save category";
  }
}

async function deleteCategory(id, name) {
  if (!confirm(`Delete category "${name}"?`)) return;
  await apiFetch(`/categories/${id}`, { method: "DELETE" });
  loadCategories();
}
