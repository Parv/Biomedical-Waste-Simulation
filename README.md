# BioShield AI™ — Automated Biomedical Waste Management System

> **CPCB Bio-Medical Waste Management Rules 2016/2021 Compliant**

An automated end-to-end system for biomedical waste sorting, safety verification, telemetry logging, and CPCB Form IV Digital Manifest generation.

---

## 🚀 How to Run Locally

Zero external dependencies required! Uses Python 3's built-in standard library.

### Linux / macOS
Open your terminal and run:

```bash
cd YOUR_PATH
./run.sh
```
*Or directly:*
```bash
python3 server.py
```

### Windows
Open Command Prompt / PowerShell in the project folder and run:

```cmd
python server.py
```

---

## 🌐 Accessing the Application

Once the server is running, open your web browser and navigate to:
👉 **`http://localhost:8000`** (or **`http://127.0.0.1:8000`**)

---

## 📁 Project Directory Structure

```text
SIH26-115/
├── server.py             # Python HTTP API Backend & SQLite DB Initializer
├── run.sh                # 1-Click Executable Launcher Script
├── README.md             # Project Setup & Operational Instructions
├── bmw_waste.db          # SQLite Database (Auto-created on launch)
└── public/               # Frontend Assets
    ├── index.html        # Main Responsive Web Application Layout
    ├── css/
    │   └── styles.css    # Modern Dark Glassmorphism CSS Styles
    └── js/
        ├── ai_engine.js  # Edge AI MobileNetV2 & Mass Fusion Engine
        ├── hardware_sim.js # Canvas 2D Mechanical Workstation Visualizer
        ├── manifest_gen.js # CPCB Form IV Digital Manifest Generator
        └── app.js        # 14-Step Workflow & 5-Item Batch Demo Player
```

---

## ⚡ Key Features

1. **14-Step Workflow Automation**: Fully automates waste ingestion, IR detection, AI classification, safety gate interlock, servo compartment tilting, ultrasonic level measurement, and ESP32 telemetry logging.
2. **5-Waste Product Batch Demo**: 1-click player that simulates all 5 CPCB BMW categories sequentially (Yellow, Red, White Sharps, Blue, Black).
3. **Safety Gate Interlock**: Hard locks automated tray tilting if Sharps or low AI confidence is detected to prevent puncture injury.
4. **CPCB Form IV Digital Manifest**: Generates official manifests with QR code, digital signatures, category weight table, and PDF download.
