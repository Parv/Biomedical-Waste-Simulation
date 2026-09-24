/**
 * BioShield AI - Edge AI Classification Engine (TFLite MobileNetV2 Simulation)
 * Multi-Modal Sensor Fusion (Computer Vision + Load Cell Weight Analytics)
 */

const AI_DATABASE = {
  gauze: {
    name: "Used Surgical Gauze / Soiled Cotton",
    category: "Yellow",
    bin_id: "bin_yellow",
    confidence: 94.5,
    is_sharps: false,
    typical_weight: 25.0,
    treatment: "High-Temperature Incineration (1050°C) per BMW Rules",
    color_code: "#EAB308",
    bounding_box: { x: 30, y: 25, w: 40, h: 45 },
    features: ["Absorbent fibrous texture", "Blood/fluid staining", "Low density mass"]
  },
  iv_tubing: {
    name: "IV Tubing & Plastic Infusion Set",
    category: "Red",
    bin_id: "bin_red",
    confidence: 89.2,
    is_sharps: false,
    typical_weight: 85.0,
    treatment: "Autoclaving/Microwaving + Shredding & Plastic Recycling",
    color_code: "#EF4444",
    bounding_box: { x: 20, y: 15, w: 60, h: 65 },
    features: ["Flexible PVC polymer", "Tubular geometry", "Clear/translucent color"]
  },
  syringe_needle: {
    name: "Hypodermic Syringe with Fixed Needle",
    category: "White",
    bin_id: "bin_white",
    confidence: 96.8,
    is_sharps: true, // SHARPS TRIGGER!
    typical_weight: 15.0,
    treatment: "Dry Heat Sterilization / Autoclaving + Shredding/Mutilation",
    color_code: "#F8FAFC",
    bounding_box: { x: 25, y: 30, w: 50, h: 35 },
    features: ["Metallic sharp point", "Puncture risk", "Calibrated barrel"]
  },
  glass_vial: {
    name: "Sterile Glass Ampoule / Medicine Vial",
    category: "Blue",
    bin_id: "bin_blue",
    confidence: 91.4,
    is_sharps: false,
    typical_weight: 45.0,
    treatment: "Sodium Hypochlorite Disinfection + Glass Crushing/Recycling",
    color_code: "#3B82F6",
    bounding_box: { x: 35, y: 20, w: 30, h: 55 },
    features: ["Rigid glass body", "High specular reflectivity", "Heavy mass for size"]
  },
  food_wrapper: {
    name: "Non-Contaminated Food Wrapper / Packaging",
    category: "Black",
    bin_id: "bin_black",
    confidence: 95.1,
    is_sharps: false,
    typical_weight: 10.0,
    treatment: "Secured Municipal Sanitary Landfill Disposal",
    color_code: "#64748B",
    bounding_box: { x: 20, y: 20, w: 55, h: 55 },
    features: ["Dry foil packaging", "Non-biological", "Light weight"]
  },
  scalpel: {
    name: "Used Surgical Scalpel Blade",
    category: "White",
    bin_id: "bin_white",
    confidence: 98.2,
    is_sharps: true, // SHARPS TRIGGER!
    typical_weight: 18.0,
    treatment: "Encapsulation / Mutilation in Puncture-Proof Container",
    color_code: "#F8FAFC",
    bounding_box: { x: 30, y: 35, w: 40, h: 25 },
    features: ["Hardened steel blade", "High cut risk", "Metallic reflection"]
  },
  ambiguous_bottle: {
    name: "Contaminated Unlabeled Medicine Container",
    category: "Red",
    bin_id: "bin_red",
    confidence: 72.4, // 60-85% triggers User Confirmation!
    is_sharps: false,
    typical_weight: 65.0,
    treatment: "Autoclaving & Polymer Chemical Disinfection",
    color_code: "#EF4444",
    bounding_box: { x: 25, y: 20, w: 45, h: 50 },
    features: ["Mixed polymer/glass", "Ambiguous label", "Moderate density"]
  },
  unknown_sharp: {
    name: "Unidentified Object with Metallic Spike",
    category: "White",
    bin_id: "bin_white",
    confidence: 52.0, // <60% triggers Safety Lock!
    is_sharps: true,
    typical_weight: 30.0,
    treatment: "Manual Inspection & Sharps Containment",
    color_code: "#F8FAFC",
    bounding_box: { x: 20, y: 20, w: 60, h: 60 },
    features: ["High noise", "Unknown hazard profile", "Low model confidence"]
  }
};

class EdgeAIEngine {
  constructor() {
    this.modelName = "MobileNetV2-Biomedical-TFLite v2.4";
    this.quantization = "INT8 Edge-Optimized";
    this.inferenceTimeMs = 14.2;
  }

  /**
   * Run inference on input item key & actual measured mass
   */
  classifyItem(itemKey, measuredWeightG = null) {
    const preset = AI_DATABASE[itemKey] || AI_DATABASE.gauze;
    const finalWeight = measuredWeightG !== null ? measuredWeightG : preset.typical_weight;

    // Weight fusion logic: refine confidence if weight matches expected density profile
    let adjustedConfidence = preset.confidence;
    const weightDiff = Math.abs(finalWeight - preset.typical_weight);
    if (weightDiff < 10.0) {
      adjustedConfidence = Math.min(99.9, adjustedConfidence + 2.5);
    } else if (weightDiff > 40.0) {
      adjustedConfidence = Math.max(45.0, adjustedConfidence - 12.0);
    }

    // Determine Safety Verification Action (Step 5 logic)
    let safetyStatus = "PASSED";
    let actionRequired = "AUTO_TILTER_DISPATCH";
    let lockAutomation = false;

    if (preset.is_sharps || adjustedConfidence < 60.0) {
      safetyStatus = preset.is_sharps ? "SHARPS_DETECTED_LOCK" : "LOW_CONFIDENCE_LOCK";
      actionRequired = "LOCK_AUTOMATION_MANUAL_PLACEMENT";
      lockAutomation = true;
    } else if (adjustedConfidence >= 60.0 && adjustedConfidence <= 85.0) {
      safetyStatus = "REQUIRES_USER_CONFIRMATION";
      actionRequired = "PROMPT_USER_VERIFICATION";
      lockAutomation = false;
    } else {
      safetyStatus = "PASSED";
      actionRequired = "AUTO_TILTER_DISPATCH";
      lockAutomation = false;
    }

    return {
      key: itemKey,
      name: preset.name,
      category: preset.category,
      bin_id: preset.bin_id,
      confidence: parseFloat(adjustedConfidence.toFixed(1)),
      is_sharps: preset.is_sharps,
      measured_weight_g: finalWeight,
      treatment: preset.treatment,
      color_code: preset.color_code,
      bounding_box: preset.bounding_box,
      features: preset.features,
      safetyStatus: safetyStatus,
      actionRequired: actionRequired,
      lockAutomation: lockAutomation,
      inferenceTimeMs: (Math.random() * 4 + 12).toFixed(1)
    };
  }
}

window.edgeAIEngine = new EdgeAIEngine();
