import "../../style.css";
import "../../auth-styles.css";
import { requireAuth, getUser, logout, apiFetch } from "../../auth.js";

if (!requireAuth(["Staff"])) throw new Error("Access denied");

const user = getUser();
document.getElementById("userName").textContent = user.fullName;
document.getElementById("userAvatar").textContent = user.fullName.charAt(0).toUpperCase();
document.getElementById("logoutBtn").addEventListener("click", logout);

let tasks = [];
const filter = document.getElementById("taskStatusFilter");
filter.addEventListener("change", renderTasks);

loadTasks();

async function loadTasks() {
  try {
    const res = await apiFetch("/stafftasks");
    if (!res || !res.ok) throw new Error("Failed");
    tasks = await res.json();
    renderTasks();
  } catch {
    document.getElementById("tasksBody").innerHTML = '<tr><td colspan="6" class="table-empty">Could not load tasks</td></tr>';
  }
}

function renderTasks() {
  const body = document.getElementById("tasksBody");
  const selected = filter.value;
  const filtered = selected ? tasks.filter((t) => t.status === selected) : tasks;

  if (filtered.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="table-empty">No tasks found</td></tr>';
    return;
  }

  body.innerHTML = filtered
    .map(
      (t) => `
      <tr>
        <td>#${t.id}</td>
        <td>${t.taskType}</td>
        <td>${t.orderId ? `#${t.orderId}` : "-"}</td>
        <td><span class="status-badge ${String(t.status).toLowerCase()}">${t.status}</span></td>
        <td>${new Date(t.assignedAt).toLocaleDateString()}</td>
        <td>
          <select class="task-status" data-id="${t.id}">
            <option ${t.status === "Pending" ? "selected" : ""}>Pending</option>
            <option ${t.status === "InProgress" ? "selected" : ""}>InProgress</option>
            <option ${t.status === "Completed" ? "selected" : ""}>Completed</option>
          </select>
        </td>
      </tr>
    `
    )
    .join("");

  body.querySelectorAll(".task-status").forEach((el) => {
    el.addEventListener("change", () => updateTask(parseInt(el.dataset.id, 10), el.value));
  });
}

async function updateTask(id, status) {
  await apiFetch(`/stafftasks/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  loadTasks();
}
