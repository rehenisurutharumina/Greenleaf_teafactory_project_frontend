import "../../style.css";
import "../../auth-styles.css";
import { requireAuth, getUser, logout, apiFetch } from "../../auth.js";

if (!requireAuth(["Admin"])) throw new Error("Access denied");

const user = getUser();
document.getElementById("userName").textContent = user.fullName;
document.getElementById("userAvatar").textContent = user.fullName.charAt(0).toUpperCase();
document.getElementById("logoutBtn").addEventListener("click", logout);

let orders = [];
const statusFilter = document.getElementById("statusFilter");
statusFilter.addEventListener("change", renderOrders);

loadOrders();

async function loadOrders() {
  try {
    const res = await apiFetch("/orders/all");
    if (!res || !res.ok) throw new Error("Failed");
    orders = await res.json();
    renderOrders();
  } catch {
    document.getElementById("ordersBody").innerHTML = '<tr><td colspan="7" class="table-empty">Could not load orders</td></tr>';
  }
}

function renderOrders() {
  const body = document.getElementById("ordersBody");
  const selected = statusFilter.value;
  const filtered = selected ? orders.filter((o) => o.status === selected) : orders;

  if (filtered.length === 0) {
    body.innerHTML = '<tr><td colspan="7" class="table-empty">No orders found</td></tr>';
    return;
  }

  body.innerHTML = filtered
    .map(
      (o) => `
      <tr>
        <td>#${o.id}</td>
        <td>${o.customerName}</td>
        <td>$${o.totalAmount.toFixed(2)}</td>
        <td><span class="status-badge ${String(o.status).toLowerCase()}">${o.status}</span></td>
        <td>${o.paymentStatus}</td>
        <td>${new Date(o.orderDate).toLocaleDateString()}</td>
        <td>
          <select class="order-status" data-id="${o.id}">
            <option ${o.status === "Pending" ? "selected" : ""}>Pending</option>
            <option ${o.status === "Confirmed" ? "selected" : ""}>Confirmed</option>
            <option ${o.status === "Processing" ? "selected" : ""}>Processing</option>
            <option ${o.status === "Packed" ? "selected" : ""}>Packed</option>
            <option ${o.status === "Shipped" ? "selected" : ""}>Shipped</option>
            <option ${o.status === "Delivered" ? "selected" : ""}>Delivered</option>
            <option ${o.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
          </select>
        </td>
      </tr>
    `
    )
    .join("");

  body.querySelectorAll(".order-status").forEach((el) => {
    el.addEventListener("change", () => updateStatus(parseInt(el.dataset.id, 10), el.value));
  });
}

async function updateStatus(id, status) {
  await apiFetch(`/orders/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  loadOrders();
}
