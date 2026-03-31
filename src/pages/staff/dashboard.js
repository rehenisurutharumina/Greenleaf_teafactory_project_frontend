import "../../style.css";
import "../../auth-styles.css";
import { requireAuth, getUser, logout, apiFetch } from "../../auth.js";

if (!requireAuth(["Staff"])) throw new Error("Access denied");

const user = getUser();
document.getElementById("userName").textContent = user.fullName;
document.getElementById("userAvatar").textContent = user.fullName.charAt(0).toUpperCase();
document.getElementById("greeting").textContent = `Welcome back, ${user.fullName}!`;
document.getElementById("logoutBtn").addEventListener("click", logout);

loadDashboard();

async function loadDashboard() {
  try {
    const response = await apiFetch("/dashboard/staff");
    if (!response || !response.ok) return;

    const stats = await response.json();
    document.getElementById("totalTasks").textContent = stats.assignedTasks ?? 0;
    document.getElementById("pendingTasks").textContent = stats.pendingTasks ?? 0;
    document.getElementById("inProgressTasks").textContent = stats.inProgressTasks ?? 0;
    document.getElementById("completedTasks").textContent = stats.completedTasks ?? 0;

    renderTasks(stats.recentTasks || []);
  } catch (e) {
    console.error("Dashboard error:", e);
  }
}

function renderTasks(tasks) {
  const tbody = document.getElementById("recentTasksBody");
  if (tasks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No tasks assigned yet</td></tr>';
    return;
  }
  tbody.innerHTML = tasks
    .map(
      (t) => `
    <tr>
      <td>#${t.id}</td>
      <td>${t.taskType}</td>
      <td>${t.orderId ? `#${t.orderId}` : "-"}</td>
      <td><span class="status-badge ${t.status?.toLowerCase()}">${t.status}</span></td>
      <td>${new Date(t.assignedAt).toLocaleDateString()}</td>
    </tr>
  `
    )
    .join("");
}
