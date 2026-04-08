import "../../style.css";
import "../../auth-styles.css";
import { requireAuth, getUser, logout, apiFetch } from "../../auth.js";

if (!requireAuth(["Admin"])) throw new Error("Access denied");

const user = getUser();
document.getElementById("userName").textContent = user.fullName;
document.getElementById("userAvatar").textContent = user.fullName.charAt(0).toUpperCase();
document.getElementById("logoutBtn").addEventListener("click", logout);

let users = [];
const modal = document.getElementById("userModal");

init();

function init() {
  loadUsers();
  document.getElementById("addUserBtn").addEventListener("click", () => modal.classList.add("active"));
  document.getElementById("cancelUserModal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.getElementById("userForm").addEventListener("submit", createUser);
}

function closeModal() {
  modal.classList.remove("active");
  document.getElementById("userForm").reset();
  document.getElementById("userMsg").textContent = "";
}

async function loadUsers() {
  try {
    const res = await apiFetch("/users");
    if (!res || !res.ok) throw new Error("Failed");
    users = await res.json();
    renderUsers();
  } catch {
    document.getElementById("usersBody").innerHTML = '<tr><td colspan="6" class="table-empty">Could not load users</td></tr>';
  }
}

function renderUsers() {
  const body = document.getElementById("usersBody");
  if (users.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="table-empty">No users found</td></tr>';
    return;
  }

  body.innerHTML = users
    .map(
      (u) => `
      <tr>
        <td>${u.fullName}</td>
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td><span class="status-badge ${u.isActive ? "confirmed" : "cancelled"}">${u.isActive ? "Active" : "Inactive"}</span></td>
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        <td>
          <div class="table-actions">
            <button class="btn-action edit" data-toggle="${u.id}">${u.isActive ? "Deactivate" : "Activate"}</button>
            <button class="btn-action delete" data-delete="${u.id}" data-name="${u.fullName}">Delete</button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");

  body.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => toggleUser(parseInt(btn.dataset.toggle, 10)));
  });
  body.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => deleteUser(parseInt(btn.dataset.delete, 10), btn.dataset.name));
  });
}

async function createUser(e) {
  e.preventDefault();
  const msg = document.getElementById("userMsg");
  const payload = {
    fullName: document.getElementById("uName").value.trim(),
    email: document.getElementById("uEmail").value.trim(),
    phone: document.getElementById("uPhone").value.trim() || null,
    password: document.getElementById("uPassword").value,
    role: document.getElementById("uRole").value,
  };

  const res = await apiFetch("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (res && res.ok) {
    closeModal();
    loadUsers();
  } else {
    const err = await res?.json();
    msg.className = "auth-msg error";
    msg.textContent = err?.message || "Could not create user";
  }
}

async function toggleUser(id) {
  await apiFetch(`/users/${id}/toggle`, { method: "PUT" });
  loadUsers();
}

async function deleteUser(id, name) {
  if (!confirm(`Delete user "${name}"?`)) return;
  await apiFetch(`/users/${id}`, { method: "DELETE" });
  loadUsers();
}
