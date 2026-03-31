import "../style.css";
import "../shop-styles.css";
import "../auth-styles.css";
import { setupNavAuth, requireAuth, apiFetch } from "../auth.js";

if (!requireAuth(["Customer"])) throw new Error("Access denied");
setupNavAuth("authNav");

let cartItems = [];

loadCart();

async function loadCart() {
  try {
    const res = await apiFetch("/cart");
    if (!res || !res.ok) return;
    cartItems = await res.json();
    renderCart();
  } catch (e) {
    document.getElementById("cartSubtitle").textContent = "Error loading cart.";
  }
}

function renderCart() {
  const list = document.getElementById("cartList");
  const summary = document.getElementById("cartSummary");
  const subtitle = document.getElementById("cartSubtitle");

  if (cartItems.length === 0) {
    subtitle.textContent = "Your cart is empty.";
    list.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon" aria-hidden="true"></div>
        <p>No items in your cart yet.</p>
        <a href="/src/pages/shop.html" class="btn cart-browse-link">Browse Products</a>
      </div>`;
    summary.style.display = "none";
    return;
  }

  subtitle.textContent = `${cartItems.length} item${cartItems.length > 1 ? "s" : ""} in your cart`;
  summary.style.display = "block";

  list.innerHTML = cartItems
    .map(
      (item) => `
    <div class="cart-item" data-id="${item.id}">
      <div>
        <div class="cart-item-name">${item.productName}</div>
        <div class="cart-meta">$${item.pricePerKg.toFixed(2)}/kg</div>
      </div>
      <input type="number" min="0.5" step="0.5" value="${item.quantityKg}"
        class="cart-item-qty" data-id="${item.id}" />
      <div class="cart-item-price">$${item.subtotal.toFixed(2)}</div>
      <button class="cart-item-remove" data-id="${item.id}">Remove</button>
    </div>
  `
    )
    .join("");

  const total = cartItems.reduce((s, i) => s + i.subtotal, 0);
  document.getElementById("summaryRows").innerHTML = cartItems
    .map(
      (i) => `<div class="cart-total-row"><span>${i.productName} x ${i.quantityKg}kg</span><span>$${i.subtotal.toFixed(2)}</span></div>`
    )
    .join("");
  document.getElementById("grandTotal").textContent = `$${total.toFixed(2)}`;

  list.querySelectorAll(".cart-item-qty").forEach((input) => {
    input.addEventListener("change", async () => {
      const id = parseInt(input.dataset.id, 10);
      const qty = parseFloat(input.value);
      if (qty <= 0) return;
      await apiFetch(`/cart/${id}`, {
        method: "PUT",
        body: JSON.stringify({ quantityKg: qty }),
      });
      loadCart();
    });
  });

  list.querySelectorAll(".cart-item-remove").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = parseInt(btn.dataset.id, 10);
      await apiFetch(`/cart/${id}`, { method: "DELETE" });
      loadCart();
    });
  });
}

document.getElementById("checkoutBtn").addEventListener("click", async () => {
  const btn = document.getElementById("checkoutBtn");
  const msg = document.getElementById("checkoutMsg");
  const text = document.getElementById("checkoutText");
  const loader = document.getElementById("checkoutLoader");

  if (cartItems.length === 0) {
    msg.textContent = "Your cart is empty.";
    msg.className = "auth-msg error";
    return;
  }

  btn.disabled = true;
  text.textContent = "Processing...";
  loader.style.display = "inline-block";
  msg.textContent = "";

  try {
    const res = await apiFetch("/orders", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: document.getElementById("shippingAddress").value.trim(),
        paymentMethod: document.getElementById("paymentMethod").value,
      }),
    });

    const data = await res?.json();

    if (res && res.ok) {
      msg.textContent = `Order #${data.orderId} placed. Total: $${data.totalAmount.toFixed(2)}`;
      msg.className = "auth-msg success";
      cartItems = [];
      renderCart();
    } else {
      msg.textContent = data?.message || "Checkout failed.";
      msg.className = "auth-msg error";
    }
  } catch (e) {
    msg.textContent = "Error placing order.";
    msg.className = "auth-msg error";
  } finally {
    btn.disabled = false;
    text.textContent = "Place Order";
    loader.style.display = "none";
  }
});
