# ⚡ NexusIT Operations - IT Asset & External Branch Management System

A sleek, enterprise-grade, high-performance IT Operations & Asset Management ERP designed specifically for IT Administrators managing laptops, office equipment, branch offices, and field service visits.

---

### 🌟 Key Features

1. **💻 Laptop Stock & Inventory Tracking**
   - Full tracking of Laptop Models, Serial Numbers, Hardware Specs (RAM, CPU, SSD).
   - Real-time Status: 
     - 🟢 **In Stock** (Available in IT Store / Rack)
     - 🔵 **Assigned** (Issued to specific staff member or branch)
     - 🟠 **Maintenance / Repair** (Under diagnosis or repair)
     - 🔴 **Decommissioned** (Scrapped or retired)
   - Search by serial number, user name, or model with instant live filtering.

2. **🗺️ Branch Offices & Interactive Map**
   - Built-in Sri Lanka map with interactive pins for each branch office (Colombo HQ, Kandy, Galle, Kurunegala, Negombo, etc.).
   - Click on any marker to see branch contact info, phone, and total laptops stationed there.
   - Click anywhere on the map to automatically grab GPS coordinates when adding new branches!

3. **🚗 Field Visits & On-Site Trips Log**
   - Schedule and track visits to external branch offices.
   - Checklist for each visit (router config, laptop delivery, maintenance, handover signoff).
   - Track which laptops were taken to branches or brought back for repair.

4. **📄 Official Handover Form & Gate Pass (No More Paper Booklets!)**
   - Stop writing on paper sheets and notebooks!
   - Select any laptop and employee to instantly generate an official printable A4 Handover Form with terms of use and dual signature lines (IT Admin + Recipient).
   - Click **Print / Save as PDF** anytime (`Ctrl + P`).

5. **☁️ Vercel & Web-Based Cloud Deployment**
   - Includes `vercel.json` and `package.json` for one-click Vercel deployment.
   - 100% cloud web-based so you can access it on your phone or laptop while traveling between branches!
   - Offline fallback with LocalStorage and one-click JSON backup & Excel CSV export.

---

### 🚀 How to Run Locally

Double-click `start.bat` or open `index.html` in Chrome or Edge.

---

### ☁️ How to Deploy to Vercel via GitHub

1. Push this repository to GitHub (or use the automated git push instructions).
2. Go to [vercel.com](https://vercel.com) -> Click **"Add New Project"**.
3. Import the GitHub repository `nexusit-operations`.
4. Click **"Deploy"**! Vercel will deploy it in 15 seconds to a live URL like `https://nexusit-operations.vercel.app`!
