/**
 * BioShield AI - Refined Application Controller & 5-Item Sequential Batch Simulator
 */

const BATCH_ITEMS = [
  { key: "gauze", name: "1. Used Surgical Gauze", category: "Yellow Bin", desc: "Infectious / Soiled Waste" },
  { key: "iv_tubing", name: "2. IV Tubing & Infusion Set", category: "Red Bin", desc: "Contaminated Recyclable Plastic" },
  { key: "syringe_needle", name: "3. Syringe with Needle", category: "White Box", desc: "Waste Sharps Hazard (Manual Lock)" },
  { key: "glass_vial", name: "4. Glass Ampoule Vial", category: "Blue Bin", desc: "Glassware & Metal Implants" },
  { key: "food_wrapper", name: "5. Packaging Wrapper", category: "Black Bin", desc: "General Non-Hazardous Waste" }
];

class AppController {
  constructor() {
    this.currentStep = 1;
    this.hardwareSim = null;
    this.activeClassification = null;
    this.binsData = [];
    this.buzzerMuted = false;
    this.audioCtx = null;
    this.batchRunning = false;

    this.initUI();
    this.initAudio();
    this.loadBinsData();
  }

  initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    } catch (e) {}
  }

  playBuzzerSound() {
    if (this.buzzerMuted || !this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.4);
    } catch (err) {}
  }

  initUI() {
    // Instantiate Canvas Hardware Simulator
    this.hardwareSim = new window.HardwareSimulator('hardwareCanvas');

    // Setup Event Handlers
    this.setupTabNavigation();
    this.setupWastePresetButtons();
    this.setupModalControls();
    this.setupHeaderActions();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  updateWorkflowStage(stepNum, statusMessage, itemIndex = null) {
    this.currentStep = stepNum;

    // Map 14 steps to 4 visual stage cards
    let activeStage = 1;
    if (stepNum >= 4 && stepNum <= 5) activeStage = 2;
    if (stepNum >= 6 && stepNum <= 9) activeStage = 3;
    if (stepNum >= 10) activeStage = 4;

    for (let i = 1; i <= 4; i++) {
      const card = document.getElementById(`stage-${i}`);
      if (!card) continue;
      if (i < activeStage) {
        card.className = "stage-card px-3 py-1.5 text-center completed";
      } else if (i === activeStage) {
        card.className = "stage-card px-3 py-1.5 text-center active";
      } else {
        card.className = "stage-card px-3 py-1.5 text-center";
      }
    }

    const liveEl = document.getElementById('txtLiveExplanation');
    if (liveEl) {
      liveEl.innerText = statusMessage;
    }

    if (itemIndex !== null) {
      const badge = document.getElementById('badgeBatchCount');
      if (badge) badge.innerText = `Item ${itemIndex + 1} of 5`;
    }
  }

  setupTabNavigation() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('active', 'border-cyan-400', 'text-cyan-400');
          t.classList.add('border-transparent', 'text-gray-400');
        });
        btn.classList.add('active', 'border-cyan-400', 'text-cyan-400');
        btn.classList.remove('border-transparent', 'text-gray-400');

        const targetTab = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        const activeContent = document.getElementById(targetTab);
        if (activeContent) activeContent.classList.remove('hidden');
      });
    });
  }

  setupWastePresetButtons() {
    const btns = document.querySelectorAll('.preset-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const itemKey = btn.getAttribute('data-item');
        if (itemKey && !this.batchRunning) {
          this.processWasteDisposalWorkflow(itemKey, 0);
        }
      });
    });
  }

  setupModalControls() {
    document.getElementById('btnModalConfirmAccept')?.addEventListener('click', () => {
      document.getElementById('modalConfirm').classList.add('hidden');
      this.executeServoTiltingAndDeposit();
    });

    document.getElementById('btnModalConfirmReject')?.addEventListener('click', () => {
      document.getElementById('modalConfirm').classList.add('hidden');
      this.hardwareSim.setLock(true);
    });

    document.getElementById('btnModalLockDismiss')?.addEventListener('click', () => {
      document.getElementById('modalLock').classList.add('hidden');
      this.hardwareSim.setLock(false);
      this.hardwareSim.clearTray();
      this.updateWorkflowStage(7, "Sharps manually placed into White Puncture-Proof Sharps Box.");
      setTimeout(() => {
        this.completeDisposalLogging();
      }, 500);
    });
  }

  setupHeaderActions() {
    document.getElementById('btnRun5ItemDemo')?.addEventListener('click', () => {
      this.run5ItemSequentialBatchSimulation();
    });

    document.getElementById('btnResetBins')?.addEventListener('click', () => {
      this.resetBinsState();
    });

    document.getElementById('btnToggleBuzzer')?.addEventListener('click', () => {
      this.buzzerMuted = !this.buzzerMuted;
      const icon = document.getElementById('iconBuzzer');
      if (this.buzzerMuted) {
        icon.className = 'w-4 h-4 text-gray-500';
      } else {
        icon.className = 'w-4 h-4 text-emerald-400';
      }
    });

    document.getElementById('btnSimulateOverflow')?.addEventListener('click', () => {
      this.triggerBinOverflowSimulation();
    });

    document.getElementById('btnDispatchManifest')?.addEventListener('click', () => {
      this.generateAndDisplayManifest();
    });

    document.getElementById('btnExportPDF')?.addEventListener('click', () => {
      const data = window.manifestGenerator.generateManifestData([], this.binsData);
      window.manifestGenerator.exportPDF(data);
    });

    document.getElementById('btnDismissAlert')?.addEventListener('click', () => {
      document.getElementById('alertBanner').classList.add('hidden');
    });
  }

  /**
   * Main Workflow Execution Engine per Item
   */
  async processWasteDisposalWorkflow(itemKey, itemIndex = 0, isAutoBatch = false) {
    // Step 1: Waste Generated & Placed
    const aiResult = window.edgeAIEngine.classifyItem(itemKey);
    this.activeClassification = aiResult;

    this.updateWorkflowStage(1, `[Step 1–2] ${aiResult.name} placed on motorized tray. IR-1 presence sensor checking...`, itemIndex);
    this.hardwareSim.setWasteItem(aiResult.name, aiResult.color_code);
    document.getElementById('txtIR1Status').innerHTML = '<span class="text-red-400 font-extrabold">ITEM PRESENT</span>';
    document.getElementById('txtLoadCellWeight').innerText = `${aiResult.measured_weight_g.toFixed(1)} g`;

    await this.delay(1100);

    // Step 3: Camera Capture
    this.updateWorkflowStage(3, `[Step 3] IR-1 confirmed object. HD Camera snapshot captured. Analyzing image...`, itemIndex);
    await this.delay(1000);

    // Step 4: AI Classification
    this.updateWorkflowStage(4, `[Step 4] Edge AI classified: ${aiResult.category} Bin (${aiResult.confidence}% confidence, ${aiResult.measured_weight_g}g mass).`, itemIndex);
    this.renderAIResultsUI(aiResult);

    await this.delay(1100);

    // Step 5: Safety Gate Check
    this.updateWorkflowStage(5, `[Step 5] Safety Gate: ${aiResult.safetyStatus === 'PASSED' ? 'PASSED -> Auto Tilting' : 'SAFETY LOCK / SHARPS TRIGGERED!'}`, itemIndex);
    this.renderSafetyVerificationUI(aiResult);

    if (aiResult.safetyStatus === "SHARPS_DETECTED_LOCK" || aiResult.safetyStatus === "LOW_CONFIDENCE_LOCK") {
      this.hardwareSim.setLock(true);
      this.playBuzzerSound();

      if (isAutoBatch) {
        // In auto-batch demo mode, show lock warning box briefly, then simulate manual sharps placement
        document.getElementById('modalLockReason').innerText = `SHARPS DETECTED (${aiResult.name})`;
        document.getElementById('modalLock').classList.remove('hidden');
        await this.delay(2200);
        document.getElementById('modalLock').classList.add('hidden');
        this.hardwareSim.setLock(false);
        this.hardwareSim.clearTray();
        this.updateWorkflowStage(7, `[Step 7] Manual Placement: ${aiResult.name} deposited into White Sharps Box.`, itemIndex);
        await this.completeDisposalLogging();
        await this.loadBinsData();
        return;
      } else {
        document.getElementById('modalLockReason').innerText = `SHARPS DETECTED (${aiResult.name})`;
        document.getElementById('modalLock').classList.remove('hidden');
        return;
      }
    } else if (aiResult.safetyStatus === "REQUIRES_USER_CONFIRMATION" && !isAutoBatch) {
      document.getElementById('modalConfirmItem').innerText = aiResult.name;
      document.getElementById('modalConfirmCategory').innerText = `${aiResult.category} Bin (${aiResult.treatment})`;
      document.getElementById('modalConfirmConfidence').innerText = `${aiResult.confidence}%`;
      document.getElementById('modalConfirm').classList.remove('hidden');
      return;
    }

    await this.delay(700);
    await this.executeServoTiltingAndDeposit(itemIndex);
  }

  renderAIResultsUI(ai) {
    document.getElementById('txtAICategory').innerText = ai.name;
    document.getElementById('txtAICategory').style.color = ai.color_code;
    
    const badge = document.getElementById('badgeAICategoryColor');
    badge.innerText = `${ai.category.toUpperCase()} BIN`;
    badge.className = `px-3.5 py-1.5 rounded-xl text-xs font-extrabold badge-${ai.category.toLowerCase()}`;

    document.getElementById('txtAIConfidence').innerText = `${ai.confidence}%`;
    document.getElementById('barAIConfidence').style.width = `${ai.confidence}%`;
    document.getElementById('txtAITreatment').innerText = ai.treatment;
  }

  renderSafetyVerificationUI(ai) {
    const box = document.getElementById('boxSafetyStatus');
    const icon = document.getElementById('iconSafetyGate');
    const title = document.getElementById('txtSafetyTitle');
    const desc = document.getElementById('txtSafetyDesc');

    if (ai.safetyStatus === "PASSED") {
      box.className = "p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-center space-y-2";
      icon.className = "w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center";
      icon.innerHTML = '<i data-lucide="check-circle" class="w-7 h-7"></i>';
      title.innerText = "SAFETY VERIFICATION PASSED";
      title.className = "font-bold text-base text-emerald-300";
      desc.innerText = `Confidence ${ai.confidence}% > 85% & Non-Sharps. Servo motor tilting tray to ${ai.category} compartment...`;
    } else if (ai.safetyStatus === "REQUIRES_USER_CONFIRMATION") {
      box.className = "p-5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-center space-y-2";
      icon.className = "w-12 h-12 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center";
      icon.innerHTML = '<i data-lucide="help-circle" class="w-7 h-7"></i>';
      title.innerText = "STAFF CONFIRMATION REQUIRED";
      title.className = "font-bold text-base text-amber-300";
      desc.innerText = `Confidence ${ai.confidence}% is 60–85%. Staff confirmation prompt displayed.`;
    } else {
      box.className = "p-5 rounded-2xl bg-red-500/20 border border-red-500/50 text-center space-y-2 alert-pulse";
      icon.className = "w-12 h-12 mx-auto rounded-full bg-red-500/30 text-red-400 flex items-center justify-center";
      icon.innerHTML = '<i data-lucide="lock" class="w-7 h-7"></i>';
      title.innerText = "AUTOMATION INTERLOCKED (SHARPS HAZARD)";
      title.className = "font-bold text-base text-red-300";
      desc.innerText = "Sharps detected or low AI confidence. Mechanical tray LOCKED to prevent injury. Manual placement required.";
    }

    if (window.lucide) window.lucide.createIcons();
  }

  async executeServoTiltingAndDeposit(itemIndex = 0) {
    const ai = this.activeClassification;

    // Step 6: Servo tilting
    let targetAngle = 0;
    if (ai.category === "Yellow") targetAngle = -30;
    if (ai.category === "Red") targetAngle = -15;
    if (ai.category === "White") targetAngle = 0;
    if (ai.category === "Blue") targetAngle = 15;
    if (ai.category === "Black") targetAngle = 30;

    this.updateWorkflowStage(6, `[Step 6] Servo Motor Tilting Tray (${targetAngle}°) to ${ai.category} Bin...`, itemIndex);
    this.hardwareSim.tiltTray(targetAngle, `TILTING (${targetAngle}°)`);
    document.getElementById('txtServoStatus').innerText = `SERVO: TILTING TO ${ai.category.toUpperCase()} (${targetAngle}°)`;

    await this.delay(1400);

    // Step 7: Deposit & IR-2 clear
    this.updateWorkflowStage(7, `[Step 7] Waste deposited into ${ai.category} Bin. IR-2 verified tray clear!`, itemIndex);
    document.getElementById('txtIR1Status').innerHTML = '<span class="text-emerald-400 font-extrabold">BEAM CLEAR</span>';
    document.getElementById('txtIR2Status').innerHTML = '<span class="text-cyan-400 font-extrabold font-mono">TRAY CLEARED ✓</span>';
    document.getElementById('txtLoadCellWeight').innerText = "0.0 g";
    document.getElementById('txtServoStatus').innerText = `SERVO: LEVEL (0°)`;

    await this.delay(900);

    // Step 8 & 9: Weight & Logging
    this.updateWorkflowStage(8, `[Step 8–9] Load Cell weight updated. ESP32 logged disposal to database.`, itemIndex);
    await this.completeDisposalLogging();
    await this.loadBinsData();

    await this.delay(600);
  }

  async completeDisposalLogging() {
    const ai = this.activeClassification;
    try {
      await fetch('/api/disposal/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: "RF-8921",
          staff_name: "Nurse Priya",
          waste_item: ai.name,
          category: ai.category,
          bin_id: ai.bin_id,
          weight_g: ai.measured_weight_g,
          confidence_pct: ai.confidence,
          verification_status: ai.safetyStatus,
          is_sharps: ai.is_sharps,
          treatment_method: ai.treatment
        })
      });
      this.loadDisposalLogs();
    } catch (err) {}
  }

  async loadBinsData() {
    try {
      const resp = await fetch('/api/bins');
      const res = await resp.json();
      if (res.success) {
        this.binsData = res.bins;
        this.renderBinCards(res.bins);
      }
    } catch (e) {}
  }

  renderBinCards(bins) {
    const grid = document.getElementById('gridBinCards');
    if (!grid) return;
    grid.innerHTML = '';

    let hasAlert = false;
    let alertBinName = '';

    bins.forEach(bin => {
      const isOverflow = bin.current_fill_pct >= 80.0 || bin.alert_active === 1;
      if (isOverflow) {
        hasAlert = true;
        alertBinName = bin.name;
      }

      const card = document.createElement('div');
      card.className = `glass-panel p-4 space-y-3 relative overflow-hidden ${isOverflow ? 'border-red-500/80 shadow-lg shadow-red-500/30 alert-pulse' : ''}`;
      
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold font-heading text-white">${bin.name}</span>
          <span class="text-[10px] px-2.5 py-0.5 rounded-full font-extrabold ${isOverflow ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-300'}">
            ${isOverflow ? 'ALERT >80%' : 'NORMAL'}
          </span>
        </div>

        <div class="space-y-1.5">
          <div class="flex justify-between text-xs font-bold">
            <span class="text-gray-400">Ultrasonic Fill:</span>
            <span class="font-mono ${isOverflow ? 'text-red-400' : 'text-cyan-400'}">${bin.current_fill_pct.toFixed(1)}%</span>
          </div>
          <div class="w-full bg-gray-950 h-3 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div class="h-full rounded-full transition-all duration-700 bin-fill-bar" style="width: ${bin.current_fill_pct}%; background-color: ${bin.color_code}"></div>
          </div>
        </div>

        <div class="flex justify-between text-xs pt-1.5 border-t border-white/5 text-gray-200 font-bold">
          <span>Load Cell Mass:</span>
          <span class="font-mono text-yellow-400">${(bin.current_weight_g / 1000.0).toFixed(2)} kg</span>
        </div>
      `;
      grid.appendChild(card);
    });

    if (hasAlert) {
      document.getElementById('alertBanner').classList.remove('hidden');
      document.getElementById('alertBannerText').innerText = `${alertBinName} has reached ${bins[0].current_fill_pct.toFixed(1)}% capacity. Buzzer sounding. Dispatch transport unit.`;
      this.playBuzzerSound();
    }
  }

  async loadDisposalLogs() {
    try {
      const resp = await fetch('/api/logs');
      const res = await resp.json();
      if (res.success && res.logs) {
        const tbody = document.getElementById('tableLogsBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        res.logs.forEach(log => {
          const tr = document.createElement('tr');
          tr.className = "hover:bg-white/5 transition-colors font-medium";
          tr.innerHTML = `
            <td class="p-3 font-mono text-gray-300 text-xs">${log.timestamp}</td>
            <td class="p-3 font-bold text-white">${log.staff_name}</td>
            <td class="p-3 text-gray-200 font-bold">${log.waste_item}</td>
            <td class="p-3 font-extrabold" style="color: ${this.getCategoryColor(log.category)}">${log.category}</td>
            <td class="p-3 font-mono text-yellow-400 font-extrabold text-sm">${log.weight_g.toFixed(1)}g</td>
            <td class="p-3 font-mono text-cyan-400 font-extrabold text-sm">${log.confidence_pct}%</td>
            <td class="p-3">
              <span class="px-3 py-1 rounded-full text-[10px] font-extrabold ${log.verification_status === 'PASSED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}">
                ${log.verification_status}
              </span>
            </td>
            <td class="p-3 text-xs text-gray-300">${log.treatment_method}</td>
          `;
          tbody.appendChild(tr);
        });
      }
    } catch (e) {}
  }

  getCategoryColor(cat) {
    if (cat === "Yellow") return "#EAB308";
    if (cat === "Red") return "#EF4444";
    if (cat === "White") return "#F8FAFC";
    if (cat === "Blue") return "#3B82F6";
    return "#64748B";
  }

  async resetBinsState() {
    try {
      await fetch('/api/bins/reset', { method: 'POST', body: '{}' });
      document.getElementById('alertBanner').classList.add('hidden');
      this.loadBinsData();
      alert("All bins reset to baseline capacity (10%).");
    } catch (e) {}
  }

  triggerBinOverflowSimulation() {
    if (this.binsData.length > 0) {
      this.binsData[0].current_fill_pct = 84.5;
      this.binsData[0].alert_active = 1;
      this.renderBinCards(this.binsData);
    }
  }

  generateAndDisplayManifest() {
    const data = window.manifestGenerator.generateManifestData([], this.binsData);
    document.getElementById('mnfID').innerText = data.manifestId;
    document.getElementById('mnfTime').innerText = data.timestamp;
    document.getElementById('mnfWeightYellow').innerText = `${data.weights.yellow} kg`;
    document.getElementById('mnfWeightRed').innerText = `${data.weights.red} kg`;
    document.getElementById('mnfWeightWhite').innerText = `${data.weights.white} kg`;
    document.getElementById('mnfWeightBlue').innerText = `${data.weights.blue} kg`;
    document.getElementById('mnfWeightBlack').innerText = `${data.weights.black} kg`;
    document.getElementById('mnfWeightTotal').innerText = `${data.weights.total} kg`;

    this.updateWorkflowStage(12, "[Step 12] Mobile Cart Dispatched to Storage Facility.");
    setTimeout(() => { this.updateWorkflowStage(13, "[Step 13] CPCB Form IV Digital Manifest Generated & Signed."); }, 800);
    setTimeout(() => { this.updateWorkflowStage(14, "[Step 14] CBWTF BMW Rules 2016/2021 Final Treatment Complete!"); }, 1600);

    const tabBtn = document.querySelector('[data-tab="tab-manifest"]');
    if (tabBtn) tabBtn.click();
  }

  /**
   * Run 5-Waste Product Sequential Batch Simulation
   */
  async run5ItemSequentialBatchSimulation() {
    if (this.batchRunning) return;
    this.batchRunning = true;

    // Switch to Workstation Tab
    const tab1 = document.querySelector('[data-tab="tab-hardware"]');
    if (tab1) tab1.click();

    for (let i = 0; i < BATCH_ITEMS.length; i++) {
      const item = BATCH_ITEMS[i];
      await this.processWasteDisposalWorkflow(item.key, i, true);
      await this.delay(1200);
    }

    // Step 12 to 14: Transport & Digital Manifest
    this.updateWorkflowStage(12, "[Step 12] Dispatching Mobile Transport Unit to Storage...");
    const tab3 = document.querySelector('[data-tab="tab-manifest"]');
    if (tab3) tab3.click();

    await this.delay(1200);

    this.generateAndDisplayManifest();

    await this.delay(1000);
    this.batchRunning = false;
    alert("5-Item Biomedical Waste Batch Simulation Complete! Form IV Digital Manifest generated.");
  }

  delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
