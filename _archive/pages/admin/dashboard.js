import "../../style.css";
import "../../auth-styles.css";
import { requireAuth, getUser, logout, apiFetch } from "../../auth.js";

if (!requireAuth(["Admin"])) {
  throw new Error("Access denied");
}

const user = getUser();

document.getElementById("userName").textContent = user.fullName;
document.getElementById("userAvatar").textContent = user.fullName.charAt(0).toUpperCase();
document.getElementById("greeting").textContent = `Welcome back, ${user.fullName}!`;
document.getElementById("currentDate").textContent = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

document.getElementById("logoutBtn").addEventListener("click", logout);

loadDashboard();

async function loadDashboard() {
  try {
    const response = await apiFetch("/dashboard/admin");
    if (!response || !response.ok) {
      showFallbackStats();
      return;
    }

    const stats = await response.json();

    document.getElementById("totalUsers").textContent = stats.totalUsers ?? 0;
    document.getElementById("totalProducts").textContent = stats.totalProducts ?? 0;
    document.getElementById("totalOrders").textContent = stats.totalOrders ?? 0;
    document.getElementById("lowStock").textContent = stats.lowStockCount ?? 0;

    renderRecentOrders(stats.recentOrders || []);
    renderLowStock(stats.lowStockProducts || []);
  } catch (error) {
    console.error("Dashboard load error:", error);
    showFallbackStats();
  }
}

function showFallbackStats() {
  document.getElementById("totalUsers").textContent = "-";
  document.getElementById("totalProducts").textContent = "-";
  document.getElementById("totalOrders").textContent = "-";
  document.getElementById("lowStock").textContent = "-";

  document.getElementById("recentOrdersBody").innerHTML =
    '<tr><td colspan="5" class="table-empty">Could not load data</td></tr>';
  document.getElementById("lowStockBody").innerHTML =
    '<tr><td colspan="4" class="table-empty">Could not load data</td></tr>';
}

function renderRecentOrders(orders) {
  const tbody = document.getElementById("recentOrdersBody");
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No orders yet</td></tr>';
    return;
  }

  tbody.innerHTML = orders
    .map(
      (o) => `
    <tr>
      <td>#${o.id}</td>
      <td>${o.customerName || "-"}</td>
      <td>$${o.totalAmount?.toFixed(2) || "0.00"}</td>
      <td><span class="status-badge ${o.status?.toLowerCase()}">${o.status}</span></td>
      <td>${new Date(o.orderDate).toLocaleDateString()}</td>
    </tr>`
    )
    .join("");
}

function renderLowStock(products) {
  const tbody = document.getElementById("lowStockBody");
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">All stock levels are healthy</td></tr>';
    return;
  }

  tbody.innerHTML = products
    .map(
      (p) => `
    <tr>
      <td>${p.productName}</td>
      <td>${p.quantityKg?.toFixed(1)}</td>
      <td>${p.reorderLevelKg?.toFixed(1)}</td>
      <td><span class="status-badge cancelled">Low</span></td>
    </tr>`
    )
    .join("");
}
