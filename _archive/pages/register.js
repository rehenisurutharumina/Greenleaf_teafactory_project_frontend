import "../style.css";
import "../auth-styles.css";
import { redirectIfLoggedIn, saveAuth, redirectToDashboard, API_BASE } from "../auth.js";

// If already logged in, go to dashboard
redirectIfLoggedIn();

const form = document.getElementById("registerForm");
const msg = document.getElementById("authMsg");
const submitBtn = document.getElementById("submitBtn");
const btnText = document.getElementById("btnText");
const btnLoader = document.getElementById("btnLoader");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "";
  msg.className = "auth-msg";

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim() || null;
  const address = document.getElementById("address").value.trim() || null;
  const role = document.getElementById("role").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!fullName || !email || !password) {
    msg.textContent = "Please fill in all required fields.";
    msg.classList.add("error");
    return;
  }

  if (password !== confirmPassword) {
    msg.textContent = "Passwords do not match.";
    msg.classList.add("error");
    return;
  }

  if (password.length < 6) {
    msg.textContent = "Password must be at least 6 characters.";
    msg.classList.add("error");
    return;
  }

  // Show loading
  submitBtn.disabled = true;
  btnText.textContent = "Creating account...";
  btnLoader.style.display = "inline-block";

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password, phone, address, role }),
    });

    const data = await response.json();

    if (response.ok) {
      saveAuth(data.token, data.user);
      msg.textContent = `Welcome, ${data.user.fullName}! Redirecting...`;
      msg.classList.add("success");

      setTimeout(() => redirectToDashboard(), 600);
    } else {
      // Extract validation errors
      if (data.errors) {
        const errors = Object.values(data.errors).flat().join(" ");
        msg.textContent = errors;
      } else {
        msg.textContent = data.message || "Registration failed. Please try again.";
      }
      msg.classList.add("error");
    }
  } catch (error) {
    msg.textContent = "Could not reach the server. Please try again later.";
    msg.classList.add("error");
    console.error("Register error:", error);
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = "Create Account";
    btnLoader.style.display = "none";
  }
});
