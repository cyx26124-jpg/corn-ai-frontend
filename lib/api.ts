const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const defaultHeaders = {
  "ngrok-skip-browser-warning": "true",
};

// ─── 健康检查 ──────────────────────────────────────
export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`, {
    headers: defaultHeaders,
  });
  return res.json();
}

// ─── 仅检测病害 ────────────────────────────────────
export async function detectDisease(imageFile: File) {
  const formData = new FormData();
  formData.append("file", imageFile);

  const res = await fetch(`${API_BASE}/detect`, {
    method: "POST",
    headers: defaultHeaders,
    body: formData,
  });

  if (!res.ok) throw new Error(`检测失败: ${res.statusText}`);
  return res.json();
}

// ─── 仅获取诊断报告 ────────────────────────────────
export async function getDiagnosis(diseaseName: string, confidence?: number) {
  const res = await fetch(`${API_BASE}/diagnosis`, {
    method: "POST",
    headers: {
      ...defaultHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      disease_name: diseaseName,
      confidence: confidence,
    }),
  });

  if (!res.ok) throw new Error(`诊断失败: ${res.statusText}`);
  return res.json();
}

// ─── 检测 + 诊断（一步完成）────────────────────────
export async function detectAndDiagnose(imageFile: File) {
  const formData = new FormData();
  formData.append("file", imageFile);

  const res = await fetch(`${API_BASE}/detect_and_diagnose`, {
    method: "POST",
    headers: defaultHeaders,
    body: formData,
  });

  if (!res.ok) throw new Error(`分析失败: ${res.statusText}`);
  return res.json();
}

// ─── 摄像头帧检测 ──────────────────────────────────
export async function detectFromCamera(base64Frame: string, runDiagnosis = false) {
  const res = await fetch(`${API_BASE}/camera_frame`, {
    method: "POST",
    headers: {
      ...defaultHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      frame: base64Frame,
      run_diagnosis: runDiagnosis,
    }),
  });

  if (!res.ok) throw new Error(`摄像头检测失败: ${res.statusText}`);
  return res.json();
}