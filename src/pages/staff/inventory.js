import "../../style.css";
import "../../auth-styles.css";
import { requireAuth, getUser, logout, apiFetch } from "../../auth.js";

if (!requireAuth(["Staff"])) throw new Error("Access denied");

const user = getUser();
document.getElementById("userName").textContent = user.fullName;
document.getElementById("userAvatar").textContent = user.fullName.charAt(0).toUpperCase();
document.getElementById("logoutBtn").addEventListener("click", logout);

let inventory = [];
const modal = document.getElementById("inventoryModal");

init();

function init() {
  loadInventory();
  document.getElementById("cancelInventoryModal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.getElementById("inventoryForm").addEventListener("submit", saveInventory);
}

async function loadInventory() {
  try {
    const res = await apiFetch("/inventory");
    if (!res || !res.ok) throw new Error("Failed");
    inventory = await res.json();
    renderInventory();
  } catch {
    document.getElementById("inventoryBody").innerHTML = '<tr><td colspan="5" class="table-empty">Could not load inventory</td></tr>';
  }
}

function renderInventory() {
  const body = document.getElementById("inventoryBody");
  if (inventory.length === 0) {
    body.innerHTML = '<tr><td colspan="5" class="table-empty">No stock records</td></tr>';
    return;
  }

  body.innerHTML = inventory
    .map(
      (i) => `
      <tr>
        <td>${i.productName}</td>
        <td>${Number(i.quantityKg).toFixed(1)}</td>
        <td>${Number(i.reorderLevelKg).toFixed(1)}</td>
        <td><span class="status-badge ${i.isLow ? "cancelled" : "confirmed"}">${i.isLow ? "Low" : "Healthy"}</span></td>
        <td><button class="btn-action edit" data-id="${i.id}">Update</button></td>
      </tr>
    `
    )
    .join("");

  body.querySelectorAll(".edit").forEach((btn) => {
    btn.addEventListener("click", () => openModal(inventory.find((x) => x.id === parseInt(btn.dataset.id, 10))));
  });
}

function openModal(item) {
  document.getElementById("invId").value = item.id;
  document.getElementById("invQty").value = item.quantityKg;
  document.getElementById("invReorder").value = item.reorderLevelKg;
  document.getElementById("inventoryProduct").textContent = `Product: ${item.productName}`;
  document.getElementById("inventoryMsg").textContent = "";
  modal.classList.add("active");
}

function closeModal() {
  modal.classList.remove("active");
}

async function saveInventory(e) {
  e.preventDefault();
  const id = document.getElementById("invId").value;
  const msg = document.getElementById("inventoryMsg");
  const payload = {
    quantityKg: parseFloat(document.getElementById("invQty").value),
    reorderLevelKg: parseFloat(document.getElementById("invReorder").value),
  };

  const res = await apiFetch(`/inventory/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (res && res.ok) {
    closeModal();
    loadInventory();
  } else {
    msg.className = "auth-msg error";
    msg.textContent = "Could not update stock";
  }
}
