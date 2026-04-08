import "../../style.css";
import "../../auth-styles.css";
import { requireAuth, getUser, logout } from "../../auth.js";

if (!requireAuth(["Customer"])) throw new Error("Access denied");

const user = getUser();
document.getElementById("userName").textContent = user.fullName;
document.getElementById("userAvatar").textContent = user.fullName.charAt(0).toUpperCase();
document.getElementById("logoutBtn").addEventListener("click", logout);

document.getElementById("profileName").textContent = user.fullName || "-";
document.getElementById("profileEmail").textContent = user.email || "-";
document.getElementById("profilePhone").textContent = user.phone || "Not provided";
document.getElementById("profileAddress").textContent = user.address || "Not provided";
document.getElementById("profileRole").textContent = user.role || "Customer";
