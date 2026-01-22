// Mobile menu
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

menuBtn.addEventListener("click", () => {
  navLinks.classList.toggle("show");
});

// Year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// Quote form (no backend)
const quoteForm = document.getElementById("quoteForm");
const formMsg = document.getElementById("formMsg");

quoteForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("qName").value.trim();
  const product = document.getElementById("qProduct").value;
  const qty = document.getElementById("qQty").value;

  formMsg.textContent = `Thanks, ${name}! We will contact you with a price for ${qty}kg of ${product}.`;
  quoteForm.reset();
});

// Product buttons
const notice = document.getElementById("notice");
document.querySelectorAll(".btnSmall").forEach(btn => {
  btn.addEventListener("click", () => {
    const p = btn.dataset.product;
    notice.style.display = "block";
    notice.textContent = `Request received for: ${p}. (Demo message — connect a backend later if needed.)`;
    notice.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

// Contact form (no backend)
const contactForm = document.getElementById("contactForm");
const contactMsg = document.getElementById("contactMsg");

contactForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("cEmail").value.trim();
  const msg = document.getElementById("cMsg").value.trim();

  contactMsg.textContent = `Message sent! We’ll reply to ${email} soon.`;
  contactForm.reset();
});
