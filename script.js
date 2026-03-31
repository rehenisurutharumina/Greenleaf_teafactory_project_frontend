// ============================================================
// script.js — GreenLeaf Tea Factory Frontend
// Connects to the ASP.NET Core Backend API and handles all
// UI interactions, scroll animations, modals, and forms.
// ============================================================

// ----------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------
const API_BASE = "http://localhost:5001/api";

// ----------------------------------------------------------
// DOM REFERENCES
// ----------------------------------------------------------
const header      = document.getElementById("header");
const menuBtn     = document.getElementById("menuBtn");
const navLinks    = document.getElementById("navLinks");
const backToTop   = document.getElementById("backToTop");
const yearEl      = document.getElementById("year");

// ============================================================
// SECTION 1 — Mobile Menu Toggle
// ============================================================
menuBtn.addEventListener("click", () => {
  navLinks.classList.toggle("show");
  menuBtn.classList.toggle("active");
});

// Close mobile menu when clicking a nav link
navLinks.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("show");
    menuBtn.classList.remove("active");
  });
});

// ============================================================
// SECTION 2 — Active Nav Link on Scroll
// ============================================================
const sections = document.querySelectorAll("section[id]");

function updateActiveNav() {
  const scrollY = window.scrollY + 120;
  sections.forEach(section => {
    const top    = section.offsetTop;
    const height = section.offsetHeight;
    const id     = section.getAttribute("id");
    const link   = navLinks.querySelector(`a[href="#${id}"]`);
    if (link) {
      if (scrollY >= top && scrollY < top + height) {
        navLinks.querySelectorAll("a").forEach(a => a.classList.remove("active"));
        link.classList.add("active");
      }
    }
  });
}

// ============================================================
// SECTION 3 — Sticky Header & Back to Top
// ============================================================
function handleScroll() {
  // Sticky header shadow
  if (window.scrollY > 20) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }

  // Back to top visibility
  if (window.scrollY > 500) {
    backToTop.classList.add("visible");
  } else {
    backToTop.classList.remove("visible");
  }

  updateActiveNav();
}

window.addEventListener("scroll", handleScroll, { passive: true });

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ============================================================
// SECTION 4 — Scroll Reveal Animations
// ============================================================
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll(".fade-in, .fade-in-left, .fade-in-right");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: "0px 0px -40px 0px"
  });

  animatedElements.forEach(el => observer.observe(el));
}

// ============================================================
// SECTION 5 — Footer Year
// ============================================================
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// ============================================================
// SECTION 6 — Load Products from Backend API
// ============================================================
async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    if (!response.ok) {
      console.error("Failed to load products:", response.status);
      return;
    }

    const products = await response.json();
    const container = document.getElementById("productCards");
    if (!container) return;

    // Clear fallback static cards
    container.innerHTML = "";

    products.forEach((product, index) => {
      const card = document.createElement("div");
      card.className = "card product fade-in visible";
      card.style.transitionDelay = `${0.1 * (index + 1)}s`;
      card.innerHTML = `
        ${product.badge ? `<div class="badge">${product.badge}</div>` : ""}
        <h3>${product.name}</h3>
        <p>${product.description || ""}</p>
        <p class="price">$${product.pricePerKg.toFixed(2)} / kg</p>
        <button class="btnSmall" data-product="${product.name}">Request Price</button>
      `;
      container.appendChild(card);
    });

    attachProductButtonHandlers();

    // Also update the quote form product dropdown
    updateProductDropdown(products);

  } catch (error) {
    console.warn("Could not load products from backend:", error.message);
    // Static fallback cards remain — still wire up handlers
    attachProductButtonHandlers();
  }
}

// ============================================================
// SECTION 7 — Update Quote Form Product Dropdown
// ============================================================
function updateProductDropdown(products) {
  const select = document.getElementById("qProduct");
  if (!select || !products.length) return;

  // Keep the first placeholder option
  select.innerHTML = '<option value="" disabled selected>Select a product</option>';

  products.forEach(product => {
    const option = document.createElement("option");
    option.value = product.name;
    option.textContent = product.name;
    select.appendChild(option);
  });
}

// ============================================================
// SECTION 8 — Product "Request Price" Buttons
// ============================================================
function attachProductButtonHandlers() {
  const notice = document.getElementById("notice");

  document.querySelectorAll(".btnSmall").forEach(btn => {
    btn.addEventListener("click", () => {
      const productName = btn.dataset.product;

      // Pre-fill the quote form
      const qProduct = document.getElementById("qProduct");
      if (qProduct) {
        for (let option of qProduct.options) {
          if (option.value === productName || option.text.includes(productName)) {
            option.selected = true;
            break;
          }
        }
      }

      // Show notice
      notice.style.display = "block";
      notice.textContent = `Interested in ${productName}? Fill in the quote form below!`;

      // Scroll to hero where quote form lives
      document.getElementById("home").scrollIntoView({ behavior: "smooth" });

      // Auto-hide notice after 5 seconds
      setTimeout(() => {
        notice.style.display = "none";
      }, 5000);
    });
  });
}

// ============================================================
// SECTION 9 — Form Message Helper
// ============================================================
function showFormMessage(element, type, text) {
  element.className = `form-message show ${type}`;
  element.textContent = text;

  if (type === "success") {
    setTimeout(() => {
      element.className = "form-message";
      element.textContent = "";
    }, 6000);
  }
}

// ============================================================
// SECTION 10 — Quote Request Form
// ============================================================
const quoteForm = document.getElementById("quoteForm");
const formMsg   = document.getElementById("formMsg");

quoteForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name    = document.getElementById("qName").value.trim();
  const email   = document.getElementById("qEmail").value.trim();
  const phone   = document.getElementById("qPhone").value.trim();
  const product = document.getElementById("qProduct").value;
  const qty     = parseInt(document.getElementById("qQty").value);

  if (!name || !product || !qty) {
    showFormMessage(formMsg, "error", "Please fill in all required fields.");
    return;
  }

  const submitBtn = document.getElementById("quoteSubmitBtn");
  submitBtn.disabled   = true;
  submitBtn.textContent = "Submitting...";
  formMsg.className    = "form-message";

  try {
    const response = await fetch(`${API_BASE}/quoterequests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name,
        productName:  product,
        quantityKg:   qty,
        email:        email || null,
        phone:        phone || null
      })
    });

    if (response.ok) {
      showFormMessage(formMsg, "success",
        `✅ Thanks, ${name}! We'll contact you with pricing for ${qty}kg of ${product}.`);
      quoteForm.reset();
    } else {
      const errorData = await response.json();
      const errorText = errorData.errors
        ? Object.values(errorData.errors).flat().join(" ")
        : "Could not submit. Please check your input.";
      showFormMessage(formMsg, "error", errorText);
    }

  } catch (error) {
    showFormMessage(formMsg, "warning",
      "⚠️ Could not reach the server. Please try again later.");
    console.error("Network error:", error.message);
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = "Request Quote";
  }
});

// ============================================================
// SECTION 11 — Contact Form
// ============================================================
const contactForm = document.getElementById("contactForm");
const contactMsg  = document.getElementById("contactMsg");

contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name    = document.getElementById("cName").value.trim();
  const email   = document.getElementById("cEmail").value.trim();
  const subject = document.getElementById("cSubject").value.trim();
  const message = document.getElementById("cMsg").value.trim();

  if (!email || !message) {
    showFormMessage(contactMsg, "error", "Please fill in email and message.");
    return;
  }

  const submitBtn = document.getElementById("contactSubmitBtn");
  submitBtn.disabled    = true;
  submitBtn.textContent = "Sending...";
  contactMsg.className  = "form-message";

  try {
    const response = await fetch(`${API_BASE}/contactmessages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderName:  name || null,
        senderEmail: email,
        subject:     subject || null,
        message:     message
      })
    });

    if (response.ok) {
      showFormMessage(contactMsg, "success",
        `✅ Message sent! We'll reply to ${email} soon.`);
      contactForm.reset();
    } else {
      const errorData = await response.json();
      if (errorData.errors) {
        const errorList = Object.values(errorData.errors).flat().join(" ");
        showFormMessage(contactMsg, "error", errorList);
      } else {
        showFormMessage(contactMsg, "error", "Could not send message. Please try again.");
      }
    }

  } catch (error) {
    showFormMessage(contactMsg, "warning",
      "⚠️ Could not reach the server. Please try again later.");
    console.error("Network error:", error.message);
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = "Send Message";
  }
});

// ============================================================
// SECTION 12 — Auth: Login
// ============================================================
const loginForm = document.getElementById("loginForm");
const loginMsg  = document.getElementById("loginMsg");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email    = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    showFormMessage(loginMsg, "error", "Please enter email and password.");
    return;
  }

  const submitBtn = document.getElementById("loginSubmitBtn");
  submitBtn.disabled    = true;
  submitBtn.textContent = "Signing in...";
  loginMsg.className    = "form-message";

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      showFormMessage(loginMsg, "success", `✅ Welcome back, ${data.user.fullName}! Redirecting...`);

      setTimeout(() => {
        const role = data.user.role;
        if (role === "Admin") window.location.href = "admin.html";
        else if (role === "Staff") window.location.href = "staff.html";
        else window.location.href = "customer.html";
      }, 1200);
    } else {
      const errData = await response.json();
      showFormMessage(loginMsg, "error", errData.message || "Invalid credentials.");
    }

  } catch (error) {
    showFormMessage(loginMsg, "warning", "⚠️ Could not reach server.");
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = "Sign In";
  }
});

// ============================================================
// SECTION 13 — Auth: Register
// ============================================================
const registerForm = document.getElementById("registerForm");
const registerMsg  = document.getElementById("registerMsg");

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("regName").value.trim();
  const email    = document.getElementById("regEmail").value.trim();
  const phone    = document.getElementById("regPhone").value.trim();
  const password = document.getElementById("regPassword").value;

  if (!fullName || !email || !password) {
    showFormMessage(registerMsg, "error", "Please fill all required fields.");
    return;
  }

  const submitBtn = document.getElementById("registerSubmitBtn");
  submitBtn.disabled    = true;
  submitBtn.textContent = "Creating account...";
  registerMsg.className = "form-message";

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        password,
        phone: phone || null,
        role: "Customer"
      })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      showFormMessage(registerMsg, "success", `✅ Account created! Welcome, ${data.user.fullName}! Redirecting...`);

      setTimeout(() => {
        window.location.href = "customer.html";
      }, 1200);
    } else {
      const errData = await response.json();
      if (errData.errors) {
        const errorList = Object.values(errData.errors).flat().join(" ");
        showFormMessage(registerMsg, "error", errorList);
      } else {
        showFormMessage(registerMsg, "error", errData.message || "Registration failed.");
      }
    }

  } catch (error) {
    showFormMessage(registerMsg, "warning", "⚠️ Could not reach server.");
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = "Create Account";
  }
});

// ============================================================
// SECTION 14 — Modal Helpers
// ============================================================
function openModal(type) {
  const modal = document.getElementById(`${type}Modal`);
  if (modal) {
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
    // Close mobile nav if open
    navLinks.classList.remove("show");
    menuBtn.classList.remove("active");
  }
}

function closeModal(type) {
  const modal = document.getElementById(`${type}Modal`);
  if (modal) {
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }
}

function switchModal(from, to) {
  closeModal(from);
  setTimeout(() => openModal(to), 200);
}

// Close modal on overlay click
document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("show");
      document.body.style.overflow = "";
    }
  });
});

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-overlay.show").forEach(m => {
      m.classList.remove("show");
    });
    document.body.style.overflow = "";
  }
});

// ============================================================
// SECTION 15 — Auth UI State
// Updates navbar to reflect logged-in / logged-out state
// ============================================================
function getDashboardUrl(role) {
  if (role === "Admin") return "admin.html";
  if (role === "Staff") return "staff.html";
  return "customer.html";
}

function updateAuthUI() {
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "null");
  const navAuth = document.getElementById("navAuth");

  if (token && user) {
    const dashUrl = getDashboardUrl(user.role);
    navAuth.innerHTML = `
      <span style="font-size:0.88rem;font-weight:500;color:var(--green-700);">
        Hello, ${user.fullName.split(" ")[0]}
      </span>
      <a href="${dashUrl}" class="btn-login" style="text-decoration:none;">Dashboard</a>
      <button class="btn-register" onclick="logout()" style="background:#dc2626;border-color:#dc2626;">Logout</button>
    `;
  } else {
    navAuth.innerHTML = `
      <button class="btn-login" id="btnLoginNav" onclick="openModal('login')">Login</button>
      <button class="btn-register" id="btnRegisterNav" onclick="openModal('register')">Register</button>
    `;
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  updateAuthUI();
}

// ============================================================
// SECTION 16 — Newsletter (client-side only)
// ============================================================
const newsletterBtn = document.getElementById("newsletterBtn");
if (newsletterBtn) {
  newsletterBtn.addEventListener("click", () => {
    const emailInput = document.getElementById("newsletterEmail");
    const email = emailInput.value.trim();
    if (!email || !email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }
    alert(`✅ Thank you! ${email} has been subscribed to our newsletter.`);
    emailInput.value = "";
  });
}

// ============================================================
// SECTION 17 — Smooth Scroll for Anchor Links
// ============================================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    const targetId = this.getAttribute("href");
    if (targetId === "#") return;
    const target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      const offsetTop = target.offsetTop - 76; // account for fixed header
      window.scrollTo({ top: offsetTop, behavior: "smooth" });
    }
  });
});

// ============================================================
// SECTION 18 — Initialize
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  initScrollAnimations();
  updateAuthUI();
  loadProducts();
  handleScroll(); // set initial state
});
