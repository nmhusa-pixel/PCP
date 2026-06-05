const redFlags = [
  ["bowelBladder", "New bowel or bladder incontinence", "Possible cauda equina or cord compression"],
  ["saddle", "Saddle anesthesia or bilateral perineal numbness", "Emergency spine evaluation trigger"],
  ["bilateralSciatica", "Severe low back pain with bilateral sciatica/leg weakness", "Cauda equina pattern"],
  ["fever", "Fever, infection risk, or immunosuppression", "Consider infection workup and urgent imaging"],
  ["cancer", "Cancer history or unexplained weight loss", "Malignancy must be excluded"],
  ["trauma", "Acute trauma or suspected fracture/instability", "Urgent imaging or surgical pathway"],
  ["motorLoss", "Progressive motor deficit or significant motor radiculopathy", "Urgent spine evaluation trigger"],
  ["upperMotor", "Upper motor neuron findings", "Hyperreflexia, hand dysfunction, gait impairment"],
  ["nightPain", "Pain worse at night or lying flat", "Concerning pattern in VMFH algorithm"]
];

const workupItems = [
  ["pt", "PT / conservative therapy trial", "PT, supervised home exercise, activity modification, or reason not feasible"],
  ["imaging", "Imaging reviewed or ordered", "X-ray/MRI/CT/US when clinically indicated, or rationale not needed"],
  ["medicationTrial", "Medication trials documented", "NSAID/APAP/topical/neuropathic/opioid history, contraindications, side effects, response"]
];

const painPatterns = [
  ["neckAxial", "Neck axial pain", "Cervical spine dominant; facet, discogenic, myofascial, or mechanical pattern"],
  ["lowBackAxial", "Low back axial pain", "Lumbar spine dominant; facet, discogenic, myofascial, or mechanical pattern"],
  ["thoracicAxial", "Thoracic axial pain", "Mid-back or rib/thoracic spine dominant pain"],
  ["upperRadicular", "Cervical radiculopathy / arm pain", "Neck or cervical nerve-root pattern into shoulder, arm, or hand"],
  ["lowerRadicular", "Lumbar radiculopathy / leg pain", "Low back or lumbar nerve-root pattern into buttock, leg, or foot"],
  ["stenosis", "Lumbar stenosis / claudication", "Leg symptoms with walking or extension, improved by flexion/sitting"],
  ["sacroiliac", "Sacroiliac / pelvic girdle pain", "Buttock/groin/lateral hip region; provocative maneuvers helpful"],
  ["neuropathicUpper", "Upper extremity neuropathic pain", "Burning, electric, allodynia, post-herpetic, diabetic, or nerve injury pattern"],
  ["neuropathicLower", "Lower extremity neuropathic pain", "Burning, electric, allodynia, diabetic neuropathy, or nerve injury pattern"],
  ["widespread", "Widespread or centralized pain", "Fibromyalgia-like, fatigue/sleep/mood amplification, diffuse tenderness"],
  ["postsurgicalSpine", "Persistent postsurgical spine pain", "Prior cervical/thoracic/lumbar surgery or persistent pain after intervention"],
  ["postsurgicalJoint", "Persistent postsurgical joint/extremity pain", "Prior limb/joint surgery or persistent pain after intervention"],
  ["headachePattern", "Headache or craniofacial pain", "Migraine, cervicogenic, trigeminal, TMJ, occipital neuralgia pattern"]
];

const patternRegions = {
  neckAxial: ["cervical"],
  lowBackAxial: ["lumbar"],
  thoracicAxial: ["thoracic", "ribs"],
  upperRadicular: ["cervical", "leftArm", "rightArm"],
  lowerRadicular: ["lumbar", "leftLeg", "rightLeg"],
  stenosis: ["lumbar", "leftLeg", "rightLeg"],
  sacroiliac: ["pelvis", "sacroiliac"],
  neuropathicUpper: ["leftArm", "rightArm"],
  neuropathicLower: ["leftLeg", "rightLeg"],
  widespread: ["skull", "cervical", "thoracic", "lumbar", "ribs", "pelvis", "sacroiliac", "leftArm", "rightArm", "leftLeg", "rightLeg"],
  postsurgicalSpine: ["cervical", "thoracic", "lumbar"],
  postsurgicalJoint: ["pelvis", "leftArm", "rightArm", "leftLeg", "rightLeg"],
  headachePattern: ["skull", "cervical"]
};

const contextItems = [
  ["procedure", "Procedure may be indicated", "Epidural, facet, SI, peripheral joint/nerve, neuromodulation evaluation"],
  ["diagnosis", "Diagnosis unclear after PCP workup", "Pain specialist asked to confirm diagnosis or phenotype"],
  ["function", "Persistent functional impairment", "Pain limits ADLs, sleep, work, mobility, or caregiving"],
  ["opioid", "Opioid complexity or risk mitigation needed", "Dose escalation, taper question, safety concerns, MME threshold"],
  ["sideEffects", "Unacceptable treatment side effects", "Pain improving but side effects require alternative options"],
  ["declinesMeds", "Patient declines medication-focused care", "Referral for non-pharmacologic, procedural, or multidisciplinary options"],
  ["misuse", "Concern for medication misuse or abnormal UDS", "Consider addiction medicine when misuse is primary"],
  ["pcpComfort", "PCP uncomfortable continuing current plan", "Referral for shared plan and scope support"]
];

const referralQuestionTemplates = {
  procedure: "Please evaluate for an appropriate interventional pain procedure target and provide a multimodal pain management plan.",
  diagnosis: "Please help clarify the pain diagnosis/phenotype after primary care workup and recommend next management steps.",
  function: "Please evaluate persistent pain-related functional impairment and recommend options to improve ADLs, sleep, work, or mobility.",
  opioid: "Please advise on opioid risk mitigation, tapering/escalation concerns, and non-opioid or procedural alternatives.",
  sideEffects: "Please recommend alternative pain management options given unacceptable side effects with current treatment.",
  declinesMeds: "Please evaluate for non-medication-focused pain management options, including procedural, rehabilitative, or multidisciplinary care.",
  misuse: "Please advise on pain management options in the setting of medication misuse concern or abnormal UDS, and whether addiction medicine co-management is needed.",
  pcpComfort: "Please provide shared pain management recommendations because the current plan is outside primary care comfort or scope."
};

const $ = (id) => document.getElementById(id);
let deferredInstallPrompt = null;
let clinicFinderShown = false;
let lastClinicPosition = null;
let clinicFinderMode = "referral";
let referralHandoffReady = false;
let restoreReferralNoteAfterPrint = false;
let pendingClinicFinderAfterPrint = false;
let printStartedAt = 0;

function renderChecks(containerId, items, showHints = true) {
  const container = $(containerId);
  container.innerHTML = items.map(([id, label, hint]) => `
    <label class="check-item">
      <input type="checkbox" id="${id}">
      <span>${label}${showHints && hint ? `<small>${hint}</small>` : ""}</span>
    </label>
  `).join("");
}

function checked(id) {
  return Boolean($(id)?.checked);
}

function checkedLabels(items) {
  return items.filter(([id]) => checked(id)).map(([, label]) => label);
}

function checkedItems(items) {
  return items.filter(([id]) => checked(id));
}

function redFlagReviewComplete() {
  return checked("noRedFlags") && checkedLabels(redFlags).length === 0;
}

function value(id) {
  return $(id).value.trim();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

let currentReferralNote = "";

function formatReferralNote(note) {
  const headingLabels = [
    "Pain Management Referral Readiness Note",
    "Patient:",
    "Pain region/pattern:",
    "Duration:",
    "Pain severity/function:",
    "Decision support recommendation:",
    "Referral readiness score:",
    "Referral-supporting factors:",
    "Red flags screened:",
    "Completed conservative care/workup:",
    "Reason for pain management referral:",
    "Items to complete/clarify:",
    "Safety note:"
  ];

  return note.split("\n").map((line) => {
    const safeLine = escapeHtml(line);
    if (!line.trim()) return "";
    const heading = headingLabels.find((label) => line.startsWith(label));
    if (!heading) return `<p>${safeLine}</p>`;
    const rest = safeLine.slice(escapeHtml(heading).length);
    return `<p><strong>${escapeHtml(heading)}</strong>${rest}</p>`;
  }).join("");
}

function selectedReasons() {
  const reasons = [];
  const pain = Number($("painScore").value || 0);

  if ($("duration").value === "chronic") reasons.push("chronic pain duration");
  if ($("duration").value === "subacute") reasons.push("subacute pain with potential escalation");
  if ($("functionImpact").value === "moderate") reasons.push("moderate functional limitation");
  if ($("functionImpact").value === "severe") reasons.push("severe functional limitation");
  if (pain >= 7) reasons.push("high pain intensity");
  if (checked("procedure")) reasons.push("possible interventional procedure target");
  if (checked("diagnosis")) reasons.push("diagnosis remains unclear after primary care workup");
  if (checked("opioid")) reasons.push("opioid complexity or safety planning needed");
  if (checked("sideEffects")) reasons.push("unacceptable treatment side effects");
  if (checked("declinesMeds")) reasons.push("patient preference against medication-focused care");
  if (checked("pcpComfort")) reasons.push("PCP requests shared pain plan support");
  if (checked("pt") && Number($("ptSessions").value || 0) >= 4) reasons.push("adequate PT or supervised exercise trial");
  if (checked("medicationTrial") || value("medSummary").length > 8) reasons.push("medication trials documented");
  if (checked("upperRadicular")) reasons.push("cervical radiculopathy with arm pain");
  if (checked("lowerRadicular")) reasons.push("lumbar radiculopathy with leg pain");
  if (checked("stenosis")) reasons.push("claudication or stenosis phenotype");
  if (checked("sacroiliac")) reasons.push("SI/hip/pelvic girdle phenotype");
  if (checked("neuropathicUpper") || checked("neuropathicLower")) reasons.push("neuropathic pain phenotype");
  if (checked("widespread")) reasons.push("widespread or centralized pain phenotype");
  if (checked("postsurgicalSpine") || checked("postsurgicalJoint")) reasons.push("persistent postsurgical pain");
  if (checked("headachePattern")) reasons.push("headache or craniofacial pain phenotype");

  return reasons;
}

function updateBodyMap() {
  document.querySelectorAll(".highlight-map [data-region]").forEach((part) => {
    part.classList.remove("active", "emphasis");
  });

  painPatterns.forEach(([id]) => {
    if (!checked(id)) return;
    const className = id === "widespread" ? "emphasis" : "active";
    patternRegions[id].forEach((region) => {
      document.querySelectorAll(`.highlight-map [data-region="${region}"]`).forEach((part) => {
        part.classList.add(className);
      });
    });
  });
}

function updateGatedSections() {
  const unlocked = redFlagReviewComplete();
  document.querySelectorAll("[data-gated='true']").forEach((section) => {
    section.classList.toggle("locked", !unlocked);
    section.querySelectorAll("input, select, textarea, button").forEach((control) => {
      control.disabled = !unlocked;
    });
  });
}

function updateWorkupDetailStates() {
  const unlocked = redFlagReviewComplete();
  [
    ["pt", "ptSessions"],
    ["imaging", "imagingSummary"],
    ["medicationTrial", "medSummary"]
  ].forEach(([checkboxId, detailId]) => {
    const enabled = unlocked && checked(checkboxId);
    const detail = $(detailId);
    detail.disabled = !enabled;
    detail.closest(".workup-detail")?.classList.toggle("disabled", !enabled);
  });
}

function updateCollapsibleSections() {
  const redReviewed = redFlagReviewComplete();
  const selectedRedFlags = checkedItems(redFlags);
  const redFlagCollapsed = redReviewed || selectedRedFlags.length > 0;
  $("redFlagDetails").hidden = redFlagCollapsed;
  $("redFlagSummary").hidden = selectedRedFlags.length === 0;
  $("editRedFlags").hidden = selectedRedFlags.length === 0;
  $("redFlagSummary").textContent = selectedRedFlags.length
    ? `Selected: ${selectedRedFlags.map(([, label]) => label).join("; ")}`
    : "";

  const selectedContexts = contextItems.filter(([id]) => checked(id));
  const contextCollapsed = selectedContexts.length > 0;
  $("referralContextDetails").hidden = contextCollapsed;
  $("editReferralContext").hidden = !contextCollapsed;
  $("referralContextSummary").hidden = !contextCollapsed;
  $("referralContextSummary").textContent = contextCollapsed
    ? `Selected: ${selectedContexts.map(([, label]) => label).join("; ")}`
    : "";
}

function autofillReferralQuestion() {
  const selectedContexts = contextItems.filter(([id]) => checked(id));
  if (!selectedContexts.length) return;

  const question = $("referralQuestion");
  if (question.value.trim() && question.dataset.autofilled !== "true") return;

  const [firstId] = selectedContexts[0];
  const extraLabels = selectedContexts.slice(1).map(([, label]) => label.toLowerCase());
  const extraText = extraLabels.length ? ` Additional context: ${extraLabels.join("; ")}.` : "";
  question.value = `${referralQuestionTemplates[firstId]}${extraText}`;
  question.dataset.autofilled = "true";
}

function clinicZoomForRadius(radius) {
  if (radius <= 30) return 10;
  if (radius <= 50) return 9;
  return 8;
}

function buildClinicSearchLinks(position, radius) {
  const { latitude, longitude } = position.coords;
  const zoom = clinicZoomForRadius(Number(radius));
  const query = encodeURIComponent("pain management clinic");
  const spineQuery = encodeURIComponent("interventional pain management clinic");
  const mapsAt = `${latitude},${longitude}`;
  return [
    {
      label: `Google Maps: pain clinics within about ${radius} miles`,
      url: `https://www.google.com/maps/search/${query}/@${mapsAt},${zoom}z`
    },
    {
      label: "Google Maps: interventional pain clinics",
      url: `https://www.google.com/maps/search/${spineQuery}/@${mapsAt},${zoom}z`
    },
    {
      label: "Bing Maps: pain management clinics",
      url: `https://www.bing.com/maps?q=${query}&cp=${latitude}~${longitude}&lvl=${zoom}`
    }
  ];
}

function renderClinicSearchLinks(position) {
  const radius = $("clinicRadius").value;
  const links = buildClinicSearchLinks(position, radius);
  $("clinicSearchLinks").hidden = false;
  $("clinicSearchLinks").innerHTML = links.map(({ label, url }) => `
    <a href="${url}" target="_blank" rel="noopener">${label}</a>
  `).join("");
  $("clinicFinderStatus").textContent = `Search links built from current device location using a ${radius}-mile radius.`;
}

function setClinicFinderMode(mode) {
  clinicFinderMode = mode;
  const setupMode = mode === "setup";
  $("clinicFinderIntro").textContent = setupMode
    ? "Enable location once so the app can suggest nearby pain clinics when a referral packet is ready."
    : "Referral packet appears ready. Use device location to search for nearby pain clinics.";
  $("clinicFinderStatus").textContent = setupMode
    ? "The browser will ask for location permission after you tap Use Location."
    : "Location is only used for this search.";
  $("skipLocationSetup").hidden = !setupMode;
}

function showClinicFinderAfterHandoff() {
  if (clinicFinderShown || !referralHandoffReady) return;
  clinicFinderShown = true;
  setClinicFinderMode("referral");
  if (typeof $("clinicFinderDialog").showModal === "function") {
    $("clinicFinderDialog").showModal();
  }
}

function maybePromptForLocationSetup() {
  if (!isStandalone()) return;
  if (localStorage.getItem("painReferralLocationSetup")) return;
  setClinicFinderMode("setup");
  localStorage.setItem("painReferralLocationSetup", "shown");
  window.setTimeout(() => {
    if (!$("clinicFinderDialog").open && typeof $("clinicFinderDialog").showModal === "function") {
      $("clinicFinderDialog").showModal();
    }
  }, 700);
}

function prepareReferralNoteForPrint() {
  const panel = $("referralNotePanel");
  restoreReferralNoteAfterPrint = panel.hidden;
  panel.hidden = false;
}

function restoreReferralNoteAfterPrinting() {
  if (!restoreReferralNoteAfterPrint) return;
  $("referralNotePanel").hidden = true;
  $("referralNoteToggle").setAttribute("aria-expanded", "false");
  restoreReferralNoteAfterPrint = false;
}

function finishPrintHandoff() {
  restoreReferralNoteAfterPrinting();
  if (!pendingClinicFinderAfterPrint) return;
  pendingClinicFinderAfterPrint = false;
  window.setTimeout(showClinicFinderAfterHandoff, 700);
}

function finishPrintHandoffAfterReturn() {
  if (!pendingClinicFinderAfterPrint) return;
  if (Date.now() - printStartedAt < 1200) return;
  finishPrintHandoff();
}

function updateFixedRailMetrics() {
  const topbar = document.querySelector(".topbar");
  const rail = document.querySelector(".decision-rail");
  if (!topbar || !rail) return;

  if (!window.matchMedia("(max-width: 1180px)").matches) {
    document.documentElement.style.removeProperty("--fixed-rail-top");
    document.documentElement.style.removeProperty("--fixed-rail-height");
    return;
  }

  window.requestAnimationFrame(() => {
    const topbarBottom = Math.max(0, Math.round(topbar.getBoundingClientRect().bottom));
    document.documentElement.style.setProperty("--fixed-rail-top", `${topbarBottom}px`);
    document.documentElement.style.setProperty("--fixed-rail-height", `${Math.ceil(rail.offsetHeight)}px`);
  });
}

function evaluate() {
  $("painValue").textContent = $("painScore").value;
  updateBodyMap();

  const red = checkedLabels(redFlags);
  const redItems = checkedItems(redFlags);
  if (red.length > 0 && checked("noRedFlags")) {
    $("noRedFlags").checked = false;
  }
  updateGatedSections();
  updateCollapsibleSections();
  updateWorkupDetailStates();
  const workup = checkedLabels(workupItems);
  const patterns = checkedLabels(painPatterns);
  const contexts = checkedLabels(contextItems);
  const cauda = checked("bowelBladder") || checked("saddle") || checked("bilateralSciatica");
  const urgentSpine = checked("motorLoss") || checked("upperMotor") || checked("trauma");
  const malignancyInfection = checked("cancer") || checked("fever") || checked("nightPain");
  const ptReady = checked("pt") && Number($("ptSessions").value || 0) >= 4;
  const imagingReady = checked("imaging") || value("imagingSummary").length > 8;
  const medicationReady = checked("medicationTrial") || value("medSummary").length > 8;
  const functionReferral = checked("function") || $("functionImpact").value !== "mild";
  const reasonReady = contexts.length > 0 || value("referralQuestion").length > 8;
  const reasons = selectedReasons();

  let indicationScore = 0;
  if ($("duration").value === "subacute") indicationScore += 10;
  if ($("duration").value === "chronic") indicationScore += 18;
  if ($("functionImpact").value === "moderate") indicationScore += 14;
  if ($("functionImpact").value === "severe") indicationScore += 22;
  if (Number($("painScore").value || 0) >= 7) indicationScore += 8;
  if (checked("procedure")) indicationScore += 18;
  if (checked("diagnosis")) indicationScore += 14;
  if (checked("opioid")) indicationScore += 14;
  if (checked("sideEffects")) indicationScore += 12;
  if (checked("declinesMeds")) indicationScore += 10;
  if (checked("pcpComfort")) indicationScore += 10;
  if (checked("pt") && Number($("ptSessions").value || 0) >= 4) indicationScore += 10;
  if (medicationReady) indicationScore += 8;
  if (patterns.length > 0) indicationScore += Math.min(18, patterns.length * 6);
  indicationScore = Math.min(indicationScore, 100);

  let score = 0;
  if (ptReady) score += 28;
  if (imagingReady) score += 28;
  if (medicationReady) score += 28;
  if (patterns.length > 0) score += 6;
  if (functionReferral) score += 5;
  if (reasonReady) score += 5;
  score = Math.min(score, 100);
  let referralScore = Math.round((indicationScore * 0.55) + (score * 0.45));
  if (!redFlagReviewComplete() && red.length === 0) referralScore = 0;
  const supportText = reasons.length ? reasons.slice(0, 4).join(", ") : "the selected clinical factors";
  const redFlagExplanation = redItems.length
    ? ` Selected red flag details: ${redItems.map(([, label, hint]) => `${label}: ${hint}`).join("; ")}.`
    : "";

  const missing = [];
  if (!redFlagReviewComplete() && red.length === 0) missing.push("Complete red flag review and attest that no red flags are present before routine referral workup.");
  if (!ptReady) missing.push("Document PT/home exercise trial, number of sessions, or why PT is unsafe/not feasible.");
  if (!imagingReady && $("duration").value !== "acute") missing.push("Add relevant imaging result or rationale for imaging not indicated.");
  if (!medicationReady) missing.push("Summarize medication trials, contraindications, intolerance, and response.");
  if (patterns.length === 0) missing.push("Select a pain pattern/phenotype so the specialist can triage procedure vs medication vs rehab needs.");
  if (!reasonReady) missing.push("State a focused referral question for pain management.");
  if (checked("misuse")) missing.push("If misuse or abnormal UDS is the primary issue, addiction medicine may be more appropriate than pain clinic alone.");

  let level = "routine";
  let title = "Pain management referral not yet clearly indicated";
  let detail = "The selected information does not yet show enough pain complexity, functional impairment, failed conservative care, or a focused specialist question.";

  if (cauda) {
    level = "danger";
    title = "Emergency evaluation";
    detail = `Possible cauda equina pattern. Send to ED or urgent spine pathway rather than routine pain management referral.${redFlagExplanation}`;
    referralScore = 100;
  } else if (urgentSpine) {
    level = "danger";
    title = "Urgent spine evaluation";
    detail = `Progressive neurologic deficit, upper motor neuron findings, trauma, or instability should route to urgent MRI and neurosurgery/orthopedic spine evaluation.${redFlagExplanation}`;
    referralScore = 100;
  } else if (malignancyInfection) {
    level = "warn";
    title = "Urgent imaging / serious disease exclusion";
    detail = `Cancer, infection, night pain, or systemic features should prompt urgent imaging/workup before routine pain management referral.${redFlagExplanation}`;
    referralScore = Math.max(referralScore, 80);
  } else if (!redFlagReviewComplete()) {
    level = "warn";
    title = "Red flag review required";
    detail = red.length
      ? `A selected red flag should be routed before routine pain referral.${redFlagExplanation}`
      : "Review each red flag symptom first. Continue only when no red flags are present, then select the no-red-flags attestation to unlock routine pain referral support.";
  } else if ($("duration").value === "acute" && referralScore >= 45) {
    level = "warn";
    title = "Acute pain: expedited review or eConsult";
    detail = `This is not a routine chronic pain referral pathway. Because ${supportText} is present, consider acute pain/surgical/specialty review, urgent eConsult, or chronic pain advice to expedite triage.`;
  } else if ($("duration").value === "acute") {
    level = "routine";
    title = "Acute pain pathway";
    detail = "Manage as acute pain or refer to the appropriate acute specialty service. Chronic pain referral is usually reserved for persistent pain or complex cases needing expedited advice.";
  } else if (referralScore >= 75) {
    level = "ready";
    title = "Pain management referral ready";
    detail = `Referral is supported by ${supportText}. The selected clinical factors and workup documentation support pain management referral.`;
  } else if (referralScore >= 55) {
    level = "warn";
    title = "Referral likely appropriate, complete remaining items";
    detail = `Referral is reasonably supported by ${supportText}. Complete the missing workup or documentation items before sending if this is not urgent.`;
  } else if (referralScore >= 40) {
    level = "warn";
    title = "Referral may be appropriate";
    detail = `Some referral factors are present: ${supportText}. Consider additional primary care management or clarify the specialist question before referral.`;
  }

  const recommendation = $("recommendation");
  recommendation.className = `recommendation ${level === "danger" ? "danger" : level === "warn" ? "warn" : ""}`;
  recommendation.innerHTML = `<strong>${title}</strong><br>${detail}`;

  const pill = $("readinessPill");
  pill.className = `missing-status ${level === "ready" ? "ready" : level === "warn" ? "warn" : level === "danger" ? "danger" : ""}`;
  pill.textContent = level === "danger" ? "Urgent" : level === "ready" ? "Ready" : level === "warn" ? "Needs review" : "Incomplete";

  $("meterFill").style.width = `${referralScore}%`;
  $("scoreText").textContent = `Referral readiness score: ${referralScore}/100`;
  $("missingCount").textContent = String(missing.length);
  $("missingList").innerHTML = missing.length ? missing.map((item) => `<li>${item}</li>`).join("") : "<li>No major routine referral gaps identified.</li>";

  const requiredFields = ["patientInitials", "age", "imagingSummary", "medSummary", "referralQuestion"];
  const completedFields = requiredFields.filter((id) => value(id).length > 0).length + workup.length + patterns.length + contexts.length + red.length;
  const possible = requiredFields.length + workupItems.length + painPatterns.length + contextItems.length + redFlags.length;
  $("completionText").textContent = `${Math.round((completedFields / possible) * 100)}% complete`;

  const note = buildNote({ red, workup, patterns, contexts, title, detail, referralScore, reasons, missing });
  currentReferralNote = note;
  $("printReferralNote").textContent = note;
  $("formattedReferralNote").innerHTML = formatReferralNote(note);
  referralHandoffReady = level === "ready" && missing.length === 0;
  $("referralActionPrompt").hidden = !referralHandoffReady;
  $("referralNotePrompt").hidden = !referralHandoffReady;
  $("copyNote").classList.toggle("handoff-ready", referralHandoffReady);
  $("printPage").classList.toggle("handoff-ready", referralHandoffReady);
  updateFixedRailMetrics();
}

function buildNote({ red, workup, patterns, contexts, title, detail, referralScore, reasons, missing }) {
  const initials = value("patientInitials") || "[patient]";
  const durationText = $("duration").selectedOptions[0].textContent;
  const impactText = $("functionImpact").selectedOptions[0].textContent;
  const ptSessions = value("ptSessions") || "0";
  const lines = [
    `Pain Management Referral Readiness Note`,
    ``,
    `Patient: ${initials}    Age: ${value("age") || "[age]"}`,
    `Pain region/pattern: ${patterns.length ? patterns.join("; ") : "[select pain region/pattern]"}`,
    `Duration: ${durationText}`,
    `Pain severity/function: ${$("painScore").value}/10; ${impactText}`,
    ``,
    `Decision support recommendation: ${title}`,
    `${detail}`,
    `Referral readiness score: ${referralScore}/100`,
    `Referral-supporting factors: ${reasons.length ? reasons.join("; ") : "None strongly identified from selected inputs"}`,
    ``,
    `Red flags screened: ${red.length ? red.join("; ") : "None documented as present"}`,
    ``,
    `Completed conservative care/workup:`,
    `- PT/home exercise: ${checked("pt") ? "Yes" : "No/unclear"}; sessions: ${ptSessions}`,
    `- Imaging: ${value("imagingSummary") || "[summarize relevant imaging or rationale]"}`,
    `- Medication trials/response: ${value("medSummary") || "[NSAID/APAP/topical/neuropathic/opioid history, contraindications, response]"}`,
    `- Prior procedures/specialists: ${value("priorCare") || "[none documented]"}`,
    ``,
    `Reason for pain management referral:`,
    `${contexts.length ? contexts.join("; ") : "[select referral context]"}`,
    `${value("referralQuestion") || "[focused referral question]"}`,
    ``,
    `Items to complete/clarify:`,
    `${missing.length ? missing.map((item) => `- ${item}`).join("\n") : "- No major routine gaps identified."}`,
    ``,
    `Safety note: This support output requires clinician review and must be reconciled with local referral requirements, payer policy, and emergency precautions.`
  ];
  return lines.join("\n");
}

function bindEvents() {
  document.querySelectorAll("input, select, textarea").forEach((element) => {
    element.addEventListener("input", evaluate);
    element.addEventListener("change", evaluate);
  });

  document.querySelectorAll("[data-clear]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(`#${button.dataset.clear} input[type="checkbox"]`).forEach((box) => {
        box.checked = false;
      });
      if (button.dataset.clear === "redFlags") {
        $("noRedFlags").checked = false;
      }
      evaluate();
    });
  });

  $("noRedFlags").addEventListener("change", () => {
    if (checked("noRedFlags")) {
      redFlags.forEach(([id]) => {
        $(id).checked = false;
      });
    }
    evaluate();
  });

  redFlags.forEach(([id]) => {
    $(id).addEventListener("change", () => {
      if (checked(id)) {
        $("noRedFlags").checked = false;
      }
      evaluate();
    });
  });

  $("editRedFlags").addEventListener("click", () => {
    $("redFlagDetails").hidden = false;
    $("redFlagSummary").hidden = true;
    $("editRedFlags").hidden = true;
  });

  contextItems.forEach(([id]) => {
    $(id).addEventListener("change", () => {
      autofillReferralQuestion();
      evaluate();
    });
  });

  $("referralQuestion").addEventListener("input", () => {
    $("referralQuestion").dataset.autofilled = "false";
  });

  $("editReferralContext").addEventListener("click", () => {
    $("referralContextDetails").hidden = false;
    $("editReferralContext").hidden = true;
    $("referralContextSummary").hidden = true;
  });

  $("referralNoteToggle").addEventListener("click", () => {
    const toggle = $("referralNoteToggle");
    const panel = $("referralNotePanel");
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    panel.hidden = expanded;
  });

  $("copyNote").addEventListener("click", async () => {
    await navigator.clipboard.writeText(currentReferralNote);
    $("copyNote").textContent = "Copied";
    showClinicFinderAfterHandoff();
    setTimeout(() => {
      $("copyNote").textContent = "Copy Note";
    }, 1300);
  });

  $("printPage").addEventListener("click", () => {
    prepareReferralNoteForPrint();
    pendingClinicFinderAfterPrint = referralHandoffReady;
    printStartedAt = Date.now();
    window.print();
  });

  window.addEventListener("afterprint", finishPrintHandoff);
  window.addEventListener("focus", finishPrintHandoffAfterReturn);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") finishPrintHandoffAfterReturn();
  });
  window.addEventListener("resize", updateFixedRailMetrics);

  $("sourcesToggle").addEventListener("click", () => {
    const toggle = $("sourcesToggle");
    const panel = $("sourcesPanel");
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    panel.hidden = expanded;
  });

  $("missingToggle").addEventListener("click", () => {
    const toggle = $("missingToggle");
    const panel = $("missingPanel");
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    panel.hidden = expanded;
  });

  $("installApp").addEventListener("click", async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      updateInstallButton();
      return;
    }
    showInstallHelp();
  });

  $("closeInstallDialog").addEventListener("click", () => {
    $("installDialog").close();
  });

  $("closeClinicFinder").addEventListener("click", () => {
    $("clinicFinderDialog").close();
  });

  $("skipLocationSetup").addEventListener("click", () => {
    localStorage.setItem("painReferralLocationSetup", "dismissed");
    $("clinicFinderDialog").close();
  });

  $("clinicRadius").addEventListener("change", () => {
    if (lastClinicPosition) renderClinicSearchLinks(lastClinicPosition);
  });

  $("useLocationForClinics").addEventListener("click", () => {
    if (!navigator.geolocation) {
      $("clinicFinderStatus").textContent = "Location is not available in this browser. Use the map app search for pain management clinics near the patient or clinic location.";
      return;
    }

    $("clinicFinderStatus").textContent = "Requesting device location...";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        lastClinicPosition = position;
        localStorage.setItem("painReferralLocationSetup", "enabled");
        renderClinicSearchLinks(position);
        if (clinicFinderMode === "setup") {
          $("clinicFinderStatus").textContent = "Location permission is enabled. Clinic suggestions will be available when a referral packet is ready.";
        }
      },
      () => {
        localStorage.setItem("painReferralLocationSetup", "dismissed");
        $("clinicFinderStatus").textContent = "Location was not shared. Open your map app and search for pain management clinics near the patient or clinic location.";
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function updateInstallButton() {
  const button = $("installApp");
  if (isStandalone()) {
    button.hidden = true;
    return;
  }
  button.hidden = false;
  button.textContent = deferredInstallPrompt ? "Install" : "Install";
}

function showInstallHelp() {
  const message = isIos()
    ? "On iPhone or iPad, tap the Safari Share button, then choose Add to Home Screen."
    : "If a native install prompt does not appear, open this page in Chrome, Edge, or Android Chrome and use the browser menu to install the app.";
  $("installMessage").textContent = message;
  $("installDialog").showModal();
}

function setupInstallSupport() {
  updateInstallButton();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    updateInstallButton();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
}

renderChecks("redFlags", redFlags, false);
renderChecks("painPatterns", painPatterns);
renderChecks("referralContext", contextItems);
bindEvents();
setupInstallSupport();
evaluate();
updateFixedRailMetrics();
maybePromptForLocationSetup();
