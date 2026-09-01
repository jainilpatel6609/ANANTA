# ANANTA TRADERS
### Full-Stack Dynamic Material Ordering & Dealer Delivery Management System

> **Tagline:** "Quality Materials. Reliable Delivery."  
> **Business Focus:** Commercial Sand, Crushed Basalt Aggregate, and Stone Grit Supply & Heavy Fleet Logistics across Gujarat.

---

## 🌟 Executive Overview

**ANANTA TRADERS** is a production-ready, responsive, multi-role full-stack business management and e-commerce platform engineered specifically for heavy construction mineral logistics. 

It completely replaces paper slips, manual phone dispatching, and unverifiable weight claims with a digital workflow spanning **Customers (Builders & Contractors)**, **Authorized Sourcing Dealers**, and **Executive Administration**.

---

## 🏗️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 5, Tailwind CSS, React Router v7, Axios, Lucide Icons, Leaflet & React-Leaflet (Interactive GPS Map), React Hot Toast, Recharts |
| **Backend** | Node.js, Express.js REST API, JWT Authentication, bcryptjs password hashing, Multer, Helmet, CORS, Morgan |
| **Database** | MongoDB & Mongoose ODM (Atlas compatible) |
| **File Storage** | Dual-mode: Cloudinary integration + local static disk storage fallback (`backend/uploads/`) |
| **Payment Gateway** | Razorpay SDK with server-side HMAC-SHA256 signature verification |
| **Map & Geocoding** | Leaflet + OpenStreetMap + Nominatim Reverse Geocoding (with GPS "Locate Me") |
| **Notifications** | Extensible Notification Service abstraction (MongoDB In-App alerts + SMS / WhatsApp Business API stubs) |

---

## 👥 Three-Tier Role Architecture

1. **USER (Builders, Contractors, Infrastructure Companies, Traders)**
   - Browse dynamic catalog with live rates per ton fetched from MongoDB.
   - Multi-step interactive order wizard with vehicle capacity enforcement (10W 18T, 12W 24T, 14W 28T, 16W 34T, Trailer 42T).
   - Pin drop-off location using GPS / draggable interactive Leaflet map marker.
   - Transparent price calculation with snapshotted base rate, freight, and 5% GST.
   - Razorpay payment checkout with instant backend verification.
   - Live visual order tracking timeline + **6-digit Delivery OTP card** to share with driver on-site.
   - View uploaded River Royalty certificates and Weighbridge scale slips.

2. **DEALER (Quarry Hubs & Transport Logistics Partners)**
   - Real-time **New Orders Pool** with atomic 1-click acceptance (strictly protects against race conditions).
   - Assign Driver information (Driver Name, Driver Mobile, Vehicle Number).
   - Upload **River Royalty Certificate Photo** & **Certified Weighbridge Slip Photo** before departure.
   - Real-time GPS navigation link to customer site coordinates.
   - **Verify Customer Delivery OTP**: Enters the 6-digit OTP provided by the site supervisor to finalize delivery and update timestamps.

3. **ADMIN (Executive Command Center & Management)**
   - High-level KPIs: Total Gross Revenue, Total Dispatched Tonnage, Orders, Dealers, and Users.
   - **Today's Orders Board**: Live dispatch monitoring radar.
   - **All Orders Master**: Multi-filter audit database with full Order Inspector modal.
   - **Dealer Network Management**: Register dealers, soft-deactivate/activate, reset password, monitor fulfillment rate %.
   - **Product & Price Manager**: Update Price Per Ton dynamically with **Historical Price Snapshot Immutability Guarantee**.
   - **Reports & Analytics**: Daily & Monthly sales statements + 1-click export to **CSV** and **Excel (.xlsx)**.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v20+ recommended)
- MongoDB running locally or a MongoDB Atlas connection URI

### 1. Backend Setup
```bash
cd backend
npm install
npm run seed     # Seeds Admin, Dealers, Customers, Products, and initial sample orders
npm start        # Starts Express API server on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Starts Vite React dev server on http://localhost:5173
```

---

## 🔑 Pre-Seeded Demonstration Accounts

For effortless evaluation, you can log in with any of these pre-configured accounts:

| Role | Mobile / ID | Password | Notes |
|---|---|---|---|
| **SUPER ADMIN** | `9876543210` | `Admin@12345` | Full command center, pricing, and report access |
| **DEALER (Siddhpur)** | `9898000001` | `Dealer@12345` | Siddhpur Stone & Sand Logistics |
| **DEALER (Sabarmati)**| `9898000002` | `Dealer@12345` | Sabarmati Minerals & Aggregates |
| **DEALER (Patan)**    | `9898000003` | `Dealer@12345` | Patan Sand Transport Hub |
| **BUILDER CUSTOMER**  | `9825000001` | `User@12345` | Rajesh Patel (Patel Infrastructure Ltd) |
| **CONTRACTOR CUSTOMER**| `9825000002` | `User@12345` | Vikram Shah (Shah Construction & Co) |

> 💡 **Tip:** The Login page includes a **1-Click Quick Demo Switcher** for instant one-click login!

---

## 🧪 Automated Testing

The backend includes a comprehensive automated integration test suite verifying core business rules:
```bash
cd backend
npm test
```

**Tested Functionality:**
- Password hashing & bcrypt verification
- Sequential order number generation (`AT-2026-XXXXXX`)
- Historical product price snapshot immutability
- Atomic dealer acceptance race conditions
- Delivery OTP cryptographic generation, expiry, and attempt limits

---

## 📂 Project Architecture

```
d:\ANANTA\
├── backend/
│   ├── src/
│   │   ├── config/          # db.js, env.js, cloudinary.js, razorpay.js
│   │   ├── controllers/     # auth, product, order, delivery, payment, dealer, report, notification
│   │   ├── middleware/      # auth.js, rbac.js, upload.js, validate.js, errorHandler.js
│   │   ├── models/          # User.js, Product.js, Order.js, Notification.js, Payment.js, Counter.js
│   │   ├── routes/          # authRoutes, productRoutes, orderRoutes, deliveryRoutes, etc.
│   │   ├── services/        # otpService, razorpayService, notificationService
│   │   ├── utils/           # orderNumber, responseHelper, logger
│   │   ├── seed/            # seed.js
│   │   └── server.js        # Express app entry point
│   ├── uploads/             # Static file storage for royalty & weighbridge slips
│   ├── tests/               # Automated integration test runner
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # MapPicker, DeliveryTimeline, StatusBadge, StatsCard, Modal, etc.
│   │   ├── context/         # AuthContext, NotificationContext
│   │   ├── layouts/         # PublicLayout, UserLayout, DealerLayout, AdminLayout
│   │   ├── pages/
│   │   │   ├── public/      # Home, Products, About, Contact, Login, Register
│   │   │   ├── user/        # Dashboard, CreateOrder, MyOrders, OrderDetails, Profile
│   │   │   ├── dealer/      # Dashboard, NewOrders, AcceptedOrders, ActiveDeliveries, Completed, Profile
│   │   │   └── admin/       # Dashboard, TodaysOrders, OrderManagement, DealerManagement, Products, Reports
│   │   ├── services/        # api.js, authService, orderService, productService, dealerService, adminService
│   │   ├── routes/          # AppRoutes, ProtectedRoute
│   │   └── main.jsx
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── README.md
```

---

## 🛡️ Security & Enterprise Integrity

- **Strict Role-Based Access Control (RBAC):** Users and dealers cannot access admin endpoints.
- **Backend-Enforced Calculations:** Product prices and tonnages are calculated exclusively on the server from MongoDB.
- **Atomic Concurrency Protection:** Simultaneous dealer acceptance requests are resolved atomically via MongoDB conditional queries.
- **Cryptographic Delivery OTP:** 6-digit random OTP stored only as a salted hash with 24-hour expiration and 5-attempt brute-force protection.
- **Payment Verification:** Razorpay webhook/client payloads are verified using SHA-256 HMAC secrets.
- **Dual-Mode Object Storage:** Seamlessly uploads to Cloudinary when configured, or utilizes local static directory fallback with full file-type filtering.

---

© 2026 **ANANTA TRADERS** — Quality Materials. Reliable Delivery.
