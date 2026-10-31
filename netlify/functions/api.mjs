import { getStore } from "@netlify/blobs";

// 기본 접속 코드 (설치 후 관리자 화면 「팀·코드 설정」에서 반드시 변경하세요)
const DEFAULT_SUBMIT_CODE = "입력코드";
const DEFAULT_ADMIN_PW = "admin-change-me";

// 예시 팀 목록 (관리자 화면에서 추가·수정·순서변경 가능)
const DEFAULT_TEAMS = [
  ["sunjang", "순장반", "담당자"],
  ["disciple", "제자사역훈련", "담당자"],
  ["faith", "신앙강좌", "담당자"],
  ["onetoone", "일대일양육", "담당자"],
  ["newfamily", "새가족부", "담당자"],
  ["family", "가정사역부", "담당자"],
  ["newlywed", "신혼부부공동체", "담당자"],
  ["onephrase", "한구절묵상", "담당자"],
  ["senior", "브라보시니어", "담당자"],
  ["happy", "행복한모임", "담당자"],
  ["homeworship", "가정예배", "담당자"],
  ["intercession", "중보기도부", "담당자"],
  ["mothers", "어머니기도회", "담당자"],
  ["ee", "전도폭발", "담당자"],
].map(([id, name, manager]) => ({ id, name, manager }));

// 한글 자판·대문자·공백으로 잘못 입력된 코드도 같은 키 입력으로 인정
const KEYS = "r R rt s sw sg e E f fr fa fq ft fx fv fg a q Q qt t T d w W c z x v g k o i O j p u P h hk ho hl y n nj np nl b m ml l".split(" ");
const CHO = "r R s e E f a q Q t T d w W c z x v g".split(" ");
const JUNG = "k o i O j p u P h hk ho hl y n nj np nl b m ml l".split(" ");
const JONG = ["", ..."r R rt s sw sg e f fr fa fq ft fx fv fg a q qt t T d w c z x v g".split(" ")];
function toKeys(str) {
  return [...String(str || "").replace(/\s/g, "")].map((ch) => {
    const c = ch.charCodeAt(0);
    if (c >= 0x3131 && c <= 0x3163) return KEYS[c - 0x3131];
    if (c >= 0xac00 && c <= 0xd7a3) {
      const i = c - 0xac00;
      return CHO[Math.floor(i / 588)] + JUNG[Math.floor((i % 588) / 28)] + JONG[i % 28];
    }
    return ch;
  }).join("").toLowerCase();
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const store = () => getStore({ name: "training-report", consistency: "strong" });

// 팀별로 키를 따로 저장(month/2026-08/팀id) → 여러 팀이 동시에 저장해도 충돌 없음
async function loadMonth(month) {
  const { blobs } = await store().list({ prefix: `month/${month}/` });
  const out = {};
  await Promise.all(blobs.map(async ({ key }) => {
    const v = await store().get(key, { type: "json" });
    if (v) out[key.split("/").pop()] = v;
  }));
  return out;
}

const defaultConfig = () => ({ teams: DEFAULT_TEAMS, submitCode: DEFAULT_SUBMIT_CODE, adminPw: DEFAULT_ADMIN_PW });
const getConfig = async () => ({ ...defaultConfig(), ...((await store().get("config", { type: "json" })) || {}) });
const validMonth = (m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m || ""));
const clean = (s, n) => String(s || "").replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trim().slice(0, n);
const publicTeams = (cfg) => cfg.teams.map(({ id, name, manager }) => ({ id, name, manager }));

function saveEntry(month, team, body) {
  const entry = {
    manager: clean(body.manager, 20) || team.manager,
    report: clean(body.report, 2000),
    plan: clean(body.plan, 2000),
    by: clean(body.by, 20),
    at: new Date().toISOString(),
  };
  return store().setJSON(`month/${month}/${team.id}`, entry);
}

export default async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (req.method === "GET" && action === "teams") {
    return json({ teams: publicTeams(await getConfig()) });
  }

  if (req.method !== "POST") return json({ error: "잘못된 요청" }, 400);
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "잘못된 요청" }, 400);
  }
  const cfg = await getConfig();

  // 팀 담당자(코드 없이 바로 입력): 자기 팀 불러오기·저장 + 제출현황(제출 여부만)
  if (action === "team") {
    if (!validMonth(body.month)) return json({ error: "보고 월을 확인해 주세요." }, 400);
    const team = cfg.teams.find((t) => t.id === body.team);
    if (body.op === "save") {
      if (!team) return json({ error: "팀을 선택해 주세요." }, 400);
      if (!clean(body.report, 10) && !clean(body.plan, 10)) return json({ error: "보고 또는 계획을 입력해 주세요." }, 400);
      await saveEntry(body.month, team, body);
    }
    const data = await loadMonth(body.month);
    const [y, m] = body.month.split("-").map(Number);
    const prev = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
    const prevEntry = team ? await store().get(`month/${prev}/${team.id}`, { type: "json" }) : null;
    return json({
      teams: publicTeams(cfg),
      submitted: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.at])),
      entry: team ? data[team.id] || null : null,
      prevPlan: prevEntry?.plan || "",
    });
  }

  if (action === "admin") {
    if (toKeys(body.pw) !== toKeys(cfg.adminPw)) return json({ error: "비밀번호가 틀렸습니다." }, 401);

    if (body.op === "saveEntry") {
      if (!validMonth(body.month)) return json({ error: "보고 월을 확인해 주세요." }, 400);
      const team = cfg.teams.find((t) => t.id === body.team);
      if (!team) return json({ error: "팀을 찾을 수 없습니다." }, 400);
      await saveEntry(body.month, team, { ...body, by: body.by || "관리자" });
    }
    if (body.op === "deleteEntry") {
      if (validMonth(body.month)) await store().delete(`month/${body.month}/${String(body.team).replace(/[^a-z0-9-]/gi, "")}`);
    }
    if (body.op === "saveConfig") {
      const teams = (Array.isArray(body.teams) ? body.teams : [])
        .map((t) => ({
          id: String(t.id || "").replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "t" + crypto.randomUUID().slice(0, 8),
          name: clean(t.name, 30),
          manager: clean(t.manager, 20),
        }))
        .filter((t) => t.name);
      if (!teams.length) return json({ error: "팀이 하나 이상 있어야 합니다." }, 400);
      const next = {
        teams,
        submitCode: clean(body.submitCode, 30) || cfg.submitCode,
        adminPw: clean(body.adminPw, 30) || cfg.adminPw,
      };
      await store().setJSON("config", next);
      return json({ ok: true, config: next });
    }

    const out = { config: await getConfig() };
    if (validMonth(body.month)) out.entries = await loadMonth(body.month);
    return json(out);
  }

  return json({ error: "잘못된 요청" }, 400);
};

export const config = { path: "/api" };
