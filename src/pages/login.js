import "../style.css";
import "../auth-styles.css";
import { redirectIfLoggedIn, saveAuth, redirectToDashboard, API_BASE } from "../auth.js";

// If already logged in, go to dashboard
redirectIfLoggedIn();

const form = document.getElementById("loginForm");
const msg = document.getElementById("authMsg");
const submitBtn = document.getElementById("submitBtn");
const btnText = document.getElementById("btnText");
const btnLoader = document.getElementById("btnLoader");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "";
  msg.className = "auth-msg";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    msg.textContent = "Please fill in all fields.";
    msg.classList.add("error");
    return;
  }

  // Show loading
  submitBtn.disabled = true;
  btnText.textContent = "Signing in...";
  btnLoader.style.display = "inline-block";

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      saveAuth(data.token, data.user);
      msg.textContent = `Welcome back, ${data.user.fullName}!`;
      msg.classList.add("success");

      // Redirect after a brief moment
      setTimeout(() => redirectToDashboard(), 600);
    } else {
      msg.textContent = data.message || "Invalid credentials. Please try again.";
      msg.classList.add("error");
    }
  } catch (error) {
    msg.textContent = "Could not reach the server. Please try again later.";
    msg.classList.add("error");
    console.error("Login error:", error);
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = "Sign In";
    btnLoader.style.display = "none";
  }
});
