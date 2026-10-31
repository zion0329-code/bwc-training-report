// 사용: node tools/seed.mjs <base-url> <관리자비번> <월> <json>
import fs from "node:fs";
const [base, pw, month, file] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(file, "utf8"));
for (const [team, e] of Object.entries(data)) {
  const r = await fetch(`${base}/api?action=admin`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ pw, op: "saveEntry", month, team, ...e, by: "시드 데이터" }) });
  console.log(team, r.status);
}
