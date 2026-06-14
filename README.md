# 🌍 FreightWise

**AI-Powered Trade Intelligence Platform by Team ZOD**

![FreightWise Dashboard](/home/shah/.gemini/antigravity/brain/69d83d70-a9c4-4472-81cd-5637addfd40d/freightwise_dashboard_1781436893374.png)

## 🚀 Overview

**FreightWise** is a next-generation logistics and supply chain intelligence platform designed to simplify international trade. Built as our first hackathon submission, the platform removes the opacity from cross-border commerce by combining real-time classification, live cost calculations, and congestion-aware routing into one unified workflow.

Instead of navigating multiple disconnected customs portals, tariff databases, and logistics resources, FreightWise provides businesses—from exporters to supply chain analysts—with instant access to critical trade information.

## ✨ Key Features

### 🤖 AI HS Code Classification
Instantly classify products using our Google Gemini-powered search. Find the most accurate 6-digit HS codes, duty rates, and VAT across global trade lanes just by typing a natural product description.

![HS Code Search](/home/shah/.gemini/antigravity/brain/69d83d70-a9c4-4472-81cd-5637addfd40d/freightwise_hscode_1781436906325.png)

### 💰 Landed Cost Calculator
Predict the true cost of international trade. Our calculator factors in live fuel surcharges, freight estimates, import duties, taxes, and handling fees so you never get surprised by a customs bill.

### 🗺️ Route Optimizer
Traffic and congestion-aware routing leveraging OSRM / OpenRouteService, seamlessly integrated with live port, air cargo, and border delay data. 

### 🏢 Warehouse Intelligence
Monitor storage bottlenecks and operational risks in real-time to prevent supply chain chokepoints.

### 🛡️ Compliance & Risk Reports
Identify dangerous goods, required documents, anti-dumping restrictions, and geopolitical trade risks before the cargo even leaves the facility.

### 🔗 Supply Chain Planner
Visualize your entire workflow from sourcing to final delivery on a single, intuitive timeline.

## 🛠️ Tech Stack

- **Frontend**: Next.js (App Router), React, TypeScript, Vanilla CSS (Custom Glassmorphism UI), Lucide Icons
- **Backend**: Node.js, Express, MongoDB (Mongoose)
- **AI Integration**: Google Gemini Pro API (for intelligent product classification and compliance checks)
- **External APIs**: 
  - OpenRouteService (Truck/HGV Routing & Distance calculations)
  - RapidAPI (Live Fuel/Barrel Indexing)
  - Various APIs for maritime tracking and aviation delays

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster or local instance
- API Keys: Google Gemini, OpenRouteService, RapidAPI

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TeamZOD/freightwise.git
   cd freightwise
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   # Rename the example env file and fill in your keys
   mv ".env 2.example" .env
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

4. **Access the Platform**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 👥 The Team

Built with 100% passion by **Team ZOD** for our 1st Hackathon Project!
We are a group of developers from IIT dedicated to making global trade transparent, accessible, and data-driven.

- Gautam Saini
- Saumya
- Mayank
- Shahreyar

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.
