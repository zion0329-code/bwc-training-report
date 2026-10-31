// 공통: API 호출 + 월 계산
async function api(action, body) {
  const opt = body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {};
  let res;
  try {
    res = await fetch(`/api?action=${action}`, opt);
  } catch {
    throw new Error("인터넷 연결을 확인해 주세요.");
  }
  const data = await res.json().catch(() => ({ error: "서버 응답 오류" }));
  if (!res.ok || data.error) throw Object.assign(new Error(data.error || "오류가 발생했습니다."), { status: res.status });
  return data;
}

const pad2 = (n) => String(n).padStart(2, "0");
const ym = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
function addMonth(m, n) {
  const [y, mo] = m.split("-").map(Number);
  return ym(new Date(y, mo - 1 + n, 1));
}
// 마지막 주 금요일에 작성 → 15일 이전에 들어오면 지난달 보고로 간주
function defaultMonth(today = new Date()) {
  return today.getDate() >= 15 ? ym(today) : addMonth(ym(today), -1);
}
function lastFriday(m) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 0);
  while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
  return d;
}
// 당회 = 다음 달 첫 주일
function firstSunday(m) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  return d;
}
const WD = "일월화수목금토";
const md = (d) => `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
const monthLabel = (m) => `${Number(m.split("-")[0])}년 ${Number(m.split("-")[1])}월`;
const docMonth = (m) => `${Number(m.split("-")[0])}-${Number(m.split("-")[1])}월`; // 보고서 표기: 2026-8월
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function store(k, v) {
  try {
    if (v === undefined) return localStorage.getItem(k);
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {}
  return null;
}
