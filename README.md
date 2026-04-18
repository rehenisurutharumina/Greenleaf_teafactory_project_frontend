# GreenLeaf Tea Factory — Frontend

The web frontend for the GreenLeaf Tea Factory Management System. A multi-page application built with vanilla HTML, CSS, and JavaScript, served via Vite. Features a public-facing website, admin dashboard, staff portal, and customer portal with role-based interfaces.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Build Tool | Vite 7 (Multi-Page App mode) |
| Languages | HTML5, CSS3, JavaScript (ES6+) |
| Charts | Chart.js (via CDN) |
| Icons | Lucide Icons (via CDN) |
| Fonts | Google Fonts (Inter) |
| API Communication | Fetch API with JWT authentication |

## Features

### Public Website (`index.html`)
- Responsive landing page with hero section
- Product showcase with category filtering
- Bulk quote request form
- Contact form with validation
- Smooth scroll navigation and animations

### Admin Dashboard (`admin.html`)
- **Overview:** KPI cards, stat cards, order breakdown bars, recent activity
- **Analytics:** Revenue trends, order volume charts, category distribution (Chart.js)
- **Orders:** Full order management with status updates, detail modals, search and filters
- **Products:** Product CRUD with image upload, category assignment, grade and pricing
- **Inventory:** Stock level management with reorder alerts, low-stock warnings
- **Users:** User management with role assignment and status control
- **Quotes:** Quote request review, status updates, and admin notes
- **Messages:** Contact message inbox with read/reply status tracking
- **Notifications:** Real-time notification bell with categorized alerts

### Staff Portal (`staff.html`)
- Welcome banner with staff info
- Task management (view, update status)
- Order fulfillment view (read-only)
- Inventory overview (read-only)
- Restricted access indicators for admin-only modules

### Customer Portal (`customer.html`)
- **Shop:** Product browsing with search, category filters, and detail modals
- **Cart:** Add/remove items, quantity controls, checkout with address and payment method
- **My Orders:** Order history with status tracking timeline
- **Profile:** View account information
- **Quick Actions:** Navigation cards for common tasks

### UI/UX Design
- Premium glassmorphism design with dark green brand theme
- Responsive layouts (mobile, tablet, desktop breakpoints)
- Micro-animations and hover effects throughout
- Loading states with skeleton placeholders and spinners
- Toast notifications for user feedback
- Modal-based forms and detail views

## Project Structure

```
Greenleaf_teafactory_project_frontend/
├── index.html           # Public website (landing page)
├── admin.html           # Admin dashboard (multi-section SPA)
├── staff.html           # Staff portal (multi-section SPA)
├── customer.html        # Customer portal (shop, cart, orders)
├── style.css            # Public website styles
├── dashboard.css        # Dashboard styles (admin, staff, customer)
├── script.js            # Public website logic (forms, navigation)
├── dashboard.js         # Admin + staff dashboard logic
├── customer.js          # Customer portal logic (shop, cart, orders)
├── vite.config.js       # Vite configuration (MPA + API proxy)
├── package.json         # Dependencies
├── Tea.jpg              # Hero background image
├── hero-bg.png          # Hero section background
├── contact-bg.jpg       # Contact section background
├── premium-bg.jpg       # Premium section background
├── .gitignore
└── README.md
```

## Prerequisites

- [Node.js 18+](https://nodejs.org/) (includes npm)
- Backend API running on `http://localhost:5001` (see [backend repository](https://github.com/rehenisurutharumina/Greenleaf_teafactory_project_backend))

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/rehenisurutharumina/Greenleaf_teafactory_project_frontend.git
cd Greenleaf_teafactory_project_frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`.

### 4. Start the backend

In a separate terminal, start the backend API (see backend README). The frontend requires the backend to be running on `http://localhost:5001` for API calls to work.

## API Proxy

The Vite dev server is configured to proxy all `/api` requests to the backend:

```js
// vite.config.js
proxy: {
  "/api": {
    target: "http://localhost:5001",
    changeOrigin: true,
  },
},
```

This means the frontend makes API calls to `/api/...` which Vite forwards to `http://localhost:5001/api/...` during development.

## How to Access

| Page | URL | Description |
|------|-----|-------------|
| Public Site | `http://localhost:5173/` | Landing page, products, contact |
| Admin Dashboard | `http://localhost:5173/admin.html` | Login as admin@greenleaf.com |
| Staff Portal | `http://localhost:5173/staff.html` | Login as staff@greenleaf.com |
| Customer Portal | `http://localhost:5173/customer.html` | Register or login as customer |

## Default Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@greenleaf.com | Admin@123 |
| Staff | staff@greenleaf.com | Staff@123 |

> Register a new account through the public site to test the customer flow.

## Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory, ready for static hosting.

```bash
npm run preview    # Preview the production build locally
```

## User Roles & Access

| Feature | Admin | Staff | Customer | Public |
|---------|:-----:|:-----:|:--------:|:------:|
| Landing Page | — | — | — | ✅ |
| Product Showcase | — | — | — | ✅ |
| Quote Request | — | — | — | ✅ |
| Contact Form | — | — | — | ✅ |
| Dashboard Overview | ✅ | ✅ | — | — |
| Analytics Charts | ✅ | — | — | — |
| Order Management | ✅ | 👁️ | — | — |
| Product CRUD | ✅ | — | — | — |
| Inventory Management | ✅ | 👁️ | — | — |
| User Management | ✅ | — | — | — |
| Quote Management | ✅ | — | — | — |
| Message Inbox | ✅ | — | — | — |
| Task Management | — | ✅ | — | — |
| Shop & Browse | — | — | ✅ | — |
| Cart & Checkout | — | — | ✅ | — |
| Order History | — | — | ✅ | — |

> 👁️ = Read-only access

## Future Improvements

- Dark mode theme toggle
- Real-time notifications via WebSocket
- Order tracking with shipping updates
- Customer product reviews and ratings
- Payment gateway integration
- PWA support for mobile

## Related Repository

- **Backend API:** [Greenleaf_teafactory_project_backend](https://github.com/rehenisurutharumina/Greenleaf_teafactory_project_backend)
