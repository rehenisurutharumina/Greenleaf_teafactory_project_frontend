import './style.css';
import { setupNavAuth } from './auth.js';

setupNavAuth('authNav');

const API_BASE = 'http://localhost:5001/api';

const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');

if (menuBtn && navLinks) {
  const closeNav = () => {
    navLinks.classList.remove('show');
    menuBtn.setAttribute('aria-expanded', 'false');
  };

  menuBtn.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('show');
    menuBtn.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('click', (e) => {
    if (!menuBtn.contains(e.target) && !navLinks.contains(e.target)) {
      closeNav();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNav();
    }
  });
}

const siteHeader = document.getElementById('siteHeader');
if (siteHeader) {
  window.addEventListener(
    'scroll',
    () => {
      siteHeader.classList.toggle('scrolled', window.scrollY > 20);
    },
    { passive: true }
  );
}

const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

function initScrollReveal() {
  const elements = document.querySelectorAll('.fade-up');

  if (!('IntersectionObserver' in window)) {
    elements.forEach((el) => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  elements.forEach((el) => observer.observe(el));
}

function setFormMessage(target, type, message) {
  if (!target) return;
  target.className = 'formMsg';
  if (type) {
    target.classList.add(type);
  }
  target.textContent = message;
}

async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);

    if (!response.ok) {
      console.error('Failed to load products:', response.status);
      attachProductButtonHandlers();
      return;
    }

    const products = await response.json();
    const container = document.querySelector('#products .cards');

    if (!container || products.length === 0) {
      attachProductButtonHandlers();
      return;
    }

    container.innerHTML = '';

    products.forEach((product, index) => {
      const card = document.createElement('div');
      card.className = 'card product fade-up visible';
      card.style.transitionDelay = `${index * 80}ms`;
      card.innerHTML = `
        ${product.badge ? `<div class="badge">${product.badge}</div>` : ''}
        <h3>${product.name}</h3>
        <p>${product.description || ''}</p>
        <p><strong>Price: $${product.pricePerKg.toFixed(2)} / kg</strong></p>
        <button class="btnSmall" data-product="${product.name}">Request Price</button>
      `;
      container.appendChild(card);
    });

    const qProduct = document.getElementById('qProduct');
    if (qProduct) {
      qProduct.innerHTML = '<option value="">Select a product</option>';
      products.forEach((product) => {
        const option = document.createElement('option');
        option.value = product.name;
        option.textContent = product.name;
        qProduct.appendChild(option);
      });
    }

    attachProductButtonHandlers();
  } catch (error) {
    console.warn('Could not load products from backend:', error.message);
    attachProductButtonHandlers();
  }
}

function attachProductButtonHandlers() {
  const notice = document.getElementById('notice');

  document.querySelectorAll('.btnSmall').forEach((btn) => {
    btn.addEventListener('click', () => {
      const productName = btn.dataset.product;
      if (!notice || !productName) return;

      const qProduct = document.getElementById('qProduct');
      if (qProduct) {
        for (const option of qProduct.options) {
          if (option.text.includes(productName) || productName.includes(option.text)) {
            option.selected = true;
            break;
          }
        }
      }

      notice.style.display = 'block';
      notice.textContent = `Interested in ${productName}? Fill in the quote form above.`;
      document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

const quoteForm = document.getElementById('quoteForm');
const formMsg = document.getElementById('formMsg');

if (quoteForm && formMsg) {
  quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('qName')?.value.trim() || '';
    const email = document.getElementById('qEmail')?.value.trim() || '';
    const phone = document.getElementById('qPhone')?.value.trim() || '';
    const product = document.getElementById('qProduct')?.value || '';
    const qtyValue = document.getElementById('qQty')?.value || '';
    const qty = Number.parseInt(qtyValue, 10);

    if (!name || !product || !qty) {
      setFormMessage(formMsg, 'error', 'Please fill in all required fields.');
      return;
    }

    const submitBtn = quoteForm.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }
    setFormMessage(formMsg, '', '');

    try {
      const response = await fetch(`${API_BASE}/quoterequests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          productName: product,
          quantityKg: qty,
          email: email || null,
          phone: phone || null,
        }),
      });

      if (response.ok) {
        setFormMessage(formMsg, 'success', `Thanks, ${name}. We will contact you with pricing for ${qty}kg of ${product}.`);
        quoteForm.reset();
      } else {
        const errorData = await response.json();
        if (errorData.errors) {
          const errorList = Object.values(errorData.errors).flat().join(' ');
          setFormMessage(formMsg, 'error', errorList);
        } else {
          setFormMessage(formMsg, 'error', errorData.message || 'Could not submit. Please check your input.');
        }
        console.error('Quote submit error:', errorData);
      }
    } catch (error) {
      setFormMessage(formMsg, 'warning', 'Could not reach the server. Please try again later.');
      console.error('Network error:', error.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Request';
      }
    }
  });
}

const contactForm = document.getElementById('contactForm');
const contactMsg = document.getElementById('contactMsg');

if (contactForm && contactMsg) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('cEmail')?.value.trim() || '';
    const message = document.getElementById('cMsg')?.value.trim() || '';

    if (!email || !message) {
      setFormMessage(contactMsg, 'error', 'Please fill in both email and message.');
      return;
    }

    const submitBtn = contactForm.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }
    setFormMessage(contactMsg, '', '');

    try {
      const response = await fetch(`${API_BASE}/contactmessages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: email,
          message,
        }),
      });

      if (response.ok) {
        setFormMessage(contactMsg, 'success', `Message sent. We will reply to ${email} soon.`);
        contactForm.reset();
      } else {
        const errorData = await response.json();

        if (errorData.errors) {
          const errorList = Object.values(errorData.errors).flat().join(' ');
          setFormMessage(contactMsg, 'error', errorList);
        } else {
          setFormMessage(contactMsg, 'error', errorData.message || 'Could not send message. Please try again.');
        }
        console.error('Contact submit error:', errorData);
      }
    } catch (error) {
      setFormMessage(contactMsg, 'warning', 'Could not reach the server. Please try again later.');
      console.error('Network error:', error.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
    }
  });
}

function initActiveNavHighlight() {
  const sections = document.querySelectorAll('section[id]');
  const navLinkItems = document.querySelectorAll('.links a[href^="#"]');

  if (sections.length === 0 || navLinkItems.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinkItems.forEach((link) => link.classList.remove('active'));

          const activeLink = document.querySelector(`.links a[href="#${id}"]`);
          if (activeLink) {
            activeLink.classList.add('active');
          }
        }
      });
    },
    {
      threshold: 0.3,
      rootMargin: '-80px 0px -50% 0px',
    }
  );

  sections.forEach((section) => observer.observe(section));
}

initScrollReveal();
initActiveNavHighlight();
loadProducts();
