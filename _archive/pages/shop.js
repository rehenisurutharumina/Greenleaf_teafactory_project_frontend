import "../style.css";
import "../shop-styles.css";
import { setupNavAuth, apiFetch, isLoggedIn, getUserRole, API_BASE } from "../auth.js";

setupNavAuth("authNav");

let allProducts = [];
let categories = [];

init();

async function init() {
  try {
    const [prodRes, catRes] = await Promise.all([
      fetch(`${API_BASE}/products`),
      fetch(`${API_BASE}/categories`),
    ]);

    if (prodRes.ok) allProducts = await prodRes.json();
    if (catRes.ok) categories = await catRes.json();

    populateCategories();
    renderProducts(allProducts);
  } catch (e) {
    document.getElementById("productsGrid").innerHTML =
      '<p class="shop-empty">Could not load products. Please try again.</p>';
  }

  document.getElementById("searchInput").addEventListener("input", applyFilters);
  document.getElementById("categoryFilter").addEventListener("change", applyFilters);
  document.getElementById("sortFilter").addEventListener("change", applyFilters);

  updateCartBadge();
}

function populateCategories() {
  const sel = document.getElementById("categoryFilter");
  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.name} (${c.productCount})`;
    sel.appendChild(opt);
  });
}

function applyFilters() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const catId = document.getElementById("categoryFilter").value;
  const sort = document.getElementById("sortFilter").value;

  let filtered = allProducts.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search) ||
      (p.description || "").toLowerCase().includes(search);
    const matchCat = !catId || p.categoryId == catId;
    return matchSearch && matchCat;
  });

  if (sort === "price-low") filtered.sort((a, b) => a.pricePerKg - b.pricePerKg);
  else if (sort === "price-high") filtered.sort((a, b) => b.pricePerKg - a.pricePerKg);
  else filtered.sort((a, b) => a.name.localeCompare(b.name));

  renderProducts(filtered);
}

function renderProducts(products) {
  const grid = document.getElementById("productsGrid");

  if (products.length === 0) {
    grid.innerHTML = '<p class="shop-empty">No products found.</p>';
    return;
  }

  grid.innerHTML = products
    .map(
      (p) => `
    <div class="shop-card">
      <div class="shop-card-img">
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
        <div class="shop-card-icon" aria-hidden="true"></div>
      </div>
      <div class="shop-card-body">
        <h3>${p.name}</h3>
        ${p.categoryName ? `<span class="shop-category">${p.categoryName}</span>` : ""}
        <p class="shop-desc">${p.description || ""}</p>
        ${p.grade ? `<span class="shop-grade">Grade: ${p.grade}</span>` : ""}
        <div class="shop-card-footer">
          <span class="shop-price">$${p.pricePerKg.toFixed(2)}<small>/kg</small></span>
          <div class="shop-card-actions">
            <input type="number" min="0.5" step="0.5" value="1" class="shop-qty" id="qty-${p.id}" />
            <button class="btn btnSmall add-to-cart-btn" data-id="${p.id}" data-name="${p.name}">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  grid.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(btn));
  });
}

async function addToCart(btn) {
  if (!isLoggedIn()) {
    if (confirm("Please log in to add items to your cart. Go to login?")) {
      window.location.href = "/src/pages/login.html";
    }
    return;
  }

  if (getUserRole() !== "Customer") {
    alert("Only customers can add items to cart.");
    return;
  }

  const productId = parseInt(btn.dataset.id, 10);
  const qtyInput = document.getElementById(`qty-${productId}`);
  const qty = parseFloat(qtyInput.value) || 1;

  btn.disabled = true;
  btn.textContent = "Adding...";

  try {
    const res = await apiFetch("/cart", {
      method: "POST",
      body: JSON.stringify({ productId, quantityKg: qty }),
    });

    if (res && res.ok) {
      btn.textContent = "Added";
      btn.classList.add("added");
      updateCartBadge();
      setTimeout(() => {
        btn.textContent = "Add to Cart";
        btn.classList.remove("added");
        btn.disabled = false;
      }, 1500);
    } else {
      const data = await res?.json();
      alert(data?.message || "Failed to add to cart.");
      btn.textContent = "Add to Cart";
      btn.disabled = false;
    }
  } catch (e) {
    alert("Error adding to cart.");
    btn.textContent = "Add to Cart";
    btn.disabled = false;
  }
}

async function updateCartBadge() {
  if (!isLoggedIn() || getUserRole() !== "Customer") return;
  try {
    const res = await apiFetch("/cart");
    if (res && res.ok) {
      const items = await res.json();
      const badge = document.getElementById("cartBadge");
      if (badge) {
        badge.textContent = items.length;
        badge.style.display = items.length > 0 ? "inline-flex" : "none";
      }
    }
  } catch (e) {
    // Ignore cart badge errors
  }
}
