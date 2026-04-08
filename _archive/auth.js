// ============================================================
// Shared API + Auth helper used across all frontend pages
// ============================================================

const API_BASE = "http://localhost:5001/api";

// ---- Token Management ----

export function getToken() {
  return localStorage.getItem("gl_token");
}

export function getUser() {
  const data = localStorage.getItem("gl_user");
  return data ? JSON.parse(data) : null;
}

export function saveAuth(token, user) {
  localStorage.setItem("gl_token", token);
  localStorage.setItem("gl_user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("gl_token");
  localStorage.removeItem("gl_user");
}

export function isLoggedIn() {
  return !!getToken();
}

export function getUserRole() {
  const user = getUser();
  return user?.role || null;
}

// ---- API Fetch Wrapper ----

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Auto-redirect on 401
  if (response.status === 401) {
    clearAuth();
    window.location.href = "/src/pages/login.html";
    return null;
  }

  return response;
}

// ---- Route Guards ----

export function requireAuth(allowedRoles = []) {
  if (!isLoggedIn()) {
    window.location.href = "/src/pages/login.html";
    return false;
  }

  if (allowedRoles.length > 0) {
    const role = getUserRole();
    if (!allowedRoles.includes(role)) {
      redirectToDashboard();
      return false;
    }
  }

  return true;
}

export function redirectToDashboard() {
  const role = getUserRole();
  switch (role) {
    case "Admin":
      window.location.href = "/src/pages/admin/dashboard.html";
      break;
    case "Staff":
      window.location.href = "/src/pages/staff/dashboard.html";
      break;
    case "Customer":
      window.location.href = "/src/pages/customer/dashboard.html";
      break;
    default:
      window.location.href = "/src/pages/login.html";
  }
}

export function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    redirectToDashboard();
    return true;
  }
  return false;
}

// ---- Logout ----

export function logout() {
  clearAuth();
  window.location.href = "/";
}

// ---- Navbar Auth Buttons ----

export function setupNavAuth(containerId = "authNav") {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (isLoggedIn()) {
    const user = getUser();
    container.innerHTML = `
      <a href="#" class="nav-user" id="navUserName">${user.fullName}</a>
      <a href="#" class="nav-link-btn" id="dashboardLink">Dashboard</a>
      <button class="btn btnSmall" id="logoutBtn">Logout</button>
    `;

    document.getElementById("dashboardLink")?.addEventListener("click", (e) => {
      e.preventDefault();
      redirectToDashboard();
    });

    document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  } else {
    container.innerHTML = `
      <a href="/src/pages/login.html" class="btn btnSmall">Login</a>
      <a href="/src/pages/register.html" class="btn btnOutline btnSmall">Register</a>
    `;
  }
}

export { API_BASE };
