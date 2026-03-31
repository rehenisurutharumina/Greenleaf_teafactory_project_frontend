// ============================================================
// dashboard.js — Shared dashboard logic for Admin/Staff/Customer
// ============================================================

const API_BASE = "http://localhost:5001/api";

// ── Auth helpers ──
function getToken() { return localStorage.getItem("token"); }
function getUser()  { return JSON.parse(localStorage.getItem("user") || "null"); }

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`
  };
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// Guard: redirect if not logged in
(function guard() {
  const user = getUser();
  const token = getToken();
  if (!user || !token) {
    alert("Please log in first.");
    window.location.href = "index.html";
    return;
  }

  // Detect which page we're on
  const page = location.pathname.split("/").pop();
  if (page === "admin.html" && user.role !== "Admin") {
    alert("Access denied. Admin only.");
    window.location.href = "index.html";
    return;
  }
  if (page === "staff.html" && user.role !== "Staff") {
    alert("Access denied. Staff only.");
    window.location.href = "index.html";
    return;
  }

  // Update UI
  const sidebarUser = document.getElementById("sidebarUser");
  const welcomeText = document.getElementById("welcomeText");
  if (sidebarUser) sidebarUser.textContent = user.fullName;
  if (welcomeText) welcomeText.textContent = `Welcome, ${user.fullName.split(" ")[0]}`;
})();

// ── Sidebar navigation ──
document.querySelectorAll(".sidebar-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const sectionId = link.dataset.section;

    // Update active link
    document.querySelectorAll(".sidebar-link").forEach(l => l.classList.remove("active"));
    link.classList.add("active");

    // Show section
    document.querySelectorAll(".dash-section").forEach(s => s.classList.remove("active"));
    const sec = document.getElementById(`sec-${sectionId}`);
    if (sec) sec.classList.add("active");

    // Update title
    const title = document.getElementById("pageTitle");
    if (title) title.textContent = link.textContent.replace(/^[^\w]*/, '').trim();

    // Load data for section
    loadSectionData(sectionId);

    // Close mobile sidebar
    document.getElementById("sidebar").classList.remove("open");
  });
});

// Mobile menu
const dashMenuBtn = document.getElementById("dashMenuBtn");
if (dashMenuBtn) {
  dashMenuBtn.addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
}

// ── Utility ──
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function statusBadge(status) {
  const cls = (status || "").toLowerCase().replace(/\s/g, "");
  return `<span class="status-badge ${cls}">${status || "—"}</span>`;
}

function showMsg(el, type, text) {
  if (!el) return;
  el.className = `form-message show ${type}`;
  el.textContent = text;
  if (type === "success") setTimeout(() => { el.className = "form-message"; }, 4000);
}

async function apiFetch(url, options = {}) {
  options.headers = { ...authHeaders(), ...(options.headers || {}) };
  const res = await fetch(`${API_BASE}${url}`, options);
  return res;
}

// ============================================================
// DATA LOADER — routes to correct loader per section
// ============================================================
function loadSectionData(section) {
  const page = location.pathname.split("/").pop();

  if (page === "admin.html") {
    const loaders = { overview: loadAdminOverview, orders: loadAllOrders, products: loadProducts, inventory: loadInventory, users: loadUsers, quotes: loadQuotes, messages: loadMessages };
    if (loaders[section]) loaders[section]();
  } else if (page === "staff.html") {
    const loaders = { overview: loadStaffOverview, tasks: loadStaffTasks, inventory: loadInventory };
    if (loaders[section]) loaders[section]();
  } else if (page === "customer.html") {
    const loaders = { overview: loadCustomerOverview, orders: loadCustomerOrders, cart: loadCart, profile: loadProfile };
    if (loaders[section]) loaders[section]();
  }
}

// ============================================================
// ADMIN — Overview
// ============================================================
async function loadAdminOverview() {
  try {
    const res = await apiFetch("/dashboard/admin");
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();

    document.getElementById("statUsers").textContent = data.totalUsers;
    document.getElementById("statProducts").textContent = data.totalProducts;
    document.getElementById("statOrders").textContent = data.totalOrders;
    document.getElementById("statLowStock").textContent = data.lowStockCount;

    // Recent orders
    const tbody = document.querySelector("#recentOrdersTable tbody");
    if (data.recentOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">No orders yet</td></tr>`;
    } else {
      tbody.innerHTML = data.recentOrders.map(o => `
        <tr>
          <td>#${o.id}</td>
          <td>${o.customerName}</td>
          <td>$${o.totalAmount.toFixed(2)}</td>
          <td>${statusBadge(o.status)}</td>
          <td>${formatDate(o.orderDate)}</td>
        </tr>
      `).join("");
    }

    // Low stock
    const lowList = document.getElementById("lowStockList");
    if (data.lowStockProducts.length === 0) {
      lowList.innerHTML = `<p class="empty-cell">All stock levels are healthy ✅</p>`;
    } else {
      lowList.innerHTML = data.lowStockProducts.map(p => `
        <div class="alert-item">
          <span class="alert-product">${p.productName}</span>
          <span class="alert-qty">${p.quantityKg} / ${p.reorderLevelKg} kg</span>
        </div>
      `).join("");
    }
  } catch (e) {
    console.error("Admin overview error:", e);
  }
}

// ============================================================
// ADMIN — All Orders
// ============================================================
async function loadAllOrders() {
  try {
    const res = await apiFetch("/orders/all");
    if (!res.ok) throw new Error("Failed");
    const orders = await res.json();

    const tbody = document.querySelector("#allOrdersTable tbody");
    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">No orders yet</td></tr>`;
    } else {
      tbody.innerHTML = orders.map(o => `
        <tr>
          <td>#${o.id}</td>
          <td>${o.customerName}</td>
          <td>${o.customerEmail}</td>
          <td>$${o.totalAmount.toFixed(2)}</td>
          <td>${statusBadge(o.status)}</td>
          <td>${statusBadge(o.paymentStatus)}</td>
          <td>${formatDate(o.orderDate)}</td>
          <td><button class="btn-sm btn-outline" onclick="openOrderStatusModal(${o.id},'${o.status}','${o.paymentStatus}')">Update</button></td>
        </tr>
      `).join("");
    }
  } catch (e) { console.error(e); }
}

// ============================================================
// ADMIN — Products
// ============================================================
async function loadProducts() {
  try {
    const res = await apiFetch("/products/all");
    if (!res.ok) throw new Error("Failed");
    const products = await res.json();

    const tbody = document.querySelector("#productsTable tbody");
    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">No products</td></tr>`;
    } else {
      tbody.innerHTML = products.map(p => `
        <tr>
          <td>${p.id}</td>
          <td><strong>${p.name}</strong></td>
          <td>${p.grade || "—"}</td>
          <td>$${p.pricePerKg.toFixed(2)}</td>
          <td>${p.badge ? statusBadge(p.badge) : "—"}</td>
          <td>${p.isAvailable ? statusBadge("Active") : statusBadge("Inactive")}</td>
          <td>
            <div class="btn-group">
              <button class="btn-sm btn-danger" onclick="deleteProduct(${p.id})">Delete</button>
            </div>
          </td>
        </tr>
      `).join("");
    }
  } catch (e) { console.error(e); }
}

// ============================================================
// ADMIN — Inventory
// ============================================================
async function loadInventory() {
  try {
    const res = await apiFetch("/inventory");
    if (!res.ok) throw new Error("Failed");
    const items = await res.json();

    const tableId = document.getElementById("inventoryTable");
    const tbody = tableId.querySelector("tbody");
    const page = location.pathname.split("/").pop();

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">No inventory</td></tr>`;
    } else {
      tbody.innerHTML = items.map(i => `
        <tr>
          <td><strong>${i.productName}</strong></td>
          <td>${i.quantityKg.toFixed(1)}</td>
          <td>${i.reorderLevelKg.toFixed(1)}</td>
          <td>${i.isLow ? statusBadge("Low Stock") : statusBadge("OK")}</td>
          ${page === "admin.html" ? `<td><button class="btn-sm btn-outline" onclick="openStockModal(${i.id},${i.quantityKg},${i.reorderLevelKg})">Update</button></td>` : ""}
        </tr>
      `).join("");
    }
  } catch (e) { console.error(e); }
}

// ============================================================
// ADMIN — Users
// ============================================================
async function loadUsers() {
  try {
    const res = await apiFetch("/users");
    if (!res.ok) throw new Error("Failed");
    const users = await res.json();

    const tbody = document.querySelector("#usersTable tbody");
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.fullName}</td>
        <td>${u.email}</td>
        <td>${u.phone || "—"}</td>
        <td>${statusBadge(u.role)}</td>
        <td>${u.isActive ? statusBadge("Active") : statusBadge("Inactive")}</td>
        <td>
          <div class="btn-group">
            <button class="btn-sm btn-outline" onclick="toggleUser(${u.id})">${u.isActive ? "Deactivate" : "Activate"}</button>
          </div>
        </td>
      </tr>
    `).join("");
  } catch (e) { console.error(e); }
}

// ============================================================
// ADMIN — Quotes
// ============================================================
async function loadQuotes() {
  try {
    const res = await apiFetch("/quoterequests");
    if (!res.ok) throw new Error("Failed");
    const quotes = await res.json();

    const tbody = document.querySelector("#quotesTable tbody");
    if (quotes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">No quote requests</td></tr>`;
    } else {
      tbody.innerHTML = quotes.map(q => `
        <tr>
          <td>#${q.id}</td>
          <td>${q.customerName}</td>
          <td>${q.productName}</td>
          <td>${q.quantityKg}</td>
          <td>${q.email || "—"}</td>
          <td>${statusBadge(q.status)}</td>
          <td>${formatDate(q.submittedAt)}</td>
        </tr>
      `).join("");
    }
  } catch (e) { console.error(e); }
}

// ============================================================
// ADMIN — Messages
// ============================================================
async function loadMessages() {
  try {
    const res = await apiFetch("/contactmessages");
    if (!res.ok) throw new Error("Failed");
    const messages = await res.json();

    const tbody = document.querySelector("#messagesTable tbody");
    if (messages.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">No messages</td></tr>`;
    } else {
      tbody.innerHTML = messages.map(m => `
        <tr>
          <td>#${m.id}</td>
          <td>${m.senderName || "—"}</td>
          <td>${m.senderEmail}</td>
          <td>${m.subject || "—"}</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.message}</td>
          <td>${m.isRead ? statusBadge("Read") : statusBadge("Unread")}</td>
          <td>${formatDate(m.receivedAt)}</td>
          <td>${!m.isRead ? `<button class="btn-sm btn-outline" onclick="markRead(${m.id})">Mark Read</button>` : ""}</td>
        </tr>
      `).join("");
    }
  } catch (e) { console.error(e); }
}

// ============================================================
// ADMIN — CRUD Actions
// ============================================================

// Toggle user active
async function toggleUser(id) {
  try {
    await apiFetch(`/users/${id}/toggle`, { method: "PUT" });
    loadUsers();
  } catch (e) { console.error(e); }
}

// Delete product
async function deleteProduct(id) {
  if (!confirm("Are you sure? This will make the product unavailable.")) return;
  try {
    await apiFetch(`/products/${id}`, { method: "DELETE" });
    loadProducts();
  } catch (e) { console.error(e); }
}

// Mark message read
async function markRead(id) {
  try {
    await apiFetch(`/contactmessages/${id}/read`, { method: "PUT" });
    loadMessages();
  } catch (e) { console.error(e); }
}

// ── Product Modal ──
function openProductModal() { document.getElementById("productModal").classList.add("show"); document.body.style.overflow = "hidden"; }
function closeProductModal() { document.getElementById("productModal").classList.remove("show"); document.body.style.overflow = ""; }

const addProductForm = document.getElementById("addProductForm");
if (addProductForm) {
  addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("productMsg");
    try {
      const res = await apiFetch("/products", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("pName").value.trim(),
          description: document.getElementById("pDesc").value.trim() || null,
          grade: document.getElementById("pGrade").value.trim() || null,
          pricePerKg: parseFloat(document.getElementById("pPrice").value),
          badge: document.getElementById("pBadge").value.trim() || null,
          isAvailable: true
        })
      });
      if (res.ok) {
        showMsg(msg, "success", "Product created!");
        addProductForm.reset();
        setTimeout(() => { closeProductModal(); loadProducts(); }, 1000);
      } else {
        const err = await res.json();
        showMsg(msg, "error", err.message || "Failed to create product.");
      }
    } catch (e) { showMsg(msg, "warning", "Server unreachable."); }
  });
}

// ── User Modal ──
function openUserModal() { document.getElementById("userModal").classList.add("show"); document.body.style.overflow = "hidden"; }
function closeUserModal() { document.getElementById("userModal").classList.remove("show"); document.body.style.overflow = ""; }

const addUserForm = document.getElementById("addUserForm");
if (addUserForm) {
  addUserForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("userMsg");
    try {
      const res = await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          fullName: document.getElementById("uName").value.trim(),
          email: document.getElementById("uEmail").value.trim(),
          password: document.getElementById("uPass").value,
          phone: document.getElementById("uPhone").value.trim() || null,
          role: document.getElementById("uRole").value
        })
      });
      if (res.ok) {
        showMsg(msg, "success", "User created!");
        addUserForm.reset();
        setTimeout(() => { closeUserModal(); loadUsers(); }, 1000);
      } else {
        const err = await res.json();
        showMsg(msg, "error", err.message || "Failed to create user.");
      }
    } catch (e) { showMsg(msg, "warning", "Server unreachable."); }
  });
}

// ── Order Status Modal ──
let currentOrderId = null;
function openOrderStatusModal(id, status, payment) {
  currentOrderId = id;
  document.getElementById("osOrderId").textContent = id;
  document.getElementById("osStatus").value = status;
  document.getElementById("osPayment").value = payment;
  document.getElementById("orderStatusModal").classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeOrderStatusModal() { document.getElementById("orderStatusModal").classList.remove("show"); document.body.style.overflow = ""; }

const orderStatusForm = document.getElementById("orderStatusForm");
if (orderStatusForm) {
  orderStatusForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("orderStatusMsg");
    try {
      const res = await apiFetch(`/orders/${currentOrderId}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: document.getElementById("osStatus").value,
          paymentStatus: document.getElementById("osPayment").value
        })
      });
      if (res.ok) {
        showMsg(msg, "success", "Order updated!");
        setTimeout(() => { closeOrderStatusModal(); loadAllOrders(); }, 1000);
      } else { showMsg(msg, "error", "Failed to update."); }
    } catch (e) { showMsg(msg, "warning", "Server unreachable."); }
  });
}

// ── Stock Modal ──
function openStockModal(id, qty, reorder) {
  document.getElementById("stockId").value = id;
  document.getElementById("stockQty").value = qty;
  document.getElementById("stockReorder").value = reorder;
  document.getElementById("stockModal").classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeStockModal() { document.getElementById("stockModal").classList.remove("show"); document.body.style.overflow = ""; }

const stockForm = document.getElementById("stockForm");
if (stockForm) {
  stockForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("stockMsg");
    const id = document.getElementById("stockId").value;
    try {
      const res = await apiFetch(`/inventory/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          quantityKg: parseFloat(document.getElementById("stockQty").value),
          reorderLevelKg: parseFloat(document.getElementById("stockReorder").value)
        })
      });
      if (res.ok) {
        showMsg(msg, "success", "Stock updated!");
        setTimeout(() => { closeStockModal(); loadInventory(); }, 1000);
      } else { showMsg(msg, "error", "Failed."); }
    } catch (e) { showMsg(msg, "warning", "Server unreachable."); }
  });
}

// ============================================================
// STAFF — Overview
// ============================================================
async function loadStaffOverview() {
  try {
    const res = await apiFetch("/dashboard/staff");
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();

    document.getElementById("statAssigned").textContent = data.assignedTasks;
    document.getElementById("statPending").textContent = data.pendingTasks;
    document.getElementById("statInProgress").textContent = data.inProgressTasks;
    document.getElementById("statCompleted").textContent = data.completedTasks;

    const tbody = document.querySelector("#recentTasksTable tbody");
    if (data.recentTasks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">No tasks assigned</td></tr>`;
    } else {
      tbody.innerHTML = data.recentTasks.map(t => `
        <tr>
          <td>#${t.id}</td>
          <td>${t.taskType}</td>
          <td>${t.orderId ? `#${t.orderId}` : "—"}</td>
          <td>${statusBadge(t.status)}</td>
          <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;">${t.notes || "—"}</td>
          <td>${formatDate(t.assignedAt)}</td>
          <td>${t.status !== "Completed" ? `<button class="btn-sm btn-outline" onclick="openTaskModal(${t.id},'${t.status}','${(t.notes||'').replace(/'/g,"\\'")}')">Update</button>` : "✅"}</td>
        </tr>
      `).join("");
    }
  } catch (e) { console.error(e); }
}

// ============================================================
// STAFF — All Tasks
// ============================================================
async function loadStaffTasks() {
  try {
    const res = await apiFetch("/stafftasks");
    if (!res.ok) throw new Error("Failed");
    const tasks = await res.json();

    const tbody = document.querySelector("#allTasksTable tbody");
    if (tasks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">No tasks</td></tr>`;
    } else {
      tbody.innerHTML = tasks.map(t => `
        <tr>
          <td>#${t.id}</td>
          <td>${t.taskType}</td>
          <td>${t.orderId ? `#${t.orderId}` : "—"}</td>
          <td>${statusBadge(t.status)}</td>
          <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;">${t.notes || "—"}</td>
          <td>${formatDate(t.assignedAt)}</td>
          <td>${t.completedAt ? formatDate(t.completedAt) : "—"}</td>
          <td>${t.status !== "Completed" ? `<button class="btn-sm btn-outline" onclick="openTaskModal(${t.id},'${t.status}','${(t.notes||'').replace(/'/g,"\\'")}')">Update</button>` : "✅"}</td>
        </tr>
      `).join("");
    }
  } catch (e) { console.error(e); }
}

// ── Task Modal ──
let currentTaskId = null;
function openTaskModal(id, status, notes) {
  currentTaskId = id;
  document.getElementById("tmTaskId").textContent = id;
  document.getElementById("tmStatus").value = status;
  document.getElementById("tmNotes").value = notes || "";
  document.getElementById("taskModal").classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeTaskModal() { document.getElementById("taskModal").classList.remove("show"); document.body.style.overflow = ""; }

const taskStatusForm = document.getElementById("taskStatusForm");
if (taskStatusForm) {
  taskStatusForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("taskMsg");
    try {
      const res = await apiFetch(`/stafftasks/${currentTaskId}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: document.getElementById("tmStatus").value,
          notes: document.getElementById("tmNotes").value.trim() || null
        })
      });
      if (res.ok) {
        showMsg(msg, "success", "Task updated!");
        setTimeout(() => { closeTaskModal(); loadStaffOverview(); loadStaffTasks(); }, 1000);
      } else { showMsg(msg, "error", "Failed."); }
    } catch (e) { showMsg(msg, "warning", "Server unreachable."); }
  });
}

// ============================================================
// CUSTOMER — Overview
// ============================================================
async function loadCustomerOverview() {
  try {
    const res = await apiFetch("/dashboard/customer");
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();

    document.getElementById("statTotalOrders").textContent = data.totalOrders;
    document.getElementById("statActiveOrders").textContent = data.activeOrders;
    document.getElementById("statCartItems").textContent = data.cartItems;

    const tbody = document.querySelector("#recentOrdersTable tbody");
    if (data.recentOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">No orders yet. <a href="index.html#products" style="color:var(--green-600);font-weight:600;">Browse products →</a></td></tr>`;
    } else {
      tbody.innerHTML = data.recentOrders.map(o => `
        <tr>
          <td>#${o.id}</td>
          <td>$${o.totalAmount.toFixed(2)}</td>
          <td>${statusBadge(o.status)}</td>
          <td>${statusBadge(o.paymentStatus || "Pending")}</td>
          <td>${formatDate(o.orderDate)}</td>
        </tr>
      `).join("");
    }
  } catch (e) { console.error(e); }
}

// ============================================================
// CUSTOMER — Orders
// ============================================================
async function loadCustomerOrders() {
  try {
    const res = await apiFetch("/orders");
    if (!res.ok) throw new Error("Failed");
    const orders = await res.json();

    const tbody = document.querySelector("#allOrdersTable tbody");
    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">No orders yet</td></tr>`;
    } else {
      tbody.innerHTML = orders.map(o => `
        <tr>
          <td>#${o.id}</td>
          <td>${o.items.length} item(s)</td>
          <td>$${o.totalAmount.toFixed(2)}</td>
          <td>${statusBadge(o.status)}</td>
          <td>${statusBadge(o.paymentStatus || "Pending")}</td>
          <td>${formatDate(o.orderDate)}</td>
        </tr>
      `).join("");
    }
  } catch (e) { console.error(e); }
}

// ============================================================
// CUSTOMER — Cart
// ============================================================
async function loadCart() {
  try {
    const res = await apiFetch("/cart");
    if (!res.ok) throw new Error("Failed");
    const items = await res.json();

    const tbody = document.querySelector("#cartTable tbody");
    const footer = document.getElementById("cartFooter");

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">Your cart is empty. <a href="index.html#products" style="color:var(--green-600);font-weight:600;">Browse products →</a></td></tr>`;
      footer.style.display = "none";
    } else {
      let total = 0;
      tbody.innerHTML = items.map(item => {
        total += item.subtotal;
        return `
          <tr>
            <td><strong>${item.productName}</strong></td>
            <td>$${item.pricePerKg.toFixed(2)}</td>
            <td>${item.quantityKg}</td>
            <td>$${item.subtotal.toFixed(2)}</td>
            <td><button class="btn-sm btn-danger" onclick="removeFromCart(${item.id})">Remove</button></td>
          </tr>
        `;
      }).join("");
      document.getElementById("cartTotal").textContent = total.toFixed(2);
      footer.style.display = "block";
    }
  } catch (e) { console.error(e); }
}

async function removeFromCart(id) {
  try {
    await apiFetch(`/cart/${id}`, { method: "DELETE" });
    loadCart();
  } catch (e) { console.error(e); }
}

async function placeOrder() {
  const msg = document.getElementById("cartMsg");
  const addr = document.getElementById("shippingAddr").value.trim();
  try {
    const res = await apiFetch("/orders", {
      method: "POST",
      body: JSON.stringify({ shippingAddress: addr || null, paymentMethod: "Cash on Delivery" })
    });
    if (res.ok) {
      const data = await res.json();
      showMsg(msg, "success", `✅ Order #${data.orderId} placed! Total: $${data.totalAmount.toFixed(2)}`);
      loadCart();
      loadCustomerOverview();
    } else {
      const err = await res.json();
      showMsg(msg, "error", err.message || "Failed to place order.");
    }
  } catch (e) { showMsg(msg, "warning", "Server unreachable."); }
}

// ============================================================
// CUSTOMER — Profile
// ============================================================
async function loadProfile() {
  try {
    const res = await apiFetch("/auth/me");
    if (!res.ok) throw new Error("Failed");
    const user = await res.json();

    document.getElementById("profName").value = user.fullName || "";
    document.getElementById("profEmail").value = user.email || "";
    document.getElementById("profPhone").value = user.phone || "";
    document.getElementById("profAddress").value = user.address || "";
  } catch (e) { console.error(e); }
}

const profileForm = document.getElementById("profileForm");
if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("profileMsg");
    try {
      const res = await apiFetch("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          fullName: document.getElementById("profName").value.trim(),
          phone: document.getElementById("profPhone").value.trim() || null,
          address: document.getElementById("profAddress").value.trim() || null
        })
      });
      if (res.ok) {
        const updated = await res.json();
        localStorage.setItem("user", JSON.stringify({ ...getUser(), fullName: updated.fullName }));
        showMsg(msg, "success", "Profile updated!");
      } else { showMsg(msg, "error", "Failed to update profile."); }
    } catch (e) { showMsg(msg, "warning", "Server unreachable."); }
  });
}

const passwordForm = document.getElementById("passwordForm");
if (passwordForm) {
  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("passMsg");
    try {
      const res = await apiFetch("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: document.getElementById("curPass").value,
          newPassword: document.getElementById("newPass").value
        })
      });
      if (res.ok) {
        showMsg(msg, "success", "Password changed!");
        passwordForm.reset();
      } else {
        const err = await res.json();
        const errText = err.errors ? Object.values(err.errors).flat().join(" ") : (err.message || "Failed.");
        showMsg(msg, "error", errText);
      }
    } catch (e) { showMsg(msg, "warning", "Server unreachable."); }
  });
}

// ============================================================
// INIT — Load first section data
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  loadSectionData("overview");
});

// Close modals on overlay click
document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("show");
      document.body.style.overflow = "";
    }
  });
});
