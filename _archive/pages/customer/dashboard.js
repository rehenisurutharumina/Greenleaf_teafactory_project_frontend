import "../../style.css";
import "../../auth-styles.css";
import { requireAuth, getUser, logout, apiFetch } from "../../auth.js";

if (!requireAuth(["Customer"])) throw new Error("Access denied");

const user = getUser();
document.getElementById("userName").textContent = user.fullName;
document.getElementById("userAvatar").textContent = user.fullName.charAt(0).toUpperCase();
document.getElementById("greeting").textContent = `Welcome back, ${user.fullName}!`;
document.getElementById("logoutBtn").addEventListener("click", logout);

loadDashboard();

async function loadDashboard() {
  try {
    const response = await apiFetch("/dashboard/customer");
    if (!response || !response.ok) return;

    const stats = await response.json();
    document.getElementById("totalOrders").textContent = stats.totalOrders ?? 0;
    document.getElementById("activeOrders").textContent = stats.activeOrders ?? 0;
    document.getElementById("cartCount").textContent = stats.cartItems ?? 0;

    renderOrders(stats.recentOrders || []);
  } catch (e) {
    console.error("Dashboard error:", e);
  }
}

function renderOrders(orders) {
  const tbody = document.getElementById("recentOrdersBody");
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No orders yet. <a href="/src/pages/shop.html">Start shopping</a></td></tr>';
    return;
  }
  tbody.innerHTML = orders
    .map(
      (o) => `
    <tr>
      <td>#${o.id}</td>
      <td>$${o.totalAmount?.toFixed(2)}</td>
      <td><span class="status-badge ${o.status?.toLowerCase()}">${o.status}</span></td>
      <td>${new Date(o.orderDate).toLocaleDateString()}</td>
    </tr>
  `
    )
    .join("");
}
