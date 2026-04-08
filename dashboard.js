// ============================================================
// dashboard.js â€” Shared dashboard logic for Admin/Staff/Customer
// ============================================================

const API_BASE = "http://localhost:5001/api";

// â”€â”€ Auth helpers â”€â”€
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

// â”€â”€ Detect which dashboard page we're on â”€â”€
function detectPage() {
  const path = location.pathname.toLowerCase();
  if (path.includes("admin")) return "admin";
  if (path.includes("staff")) return "staff";
  if (path.includes("customer")) return "customer";
  return "unknown";
}

// Guard: redirect if not logged in or not authorized
(function guard() {
  const user = getUser();
  const token = getToken();

  if (!user || !token) {
    window.location.replace("index.html");
    return;
  }

  const currentPage = detectPage();

  if (currentPage === "admin" && user.role !== "Admin") {
    alert("Access denied. Admin only.");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.replace("index.html");
    return;
  }
  if (currentPage === "staff" && user.role !== "Staff" && user.role !== "Admin") {
    alert("Access denied. Staff only.");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.replace("index.html");
    return;
  }
  if (currentPage === "customer" && user.role !== "Customer") {
    alert("Access denied. Customer only.");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.replace("index.html");
    return;
  }

  // Update UI with cached data
  const sidebarUser = document.getElementById("sidebarUser");
  const welcomeText = document.getElementById("welcomeText");
  const sidebarAvatar = document.getElementById("sidebarAvatar");
  if (sidebarUser) sidebarUser.textContent = user.fullName;
  if (welcomeText) welcomeText.textContent = `Welcome, ${user.fullName.split(" ")[0]}`;
  if (sidebarAvatar) sidebarAvatar.textContent = user.fullName.charAt(0).toUpperCase();

  // Show date and time
  const headerDate = document.getElementById("headerDate");
  if (headerDate) {
    headerDate.textContent = new Date().toLocaleDateString("en-US", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }

  function updateWelcomeBannerInfo(u) {
    const bannerName = document.getElementById("welcomeBannerName");
    if (bannerName) {
      const h = new Date().getHours();
      const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
      bannerName.textContent = `${g}, ${u.fullName.split(' ')[0]}!`;
    }
  }
  updateWelcomeBannerInfo(user);

  function updateClock() {
    const wt = document.getElementById('welcomeTime');
    if (wt) wt.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  updateClock();
  setInterval(updateClock, 1000);

  // Verify token with backend
  fetch(`${API_BASE}/auth/me`, {
    headers: { "Authorization": `Bearer ${token}` }
  })
  .then(res => {
    if (!res.ok) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("index.html");
      return null;
    }
    return res.json();
  })
  .then(serverUser => {
    if (!serverUser) return;

    const serverRole = serverUser.role;
    if (currentPage === "admin" && serverRole !== "Admin") {
      alert("Access denied. Your role does not have admin privileges.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("index.html");
      return;
    }
    if (currentPage === "staff" && serverRole !== "Staff" && serverRole !== "Admin") {
      alert("Access denied. Your role does not have staff privileges.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("index.html");
      return;
    }
    if (currentPage === "customer" && serverRole !== "Customer") {
      alert("Access denied. Customer area only.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("index.html");
      return;
    }

    const updatedUser = {
      id: serverUser.id,
      fullName: serverUser.fullName,
      email: serverUser.email,
      phone: serverUser.phone,
      address: serverUser.address,
      role: serverUser.role
    };
    localStorage.setItem("user", JSON.stringify(updatedUser));

    if (sidebarUser) sidebarUser.textContent = updatedUser.fullName;
    if (welcomeText) welcomeText.textContent = `Welcome, ${updatedUser.fullName.split(" ")[0]}`;
    if (sidebarAvatar) sidebarAvatar.textContent = updatedUser.fullName.charAt(0).toUpperCase();
    
    // Also update the big banner if it exists
    updateWelcomeBannerInfo(updatedUser);
  })
  .catch(() => {
    console.warn("Could not verify token with server. Using cached credentials.");
  });
})();

// â”€â”€ Sidebar navigation â”€â”€
document.querySelectorAll(".sidebar-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const sectionId = link.dataset.section;

    document.querySelectorAll(".sidebar-link").forEach(l => l.classList.remove("active"));
    link.classList.add("active");

    document.querySelectorAll(".dash-section").forEach(s => s.classList.remove("active"));
    const sec = document.getElementById(`sec-${sectionId}`);
    if (sec) sec.classList.add("active");

    const title = document.getElementById("pageTitle");
    if (title) title.textContent = link.textContent.replace(/^[^\w]*/, '').trim();

    loadSectionData(sectionId);

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

// â”€â”€ Utility â”€â”€
function formatDate(d) {
  if (!d) return "â€”";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function statusBadge(status) {
  const cls = (status || "").toLowerCase().replace(/\s/g, "");
  return `<span class="status-badge ${cls}">${status || "â€”"}</span>`;
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

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.replace("index.html");
    return res;
  }

  return res;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// DATA LOADER â€” routes to correct loader per section
// ============================================================
function loadSectionData(section) {
  const page = detectPage();

  if (page === "admin") {
    const loaders = { overview: loadAdminOverview, analytics: loadAnalytics, orders: loadAllOrders, products: loadProducts, inventory: loadInventory, users: loadUsers, quotes: loadQuotes, messages: loadMessages };
    if (loaders[section]) loaders[section]();
  } else if (page === "staff") {
    const loaders = { overview: loadStaffOverview, tasks: loadStaffTasks, inventory: loadInventory };
    if (loaders[section]) loaders[section]();
  } else if (page === "customer") {
    const loaders = { overview: loadCustomerOverview, shop: loadShop, orders: loadCustomerOrders, cart: loadCart, wishlist: loadWishlist, profile: loadProfile };
    if (loaders[section]) loaders[section]();
  }
}

// ============================================================
// ADMIN â€” Overview (Enhanced)
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
    document.getElementById("statRevenue").textContent = `$${(data.totalRevenue || 0).toFixed(2)}`;
    document.getElementById("statPendingQuotes").textContent = data.pendingQuotes || 0;
    document.getElementById("statUnreadMsgs").textContent = data.unreadMessages || 0;
    document.getElementById("statCategories").textContent = data.totalCategories || 0;

    // Order status breakdown bars
    if (data.orderBreakdown) {
      const ob = data.orderBreakdown;
      const total = Math.max(data.totalOrders, 1);
      const setBar = (id, countId, count) => {
        document.getElementById(id).style.width = `${Math.min((count / total) * 100, 100)}%`;
        document.getElementById(countId).textContent = count;
      };
      setBar('barPending', 'countPending', ob.pending);
      setBar('barProcessing', 'countProcessing', ob.processing);
      setBar('barShipped', 'countShipped', ob.shipped);
      setBar('barDelivered', 'countDelivered', ob.delivered);
    }

    // Recent orders
    const tbody = document.querySelector("#recentOrdersTable tbody");
    if (data.recentOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">No orders yet</td></tr>`;
    } else {
      tbody.innerHTML = data.recentOrders.map(o => `
        <tr>
          <td><strong>#${o.id}</strong></td>
          <td>${escapeHtml(o.customerName)}</td>
          <td><strong>$${o.totalAmount.toFixed(2)}</strong></td>
          <td>${statusBadge(o.status)}</td>
          <td>${statusBadge(o.paymentStatus || 'Pending')}</td>
          <td>${formatDate(o.orderDate)}</td>
        </tr>
      `).join("");
    }

    // Low stock
    const lowList = document.getElementById("lowStockList");
    if (data.lowStockProducts.length === 0) {
      lowList.innerHTML = `<div class="empty-state-mini"><span style="font-size:1.2rem;">âœ…</span><p style="margin:0;color:#6b786b;font-size:0.85rem;">All stock levels are healthy</p></div>`;
    } else {
      lowList.innerHTML = data.lowStockProducts.map(p => {
        const pct = p.reorderLevelKg > 0 ? (p.quantityKg / p.reorderLevelKg * 100) : 0;
        const critical = pct < 30;
        return `
          <div class="alert-item${critical ? ' critical' : ''}">
            <span class="alert-product">${escapeHtml(p.productName)}</span>
            <span class="alert-qty">${p.quantityKg.toFixed(1)} / ${p.reorderLevelKg.toFixed(1)} kg</span>
          </div>
        `;
      }).join("");
    }

    // Also load KPI + notifications for overview
    loadKPIData();
    loadNotifications();
  } catch (e) {
    console.error("Admin overview error:", e);
  }
}

// ============================================================
// ADMIN â€” KPI Data
// ============================================================
async function loadKPIData() {
  try {
    const res = await apiFetch("/dashboard/analytics");
    if (!res.ok) return;
    const data = await res.json();
    if (data.kpi) {
      const k = data.kpi;
      const revEl = document.getElementById("kpiThisMonthRev");
      const ordEl = document.getElementById("kpiThisMonthOrders");
      const revTrend = document.getElementById("kpiRevTrend");
      const ordTrend = document.getElementById("kpiOrderTrend");

      if (revEl) revEl.textContent = `$${(k.thisMonthRevenue || 0).toFixed(2)}`;
      if (ordEl) ordEl.textContent = k.thisMonthOrders || 0;

      if (revTrend) {
        const g = k.revenueGrowth || 0;
        revTrend.textContent = g > 0 ? `â†‘ ${g}%` : g < 0 ? `â†“ ${Math.abs(g)}%` : 'â€” 0%';
        revTrend.className = `kpi-trend ${g > 0 ? 'trend-up' : g < 0 ? 'trend-down' : 'trend-flat'}`;
      }
      if (ordTrend) {
        const g = k.orderGrowth || 0;
        ordTrend.textContent = g > 0 ? `â†‘ ${g}%` : g < 0 ? `â†“ ${Math.abs(g)}%` : 'â€” 0%';
        ordTrend.className = `kpi-trend ${g > 0 ? 'trend-up' : g < 0 ? 'trend-down' : 'trend-flat'}`;
      }
    }
  } catch (e) { console.warn("KPI load error:", e); }
}

// ============================================================
// ADMIN â€” Notifications
// ============================================================
let notificationsCache = null;

async function loadNotifications() {
  try {
    const res = await apiFetch("/dashboard/notifications");
    if (!res.ok) return;
    notificationsCache = await res.json();

    // Update bell badge
    const badge = document.getElementById("notifBadge");
    const total = notificationsCache.summary?.total || 0;
    if (badge) {
      if (total > 0) {
        badge.textContent = total > 99 ? '99+' : total;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    // Update sidebar badges
    updateSidebarBadges(notificationsCache.summary);

    // Render panel
    renderNotificationPanel();
  } catch (e) { console.warn("Notification load error:", e); }
}

function updateSidebarBadges(summary) {
  if (!summary) return;
  // Add badges to sidebar navigation links
  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(link => {
    // Remove existing badges
    const old = link.querySelector('.sidebar-badge');
    if (old) old.remove();

    const section = link.dataset.section;
    let count = 0, cls = 'badge-info';

    if (section === 'orders' && summary.newOrders > 0) { count = summary.newOrders; cls = 'badge-info'; }
    if (section === 'quotes' && summary.newQuotes > 0) { count = summary.newQuotes; cls = 'badge-warning'; }
    if (section === 'messages' && summary.unreadMessages > 0) { count = summary.unreadMessages; cls = 'badge-info'; }
    if (section === 'inventory' && summary.lowStock > 0) { count = summary.lowStock; cls = 'badge-danger'; }

    if (count > 0) {
      const b = document.createElement('span');
      b.className = `sidebar-badge ${cls}`;
      b.textContent = count;
      link.appendChild(b);
    }
  });
}

function toggleNotificationPanel() {
  const panel = document.getElementById("notificationPanel");
  if (panel) {
    panel.classList.toggle("show");
    if (panel.classList.contains("show") && !notificationsCache) loadNotifications();
  }
}

// Close panel on outside click
document.addEventListener("click", (e) => {
  const panel = document.getElementById("notificationPanel");
  const bell = document.getElementById("notificationBell");
  if (panel && bell && !panel.contains(e.target) && !bell.contains(e.target)) {
    panel.classList.remove("show");
  }
});

function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(dateStr);
}

function renderNotificationPanel() {
  const list = document.getElementById("notifList");
  const summaryEl = document.getElementById("notifSummary");
  if (!notificationsCache || !list) return;

  const { notifications, summary } = notificationsCache;

  // Summary badges
  if (summaryEl) {
    let html = '';
    if (summary.lowStock > 0) html += `<span class="notif-sum-badge sum-stock">âš  ${summary.lowStock}</span>`;
    if (summary.newOrders > 0) html += `<span class="notif-sum-badge sum-order">ðŸ“¦ ${summary.newOrders}</span>`;
    if (summary.newQuotes > 0) html += `<span class="notif-sum-badge sum-quote">ðŸ“„ ${summary.newQuotes}</span>`;
    if (summary.unreadMessages > 0) html += `<span class="notif-sum-badge sum-msg">âœ‰ ${summary.unreadMessages}</span>`;
    summaryEl.innerHTML = html;
  }

  if (!notifications || notifications.length === 0) {
    list.innerHTML = `
      <div class="notif-empty">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <p>All caught up! No new notifications.</p>
      </div>`;
    return;
  }

  const iconSvgs = {
    'alert-triangle': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    'shopping-bag': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    'file-text': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    'mail': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>'
  };

  list.innerHTML = notifications.slice(0, 20).map(n => {
    const sevClass = n.severity === 'critical' ? ' severity-critical' : '';
    return `
      <div class="notif-item">
        <div class="notif-item-icon icon-${n.type}${sevClass}">${iconSvgs[n.icon] || iconSvgs['alert-triangle']}</div>
        <div class="notif-item-content">
          <div class="notif-item-title"><span class="severity-dot ${n.severity}"></span>${escapeHtml(n.title)}</div>
          <div class="notif-item-message">${escapeHtml(n.message)}</div>
          <div class="notif-item-time">${timeAgo(n.timestamp)}</div>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// ADMIN â€” Analytics (Canvas Charts)
// ============================================================
let analyticsLoaded = false;

async function loadAnalytics() {
  if (analyticsLoaded) return;

  const loading = document.getElementById("analyticsLoading");
  const content = document.getElementById("analyticsContent");
  const empty   = document.getElementById("analyticsEmpty");

  try {
    const res = await apiFetch("/dashboard/analytics");
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();

    if (loading) loading.style.display = "none";

    const hasData = (data.monthlySales?.some(m => m.revenue > 0)) ||
                    (data.orderTrends?.some(m => m.orders > 0)) ||
                    (data.topProducts?.length > 0);

    if (!hasData) {
      if (empty) empty.style.display = "block";
      return;
    }

    if (content) content.style.display = "block";

    // Render all charts
    setTimeout(() => {
      renderBarChart("chartMonthlySales", data.monthlySales.map(m => m.month), data.monthlySales.map(m => m.revenue), { color: '#7c3aed', label: 'Revenue ($)', prefix: '$' });
      renderLineChart("chartOrderTrends", data.orderTrends.map(m => m.month), data.orderTrends.map(m => m.orders), { color: '#3b82f6', label: 'Orders' });

      if (data.topProducts.length > 0) {
        renderHorizontalBarChart("chartTopProducts", data.topProducts.map(p => p.productName), data.topProducts.map(p => p.totalRevenue), { colors: ['#2e8b3e','#3b82f6','#f59e0b','#ef4444','#7c3aed','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1'] });
        const legend = document.getElementById("topProductsLegend");
        if (legend) {
          const colors = ['#2e8b3e','#3b82f6','#f59e0b','#ef4444','#7c3aed','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1'];
          legend.innerHTML = data.topProducts.map((p, i) => `<div class="chart-legend-item"><span class="chart-legend-dot" style="background:${colors[i % colors.length]}"></span>${escapeHtml(p.productName)} â€” $${p.totalRevenue.toFixed(2)}</div>`).join('');
        }
      }

      if (data.stockOverview.length > 0) {
        renderStockChart("chartStockOverview", data.stockOverview);
      }

      if (data.quoteTrends.length > 0) {
        renderGroupedBarChart("chartQuoteTrends", data.quoteTrends.map(q => q.month), [
          { label: 'Total', data: data.quoteTrends.map(q => q.total), color: '#6366f1' },
          { label: 'Pending', data: data.quoteTrends.map(q => q.pending), color: '#f59e0b' },
          { label: 'Replied', data: data.quoteTrends.map(q => q.replied), color: '#10b981' }
        ]);
      }

      analyticsLoaded = true;
    }, 100);
  } catch (e) {
    console.error("Analytics error:", e);
    if (loading) loading.innerHTML = '<div class="empty-state-block"><p>Failed to load analytics. Please try again.</p></div>';
  }
}

// â”€â”€ Canvas Chart Helpers â”€â”€
function getCanvasCtx(id) {
  const c = document.getElementById(id);
  if (!c) return null;
  const dpr = window.devicePixelRatio || 1;
  const rect = c.parentElement.getBoundingClientRect();
  c.width = rect.width * dpr;
  c.height = (c.getAttribute('height') || 280) * dpr;
  c.style.width = rect.width + 'px';
  c.style.height = (c.getAttribute('height') || 280) + 'px';
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w: rect.width, h: parseInt(c.getAttribute('height') || 280) };
}

function renderBarChart(id, labels, values, opts = {}) {
  const r = getCanvasCtx(id);
  if (!r) return;
  const { ctx, w, h } = r;
  const pad = { top: 30, right: 20, bottom: 50, left: 60 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const max = Math.max(...values, 1);
  const barW = Math.min(chartW / labels.length * 0.6, 40);
  const gap = chartW / labels.length;

  ctx.clearRect(0, 0, w, h);
  ctx.font = '500 11px Inter, system-ui, sans-serif';

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.strokeStyle = '#eef0ee'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#9aa59a'; ctx.textAlign = 'right';
    const val = max - (max / 4) * i;
    ctx.fillText((opts.prefix || '') + (val >= 1000 ? (val/1000).toFixed(1)+'k' : val.toFixed(0)), pad.left - 8, y + 4);
  }

  // Bars
  labels.forEach((label, i) => {
    const x = pad.left + gap * i + (gap - barW) / 2;
    const barH = (values[i] / max) * chartH;
    const y = pad.top + chartH - barH;

    const grad = ctx.createLinearGradient(x, y, x, pad.top + chartH);
    grad.addColorStop(0, opts.color || '#2e8b3e');
    grad.addColorStop(1, (opts.color || '#2e8b3e') + '40');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    // Label
    ctx.fillStyle = '#6b786b'; ctx.textAlign = 'center';
    ctx.fillText(label.replace(/\s\d{4}$/, ''), pad.left + gap * i + gap / 2, h - pad.bottom + 18);
  });
}

function renderLineChart(id, labels, values, opts = {}) {
  const r = getCanvasCtx(id);
  if (!r) return;
  const { ctx, w, h } = r;
  const pad = { top: 30, right: 20, bottom: 50, left: 50 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const max = Math.max(...values, 1);
  const gap = chartW / Math.max(labels.length - 1, 1);

  ctx.clearRect(0, 0, w, h);
  ctx.font = '500 11px Inter, system-ui, sans-serif';

  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.strokeStyle = '#eef0ee'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#9aa59a'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(max - (max / 4) * i), pad.left - 8, y + 4);
  }

  // Area fill
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top + chartH);
  values.forEach((v, i) => { ctx.lineTo(pad.left + gap * i, pad.top + chartH - (v / max) * chartH); });
  ctx.lineTo(pad.left + gap * (values.length - 1), pad.top + chartH);
  ctx.closePath();
  const areaGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  areaGrad.addColorStop(0, (opts.color || '#3b82f6') + '30');
  areaGrad.addColorStop(1, (opts.color || '#3b82f6') + '05');
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = opts.color || '#3b82f6'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  values.forEach((v, i) => {
    const x = pad.left + gap * i, y = pad.top + chartH - (v / max) * chartH;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Points + labels
  values.forEach((v, i) => {
    const x = pad.left + gap * i, y = pad.top + chartH - (v / max) * chartH;
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = opts.color || '#3b82f6'; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = '#6b786b'; ctx.textAlign = 'center';
    ctx.fillText(labels[i].replace(/\s\d{4}$/, ''), x, h - pad.bottom + 18);
  });
}

function renderHorizontalBarChart(id, labels, values, opts = {}) {
  const r = getCanvasCtx(id);
  if (!r) return;
  const { ctx, w, h } = r;
  const pad = { top: 10, right: 60, bottom: 10, left: 120 };
  const chartW = w - pad.left - pad.right;
  const barH = Math.min((h - pad.top - pad.bottom) / labels.length * 0.65, 28);
  const gap = (h - pad.top - pad.bottom) / labels.length;
  const max = Math.max(...values, 1);
  const colors = opts.colors || ['#2e8b3e'];

  ctx.clearRect(0, 0, w, h);
  ctx.font = '500 11px Inter, system-ui, sans-serif';

  labels.forEach((label, i) => {
    const y = pad.top + gap * i + (gap - barH) / 2;
    const barWidth = (values[i] / max) * chartW;

    ctx.fillStyle = colors[i % colors.length] + '20';
    ctx.beginPath(); ctx.roundRect(pad.left, y, chartW, barH, 4); ctx.fill();

    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath(); ctx.roundRect(pad.left, y, Math.max(barWidth, 4), barH, 4); ctx.fill();

    ctx.fillStyle = '#353d35'; ctx.textAlign = 'right';
    const shortLabel = label.length > 16 ? label.substring(0, 14) + 'â€¦' : label;
    ctx.fillText(shortLabel, pad.left - 8, y + barH / 2 + 4);

    ctx.fillStyle = '#6b786b'; ctx.textAlign = 'left';
    ctx.fillText('$' + (values[i] >= 1000 ? (values[i] / 1000).toFixed(1) + 'k' : values[i].toFixed(0)), pad.left + barWidth + 8, y + barH / 2 + 4);
  });
}

function renderStockChart(id, stockData) {
  const r = getCanvasCtx(id);
  if (!r) return;
  const { ctx, w, h } = r;
  const pad = { top: 10, right: 80, bottom: 10, left: 120 };
  const chartW = w - pad.left - pad.right;
  const barH = Math.min((h - pad.top - pad.bottom) / stockData.length * 0.6, 24);
  const gap = (h - pad.top - pad.bottom) / stockData.length;
  const maxQty = Math.max(...stockData.map(s => Math.max(s.quantityKg, s.reorderLevelKg * 3)), 1);

  ctx.clearRect(0, 0, w, h);
  ctx.font = '500 11px Inter, system-ui, sans-serif';

  stockData.forEach((s, i) => {
    const y = pad.top + gap * i + (gap - barH) / 2;
    const qtyWidth = (s.quantityKg / maxQty) * chartW;
    const reorderX = pad.left + (s.reorderLevelKg / maxQty) * chartW;
    const color = s.isLow ? (s.percentOfReorder < 30 ? '#ef4444' : '#f59e0b') : '#22c55e';

    ctx.fillStyle = '#f0f2f0';
    ctx.beginPath(); ctx.roundRect(pad.left, y, chartW, barH, 4); ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(pad.left, y, Math.max(qtyWidth, 4), barH, 4); ctx.fill();

    // Reorder line
    ctx.strokeStyle = '#dc262680'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(reorderX, y - 2); ctx.lineTo(reorderX, y + barH + 2); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#353d35'; ctx.textAlign = 'right';
    const shortLabel = s.productName.length > 14 ? s.productName.substring(0, 12) + 'â€¦' : s.productName;
    ctx.fillText(shortLabel, pad.left - 8, y + barH / 2 + 4);

    ctx.fillStyle = '#6b786b'; ctx.textAlign = 'left';
    ctx.fillText(`${s.quantityKg.toFixed(0)} kg`, pad.left + qtyWidth + 8, y + barH / 2 + 4);
  });
}

function renderGroupedBarChart(id, labels, datasets) {
  const r = getCanvasCtx(id);
  if (!r) return;
  const { ctx, w, h } = r;
  const pad = { top: 30, right: 20, bottom: 60, left: 50 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const groupW = chartW / labels.length;
  const barW = Math.min(groupW / (datasets.length + 1), 20);
  const allVals = datasets.flatMap(d => d.data);
  const max = Math.max(...allVals, 1);

  ctx.clearRect(0, 0, w, h);
  ctx.font = '500 11px Inter, system-ui, sans-serif';

  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.strokeStyle = '#eef0ee'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#9aa59a'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(max - (max / 4) * i), pad.left - 8, y + 4);
  }

  labels.forEach((label, li) => {
    datasets.forEach((ds, di) => {
      const totalBarsW = datasets.length * barW + (datasets.length - 1) * 3;
      const startX = pad.left + groupW * li + (groupW - totalBarsW) / 2;
      const x = startX + di * (barW + 3);
      const barH = (ds.data[li] / max) * chartH;
      const y = pad.top + chartH - barH;

      ctx.fillStyle = ds.color;
      ctx.beginPath(); ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]); ctx.fill();
    });

    ctx.fillStyle = '#6b786b'; ctx.textAlign = 'center';
    ctx.fillText(label.replace(/\s\d{4}$/, ''), pad.left + groupW * li + groupW / 2, h - pad.bottom + 18);
  });

  // Legend
  const legendY = h - 15;
  let legendX = pad.left;
  datasets.forEach(ds => {
    ctx.fillStyle = ds.color;
    ctx.beginPath(); ctx.roundRect(legendX, legendY - 6, 10, 10, 2); ctx.fill();
    ctx.fillStyle = '#6b786b'; ctx.textAlign = 'left';
    ctx.fillText(ds.label, legendX + 14, legendY + 3);
    legendX += ctx.measureText(ds.label).width + 30;
  });
}

// ============================================================
// ADMIN â€” All Orders (with search & filter)
// ============================================================
let allOrdersCache = [];

async function loadAllOrders() {
  try {
    const res = await apiFetch("/orders/all");
    if (!res.ok) throw new Error("Failed");
    allOrdersCache = await res.json();
    renderOrders();
  } catch (e) { console.error(e); }
}

function renderOrders() {
  const search = (document.getElementById("orderSearch")?.value || "").toLowerCase();
  const statusFilter = document.getElementById("orderStatusFilter")?.value || "";

  let filtered = allOrdersCache;
  if (search) {
    filtered = filtered.filter(o =>
      `#${o.id}`.includes(search) ||
      (o.customerName || "").toLowerCase().includes(search) ||
      (o.customerEmail || "").toLowerCase().includes(search)
    );
  }
  if (statusFilter) {
    filtered = filtered.filter(o => o.status === statusFilter);
  }

  const tbody = document.querySelector("#allOrdersTable tbody");
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">No orders found</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(o => `
      <tr>
        <td><strong>#${o.id}</strong></td>
        <td>${escapeHtml(o.customerName)}</td>
        <td>${escapeHtml(o.customerEmail)}</td>
        <td><strong>$${o.totalAmount.toFixed(2)}</strong></td>
        <td>${statusBadge(o.status)}</td>
        <td>${statusBadge(o.paymentStatus)}</td>
        <td>${formatDate(o.orderDate)}</td>
        <td>
          <div class="btn-group">
            <button class="btn-sm btn-info" onclick="viewOrderDetail(${o.id})">View</button>
            <button class="btn-sm btn-outline" onclick="openOrderStatusModal(${o.id},'${o.status}','${o.paymentStatus}')">Update</button>
          </div>
        </td>
      </tr>
    `).join("");
  }
}

// Wire up order search & filter
document.getElementById("orderSearch")?.addEventListener("input", renderOrders);
document.getElementById("orderStatusFilter")?.addEventListener("change", renderOrders);

// ============================================================
// ADMIN â€” Order Detail View
// ============================================================
async function viewOrderDetail(id) {
  try {
    const res = await apiFetch(`/orders/${id}`);
    if (!res.ok) throw new Error("Failed to load order");
    const order = await res.json();

    document.getElementById("odOrderId").textContent = id;

    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
      itemsHtml = `
        <table class="order-items-table">
          <thead><tr><th>Product</th><th>Qty (kg)</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${order.items.map(i => `
              <tr>
                <td><strong>${escapeHtml(i.productName)}</strong></td>
                <td>${i.quantityKg}</td>
                <td>$${i.unitPrice.toFixed(2)}</td>
                <td><strong>$${i.subtotal.toFixed(2)}</strong></td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot><tr><td colspan="3" style="text-align:right;">Total:</td><td><strong>$${order.totalAmount.toFixed(2)}</strong></td></tr></tfoot>
        </table>
      `;
    }

    document.getElementById("orderDetail").innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Customer</div><div class="detail-value">${escapeHtml(order.customerName)}</div></div>
        <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${escapeHtml(order.customerEmail)}</div></div>
        <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${statusBadge(order.status)}</div></div>
        <div class="detail-item"><div class="detail-label">Payment</div><div class="detail-value">${statusBadge(order.paymentStatus)} (${escapeHtml(order.paymentMethod || 'N/A')})</div></div>
        <div class="detail-item"><div class="detail-label">Order Date</div><div class="detail-value">${formatDate(order.orderDate)}</div></div>
        <div class="detail-item"><div class="detail-label">Updated</div><div class="detail-value">${order.updatedAt ? formatDate(order.updatedAt) : 'â€”'}</div></div>
        <div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Shipping Address</div><div class="detail-value">${escapeHtml(order.shippingAddress) || 'Not provided'}</div></div>
      </div>
      <h4 style="margin-top:20px;font-size:0.85rem;font-weight:700;color:#1a1f1a;">Order Items</h4>
      ${itemsHtml}
    `;

    document.getElementById("orderDetailModal").classList.add("show");
    document.body.style.overflow = "hidden";
  } catch (e) { console.error(e); }
}

function closeOrderDetailModal() { document.getElementById("orderDetailModal").classList.remove("show"); document.body.style.overflow = ""; }

// ============================================================
// ADMIN â€” Products (with edit, category filter, search)
// ============================================================
let allProductsCache = [];
let categoriesCache = [];

async function loadProducts() {
  try {
    // Load categories for dropdown
    const catRes = await apiFetch("/categories");
    if (catRes.ok) {
      categoriesCache = await catRes.json();
      populateCategoryDropdowns();
    }

    const res = await apiFetch("/products/all");
    if (!res.ok) throw new Error("Failed");
    allProductsCache = await res.json();
    renderProducts();
  } catch (e) { console.error(e); }
}

function populateCategoryDropdowns() {
  // Product modal category select
  const pCat = document.getElementById("pCategory");
  if (pCat) {
    pCat.innerHTML = `<option value="">None</option>` + categoriesCache.map(c =>
      `<option value="${c.id}">${escapeHtml(c.name)}</option>`
    ).join("");
  }

  // Filter dropdown
  const filterCat = document.getElementById("productCategoryFilter");
  if (filterCat) {
    filterCat.innerHTML = `<option value="">All Categories</option>` + categoriesCache.map(c =>
      `<option value="${c.id}">${escapeHtml(c.name)}</option>`
    ).join("");
  }
}

function renderProducts() {
  const search = (document.getElementById("productSearch")?.value || "").toLowerCase();
  const catFilter = document.getElementById("productCategoryFilter")?.value || "";

  let filtered = allProductsCache;
  if (search) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(search) ||
      (p.grade || "").toLowerCase().includes(search) ||
      (p.categoryName || "").toLowerCase().includes(search)
    );
  }
  if (catFilter) {
    filtered = filtered.filter(p => p.categoryId == catFilter);
  }

  const tbody = document.querySelector("#productsTable tbody");
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-cell">No products found</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(p => {
      const thumb = p.imageUrl
        ? `<img src="${escapeHtml(p.imageUrl)}" class="product-thumb" alt="${escapeHtml(p.name)}" onerror="this.outerHTML='<div class=\\'product-thumb-placeholder\\'>${escapeHtml(p.name.substring(0,2).toUpperCase())}</div>'" />`
        : `<div class="product-thumb-placeholder">${escapeHtml(p.name.substring(0,2).toUpperCase())}</div>`;

      return `
        <tr>
          <td>${p.id}</td>
          <td>${thumb}</td>
          <td><strong>${escapeHtml(p.name)}</strong>${p.description ? `<br><small style="color:#9aa59a;">${escapeHtml(p.description.substring(0,50))}${p.description.length > 50 ? '...' : ''}</small>` : ''}</td>
          <td>${escapeHtml(p.categoryName) || 'â€”'}</td>
          <td>${escapeHtml(p.grade) || 'â€”'}</td>
          <td><strong>$${p.pricePerKg.toFixed(2)}</strong></td>
          <td>${p.badge ? statusBadge(p.badge) : 'â€”'}</td>
          <td>${p.isAvailable ? statusBadge('Active') : statusBadge('Inactive')}</td>
          <td>
            <div class="btn-group">
              <button class="btn-sm btn-outline" onclick="editProduct(${p.id})">Edit</button>
              <button class="btn-sm btn-danger" onclick="deleteProduct(${p.id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }
}

// Wire up product search & filter
document.getElementById("productSearch")?.addEventListener("input", renderProducts);
document.getElementById("productCategoryFilter")?.addEventListener("change", renderProducts);

// Edit product - populate modal
function editProduct(id) {
  const p = allProductsCache.find(prod => prod.id === id);
  if (!p) return;

  document.getElementById("pEditId").value = p.id;
  document.getElementById("pName").value = p.name || '';
  document.getElementById("pGrade").value = p.grade || '';
  document.getElementById("pDesc").value = p.description || '';
  document.getElementById("pPrice").value = p.pricePerKg || '';
  document.getElementById("pBadge").value = p.badge || '';
  document.getElementById("pImage").value = p.imageUrl || '';
  const fileInput = document.getElementById("pImageFile");
  if (fileInput) fileInput.value = '';
  const preview = document.getElementById("pImagePreview");
  if (preview) {
    if (p.imageUrl) preview.innerHTML = `<a href="${p.imageUrl}" target="_blank" style="color: #4b5e4b; text-decoration: underline;">View Current Image</a>`;
    else preview.innerHTML = '';
  }
  document.getElementById("pAvailable").checked = p.isAvailable;

  const pCat = document.getElementById("pCategory");
  if (pCat && p.categoryId) pCat.value = p.categoryId;

  document.getElementById("productModalTitle").textContent = "Edit Product";
  document.getElementById("productSubmitBtn").textContent = "Update Product";
  openProductModal();
}

// ============================================================
// ADMIN â€” Inventory (with low stock filter, stock bars)
// ============================================================
let allInventoryCache = [];

async function loadInventory() {
  try {
    const res = await apiFetch("/inventory");
    if (!res.ok) throw new Error("Failed");
    allInventoryCache = await res.json();
    renderInventory();
  } catch (e) { console.error(e); }
}

function renderInventory() {
  const lowOnly = document.getElementById("lowStockOnly")?.checked || false;

  let filtered = allInventoryCache;
  if (lowOnly) {
    filtered = filtered.filter(i => i.isLow);
  }

  const tbody = document.querySelector("#inventoryTable tbody");
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">${lowOnly ? 'No low stock items' : 'No inventory'}</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(i => {
      const pct = i.reorderLevelKg > 0 ? Math.min((i.quantityKg / (i.reorderLevelKg * 3)) * 100, 100) : 100;
      let barClass = 'green';
      if (pct < 33) barClass = 'red';
      else if (pct < 66) barClass = 'yellow';

      return `
        <tr>
          <td><strong>${escapeHtml(i.productName)}</strong></td>
          <td><strong>${i.quantityKg.toFixed(1)}</strong></td>
          <td>${i.reorderLevelKg.toFixed(1)}</td>
          <td><div class="stock-bar"><div class="stock-bar-fill ${barClass}" style="width:${pct}%"></div></div></td>
          <td>${i.isLow ? statusBadge('Low Stock') : statusBadge('OK')}</td>
          <td>${i.lastUpdated ? formatDate(i.lastUpdated) : 'â€”'}</td>
          <td><button class="btn-sm btn-outline" onclick="openStockModal(${i.id},${i.quantityKg},${i.reorderLevelKg},'${escapeHtml(i.productName).replace(/'/g,"\\'")}')">Update</button></td>
        </tr>
      `;
    }).join("");
  }
}

document.getElementById("lowStockOnly")?.addEventListener("change", renderInventory);

// ============================================================
// ADMIN â€” Users (with search & role filter)
// ============================================================
let allUsersCache = [];

async function loadUsers() {
  try {
    const res = await apiFetch("/users");
    if (!res.ok) throw new Error("Failed");
    allUsersCache = await res.json();
    renderUsers();
  } catch (e) { console.error(e); }
}

function renderUsers() {
  const search = (document.getElementById("userSearch")?.value || "").toLowerCase();
  const roleFilter = document.getElementById("userRoleFilter")?.value || "";

  let filtered = allUsersCache;
  if (search) {
    filtered = filtered.filter(u =>
      u.fullName.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search) ||
      (u.phone || "").toLowerCase().includes(search)
    );
  }
  if (roleFilter) {
    filtered = filtered.filter(u => u.role === roleFilter);
  }

  const tbody = document.querySelector("#usersTable tbody");
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">No users found</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(u => `
      <tr>
        <td>${u.id}</td>
        <td><strong>${escapeHtml(u.fullName)}</strong></td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.phone) || 'â€”'}</td>
        <td>${statusBadge(u.role)}</td>
        <td>${u.isActive ? statusBadge('Active') : statusBadge('Inactive')}</td>
        <td>${formatDate(u.createdAt)}</td>
        <td>
          <div class="btn-group">
            <button class="btn-sm ${u.isActive ? 'btn-warning' : 'btn-primary'}" onclick="toggleUser(${u.id})">${u.isActive ? 'Deactivate' : 'Activate'}</button>
          </div>
        </td>
      </tr>
    `).join("");
  }
}

document.getElementById("userSearch")?.addEventListener("input", renderUsers);
document.getElementById("userRoleFilter")?.addEventListener("change", renderUsers);

// ============================================================
// ADMIN â€” Quotes (with search, filter, action buttons, amount)
// ============================================================
let allQuotesCache = [];

async function loadQuotes() {
  try {
    const res = await apiFetch("/quoterequests");
    if (!res.ok) throw new Error("Failed");
    allQuotesCache = await res.json();
    renderQuotes();
  } catch (e) { console.error(e); }
}

function renderQuotes() {
  const search = (document.getElementById("quoteSearch")?.value || "").toLowerCase();
  const statusFilter = document.getElementById("quoteStatusFilter")?.value || "";

  let filtered = allQuotesCache;
  if (search) {
    filtered = filtered.filter(q =>
      q.customerName.toLowerCase().includes(search) ||
      q.productName.toLowerCase().includes(search) ||
      (q.email || "").toLowerCase().includes(search)
    );
  }
  if (statusFilter) {
    filtered = filtered.filter(q => q.status === statusFilter);
  }

  const tbody = document.querySelector("#quotesTable tbody");
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-cell">No quote requests found</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(q => `
      <tr>
        <td><strong>#${q.id}</strong></td>
        <td>${escapeHtml(q.customerName)}</td>
        <td>${escapeHtml(q.productName)}</td>
        <td><strong>${q.quantityKg}</strong></td>
        <td>${escapeHtml(q.email || q.phone || 'â€”')}</td>
        <td>${q.quotedAmount ? `<strong>$${q.quotedAmount.toFixed(2)}</strong>` : 'â€”'}</td>
        <td>${statusBadge(q.status)}</td>
        <td>${formatDate(q.submittedAt)}</td>
        <td>
          <button class="btn-sm btn-info" onclick="openQuoteResponseModal(${q.id})">Respond</button>
        </td>
      </tr>
    `).join("");
  }
}

document.getElementById("quoteSearch")?.addEventListener("input", renderQuotes);
document.getElementById("quoteStatusFilter")?.addEventListener("change", renderQuotes);

// ============================================================
// ADMIN â€” Messages (with search, filter, view detail)
// ============================================================
let allMessagesCache = [];

async function loadMessages() {
  try {
    const res = await apiFetch("/contactmessages");
    if (!res.ok) throw new Error("Failed");
    allMessagesCache = await res.json();
    renderMessages();
  } catch (e) { console.error(e); }
}

function renderMessages() {
  const search = (document.getElementById("messageSearch")?.value || "").toLowerCase();
  const readFilter = document.getElementById("messageReadFilter")?.value || "";

  let filtered = allMessagesCache;
  if (search) {
    filtered = filtered.filter(m =>
      (m.senderName || "").toLowerCase().includes(search) ||
      m.senderEmail.toLowerCase().includes(search) ||
      (m.subject || "").toLowerCase().includes(search) ||
      m.message.toLowerCase().includes(search)
    );
  }
  if (readFilter === "unread") {
    filtered = filtered.filter(m => !m.isRead);
  } else if (readFilter === "read") {
    filtered = filtered.filter(m => m.isRead);
  }

  const tbody = document.querySelector("#messagesTable tbody");
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">No messages found</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(m => `
      <tr style="${!m.isRead ? 'background:rgba(254,243,199,0.3);' : ''}">
        <td><strong>#${m.id}</strong></td>
        <td>${escapeHtml(m.senderName) || 'â€”'}</td>
        <td>${escapeHtml(m.senderEmail)}</td>
        <td>${escapeHtml(m.subject) || 'â€”'}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.message)}</td>
        <td>${m.isRead ? statusBadge('Read') : statusBadge('Unread')}</td>
        <td>${formatDate(m.receivedAt)}</td>
        <td>
          <div class="btn-group">
            <button class="btn-sm btn-info" onclick="viewMessage(${m.id})">View</button>
            ${!m.isRead ? `<button class="btn-sm btn-outline" onclick="markRead(${m.id})">Mark Read</button>` : ''}
          </div>
        </td>
      </tr>
    `).join("");
  }
}

document.getElementById("messageSearch")?.addEventListener("input", renderMessages);
document.getElementById("messageReadFilter")?.addEventListener("change", renderMessages);

// ============================================================
// ADMIN â€” CRUD Actions
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

// View message detail
async function viewMessage(id) {
  try {
    const res = await apiFetch(`/contactmessages/${id}`);
    if (!res.ok) throw new Error("Failed");
    const m = await res.json();

    document.getElementById("mmId").textContent = m.id;
    document.getElementById("messageDetail").innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">From</div><div class="detail-value">${escapeHtml(m.senderName) || 'Anonymous'}</div></div>
        <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${escapeHtml(m.senderEmail)}</div></div>
        <div class="detail-item"><div class="detail-label">Subject</div><div class="detail-value">${escapeHtml(m.subject) || 'No subject'}</div></div>
        <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${m.isRead ? statusBadge('Read') : statusBadge('Unread')}</div></div>
        <div class="detail-item"><div class="detail-label">Received</div><div class="detail-value">${formatDate(m.receivedAt)}</div></div>
      </div>
      <div style="margin-top:16px;">
        <div class="detail-label">Message</div>
        <div class="detail-value full">${escapeHtml(m.message)}</div>
      </div>
    `;

    // Actions
    const actionsEl = document.getElementById("messageActions");
    if (!m.isRead) {
      actionsEl.innerHTML = `<button class="btn-sm btn-primary" onclick="markRead(${m.id});closeMessageModal();">Mark as Read</button>`;
    } else {
      actionsEl.innerHTML = '';
    }

    // Auto-mark as read when opening
    if (!m.isRead) {
      await apiFetch(`/contactmessages/${m.id}/read`, { method: "PUT" });
      loadMessages();
    }

    document.getElementById("messageModal").classList.add("show");
    document.body.style.overflow = "hidden";
  } catch (e) { console.error(e); }
}

// â”€â”€ Product Modal â”€â”€
function openProductModal() { document.getElementById("productModal").classList.add("show"); document.body.style.overflow = "hidden"; }
function closeProductModal() {
  document.getElementById("productModal").classList.remove("show");
  document.body.style.overflow = "";
  // Reset form to "Add" mode
  document.getElementById("pEditId").value = "";
  document.getElementById("addProductForm").reset();
  const hiddenImg = document.getElementById("pImage");
  if (hiddenImg) hiddenImg.value = "";
  const preview = document.getElementById("pImagePreview");
  if (preview) preview.innerHTML = "";
  document.getElementById("pAvailable").checked = true;
  document.getElementById("productModalTitle").textContent = "Add Product";
  document.getElementById("productSubmitBtn").textContent = "Create Product";
}

const addProductForm = document.getElementById("addProductForm");
if (addProductForm) {
  addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("productMsg");
    const editId = document.getElementById("pEditId").value;
    const isEdit = !!editId;
    const submitBtn = document.getElementById("productSubmitBtn");
    submitBtn.disabled = true;

    let finalImageUrl = document.getElementById("pImage").value.trim() || null;
    const fileInput = document.getElementById("pImageFile");

    if (fileInput && fileInput.files.length > 0) {
      const formData = new FormData();
      formData.append("file", fileInput.files[0]);
      try {
        const uploadRes = await fetch(`${API_BASE}/uploads`, {
          method: "POST",
          body: formData,
          headers: { "Authorization": `Bearer ${getToken()}` }
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalImageUrl = uploadData.url;
        } else {
          const err = await uploadRes.json();
          showMsg(msg, "error", err.message || "Failed to upload image.");
          submitBtn.disabled = false;
          return;
        }
      } catch (err) {
        showMsg(msg, "error", "Image upload server unreachable.");
        submitBtn.disabled = false;
        return;
      }
    }

    const payload = {
      name: document.getElementById("pName").value.trim(),
      description: document.getElementById("pDesc").value.trim() || null,
      grade: document.getElementById("pGrade").value.trim() || null,
      pricePerKg: parseFloat(document.getElementById("pPrice").value),
      badge: document.getElementById("pBadge").value.trim() || null,
      imageUrl: finalImageUrl,
      isAvailable: document.getElementById("pAvailable").checked,
      categoryId: document.getElementById("pCategory").value ? parseInt(document.getElementById("pCategory").value) : null
    };

    try {
      const url = isEdit ? `/products/${editId}` : "/products";
      const method = isEdit ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method: method,
        body: JSON.stringify(payload)
      });
      if (res.ok || res.status === 201) {
        showMsg(msg, "success", isEdit ? "Product updated!" : "Product created!");
        setTimeout(() => { closeProductModal(); loadProducts(); }, 1000);
      } else {
        const err = await res.json();
        showMsg(msg, "error", err.message || err.title || "Failed to save product.");
      }
    } catch (e) { showMsg(msg, "warning", "Server unreachable."); }
    finally { submitBtn.disabled = false; }
  });
}

// â”€â”€ User Modal â”€â”€
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

// â”€â”€ Order Status Modal â”€â”€
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

// â”€â”€ Stock Modal â”€â”€
function openStockModal(id, qty, reorder, productName) {
  document.getElementById("stockId").value = id;
  document.getElementById("stockQty").value = qty;
  document.getElementById("stockReorder").value = reorder;
  const nameEl = document.getElementById("stockProductName");
  if (nameEl) nameEl.value = productName || '';
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

// â”€â”€ Quote Response Modal â”€â”€
function openQuoteResponseModal(id) {
  const q = allQuotesCache.find(quote => quote.id === id);
  if (!q) return;

  document.getElementById("qmId").textContent = q.id;
  document.getElementById("qmStatus").value = q.status;
  document.getElementById("qmNotes").value = q.adminNotes || "";
  document.getElementById("qmAmount").value = q.quotedAmount || "";

  document.getElementById("quoteDetail").innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-label">Customer</div><div class="detail-value">${escapeHtml(q.customerName)}</div></div>
      <div class="detail-item"><div class="detail-label">Product</div><div class="detail-value">${escapeHtml(q.productName)}</div></div>
      <div class="detail-item"><div class="detail-label">Quantity</div><div class="detail-value"><strong>${q.quantityKg} kg</strong></div></div>
      <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${escapeHtml(q.email) || 'â€”'}</div></div>
      <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value">${escapeHtml(q.phone) || 'â€”'}</div></div>
      <div class="detail-item"><div class="detail-label">Submitted</div><div class="detail-value">${formatDate(q.submittedAt)}</div></div>
    </div>
  `;

  document.getElementById("quoteModal").classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeQuoteModal() { document.getElementById("quoteModal").classList.remove("show"); document.body.style.overflow = ""; }

const quoteResponseForm = document.getElementById("quoteResponseForm");
if (quoteResponseForm) {
  quoteResponseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("quoteMsg");
    const id = document.getElementById("qmId").textContent;
    const amountVal = document.getElementById("qmAmount").value;

    try {
      const res = await apiFetch(`/quoterequests/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: document.getElementById("qmStatus").value,
          adminNotes: document.getElementById("qmNotes").value.trim() || null,
          quotedAmount: amountVal ? parseFloat(amountVal) : null
        })
      });
      if (res.ok) {
        showMsg(msg, "success", "Quote updated!");
        setTimeout(() => { closeQuoteModal(); loadQuotes(); }, 1000);
      } else { showMsg(msg, "error", "Failed to update."); }
    } catch (e) { showMsg(msg, "warning", "Server unreachable."); }
  });
}

// â”€â”€ Message Modal â”€â”€
function closeMessageModal() { document.getElementById("messageModal").classList.remove("show"); document.body.style.overflow = ""; }

// ============================================================
// STAFF â€” Overview (Enhanced with completion ring + welcome banner)
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

    // Welcome banner â€” dynamic greeting
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';

    const user = getUser();
    const firstName = user ? user.fullName.split(' ')[0] : 'Staff';
    const bannerName = document.getElementById("welcomeBannerName");
    if (bannerName) bannerName.textContent = `${greeting}, ${firstName}!`;

    const welcomeTime = document.getElementById("welcomeTime");
    if (welcomeTime) {
      const now = new Date();
      welcomeTime.innerHTML = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) +
        '<br>' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    // Task breakdown items
    const tbiPending = document.getElementById("tbiPending");
    const tbiInProgress = document.getElementById("tbiInProgress");
    const tbiCompleted = document.getElementById("tbiCompleted");
    if (tbiPending) tbiPending.textContent = data.pendingTasks;
    if (tbiInProgress) tbiInProgress.textContent = data.inProgressTasks;
    if (tbiCompleted) tbiCompleted.textContent = data.completedTasks;

    // Completion ring
    renderCompletionRing(data.completionRate || 0);

    // Inventory summary
    const stockSummary = document.getElementById("staffStockSummary");
    const invTotal = document.getElementById("staffInvTotal");
    if (invTotal && data.inventorySummary) {
      invTotal.textContent = `${data.inventorySummary.totalProducts} products`;
    }

    if (stockSummary && data.inventorySummary) {
      const inv = data.inventorySummary;
      if (inv.lowStockCount === 0) {
        stockSummary.innerHTML = '<div class="empty-state-mini"><span style="font-size:1.5rem;">âœ…</span><p style="margin:6px 0 0;color:#6b786b;font-size:0.85rem;font-weight:500;">All ' + inv.totalProducts + ' products have healthy stock levels</p></div>';
      } else {
        let html = '<div class="alert-item" style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-color:#bfdbfe;margin-bottom:8px;"><span class="alert-product" style="color:#1e40af;">\u26a0 ' + inv.lowStockCount + ' item' + (inv.lowStockCount > 1 ? 's' : '') + ' below reorder level</span></div>';
        html += inv.lowStockItems.map(function(p) {
          const pct = p.reorderLevelKg > 0 ? (p.quantityKg / p.reorderLevelKg * 100) : 0;
          const critical = pct < 30;
          return '<div class="alert-item' + (critical ? ' critical' : '') + '"><span class="alert-product">' + escapeHtml(p.productName) + '</span><span class="alert-qty">' + p.quantityKg.toFixed(1) + ' / ' + p.reorderLevelKg.toFixed(1) + ' kg</span></div>';
        }).join("");
        stockSummary.innerHTML = html;
      }
    }

    // Recent tasks table
    const tbody = document.querySelector("#recentTasksTable tbody");
    if (data.recentTasks.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-cell"><div class="empty-state-mini"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9aa59a" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><p style="margin:6px 0 0;color:#9aa59a;font-size:0.85rem;">No tasks assigned yet</p></div></td></tr>';
    } else {
      tbody.innerHTML = data.recentTasks.map(function(t) {
        var actions = t.status !== 'Completed'
          ? '<button class="btn-sm btn-outline" onclick="openTaskModal(' + t.id + ',\'' + t.status + '\',\'' + (t.notes||'').replace(/'/g,"\\'") + '\')">Update</button>'
          : '<span class="status-badge completed">Done</span>';
        return '<tr>' +
          '<td><strong>#' + t.id + '</strong></td>' +
          '<td>' + taskTypeBadge(t.taskType) + '</td>' +
          '<td>' + (t.orderId ? '<strong>#' + t.orderId + '</strong>' : '<span style="color:#b0b8b0">\u2014</span>') + '</td>' +
          '<td>' + statusBadge(t.status) + '</td>' +
          '<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(t.notes || '\u2014') + '</td>' +
          '<td>' + formatDate(t.assignedAt) + '</td>' +
          '<td>' + actions + '</td>' +
          '</tr>';
      }).join("");
    }
  } catch (e) { console.error("Staff overview error:", e); }
}

// â”€â”€ Completion Ring Canvas â”€â”€
function renderCompletionRing(percent) {
  const canvas = document.getElementById("completionCanvas");
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = 140 * dpr;
  canvas.height = 140 * dpr;
  canvas.style.width = '140px';
  canvas.style.height = '140px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = 70, cy = 70, radius = 55, lineWidth = 10;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (Math.PI * 2 * (percent / 100));

  // Background track
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#eef0ee';
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Progress arc
  if (percent > 0) {
    const grad = ctx.createLinearGradient(0, 0, 140, 140);
    grad.addColorStop(0, '#10b981');
    grad.addColorStop(0.5, '#3b82f6');
    grad.addColorStop(1, '#2563eb');

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Update label
  const ringPercent = document.getElementById("ringPercent");
  if (ringPercent) ringPercent.textContent = Math.round(percent) + '%';
}

// â”€â”€ Task Type Badge Helper â”€â”€
function taskTypeBadge(type) {
  const icons = {
    'Packing': 'ðŸ“¦',
    'Processing': 'âš™ï¸',
    'QualityCheck': 'ðŸ”',
    'Dispatch': 'ðŸšš'
  };
  const icon = icons[type] || 'ðŸ“‹';
  return `<span style="display:inline-flex;align-items:center;gap:4px;font-weight:600;">${icon} ${type}</span>`;
}

// ============================================================
// STAFF â€” All Tasks (with filter)
// ============================================================
let allStaffTasksCache = [];

async function loadStaffTasks() {
  try {
    const res = await apiFetch("/stafftasks");
    if (!res.ok) throw new Error("Failed");
    allStaffTasksCache = await res.json();
    renderStaffTasks();

    // Attach filter event
    const filter = document.getElementById("staffTaskStatusFilter");
    if (filter && !filter.__bound) {
      filter.__bound = true;
      filter.addEventListener("change", renderStaffTasks);
    }
  } catch (e) { console.error("Staff tasks error:", e); }
}

function renderStaffTasks() {
  const filter = document.getElementById("staffTaskStatusFilter")?.value || "";
  const tasks = filter ? allStaffTasksCache.filter(t => t.status === filter) : allStaffTasksCache;

  const tbody = document.querySelector("#allTasksTable tbody");
  if (!tbody) return;

  if (tasks.length === 0) {
    const msg = filter ? `No ${filter} tasks` : "No tasks assigned";
    tbody.innerHTML = `<tr><td colspan="8" class="empty-cell"><div class="empty-state-mini"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9aa59a" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><p style="margin:6px 0 0;color:#9aa59a;font-size:0.85rem;">${msg}</p></div></td></tr>`;
  } else {
    tbody.innerHTML = tasks.map(t => `
      <tr>
        <td><strong>#${t.id}</strong></td>
        <td>${taskTypeBadge(t.taskType)}</td>
        <td>${t.orderId ? `<strong>#${t.orderId}</strong>` : '<span style="color:#b0b8b0">â€”</span>'}</td>
        <td>${statusBadge(t.status)}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(t.notes || 'â€”')}</td>
        <td>${formatDate(t.assignedAt)}</td>
        <td>${t.completedAt ? formatDate(t.completedAt) : '<span style="color:#b0b8b0">â€”</span>'}</td>
        <td>${t.status !== 'Completed' ? `<button class="btn-sm btn-outline" onclick="openTaskModal(${t.id},'${t.status}','${(t.notes||'').replace(/'/g,"\\'")}')">Update</button>` : '<span class="status-badge completed">Done</span>'}</td>
      </tr>
    `).join("");
  }
}

// â”€â”€ Task Modal â”€â”€
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
// CUSTOMER â€” Overview
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
      tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">No orders yet. <a href="index.html#products" style="color:var(--green-600);font-weight:600;">Browse products â†’</a></td></tr>`;
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
// CUSTOMER â€” Orders
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
// CUSTOMER â€” Cart
// ============================================================
async function loadCart() {
  try {
    const res = await apiFetch("/cart");
    if (!res.ok) throw new Error("Failed");
    const items = await res.json();

    const tbody = document.querySelector("#cartTable tbody");
    const footer = document.getElementById("cartFooter");

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">Your cart is empty. <a href="index.html#products" style="color:var(--green-600);font-weight:600;">Browse products â†’</a></td></tr>`;
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
      showMsg(msg, "success", `âœ… Order #${data.orderId} placed! Total: $${data.totalAmount.toFixed(2)}`);
      loadCart();
      loadCustomerOverview();
    } else {
      const err = await res.json();
      showMsg(msg, "error", err.message || "Failed to place order.");
    }
  } catch (e) { showMsg(msg, "warning", "Server unreachable."); }
}

// ============================================================
// CUSTOMER â€” Profile
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
// INIT â€” Load first section data
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

// Close modals on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-overlay.show").forEach(o => {
      o.classList.remove("show");
      document.body.style.overflow = "";
    });
  }
});
