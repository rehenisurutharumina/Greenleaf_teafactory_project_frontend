import "../../style.css";
import "../../auth-styles.css";
import { requireAuth, getUser, logout, apiFetch } from "../../auth.js";

if (!requireAuth(["Customer"])) throw new Error("Access denied");

const user = getUser();
document.getElementById("userName").textContent = user.fullName;
document.getElementById("userAvatar").textContent = user.fullName.charAt(0).toUpperCase();
document.getElementById("logoutBtn").addEventListener("click", logout);

let orders = [];
const modal = document.getElementById("orderModal");

init();

function init() {
  loadOrders();
  document.getElementById("closeOrderModal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
}

async function loadOrders() {
  try {
    const res = await apiFetch("/orders");
    if (!res || !res.ok) throw new Error("Failed");
    orders = await res.json();
    renderOrders();
  } catch {
    document.getElementById("ordersBody").innerHTML = '<tr><td colspan="6" class="table-empty">Could not load orders</td></tr>';
  }
}

function renderOrders() {
  const body = document.getElementById("ordersBody");
  if (orders.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="table-empty">No orders found</td></tr>';
    return;
  }

  body.innerHTML = orders
    .map(
      (o) => `
      <tr>
        <td>#${o.id}</td>
        <td>$${o.totalAmount.toFixed(2)}</td>
        <td><span class="status-badge ${String(o.status).toLowerCase()}">${o.status}</span></td>
        <td>${o.paymentStatus}</td>
        <td>${new Date(o.orderDate).toLocaleDateString()}</td>
        <td><button class="btn-action view" data-id="${o.id}">View</button></td>
      </tr>
    `
    )
    .join("");

  body.querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => openModal(orders.find((x) => x.id === parseInt(btn.dataset.id, 10))));
  });
}

function openModal(order) {
  document.getElementById("orderMeta").textContent = `Order #${order.id} | ${order.status} | ${order.paymentMethod || "-"}`;
  document.getElementById("orderItemsBody").innerHTML = order.items
    .map(
      (i) => `
      <tr>
        <td>${i.productName}</td>
        <td>${Number(i.quantityKg).toFixed(1)}</td>
        <td>$${Number(i.unitPrice).toFixed(2)}</td>
        <td>$${Number(i.subtotal).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");
  modal.classList.add("active");
}

function closeModal() {
  modal.classList.remove("active");
}
