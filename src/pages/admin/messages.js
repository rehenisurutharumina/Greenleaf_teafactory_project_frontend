import "../../style.css";
import "../../auth-styles.css";
import { requireAuth, getUser, logout, apiFetch } from "../../auth.js";

if (!requireAuth(["Admin"])) throw new Error("Access denied");

const user = getUser();
document.getElementById("userName").textContent = user.fullName;
document.getElementById("userAvatar").textContent = user.fullName.charAt(0).toUpperCase();
document.getElementById("logoutBtn").addEventListener("click", logout);

let messages = [];
const modal = document.getElementById("messageModal");

init();

function init() {
  loadMessages();
  document.getElementById("closeMessageModal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
}

async function loadMessages() {
  try {
    const res = await apiFetch("/contactmessages");
    if (!res || !res.ok) throw new Error("Failed");
    messages = await res.json();
    renderMessages();
  } catch {
    document.getElementById("messagesBody").innerHTML = '<tr><td colspan="5" class="table-empty">Could not load messages</td></tr>';
  }
}

function renderMessages() {
  const body = document.getElementById("messagesBody");
  if (messages.length === 0) {
    body.innerHTML = '<tr><td colspan="5" class="table-empty">No messages received</td></tr>';
    return;
  }

  body.innerHTML = messages
    .map(
      (m) => `
      <tr>
        <td>${m.senderName || "Unknown"}<br/><span class="form-help">${m.senderEmail}</span></td>
        <td>${m.subject || "General Inquiry"}</td>
        <td>${new Date(m.receivedAt).toLocaleString()}</td>
        <td><span class="status-badge ${m.isRead ? "confirmed" : "pending"}">${m.isRead ? "Read" : "Unread"}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn-action view" data-id="${m.id}">View</button>
            ${m.isRead ? "" : `<button class="btn-action edit" data-mark="${m.id}">Mark Read</button>`}
          </div>
        </td>
      </tr>
    `
    )
    .join("");

  body.querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => openModal(messages.find((x) => x.id === parseInt(btn.dataset.id, 10))));
  });

  body.querySelectorAll("[data-mark]").forEach((btn) => {
    btn.addEventListener("click", () => markRead(parseInt(btn.dataset.mark, 10)));
  });
}

function openModal(message) {
  document.getElementById("messageMeta").textContent = `${message.senderName || "Unknown"} <${message.senderEmail}> | ${message.subject || "General Inquiry"}`;
  document.getElementById("messageBody").textContent = message.message;
  modal.classList.add("active");
}

function closeModal() {
  modal.classList.remove("active");
}

async function markRead(id) {
  await apiFetch(`/contactmessages/${id}/read`, { method: "PUT" });
  loadMessages();
}
