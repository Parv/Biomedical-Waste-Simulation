/**
 * BioShield AI - Sleek Mechanical Hardware Visualizer
 * Perfectly proportioned 250px canvas visualizer with crisp, clear text & glowing laser beams
 */

class HardwareSimulator {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Hardware state
    this.trayAngle = 0; // -30 (Yellow/Red), 0 (Sharps/Level), +30 (Blue/Black)
    this.targetTrayAngle = 0;
    this.itemPosition = { x: 0, y: 0 };
    this.itemVisible = false;
    this.itemLabel = "";
    this.itemColor = "#EAB308";
    this.ir1Active = false; // Waste presence
    this.ir2Active = false; // Tray clear sensor
    this.servoStatus = "IDLE (0°)";
    this.lockLed = false;
    this.rfidActive = true;
    
    this.initCanvasSize();
    this.startLoop();
  }

  initCanvasSize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 560;
    const h = rect.height || 250;
    
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = w;
    this.height = h;
  }

  setWasteItem(label, colorCode) {
    this.itemVisible = true;
    this.itemLabel = label;
    this.itemColor = colorCode;
    this.ir1Active = true;
    this.ir2Active = false;
    this.itemPosition = { x: this.width / 2, y: 110 };
  }

  tiltTray(targetAngle, statusText) {
    this.targetTrayAngle = targetAngle;
    this.servoStatus = statusText;
  }

  clearTray() {
    this.itemVisible = false;
    this.ir1Active = false;
    this.ir2Active = true;
    this.targetTrayAngle = 0;
    this.servoStatus = "IDLE (0°)";
    setTimeout(() => { this.ir2Active = false; }, 1800);
  }

  setLock(state) {
    this.lockLed = state;
  }

  startLoop() {
    const render = () => {
      this.update();
      this.draw();
      requestAnimationFrame(render);
    };
    render();
  }

  update() {
    this.trayAngle += (this.targetTrayAngle - this.trayAngle) * 0.1;

    if (Math.abs(this.targetTrayAngle) > 10 && this.itemVisible) {
      const slideDir = Math.sign(this.targetTrayAngle);
      this.itemPosition.x += slideDir * 6;
      this.itemPosition.y += 3;
      if (this.itemPosition.x < 60 || this.itemPosition.x > this.width - 60 || this.itemPosition.y > 180) {
        this.clearTray();
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#060911";
    ctx.fillRect(0, 0, w, h);

    // Subtle Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Header Status Bar
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(10, 8, w - 20, 28);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 8, w - 20, 28);

    ctx.font = "bold 11px Outfit, sans-serif";
    ctx.fillStyle = "#06B6D4";
    ctx.fillText("MECHANICAL WORKSTATION (ESP32 IoT)", 18, 26);

    // RFID & Lock Status
    ctx.fillStyle = this.rfidActive ? "#10B981" : "#6B7280";
    ctx.beginPath(); ctx.arc(w - 160, 22, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText("RFID: READY", w - 152, 25);

    ctx.fillStyle = this.lockLed ? "#EF4444" : "#10B981";
    ctx.beginPath(); ctx.arc(w - 75, 22, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.lockLed ? "#F87171" : "#9CA3AF";
    ctx.fillText(this.lockLed ? "LOCK: ON" : "LOCK: OFF", w - 67, 25);

    // Camera Sensor Unit
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(w / 2 - 45, 42, 90, 16);
    ctx.strokeStyle = "#38BDF8";
    ctx.lineWidth = 1;
    ctx.strokeRect(w / 2 - 45, 42, 90, 16);

    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 9px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HD AI CAMERA", w / 2, 54);

    // Camera FOV Beam Cone
    if (this.ir1Active) {
      const grad = ctx.createLinearGradient(w / 2, 58, w / 2, 115);
      grad.addColorStop(0, "rgba(56, 189, 248, 0.2)");
      grad.addColorStop(1, "rgba(56, 189, 248, 0.0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(w / 2, 58);
      ctx.lineTo(w / 2 - 70, 115);
      ctx.lineTo(w / 2 + 70, 115);
      ctx.closePath();
      ctx.fill();
    }

    // IR Proximity Beam Line
    ctx.strokeStyle = this.ir1Active ? "#EF4444" : "#10B981";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(60, 112);
    ctx.lineTo(w - 60, 112);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = this.ir1Active ? "#F87171" : "#34D399";
    ctx.font = "bold 10px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(this.ir1Active ? "IR-1: ITEM PRESENT" : "IR-1: CLEAR", 60, 105);

    // Motorized Tray Assembly
    ctx.save();
    ctx.translate(w / 2, 120);
    ctx.rotate((this.trayAngle * Math.PI) / 180);

    // Tray Plate
    ctx.fillStyle = "#334155";
    ctx.fillRect(-100, 0, 200, 10);
    ctx.strokeStyle = "#0EA5E9";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-100, 0, 200, 10);

    // Load Cell Sensor Box
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(-25, 10, 50, 12);
    ctx.fillStyle = "#000";
    ctx.font = "bold 8px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText("LOAD CELL", 0, 19);

    ctx.restore();

    // Dual Servo Motors
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(w / 2 - 125, 110, 20, 28);
    ctx.fillRect(w / 2 + 105, 110, 20, 28);
    ctx.fillStyle = "#94A3B8";
    ctx.font = "8px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SERVO L", w / 2 - 115, 148);
    ctx.fillText("SERVO R", w / 2 + 115, 148);

    // Render Waste Item on Tray
    if (this.itemVisible) {
      ctx.save();
      ctx.translate(this.itemPosition.x, this.itemPosition.y - 12);
      ctx.rotate((this.trayAngle * Math.PI) / 180);

      // Item Body
      ctx.fillStyle = this.itemColor;
      ctx.shadowColor = this.itemColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(-24, -14, 48, 22, 5);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Item Name Label
      ctx.fillStyle = "#000";
      ctx.font = "bold 9px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.itemLabel.substring(0, 15), 0, 0);

      // AI Bounding Box
      ctx.strokeStyle = "#06B6D4";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-28, -18, 56, 30);

      ctx.restore();
    }

    // 5 Bin Compartments at Bottom
    const binWidth = (w - 40) / 5;
    const binY = 175;
    const binHeight = 65;

    const binsInfo = [
      { name: "Yellow", code: "#EAB308", label: "Infectious" },
      { name: "Red", code: "#EF4444", label: "Recyclable" },
      { name: "White", code: "#F8FAFC", label: "Sharps Box" },
      { name: "Blue", code: "#3B82F6", label: "Glass/Metal" },
      { name: "Black", code: "#64748B", label: "General" }
    ];

    binsInfo.forEach((bin, idx) => {
      const bx = 20 + idx * binWidth;
      
      // Bin Body
      ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
      ctx.fillRect(bx + 3, binY, binWidth - 6, binHeight);
      ctx.strokeStyle = bin.code;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx + 3, binY, binWidth - 6, binHeight);

      // Bin Lid Header
      ctx.fillStyle = bin.code;
      ctx.fillRect(bx + 1, binY - 5, binWidth - 2, 5);

      // Bin Labels
      ctx.fillStyle = bin.name === "White" ? "#000" : "#FFF";
      ctx.font = "bold 10px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(bin.name, bx + binWidth / 2, binY + 20);
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.font = "9px Inter, sans-serif";
      ctx.fillText(bin.label, bx + binWidth / 2, binY + 36);
    });
  }
}

window.HardwareSimulator = HardwareSimulator;
