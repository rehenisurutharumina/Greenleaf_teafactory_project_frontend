// ============================================================
// customer.js — GreenLeaf Tea Factory Customer Portal
// Loaded AFTER dashboard.js — overrides customer-specific logic
// ============================================================

// ── Customer State ──
let shopProductsCache = [];
let shopCategoriesCache = [];
let customerOrdersCache = [];
let wishlistItems = JSON.parse(localStorage.getItem('gl_wishlist') || '[]');
let reviewsStore = JSON.parse(localStorage.getItem('gl_reviews') || '{}');

// ── Override section loader for customer page ──
(function () {
  const original = window.loadSectionData;
  window.loadSectionData = function (section) {
    if (detectPage() === 'customer') {
      const loaders = {
        overview: loadCustomerOverview,
        shop: loadShop,
        orders: loadCustomerOrders,
        cart: loadCart,
        wishlist: loadWishlist,
        profile: loadProfile
      };
      if (loaders[section]) loaders[section]();
    } else if (original) {
      original(section);
    }
  };
})();

// ── Toast ──
function showToast(message, type = 'success') {
  document.querySelectorAll('.cust-toast').forEach(t => t.remove());
  const toast = document.createElement('div');
  toast.className = `cust-toast ${type}`;
  const icon = type === 'success'
    ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
    : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';
  toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icon}</svg><span>${message}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3500);
}

function updateCartBadge(count) {
  const badge = document.getElementById('cartBadge');
  if (badge) {
    if (count > 0) { badge.textContent = count; badge.style.display = 'inline-flex'; }
    else { badge.style.display = 'none'; }
  }
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function renderStars(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) html += '<svg class="star filled" width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    else if (i - 0.5 <= rating) html += '<svg class="star half" width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1" style="opacity:0.6"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    else html += '<svg class="star empty" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d0d5d0" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  }
  return html;
}

function getProductReviews(productId) {
  return reviewsStore[productId] || [];
}

// ============================================================
// CUSTOMER — Overview
// ============================================================
async function loadCustomerOverview() {
  try {
    const res = await apiFetch('/dashboard/customer');
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();

    document.getElementById('statTotalOrders').textContent = data.totalOrders;
    document.getElementById('statActiveOrders').textContent = data.activeOrders;
    document.getElementById('statCartItems').textContent = data.cartItems;
    updateCartBadge(data.cartItems);

    // Welcome banner and time logic is now handled globally in dashboard.js

    const tbody = document.querySelector('#recentOrdersTable tbody');
    if (data.recentOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-cell"><div class="empty-state-block" style="padding:30px;"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c8d8c8" stroke-width="1.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg><h3>No orders yet</h3><p>Start exploring our premium tea collection!</p><button class="btn-sm btn-primary" style="margin-top:12px;" onclick="document.querySelector('[data-section=shop]').click()">Browse Shop →</button></div></td></tr>`;
    } else {
      tbody.innerHTML = data.recentOrders.map(o => `
        <tr>
          <td><strong>#${o.id}</strong></td>
          <td><strong>$${o.totalAmount.toFixed(2)}</strong></td>
          <td>${statusBadge(o.status)}</td>
          <td>${statusBadge(o.paymentStatus || 'Pending')}</td>
          <td>${formatDate(o.orderDate)}</td>
          <td><button class="btn-sm btn-outline" onclick="openOrderDetail(${o.id})">View</button></td>
        </tr>`).join('');
    }
  } catch (e) { console.error('Customer overview error:', e); }
}

// ============================================================
// CUSTOMER — Shop
// ============================================================
let shopLoaded = false;

async function loadShop() {
  if (!shopLoaded) {
    try {
      const catRes = await apiFetch('/categories');
      if (catRes.ok) {
        shopCategoriesCache = await catRes.json();
        const sel = document.getElementById('shopCategoryFilter');
        if (sel) sel.innerHTML = '<option value="">All Categories</option>' + shopCategoriesCache.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
      }
    } catch (e) { console.warn('Categories error:', e); }
  }
  try {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error('Failed');
    shopProductsCache = await res.json();
    shopLoaded = true;
    renderShopProducts();
  } catch (e) {
    console.error('Shop error:', e);
    document.getElementById('shopGrid').innerHTML = '<div class="cust-no-results"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c8d8c8" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg><h3>Could not load products</h3><p>Please try again later.</p></div>';
  }
}

function renderShopProducts() {
  const search = (document.getElementById('shopSearch')?.value || '').toLowerCase();
  const catFilter = document.getElementById('shopCategoryFilter')?.value || '';
  const sortBy = document.getElementById('shopSortBy')?.value || 'name';
  let filtered = [...shopProductsCache];

  if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || (p.description || '').toLowerCase().includes(search) || (p.grade || '').toLowerCase().includes(search) || (p.categoryName || '').toLowerCase().includes(search));
  if (catFilter) filtered = filtered.filter(p => String(p.categoryId) === catFilter);

  switch (sortBy) {
    case 'name': filtered.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'name-desc': filtered.sort((a, b) => b.name.localeCompare(a.name)); break;
    case 'price-asc': filtered.sort((a, b) => a.pricePerKg - b.pricePerKg); break;
    case 'price-desc': filtered.sort((a, b) => b.pricePerKg - a.pricePerKg); break;
  }

  const grid = document.getElementById('shopGrid');
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="cust-no-results"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c8d8c8" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><h3>No products found</h3><p>Try adjusting your search or filter.</p></div>';
    return;
  }

  const teaIcons = ['🍵', '🌿', '☕', '🫖', '🌱'];
  grid.innerHTML = filtered.map((p, i) => {
    const inWL = isInWishlist(p.id);
    const reviews = getProductReviews(p.id);
    const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return `
      <div class="cust-product-card" data-product-id="${p.id}">
        <div class="cust-product-image" onclick="openProductDetail(${p.id})">
          ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" />` : `<span class="cust-pd-emoji">${teaIcons[i % teaIcons.length]}</span>`}
          ${p.badge ? `<span class="cust-product-badge">${escapeHtml(p.badge)}</span>` : ''}
          <button class="cust-wishlist-btn ${inWL ? 'active' : ''}" onclick="event.stopPropagation();toggleWishlist(${p.id})" title="${inWL ? 'Remove from wishlist' : 'Add to wishlist'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${inWL ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
        <div class="cust-product-body" onclick="openProductDetail(${p.id})">
          <div class="cust-product-meta">
            ${p.categoryName ? `<span class="cust-product-category">${escapeHtml(p.categoryName)}</span>` : ''}
            ${p.grade ? `<span class="cust-product-grade-tag">Grade: ${escapeHtml(p.grade)}</span>` : ''}
          </div>
          <h4 class="cust-product-name">${escapeHtml(p.name)}</h4>
          <p class="cust-product-desc">${escapeHtml(p.description || '')}</p>
          ${reviews.length > 0 ? `<div class="cust-product-rating">${renderStars(avg)}<span class="cust-rating-count">(${reviews.length})</span></div>` : ''}
        </div>
        <div class="cust-product-footer">
          <div class="cust-product-price">$${p.pricePerKg.toFixed(2)} <small>/ kg</small></div>
          <div class="cust-product-actions">
            <button class="cust-btn-add-cart" onclick="event.stopPropagation();quickAddToCart(${p.id})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Add</button>
            <button class="cust-btn-detail" onclick="event.stopPropagation();openProductDetail(${p.id})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// Shop toolbar listeners
document.getElementById('shopSearch')?.addEventListener('input', debounce(renderShopProducts, 300));
document.getElementById('shopCategoryFilter')?.addEventListener('change', renderShopProducts);
document.getElementById('shopSortBy')?.addEventListener('change', renderShopProducts);

async function quickAddToCart(productId) {
  try {
    const res = await apiFetch('/cart', { method: 'POST', body: JSON.stringify({ productId, quantityKg: 1 }) });
    if (res.ok) {
      showToast('Added 1 kg to cart!');
      const badge = document.getElementById('cartBadge');
      if (badge) updateCartBadge((parseInt(badge.textContent) || 0) + 1);
    } else {
      const err = await res.json();
      showToast(err.message || 'Failed to add', 'error');
    }
  } catch (e) { showToast('Server unreachable', 'error'); }
}

// ============================================================
// CUSTOMER — Product Detail Modal
// ============================================================
let pdQtyValue = 1;

function openProductDetail(productId) {
  const product = shopProductsCache.find(p => p.id === productId);
  if (!product) {
    // If cache empty, load products first
    fetch(`${API_BASE}/products`).then(r => r.json()).then(products => {
      shopProductsCache = products;
      const p = products.find(x => x.id === productId);
      if (p) _renderProductDetail(p);
    });
    return;
  }
  _renderProductDetail(product);
}

function _renderProductDetail(product) {
  pdQtyValue = 1;
  const modal = document.getElementById('productDetailModal');
  document.getElementById('pdTitle').textContent = product.name;
  const content = document.getElementById('pdContent');
  const reviews = getProductReviews(product.id);
  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const inWL = isInWishlist(product.id);
  const teaIcons = ['🍵', '🌿', '☕', '🫖', '🌱'];
  const emoji = teaIcons[product.id % teaIcons.length];

  content.innerHTML = `
    <div class="cust-pd-top">
      <div class="cust-pd-image">
        ${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" />` : `<span class="cust-pd-emoji">${emoji}</span>`}
      </div>
      <div class="cust-pd-info">
        ${product.categoryName ? `<div class="cust-pd-category">${escapeHtml(product.categoryName)}</div>` : ''}
        <h2 class="cust-pd-name">${escapeHtml(product.name)}</h2>
        ${product.grade ? `<div class="cust-pd-grade">⭐ Grade: ${escapeHtml(product.grade)}</div>` : ''}
        <p class="cust-pd-desc">${escapeHtml(product.description || 'Premium quality tea from the hills of Sri Lanka.')}</p>
        <div class="cust-pd-price">$${product.pricePerKg.toFixed(2)} <small>/ kg</small></div>
        <div class="cust-pd-add-form">
          <div class="cust-qty-control">
            <button class="cust-qty-btn" onclick="pdAdjustQty(-0.5)">−</button>
            <span class="cust-qty-value" id="pdQty">1</span>
            <button class="cust-qty-btn" onclick="pdAdjustQty(0.5)">+</button>
          </div>
          <button class="cust-btn-add-cart" onclick="addToCartFromDetail(${product.id})" style="padding:10px 20px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Add to Cart
          </button>
          <button class="cust-btn-detail" onclick="toggleWishlist(${product.id});_renderProductDetail(shopProductsCache.find(p=>p.id===${product.id}));" style="padding:10px 12px;" title="Wishlist">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${inWL ? '#ef4444' : 'none'}" stroke="${inWL ? '#ef4444' : 'currentColor'}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
      </div>
    </div>
    <div class="cust-pd-reviews">
      <div class="cust-pd-reviews-header">
        <h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:-2px;opacity:.6"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Reviews ${reviews.length > 0 ? `(${reviews.length})` : ''}</h3>
        ${reviews.length > 0 ? `<div class="cust-pd-avg-rating">${renderStars(avg)}<span>${avg.toFixed(1)}/5</span></div>` : ''}
        <button class="btn-sm btn-primary" onclick="openReviewModal(${product.id},'${escapeHtml(product.name).replace(/'/g, "\\'")}')">Write Review</button>
      </div>
      <div class="cust-pd-reviews-list">
        ${reviews.length === 0 ? '<p class="cust-no-reviews">No reviews yet. Be the first to share your thoughts!</p>' : reviews.map(r => `
          <div class="cust-review-item">
            <div class="cust-review-header"><div class="cust-review-stars">${renderStars(r.rating)}</div><span class="cust-review-date">${formatDate(r.date)}</span></div>
            <div class="cust-review-author">${escapeHtml(r.author)}</div>
            <p class="cust-review-text">${escapeHtml(r.text)}</p>
          </div>`).join('')}
      </div>
    </div>`;
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function pdAdjustQty(delta) {
  pdQtyValue = Math.max(0.5, Math.min(1000, pdQtyValue + delta));
  const el = document.getElementById('pdQty');
  if (el) el.textContent = pdQtyValue;
}

async function addToCartFromDetail(productId) {
  try {
    const res = await apiFetch('/cart', { method: 'POST', body: JSON.stringify({ productId, quantityKg: pdQtyValue }) });
    if (res.ok) {
      showToast(`Added ${pdQtyValue} kg to cart!`);
      closeProductDetailModal();
      const badge = document.getElementById('cartBadge');
      if (badge) updateCartBadge((parseInt(badge.textContent) || 0) + 1);
    } else { const err = await res.json(); showToast(err.message || 'Failed', 'error'); }
  } catch (e) { showToast('Server unreachable', 'error'); }
  pdQtyValue = 1;
}

function closeProductDetailModal() {
  document.getElementById('productDetailModal').classList.remove('show');
  document.body.style.overflow = '';
  pdQtyValue = 1;
}

// ============================================================
// CUSTOMER — Orders
// ============================================================
async function loadCustomerOrders() {
  try {
    const res = await apiFetch('/orders');
    if (!res.ok) throw new Error('Failed');
    customerOrdersCache = await res.json();
    renderCustomerOrders();
  } catch (e) {
    console.error(e);
    document.querySelector('#allOrdersTable tbody').innerHTML = '<tr><td colspan="7" class="empty-cell">Failed to load orders</td></tr>';
  }
}

function renderCustomerOrders() {
  const statusFilter = document.getElementById('custOrderFilter')?.value || '';
  let filtered = [...customerOrdersCache];
  if (statusFilter) filtered = filtered.filter(o => o.status === statusFilter);

  const tbody = document.querySelector('#allOrdersTable tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-cell"><div class="empty-state-block" style="padding:30px;"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c8d8c8" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><h3>${statusFilter ? 'No orders with this status' : 'No orders yet'}</h3><p>Your order history will appear here.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(o => `
      <tr>
        <td><strong>#${o.id}</strong></td>
        <td>${o.items.length} item${o.items.length !== 1 ? 's' : ''}</td>
        <td><strong>$${o.totalAmount.toFixed(2)}</strong></td>
        <td>${statusBadge(o.status)}</td>
        <td>${statusBadge(o.paymentStatus || 'Pending')}</td>
        <td>${formatDate(o.orderDate)}</td>
        <td><button class="btn-sm btn-outline" onclick="openOrderDetail(${o.id})">Details</button></td>
      </tr>`).join('');
  }
}

document.getElementById('custOrderFilter')?.addEventListener('change', renderCustomerOrders);

// ============================================================
// CUSTOMER — Order Detail with Tracking
// ============================================================
async function openOrderDetail(orderId) {
  const modal = document.getElementById('custOrderDetailModal');
  const content = document.getElementById('codContent');
  document.getElementById('codOrderId').textContent = orderId;
  content.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><span>Loading order details...</span></div>';
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';

  try {
    const res = await apiFetch(`/orders/${orderId}`);
    if (!res.ok) throw new Error('Failed');
    const order = await res.json();

    const steps = ['Pending', 'Processing', 'Shipped', 'Delivered'];
    const currentIdx = steps.indexOf(order.status);
    const isCancelled = order.status === 'Cancelled';

    content.innerHTML = `
      <div class="cust-od-header">
        <div class="cust-od-item"><div class="cust-od-label">Order Date</div><div class="cust-od-value">${formatDate(order.orderDate)}</div></div>
        <div class="cust-od-item"><div class="cust-od-label">Status</div><div class="cust-od-value">${statusBadge(order.status)}</div></div>
        <div class="cust-od-item"><div class="cust-od-label">Payment Method</div><div class="cust-od-value">${escapeHtml(order.paymentMethod || 'Cash on Delivery')}</div></div>
        <div class="cust-od-item"><div class="cust-od-label">Payment Status</div><div class="cust-od-value">${statusBadge(order.paymentStatus || 'Pending')}</div></div>
        <div class="cust-od-item" style="grid-column:1/-1;"><div class="cust-od-label">Shipping Address</div><div class="cust-od-value">${escapeHtml(order.shippingAddress || 'Not provided')}</div></div>
      </div>
      ${!isCancelled ? `
        <div class="cust-tracking-timeline">
          ${steps.map((step, i) => `
            <div class="cust-tracking-step ${i < currentIdx ? 'completed' : i === currentIdx ? 'active' : ''}">
              <div class="cust-tracking-dot">
                ${i < currentIdx ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : i === currentIdx ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>' : ''}
              </div>
              <span class="cust-tracking-label">${step}</span>
            </div>`).join('')}
        </div>` : '<div class="cust-cancelled-banner"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> This order has been cancelled.</div>'}
      <h3 style="font-family:var(--font-body);font-size:.95rem;font-weight:700;margin-bottom:14px;color:#1a1f1a;">Order Items</h3>
      <div class="table-wrap"><table class="dash-table"><thead><tr><th>Product</th><th>Price/kg</th><th>Qty (kg)</th><th>Subtotal</th></tr></thead><tbody>
        ${order.items.map(i => `<tr><td><strong>${escapeHtml(i.productName)}</strong></td><td>$${i.unitPrice.toFixed(2)}</td><td>${i.quantityKg}</td><td><strong>$${i.subtotal.toFixed(2)}</strong></td></tr>`).join('')}
      </tbody></table></div>
      <div class="cust-cart-summary" style="max-width:350px;margin-left:auto;">
        <div class="cust-cart-total-row"><span>Order Total</span><span class="cust-cart-total-amount">$${order.totalAmount.toFixed(2)}</span></div>
      </div>`;
  } catch (e) {
    content.innerHTML = '<div class="empty-state-block"><h3>Could not load order details</h3><p>Please try again.</p></div>';
  }
}

function closeCustOrderDetailModal() {
  document.getElementById('custOrderDetailModal').classList.remove('show');
  document.body.style.overflow = '';
}

// ============================================================
// CUSTOMER — Cart
// ============================================================
async function loadCart() {
  try {
    const res = await apiFetch('/cart');
    if (!res.ok) throw new Error('Failed');
    const items = await res.json();
    const tbody = document.querySelector('#cartTable tbody');
    const footer = document.getElementById('cartFooter');
    updateCartBadge(items.length);

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-cell"><div class="empty-state-block" style="padding:40px;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c8d8c8" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><h3>Your cart is empty</h3><p>Add some premium teas from our shop!</p><button class="btn-sm btn-primary" style="margin-top:12px;" onclick="document.querySelector('[data-section=shop]').click()">Browse Shop →</button></div></td></tr>`;
      if (footer) footer.style.display = 'none';
    } else {
      let total = 0;
      tbody.innerHTML = items.map(item => {
        total += item.subtotal;
        return `<tr>
          <td><div style="display:flex;align-items:center;gap:10px;"><strong>${escapeHtml(item.productName)}</strong>${item.productBadge ? `<span class="status-badge" style="font-size:.6rem;padding:2px 6px;">${escapeHtml(item.productBadge)}</span>` : ''}</div></td>
          <td>$${item.pricePerKg.toFixed(2)}</td>
          <td><div class="cust-qty-control"><button class="cust-qty-btn" onclick="updateCartQty(${item.id},${Math.max(0.5, item.quantityKg - 0.5)})">−</button><span class="cust-qty-value">${item.quantityKg}</span><button class="cust-qty-btn" onclick="updateCartQty(${item.id},${item.quantityKg + 0.5})">+</button></div></td>
          <td><strong>$${item.subtotal.toFixed(2)}</strong></td>
          <td><button class="btn-sm btn-danger" onclick="removeFromCart(${item.id})" title="Remove"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>
        </tr>`;
      }).join('');
      document.getElementById('cartTotal').textContent = total.toFixed(2);
      if (footer) footer.style.display = 'block';
      // Auto-fill shipping address
      const user = getUser();
      const addrInput = document.getElementById('shippingAddr');
      if (addrInput && !addrInput.value && user?.address) addrInput.value = user.address;
    }
  } catch (e) { console.error('Cart error:', e); }
}

async function updateCartQty(cartItemId, newQty) {
  if (newQty <= 0) { removeFromCart(cartItemId); return; }
  try {
    const res = await apiFetch(`/cart/${cartItemId}`, { method: 'PUT', body: JSON.stringify({ quantityKg: newQty }) });
    if (res.ok) loadCart();
    else showToast('Failed to update quantity', 'error');
  } catch (e) { showToast('Server unreachable', 'error'); }
}

async function removeFromCart(id) {
  try {
    await apiFetch(`/cart/${id}`, { method: 'DELETE' });
    showToast('Item removed from cart');
    loadCart();
  } catch (e) { showToast('Failed to remove item', 'error'); }
}

async function placeOrder() {
  const msg = document.getElementById('cartMsg');
  const addr = document.getElementById('shippingAddr').value.trim();
  const payment = document.getElementById('paymentMethod')?.value || 'Cash on Delivery';
  if (!addr) { showMsg(msg, 'error', 'Please enter a shipping address.'); return; }

  const btn = document.querySelector('#cartFooter .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Placing Order...'; }

  try {
    const res = await apiFetch('/orders', { method: 'POST', body: JSON.stringify({ shippingAddress: addr, paymentMethod: payment }) });
    if (res.ok) {
      const data = await res.json();
      showMsg(msg, 'success', `✅ Order #${data.orderId} placed! Total: $${data.totalAmount.toFixed(2)}`);
      showToast(`Order #${data.orderId} placed successfully!`);
      loadCart();
      loadCustomerOverview();
    } else {
      const err = await res.json();
      showMsg(msg, 'error', err.message || 'Failed to place order.');
    }
  } catch (e) { showMsg(msg, 'warning', 'Server unreachable.'); }
  finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Place Order'; }
  }
}

// ============================================================
// CUSTOMER — Wishlist
// ============================================================
function loadWishlist() {
  const grid = document.getElementById('wishlistGrid');
  const clearBtn = document.getElementById('clearWishlistBtn');
  if (wishlistItems.length === 0) {
    grid.innerHTML = '<div class="empty-state-block"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c8d8c8" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><h3>Your wishlist is empty</h3><p>Browse our shop and save teas you love for later!</p><button class="btn-sm btn-primary" style="margin-top:12px;" onclick="document.querySelector(\'[data-section=shop]\').click()">Browse Shop →</button></div>';
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }
  if (clearBtn) clearBtn.style.display = 'inline-flex';
  if (shopProductsCache.length === 0) {
    fetch(`${API_BASE}/products`).then(r => r.json()).then(products => { shopProductsCache = products; _renderWishlistGrid(grid); }).catch(() => { grid.innerHTML = '<div class="empty-state-block"><p>Could not load products.</p></div>'; });
  } else { _renderWishlistGrid(grid); }
}

function _renderWishlistGrid(grid) {
  const teaIcons = ['🍵', '🌿', '☕', '🫖', '🌱'];
  const items = wishlistItems.map(id => shopProductsCache.find(p => p.id === id)).filter(Boolean);
  if (items.length === 0) {
    grid.innerHTML = '<div class="empty-state-block"><h3>Items no longer available</h3></div>';
    return;
  }
  grid.innerHTML = items.map((p, i) => `
    <div class="cust-product-card">
      <div class="cust-product-image" onclick="openProductDetail(${p.id})">
        ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" />` : `<span class="cust-pd-emoji">${teaIcons[i % teaIcons.length]}</span>`}
        ${p.badge ? `<span class="cust-product-badge">${escapeHtml(p.badge)}</span>` : ''}
        <button class="cust-wishlist-btn active" onclick="event.stopPropagation();toggleWishlist(${p.id})"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
      </div>
      <div class="cust-product-body" onclick="openProductDetail(${p.id})">
        ${p.categoryName ? `<span class="cust-product-category">${escapeHtml(p.categoryName)}</span>` : ''}
        <h4 class="cust-product-name">${escapeHtml(p.name)}</h4>
        <p class="cust-product-desc">${escapeHtml(p.description || '')}</p>
      </div>
      <div class="cust-product-footer">
        <div class="cust-product-price">$${p.pricePerKg.toFixed(2)} <small>/ kg</small></div>
        <button class="cust-btn-add-cart" onclick="event.stopPropagation();quickAddToCart(${p.id})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Add to Cart</button>
      </div>
    </div>`).join('');
}

function toggleWishlist(productId) {
  const idx = wishlistItems.indexOf(productId);
  if (idx > -1) { wishlistItems.splice(idx, 1); showToast('Removed from wishlist'); }
  else { wishlistItems.push(productId); showToast('Added to wishlist! 💚'); }
  localStorage.setItem('gl_wishlist', JSON.stringify(wishlistItems));
  const active = document.querySelector('.sidebar-link.active')?.dataset.section;
  if (active === 'shop') renderShopProducts();
  if (active === 'wishlist') loadWishlist();
}

function isInWishlist(productId) { return wishlistItems.includes(productId); }

function clearWishlist() {
  if (!confirm('Clear your entire wishlist?')) return;
  wishlistItems = [];
  localStorage.setItem('gl_wishlist', JSON.stringify(wishlistItems));
  loadWishlist();
  showToast('Wishlist cleared');
}

// ============================================================
// CUSTOMER — Profile
// ============================================================
async function loadProfile() {
  try {
    const res = await apiFetch('/auth/me');
    if (!res.ok) throw new Error('Failed');
    const user = await res.json();
    document.getElementById('profName').value = user.fullName || '';
    document.getElementById('profEmail').value = user.email || '';
    document.getElementById('profPhone').value = user.phone || '';
    document.getElementById('profAddress').value = user.address || '';
  } catch (e) { console.error('Profile load error:', e); }
}

// Profile form
const _pfForm = document.getElementById('profileForm');
if (_pfForm) {
  const pf = _pfForm.cloneNode(true);
  _pfForm.parentNode.replaceChild(pf, _pfForm);
  pf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('profileMsg');
    const btn = pf.querySelector('button[type=submit]');
    if (btn) btn.disabled = true;
    try {
      const res = await apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify({ fullName: document.getElementById('profName').value.trim(), phone: document.getElementById('profPhone').value.trim() || null, address: document.getElementById('profAddress').value.trim() || null }) });
      if (res.ok) {
        const u = await res.json();
        localStorage.setItem('user', JSON.stringify({ ...getUser(), fullName: u.fullName, phone: u.phone, address: u.address }));
        showMsg(msg, 'success', 'Profile updated successfully!');
        showToast('Profile saved! ✅');
        const su = document.getElementById('sidebarUser');
        const wt = document.getElementById('welcomeText');
        const sa = document.getElementById('sidebarAvatar');
        if (su) su.textContent = u.fullName;
        if (wt) wt.textContent = `Welcome, ${u.fullName.split(' ')[0]}`;
        if (sa) sa.textContent = u.fullName.charAt(0).toUpperCase();
      } else showMsg(msg, 'error', 'Failed to update profile.');
    } catch (e) { showMsg(msg, 'warning', 'Server unreachable.'); }
    finally { if (btn) btn.disabled = false; }
  });
}

// Password form
const _pwForm = document.getElementById('passwordForm');
if (_pwForm) {
  const pw = _pwForm.cloneNode(true);
  _pwForm.parentNode.replaceChild(pw, _pwForm);
  pw.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('passMsg');
    const np = document.getElementById('newPass').value;
    const cp = document.getElementById('confirmPass').value;
    if (np !== cp) { showMsg(msg, 'error', 'Passwords do not match.'); return; }
    if (np.length < 6) { showMsg(msg, 'error', 'Password must be at least 6 characters.'); return; }
    try {
      const res = await apiFetch('/auth/change-password', { method: 'PUT', body: JSON.stringify({ currentPassword: document.getElementById('curPass').value, newPassword: np }) });
      if (res.ok) { showMsg(msg, 'success', 'Password changed!'); showToast('Password updated! 🔒'); pw.reset(); }
      else { const err = await res.json(); showMsg(msg, 'error', err.errors ? Object.values(err.errors).flat().join(' ') : (err.message || 'Failed.')); }
    } catch (e) { showMsg(msg, 'warning', 'Server unreachable.'); }
  });
}

// ============================================================
// CUSTOMER — Reviews (localStorage)
// ============================================================
function openReviewModal(productId, productName) {
  const modal = document.getElementById('reviewModal');
  if (!modal) return;
  document.getElementById('reviewProductName').textContent = productName;
  document.getElementById('reviewProductId').value = productId;
  document.getElementById('reviewRating').value = '5';
  document.getElementById('reviewText').value = '';
  // Highlight stars
  updateReviewStarDisplay(5);
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeReviewModal() {
  document.getElementById('reviewModal')?.classList.remove('show');
  document.body.style.overflow = '';
}

function updateReviewStarDisplay(rating) {
  document.querySelectorAll('#reviewStarsSelect .review-star').forEach((star, i) => {
    star.classList.toggle('active', i < rating);
  });
}

function setReviewRating(rating) {
  document.getElementById('reviewRating').value = rating;
  updateReviewStarDisplay(rating);
}

function submitReview() {
  const productId = parseInt(document.getElementById('reviewProductId').value);
  const rating = parseInt(document.getElementById('reviewRating').value);
  const text = document.getElementById('reviewText').value.trim();
  const user = getUser();

  if (!text) { showToast('Please write a review.', 'error'); return; }
  if (!rating || rating < 1 || rating > 5) { showToast('Please select a rating.', 'error'); return; }

  const review = { rating, text, author: user?.fullName || 'Customer', date: new Date().toISOString() };
  if (!reviewsStore[productId]) reviewsStore[productId] = [];
  reviewsStore[productId].unshift(review);
  localStorage.setItem('gl_reviews', JSON.stringify(reviewsStore));

  showToast('Review submitted! Thank you! ⭐');
  closeReviewModal();

  // Refresh product detail if open
  const pdModal = document.getElementById('productDetailModal');
  if (pdModal.classList.contains('show')) {
    const product = shopProductsCache.find(p => p.id === productId);
    if (product) _renderProductDetail(product);
  }
}
