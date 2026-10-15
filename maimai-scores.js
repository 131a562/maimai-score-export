(async () => {
const TEST = window.__MAI_TEST__;
if (!TEST && !["maimaidx.jp", "maimaidx-eng.com"].includes(location.hostname)) {
alert("请在登录后的 maimai DX NET（maimaidx.jp）页面上执行。");
return;
}
const NET = location.origin + "/maimai-mobile";
const CONST_URL = "https://otoge-db.net/maimai/data/music-ex.json";
const JACKET_URL = "https://otoge-db.net/maimai/jacket/";
const ALL_DIFFS = [
{ id: 0, cls: "basic", name: "BASIC", short: "BAS", key: "bas" },
{ id: 1, cls: "advanced", name: "ADVANCED", short: "ADV", key: "adv" },
{ id: 2, cls: "expert", name: "EXPERT", short: "EXP", key: "exp" },
{ id: 3, cls: "master", name: "MASTER", short: "MAS", key: "mas" },
{ id: 4, cls: "remaster", name: "Re:MASTER", short: "ReM", key: "remas" },
];
const DIFFS = ALL_DIFFS.slice(2);
const VERSIONS = [
[10000, "maimai"], [11000, "maimai PLUS"], [12000, "GreeN"], [13000, "GreeN PLUS"],
[14000, "ORANGE"], [15000, "ORANGE PLUS"], [16000, "PiNK"], [17000, "PiNK PLUS"],
[18000, "MURASAKi"], [18500, "MURASAKi PLUS"], [19000, "MiLK"], [19500, "MiLK PLUS"],
[19900, "FiNALE"], [20000, "でらっくす"], [20500, "でらっくす PLUS"], [21000, "Splash"],
[21500, "Splash PLUS"], [22000, "UNiVERSE"], [22500, "UNiVERSE PLUS"], [23000, "FESTiVAL"],
[23500, "FESTiVAL PLUS"], [24000, "BUDDiES"], [24500, "BUDDiES PLUS"], [25000, "PRiSM"],
[25500, "PRiSM PLUS"], [26000, "CiRCLE"], [26500, "CiRCLE PLUS"], [27000, "MAGiCAL"],
];
const versionNames = VERSIONS.map(([, n]) => n);
const versionIndexOf = (code) => {
const c = +code || 0;
if (!c) return -1;
const last = VERSIONS[VERSIONS.length - 1][0];
if (c >= last + 500) return VERSIONS.length - 1 + Math.floor((c - last) / 500);
let i = VERSIONS.length - 1;
while (i > 0 && VERSIONS[i][0] > c) i--;
return i;
};
const versionName = (v) => (v >= 0 ? versionNames[v] || VERSIONS[v]?.[1] || `Ver.${v}` : "");
const RANKS = [
["SSS+", 100.5], ["SSS", 100], ["SS+", 99.5], ["SS", 99], ["S+", 98], ["S", 97],
["AAA", 94], ["AA", 90], ["A", 80], ["BBB", 75], ["BB", 70], ["B", 60], ["C", 50], ["D", 0],
];
const FACTORS = [
[100.5, 224], [100.4999, 222], [100, 216], [99.9999, 214], [99.5, 211], [99, 208],
[98.9999, 206], [98, 203], [97, 200], [96.9999, 176], [94, 168], [90, 152], [80, 136],
[79.9999, 128], [75, 120], [70, 112], [60, 96], [50, 80], [40, 64], [30, 48], [20, 32], [10, 16], [0, 0],
];
const FC_NAMES = { app: "AP+", ap: "AP", fcp: "FC+", fc: "FC" };
const SYNC_NAMES = { fsdp: "FDX+", fdxp: "FDX+", fsd: "FDX", fdx: "FDX", fsp: "FS+", fs: "FS", sync: "SYNC" };
const FC_ORDER = ["AP+", "AP", "FC+", "FC"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (s) => +String(s || "").replace(/[,%\s]/g, "") || 0;
const norm = (s) => String(s || "").normalize("NFKC").replace(/\s+/g, " ").trim();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
document.getElementById("mai-score-panel")?.remove();
const panel = document.createElement("div");
panel.id = "mai-score-panel";
panel.style.cssText =
"position:fixed;inset:0;z-index:99999;background:#fff;color:#222;overflow:auto;" +
"padding:10px;font:13px/1.5 sans-serif;-webkit-text-size-adjust:100%;box-sizing:border-box;text-align:left";
document.body.appendChild(panel);
let logTarget = panel; // 加载全曲成绩时改为输出到查分区域
const log = (msg) => {
const p = document.createElement("div");
p.textContent = msg;
logTarget.appendChild(p);
};
const rankOf = (a) => RANKS.find(([, b]) => a >= b)[0];
function calcRating(c, s) {
if (!c || !s.played) return 0;
const a = Math.min(s.achievement, 100.5);
const f = FACTORS.find(([t]) => a >= t)[1];
const base = Math.floor((Math.round(c * 10) * Math.round(a * 10000) * f) / 1e8);
return base + (s.fc === "AP" || s.fc === "AP+" ? 1 : 0);
}
const dxStarOf = (p, max) => (max > 0 ? [0.85, 0.9, 0.93, 0.95, 0.97].filter((t) => p >= max * t).length : 0);
const constParts = (s) => {
if (s.const == null) return null;
const i = Math.floor(s.const + 1e-9);
const plus = s.level ? s.level.endsWith("+") : s.const - i >= 0.6 - 1e-9;
return { int: String(i), plus, dec: s.const_unknown ? ".?" : "." + Math.round((s.const - i) * 10) };
};
const constText = (s) => {
const p = constParts(s);
return p ? p.int + (p.plus ? "+" : "") + p.dec : "";
};
function parseRow(el, genre) {
const cls = (String(el.className).match(/music_([a-z]+)_score_back/) || [])[1];
const diff = ALL_DIFFS.find((d) => d.cls === cls);
if (!diff) return null; // 宴谱面等
const title = norm(el.querySelector(".music_name_block")?.textContent);
if (!title) return null;
const row = el.parentElement || el;
const id = row.id || el.id || "";
let kind;
if (id) kind = /sta/i.test(id) ? "STD" : "DX";
else {
const icon = row.querySelector("img.music_kind_icon") ||
[...row.querySelectorAll("img")].find((i) => /music_(standard|dx)\./.test(i.src));
kind = icon && /standard/.test(icon.src) ? "STD" : "DX";
}
const blocks = el.querySelectorAll(".music_score_block");
const achText = blocks[0]?.textContent || "";
const played = /\d/.test(achText);
const dx = (blocks[1]?.textContent || "").match(/([\d,]+)\s*\/\s*([\d,]+)/);
let fc = "", sync = "";
for (const img of el.querySelectorAll("img")) {
const m = (img.getAttribute("src") || "").match(/music_icon_([a-z]+)\.png/);
if (!m) continue;
if (FC_NAMES[m[1]]) fc = FC_NAMES[m[1]];
if (SYNC_NAMES[m[1]]) sync = SYNC_NAMES[m[1]];
}
const achievement = played ? parseFloat(achText) : 0;
if (!sampleHtml && played) sampleHtml = row.outerHTML;
return {
difficulty: diff.name,
diffShort: diff.short,
diffKey: diff.key,
title,
kind,
genre,
level: norm(el.querySelector(".music_lv_block")?.textContent),
played,
achievement,
rank: played ? rankOf(achievement) : "",
fc: played ? fc : "",
sync: played ? sync : "",
dx_score: dx ? num(dx[1]) : 0,
dx_max: dx ? num(dx[2]) : 0,
};
}
function parseList(doc) {
const root = doc.querySelector(".main_wrapper") || doc.body;
if (!root) return [];
const songs = [];
let genre = "";
for (const el of root.querySelectorAll(".screw_block, div[class*='_score_back']")) {
if (el.classList.contains("screw_block")) genre = norm(el.textContent);
else {
const s = parseRow(el, genre);
if (s) songs.push(s);
}
}
return songs;
}
function parseRatingTarget(doc) {
const root = doc.querySelector(".main_wrapper") || doc.body;
const out = { new: [], old: [], none: [], skip: [], headers: [] };
if (!root) return out;
let sec = "none";
for (const el of root.querySelectorAll("*")) {
if (/_score_back/.test(String(el.className))) {
const s = parseRow(el, "");
if (s) out[sec].push(s);
continue;
}
if (el.closest("[class*=_score_back]")) continue;
const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("");
const t = norm(own || (el.tagName === "IMG" ? el.getAttribute("alt") : ""));
if (!t || t.length > 40 || !/対象曲|候補曲|Songs for Rating/i.test(t)) continue;
out.headers.push(t);
sec = /候補|Selection|Candidate/i.test(t) ? "skip" : /新|New/i.test(t) ? "new" : "old";
}
if (!out.new.length && !out.old.length && out.none.length) {
out.new = out.none.slice(0, 15);
out.old = out.none.slice(15, 50);
out.guessed = true;
}
return out;
}
let sampleHtml = ""; // 调试用：一首歌在成绩页上的原始 HTML
const keyOf = (s) => norm(s.title) + "|" + s.kind;
const chartKey = (s) => keyOf(s) + "|" + s.difficulty;
log("正在读取谱面定数表（otoge-db）...");
let constData = [];
try {
constData = await (await fetch(CONST_URL)).json();
log(`✓ 定数表：${constData.length} 首`);
} catch (e) {
log(`× 定数表读取失败（${e}），将按等级估算定数，且不显示曲绘。`);
}
const metaIndex = new Map();
for (const m of constData) {
if (m.catcode === "宴会場" || m.lev_utage) continue;
for (const [kind, pre] of [["STD", ""], ["DX", "dx_"]]) {
if (!m[pre + "lev_bas"] && !m[pre + "lev_mas"]) continue;
const k = norm(m.title) + "|" + kind;
if (!metaIndex.has(k)) metaIndex.set(k, []);
metaIndex.get(k).push({ m, pre });
}
}
const matchLog = []; // 调试用：同名 / 找不到的曲目
function findMeta(s) {
let c = metaIndex.get(keyOf(s)) || [];
if (c.length > 1 && s.genre) {
const g = c.filter(({ m }) => norm(m.catcode) === s.genre);
if (g.length) c = g;
}
if (c.length > 1) {
const l = c.filter(({ m, pre }) => norm(m[`${pre}lev_${s.diffKey}`]) === s.level);
if (l.length) c = l;
}
if (c.length !== 1 && matchLog.length < 200) {
matchLog.push(`${s.difficulty} [${s.kind}] ${s.title} (${s.genre}) → ${c.length ? c.length + " 个候选" : "定数表里没有"}`);
}
return c[0];
}
const estimateConst = (lv) => {
const n = parseFloat(lv);
return isNaN(n) ? null : n + (lv.endsWith("+") ? 0.6 : 0);
};
function enrich(s) {
const hit = findMeta(s);
const m = hit?.m, pre = hit?.pre || "";
const ci = parseFloat(m?.[`${pre}lev_${s.diffKey}_i`]);
s.const = ci > 0 ? ci : estimateConst(s.level);
s.const_unknown = ci > 0 ? "" : m ? "未确定" : "无数据";
s.otoge_version = m ? versionIndexOf(m.version) : -1;
s.version_idx = s.otoge_version;
s.version = versionName(s.version_idx);
s.img = m?.image_url || "";
s.dx_star = s.played ? dxStarOf(s.dx_score, s.dx_max) : 0;
s.dx_ratio = s.dx_max ? s.dx_score / s.dx_max : 0;
s.rating = calcRating(s.const, s);
s.frame = s.frame || "";
return s;
}
const getDoc = async (url) => {
const res = await fetch(url, { credentials: "include" });
const doc = new DOMParser().parseFromString(await res.text(), "text/html");
return { res, doc };
};
const diagnose = ({ res, doc }) => {
const text = (doc.querySelector(".main_wrapper") || doc.body)?.textContent.replace(/\s+/g, " ").trim().slice(0, 200) || "";
return `URL=${res.url.replace(NET, "")} / HTTP ${res.status} / title=${doc.title} / main_wrapper=${!!doc.querySelector(".main_wrapper")} / score_back=${doc.querySelectorAll("[class*=_score_back]").length} / 内容: ${text}`;
};
const diagnostics = [];
const showDiagnostics = (parent) => {
log("请把下面的诊断信息截图或复制发给开发者：");
const pre = document.createElement("textarea");
pre.readOnly = true;
pre.style.cssText = "width:100%;height:240px;font:12px monospace;box-sizing:border-box";
pre.value = [`location=${location.href}`, `UA=${navigator.userAgent}`, ...diagnostics.slice(0, 8)].join("\n\n");
parent.appendChild(pre);
};
log("正在读取玩家信息 ...");
let player = { name: "", rating: 0 };
try {
const { doc } = await getDoc(NET + "/home/");
player = { name: norm(doc.querySelector(".name_block")?.textContent), rating: num(doc.querySelector(".rating_block")?.textContent) };
} catch (e) {}
log(player.rating ? `✓ ${player.name}：DX Rating ${player.rating}` : "× 没有读到游戏内 Rating，只显示计算值");
await sleep(1000); // 别给服务器太大压力
log("正在读取 Rating 对象曲 ...");
let target = { new: [], old: [], headers: [] };
try {
const page = await getDoc(`${NET}/home/ratingTargetMusic/`);
target = parseRatingTarget(page.doc);
if (!target.new.length && !target.old.length) diagnostics.push(`[ratingTargetMusic] ${diagnose(page)}`);
} catch (e) {
diagnostics.push(`[ratingTargetMusic] ${e}`);
}
let new15 = target.new.slice(0, 15).map(enrich);
let old35 = target.old.slice(0, 35).map(enrich);
let b50Source = "rating 对象曲页面";
let b50 = [];
let b50Cache = null;
const ratingInfo = { new15: 0, old35: 0, total: 0 };
const sum = (arr, k) => arr.reduce((a, s) => a + s[k], 0);
const avg = (arr, k) => (arr.length ? sum(arr, k) / arr.length : 0);
if (new15.length + old35.length) {
log(`✓ 新曲枠 ${new15.length} 首 · 旧曲枠 ${old35.length} 首${target.guessed ? "（没认出页面上的标题，按顺序划分）" : ""}`);
}
let charts = null;
let latestVersion = Math.max(versionNames.length - 1, ...constData.map((m) => versionIndexOf(m.version)));
const membership = new Map(); // 版本序号 → Set(曲名|STD/DX)
async function loadVersion(v) {
if (membership.has(v)) return membership.get(v);
const set = new Set();
try {
const page = await getDoc(`${NET}/record/musicVersion/search/?version=${v}&diff=3`);
for (const s of parseList(page.doc)) set.add(keyOf(s));
if (!set.size) diagnostics.push(`[version=${v}] ${diagnose(page)}`);
} catch (e) {
diagnostics.push(`[version=${v}] ${e}`);
}
membership.set(v, set);
applyVersions();
return set;
}
function applyVersions() {
if (!charts) return;
const official = new Map();
for (const [v, set] of membership) for (const k of set) official.set(k, v);
for (const s of charts) {
s.version_idx = official.has(keyOf(s)) ? official.get(keyOf(s)) : s.otoge_version;
s.version = versionName(s.version_idx);
}
}
async function loadAllCharts() {
const list = [];
for (const diff of DIFFS) {
log(`正在获取 ${diff.name} 全曲成绩 ...`);
const page = await getDoc(`${NET}/record/musicGenre/search/?genre=99&diff=${diff.id}`);
const songs = parseList(page.doc);
if (!songs.length) diagnostics.push(`[${diff.name}] ${diagnose(page)}`);
log(`${songs.length ? "✓" : "×"} ${diff.name}：${songs.length} 个谱面（已游玩 ${songs.filter((s) => s.played).length}）`);
list.push(...songs);
await sleep(1000);
}
if (!list.length) return false;
log("正在读取版本列表 ...");
try {
const top = await getDoc(`${NET}/record/musicVersion/`);
let officialLatest = -1;
top.doc.querySelectorAll("select[name=version] option").forEach((o) => {
const v = parseInt(o.value);
const name = norm(o.textContent);
if (v >= 0 && name) {
versionNames[v] = name;
officialLatest = Math.max(officialLatest, v);
}
});
if (officialLatest >= 0) latestVersion = officialLatest;
} catch (e) {}
charts = list.map(enrich);
const frames = new Map();
for (const s of new15.concat(old35)) frames.set(chartKey(s), s.frame);
for (const s of charts) s.frame = frames.get(chartKey(s)) || "";
applyVersions();
if (b50.length && b50Source === "rating 对象曲页面") {
const byKey = new Map(charts.map((s) => [chartKey(s), s]));
for (const s of b50) {
const c = byKey.get(chartKey(s));
if (!c || Math.abs(c.achievement - s.achievement) > 1e-6) continue;
Object.assign(s, { fc: s.fc || c.fc, sync: s.sync || c.sync, dx_score: s.dx_score || c.dx_score, dx_max: s.dx_max || c.dx_max });
enrich(s);
}
ratingInfo.new15 = sum(new15, "rating");
ratingInfo.old35 = sum(old35, "rating");
ratingInfo.total = ratingInfo.new15 + ratingInfo.old35;
b50Cache = null;
}
return true;
}
if (!new15.length && !old35.length) {
log("× 没有读到 Rating 对象曲页面，改为读取全曲成绩自己计算 B50（只算 EXPERT 以上）");
if (!(await loadAllCharts())) {
log("没有取到任何数据。可能是：未登录、处于维护时间（4:00–7:00）、当前账号无法查看成绩页，或页面结构不同。");
showDiagnostics(panel);
const close = document.createElement("button");
close.textContent = "关闭";
close.style.cssText = "margin-top:8px;padding:8px 12px;font-size:14px";
close.onclick = () => panel.remove();
panel.appendChild(close);
return;
}
log(`正在读取当前版本（${versionName(latestVersion)}）的曲目 ...`);
const latestSet = await loadVersion(latestVersion);
const isNew = (s) => (latestSet.size ? latestSet.has(keyOf(s)) : s.otoge_version === latestVersion);
const byRating = (a, b) => b.rating - a.rating || b.achievement - a.achievement;
const rated = charts.filter((s) => s.rating > 0);
new15 = rated.filter(isNew).sort(byRating).slice(0, 15);
old35 = rated.filter((s) => !isNew(s)).sort(byRating).slice(0, 35);
b50Source = "全曲成绩计算（EXPERT 以上）";
}
new15.forEach((s, i) => (s.frame = `新${i + 1}`));
old35.forEach((s, i) => (s.frame = `旧${i + 1}`));
b50 = new15.concat(old35);
ratingInfo.new15 = sum(new15, "rating");
ratingInfo.old35 = sum(old35, "rating");
ratingInfo.total = ratingInfo.new15 + ratingInfo.old35;
const IMG = { W: 1800, PAD: 28, COLS: 5, GAP: 10, CH: 124, HEAD: 168, SEC: 44, FOOT: 40, PER_IMAGE: 150 };
IMG.CW = Math.floor((IMG.W - IMG.PAD * 2 - IMG.GAP * (IMG.COLS - 1)) / IMG.COLS);
const FONT = `"Hiragino Sans","Hiragino Kaku Gothic ProN","PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`;
const C = {
bg: "#16151c", card: "#24222d", line: "#3a3745", fg: "#f3f1f8", muted: "#9d99ab", accent: "#ff5aa8", plat: "#7fe0ff",
BASIC: "#3fbf6f", ADVANCED: "#f2a33a", EXPERT: "#e5484d", MASTER: "#9a5cf0", "Re:MASTER": "#e3c8ff",
"SSS+": "#ffd36b", SSS: "#ffc94a", "SS+": "#f0b43c", SS: "#f0b43c", "S+": "#e3a53a", S: "#e3a53a",
"AP+": "#ffd36b", AP: "#ffc94a", "FC+": "#7fe0ff", FC: "#4fc3f7",
"FDX+": "#ff9a5a", FDX: "#ffb347", "FS+": "#7ee08a", FS: "#5ccf6c", SYNC: "#9d99ab",
DX: "#ff9a3c", STD: "#4aa3ff", star: ["#3a3745", "#5ccf6c", "#5ccf6c", "#ffb347", "#ffb347", "#ffd36b"],
};
const f = (w, px) => `${w} ${px}px ${FONT}`;
const jacketCache = new Map();
const loadImg = (src, cors) => new Promise((resolve) => {
const img = new Image();
if (cors) img.crossOrigin = "anonymous";
const t = setTimeout(() => resolve(null), 10000);
img.onload = () => { clearTimeout(t); resolve(img); };
img.onerror = () => { clearTimeout(t); resolve(null); };
img.src = src;
});
function loadJacket(id) {
if (!id) return Promise.resolve(null);
if (!jacketCache.has(id)) {
jacketCache.set(id, loadImg(JACKET_URL + id, true).then((img) => img || (TEST ? null : loadImg(`${NET}/img/Music/${id}`, false))));
}
return jacketCache.get(id);
}
function rrect(ctx, x, y, w, h, r) {
ctx.beginPath();
ctx.moveTo(x + r, y);
ctx.arcTo(x + w, y, x + w, y + h, r);
ctx.arcTo(x + w, y + h, x, y + h, r);
ctx.arcTo(x, y + h, x, y, r);
ctx.arcTo(x, y, x + w, y, r);
ctx.closePath();
}
function fit(ctx, text, maxW) {
if (ctx.measureText(text).width <= maxW) return text;
let t = text;
while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
return t + "…";
}
function pill(ctx, text, x, y, color, px = 12, ink = "#16151c") {
ctx.font = f(800, px);
const w = ctx.measureText(text).width + px;
rrect(ctx, x, y - px - 2, w, px + 7, 4);
ctx.fillStyle = color;
ctx.fill();
ctx.fillStyle = ink;
ctx.fillText(text, x + px / 2, y + 1);
return w;
}
function constPill(ctx, s, x, y, px = 13) {
const p = constParts(s);
const parts = p
? [[`${s.diffShort} ${p.int}`, px, 0], [p.plus ? "+" : "", px - 2, -px * 0.42], [p.dec, px, 0]]
: [[`${s.diffShort} ?`, px, 0]];
let w = px;
for (const [t, size] of parts) {
ctx.font = f(800, size);
w += ctx.measureText(t).width;
}
rrect(ctx, x, y - px - 3, w, px + 9, 4);
ctx.fillStyle = C[s.difficulty] || C.muted;
ctx.fill();
ctx.fillStyle = s.difficulty === "Re:MASTER" ? "#3b1d5e" : "#16151c";
let cx = x + px / 2;
for (const [t, size, dy] of parts) {
ctx.font = f(800, size);
ctx.fillText(t, cx, y + 1 + dy);
cx += ctx.measureText(t).width;
}
return w;
}
function drawStars(ctx, n, right, baseline, size = 12, gap = 2) {
const total = 5 * size + 4 * gap;
for (let i = 0; i < 5; i++) {
const cx = right - total + i * (size + gap) + size / 2, cy = baseline - size / 2;
ctx.beginPath();
for (let k = 0; k < 8; k++) {
const r = k % 2 ? size * 0.2 : size / 2;
const a = -Math.PI / 2 + (k * Math.PI) / 4;
ctx[k ? "lineTo" : "moveTo"](cx + r * Math.cos(a), cy + r * Math.sin(a));
}
ctx.closePath();
ctx.fillStyle = i < n ? C.star[n] : C.line;
ctx.fill();
}
return total;
}
function drawCard(ctx, s, label, x, y, jacket) {
const { CW, CH } = IMG;
rrect(ctx, x, y, CW, CH, 10);
ctx.fillStyle = C.card;
ctx.fill();
ctx.save();
rrect(ctx, x, y, CW, CH, 10);
ctx.clip();
if (jacket) ctx.drawImage(jacket, x, y, CH, CH);
else {
ctx.fillStyle = C.line;
ctx.fillRect(x, y, CH, CH);
ctx.fillStyle = C.muted;
ctx.font = f(700, 14);
ctx.textAlign = "center";
ctx.fillText("NO IMAGE", x + CH / 2, y + CH / 2 + 5);
ctx.textAlign = "left";
}
ctx.fillStyle = C[s.difficulty] || C.muted;
ctx.fillRect(x, y + CH - 6, CH, 6);
ctx.restore();
ctx.font = f(800, 13);
const lw = ctx.measureText(label).width + 12;
rrect(ctx, x + 4, y + 4, lw, 20, 5);
ctx.fillStyle = "rgba(0,0,0,.72)";
ctx.fill();
ctx.fillStyle = "#fff";
ctx.fillText(label, x + 10, y + 19);
pill(ctx, s.kind, x + 6, y + CH - 12, C[s.kind], 11, "#fff");
const L = x + CH + 10, R = x + CW - 10, TW = R - L;
ctx.textAlign = "left";
const text = (t, tx, ty, font, color, maxW) => {
ctx.font = font;
ctx.fillStyle = color;
const s2 = maxW != null ? fit(ctx, t, Math.max(0, maxW)) : t;
if (maxW == null || maxW > 12) ctx.fillText(s2, tx, ty);
return ctx.measureText(s2).width;
};
const textR = (t, ty, font, color, maxW) => { // 右对齐，返回宽度
ctx.font = font;
const s2 = fit(ctx, t, maxW);
const w = ctx.measureText(s2).width;
if (maxW > 12) {
ctx.fillStyle = color;
ctx.fillText(s2, R - w, ty);
}
return w;
};
let cx = L + constPill(ctx, s, L, y + 20) + 8;
if (s.version) textR(s.version, y + 20, f(600, 12), C.muted, R - cx);
text(s.title, L, y + 45, f(700, 16), C.fg, TW);
if (s.played) {
cx = L + text(`${s.achievement.toFixed(4)}%`, L, y + 71, f(800, 18), C.fg);
text(s.rank, cx + 5, y + 71, f(800, 14), C[s.rank] || C.muted, R - cx - 5);
} else {
text("未游玩", L, y + 71, f(700, 15), C.muted);
}
const starW = s.dx_max ? drawStars(ctx, s.dx_star, R, y + 93) : 0;
cx = L;
for (const t of [s.fc, s.sync === "SYNC" ? "" : s.sync]) {
if (!t) continue;
ctx.font = f(800, 11);
if (cx + ctx.measureText(t).width + 11 > R - starW - 6) break;
cx += pill(ctx, t, cx, y + 93, C[t] || C.muted, 11) + 4;
}
const ratingW = textR(s.rating > 0 ? String(s.rating) : "—", y + 117, f(800, 22), s.rating > 0 ? C.accent : C.muted, TW);
if (s.dx_max) {
cx = L + text("DX ", L, y + 116, f(700, 11), C.muted);
text(`${s.played ? s.dx_score.toLocaleString("en-US") : "—"} / ${s.dx_max.toLocaleString("en-US")}`, cx, y + 116, f(700, 13), C.plat, R - cx - ratingW - 8);
}
}
async function drawImage(title, subtitle, stats, sections) {
const { W, PAD, COLS, GAP, CH, HEAD, SEC, FOOT, CW } = IMG;
const rowsOf = (n) => Math.max(1, Math.ceil(n / COLS));
const H = HEAD + sections.reduce((h, sec) => h + SEC + rowsOf(sec.rows.length) * (CH + GAP), 0) + FOOT;
const jackets = new Map();
await Promise.all(sections.flatMap((sec) => sec.rows).map(async (s) => jackets.set(s, await loadJacket(s.img))));
const cv = document.createElement("canvas");
cv.width = W;
cv.height = H;
const ctx = cv.getContext("2d");
ctx.fillStyle = C.bg;
ctx.fillRect(0, 0, W, H);
ctx.textBaseline = "alphabetic";
ctx.fillStyle = C.accent;
ctx.font = f(800, 16);
ctx.fillText(fit(ctx, `maimai でらっくす ${versionName(latestVersion)}${player.name ? "  ·  " + player.name : ""}`, 700), PAD, 42);
ctx.fillStyle = C.fg;
ctx.font = f(800, 52);
ctx.fillText(fit(ctx, title, 760), PAD, 100);
ctx.font = f(500, 15);
ctx.fillStyle = C.muted;
ctx.fillText(fit(ctx, subtitle, 760), PAD, 132);
const boxW = 220, boxGap = 10;
stats.forEach(([label, value, note], i) => {
const bx = W - PAD - (stats.length - i) * (boxW + boxGap) + boxGap;
rrect(ctx, bx, 26, boxW, 112, 10);
ctx.fillStyle = C.card;
ctx.fill();
ctx.fillStyle = C.muted;
ctx.font = f(700, 14);
ctx.fillText(label, bx + 14, 52);
ctx.fillStyle = C.fg;
ctx.font = f(800, 30);
ctx.fillText(fit(ctx, value, boxW - 28), bx + 14, 92);
ctx.fillStyle = C.muted;
ctx.font = f(500, 13);
ctx.fillText(fit(ctx, note, boxW - 28), bx + 14, 122);
});
let y = HEAD;
for (const sec of sections) {
ctx.fillStyle = C.line;
ctx.fillRect(PAD, y + 6, W - PAD * 2, 1);
ctx.fillStyle = C.fg;
ctx.font = f(800, 20);
ctx.fillText(sec.name, PAD, y + 34);
if (sec.note) {
const nw = ctx.measureText(sec.name).width;
ctx.font = f(500, 15);
ctx.fillStyle = C.muted;
ctx.fillText(sec.note, PAD + nw + 14, y + 34);
}
y += SEC;
if (!sec.rows.length) {
ctx.font = f(500, 15);
ctx.fillStyle = C.muted;
ctx.fillText("没有符合条件的谱面", PAD, y + 40);
}
sec.rows.forEach((s, i) => {
drawCard(ctx, s, sec.label(s, i), PAD + (i % COLS) * (CW + GAP), y + Math.floor(i / COLS) * (CH + GAP), jackets.get(s));
});
y += rowsOf(sec.rows.length) * (CH + GAP);
}
ctx.font = f(500, 13);
ctx.fillStyle = C.muted;
ctx.fillText(fit(ctx,
`${new Date().toLocaleString("ja-JP")}  ·  成绩：maimai DX NET  ·  定数・曲绘：otoge-db（定数为 ".?" 的还未公开）  ·  AP/AP+ 单曲 rating +1`,
W - PAD * 2), PAD, H - 16);
try {
const blob = await new Promise((resolve, reject) => {
try {
cv.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
} catch (e) {
reject(e);
}
});
cv.width = cv.height = 0; // 立即释放 canvas 内存（iOS 有总量上限）
return { blob, url: URL.createObjectURL(blob) };
} catch (e) {
if (jackets.size) {
for (const k of jacketCache.keys()) jacketCache.set(k, Promise.resolve(null));
return drawImage(title, subtitle, stats, sections);
}
throw e;
}
}
const stamp = new Date().toISOString().slice(0, 10);
const countBy = (arr, k, v) => arr.filter((s) => s[k] === v).length;
const b50Image = () => {
const calc = ratingInfo.total;
const diff = player.rating ? calc - player.rating : 0;
return drawImage(
`DX Rating ${player.rating || calc}`,
player.rating
? `游戏内 Rating（maimai DX NET）· 按定数计算 ${calc}${diff === 0 ? "（一致）" : `（差 ${diff > 0 ? "+" : ""}${diff}）`}`
: `新曲枠 ${ratingInfo.new15} + 旧曲枠 ${ratingInfo.old35}（按定数计算）`,
[
["新曲枠", `${ratingInfo.new15}`, `${new15.length}曲 · 平均 ${avg(new15, "rating").toFixed(1)} · 最低 ${new15.length ? new15[new15.length - 1].rating : "—"}`],
["旧曲枠", `${ratingInfo.old35}`, `${old35.length}曲 · 平均 ${avg(old35, "rating").toFixed(1)} · 最低 ${old35.length ? old35[old35.length - 1].rating : "—"}`],
["平均达成率", `${avg(b50, "achievement").toFixed(4)}%`, `SSS+ ${countBy(b50, "rank", "SSS+")} · SSS ${countBy(b50, "rank", "SSS")} · SS+ ${countBy(b50, "rank", "SS+")}`],
],
[
{ name: "新曲枠", note: `${versionName(latestVersion)} · 合计 ${ratingInfo.new15}`, rows: new15, label: (s, i) => `#${i + 1}` },
{ name: "旧曲枠", note: `合计 ${ratingInfo.old35}`, rows: old35, label: (s, i) => `#${i + 1}` },
]
);
};
const csvCell = (s) => (/[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s));
const toCsv = (rows, keys = Object.keys(rows[0])) =>
"﻿" + [keys, ...rows.map((r) => keys.map((k) => r[k] ?? ""))]
.map((r) => r.map(csvCell).join(",")).join("\r\n");
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const saveFile = async (name, blob) => {
const file = new File([blob], name, { type: blob.type });
if (navigator.canShare?.({ files: [file] })) {
try {
await navigator.share({ files: [file] });
return;
} catch (e) {
if (e.name === "AbortError") return; // 用户取消
}
}
const url = URL.createObjectURL(blob);
if (isIOS) {
window.open(url, "_blank") || (location.href = url);
return;
}
const a = document.createElement("a");
a.href = url;
a.download = name;
document.body.appendChild(a);
a.click();
a.remove();
};
const download = (name, text, type) => saveFile(name, new Blob([text], { type }));
const songKeys = ["frame", "difficulty", "kind", "const", "title", "genre", "version", "achievement", "rank", "fc", "sync", "dx_score", "dx_max", "dx_star", "rating", "const_unknown"];
const compactKeys = ["frame", "difficulty", "const", "title", "achievement", "fc", "rating"];
const exportRows = (rows) => rows.map((s) => ({ ...s, achievement: s.played ? s.achievement.toFixed(4) : "", const: constText(s) }));
let shownRows = [];
let tab = "b50";
panel.innerHTML = "";
panel.style.background = "#f4f3f8";
const bar = document.createElement("div");
bar.style.cssText = "position:sticky;top:0;z-index:1;background:#f4f3f8;padding:4px 0 8px;display:flex;flex-wrap:wrap;gap:6px";
const mkBtn = (label, fn, parent = bar) => {
const b = document.createElement("button");
b.textContent = label;
b.style.cssText = "padding:9px 12px;font-size:15px;border:1px solid #cfcbdb;border-radius:8px;background:#fff;color:#222";
b.onclick = fn;
parent.appendChild(b);
return b;
};
const tabs = {};
for (const [k, label] of [["b50", "B50 图"], ["filter", "查分图"], ["table", "表格"]]) {
tabs[k] = mkBtn(label, () => { tab = k; page = 0; render(); });
}
mkBtn("关闭", () => panel.remove());
panel.appendChild(bar);
const filters = document.createElement("div");
filters.style.cssText = "display:none;flex-wrap:wrap;gap:8px 14px;padding:10px;background:#fff;border-radius:10px;margin-bottom:8px";
panel.appendChild(filters);
const $ = (id) => filters.querySelector("#" + id);
const PREF_KEY = "mai-score-filters";
const sel = (id, opts) => `<select id="${id}" style="font-size:16px;padding:4px;max-width:100%">${opts}</select>`;
const group = (label, html) => `<label style="display:inline-flex;align-items:center;gap:4px;white-space:nowrap">${label} ${html}</label>`;
function buildFilters() {
const verOpts = versionNames.slice(0, latestVersion + 1).map((n, v) => [v, versionName(v)]).reverse();
filters.innerHTML = [
group("难度", sel("mc-diff", `<option value="">全部</option>${DIFFS.map((d) => `<option>${d.name}</option>`).join("")}`)),
group("版本", sel("mc-ver", `<option value="">全部</option>${verOpts.map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join("")}`)),
group("定数", `<input id="mc-min" type="text" inputmode="decimal" placeholder="下限" style="width:64px;padding:4px;font-size:16px"> 〜 <input id="mc-max" type="text" inputmode="decimal" placeholder="上限" style="width:64px;padding:4px;font-size:16px">`),
group("种类", sel("mc-kind", `<option value="">全部</option><option>DX</option><option>STD</option>`)),
group("曲目", sel("mc-played", `<option value="played">只看已游玩</option><option value="all">全部（含未游玩）</option><option value="unplayed">只看未游玩</option>`)),
group("排序", sel("mc-sort", `<option value="rating">单曲rating</option><option value="const">定数</option><option value="ach">达成率</option><option value="dx">DX分比例</option><option value="title">曲名</option>`)),
].join("");
try {
const saved = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
for (const [id, v] of Object.entries(saved)) if ($(id)) $(id).value = v;
} catch (e) {}
if (!$("mc-played").value) $("mc-played").value = "played";
if (!$("mc-sort").value) $("mc-sort").value = "rating";
}
const savePrefs = () => {
try {
localStorage.setItem(PREF_KEY, JSON.stringify(Object.fromEntries([...filters.querySelectorAll("select,input")].map((el) => [el.id, el.value]))));
} catch (e) {}
};
const view = document.createElement("div");
panel.appendChild(view);
const more = document.createElement("details");
more.style.cssText = "margin-top:12px;background:#fff;border-radius:10px;padding:10px";
more.innerHTML = "<summary><b>下载 / 调试信息</b></summary>";
const moreBtns = document.createElement("div");
moreBtns.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin:8px 0";
more.appendChild(moreBtns);
mkBtn("B50 CSV", () => download(`maimai_b50_${stamp}.csv`, toCsv(exportRows(b50), songKeys), "text/csv"), moreBtns);
mkBtn("当前筛选 CSV", () => shownRows.length && download(`maimai_filtered_${stamp}.csv`, toCsv(exportRows(shownRows), songKeys), "text/csv"), moreBtns);
mkBtn("JSON", () => download(`maimai_scores_${stamp}.json`, JSON.stringify({ exported_at: new Date().toISOString(), player, rating: ratingInfo, b50: b50.map(({ diffKey, otoge_version, ...s }) => s), songs: (charts || []).map(({ diffKey, otoge_version, ...s }) => s) }, null, 1), "application/json"), moreBtns);
mkBtn("调试信息", async () => {
const info = JSON.stringify({
ua: navigator.userAgent,
b50Source,
targetHeaders: target.headers,
targetCounts: { new: target.new.length, old: target.old.length, unknown: target.none?.length, skipped: target.skip?.length, guessed: !!target.guessed },
charts: charts ? DIFFS.map((d) => `${d.name}:${charts.filter((s) => s.difficulty === d.name).length}`).join(" ") : "未读取",
rating: ratingInfo,
player,
latestVersion: `${latestVersion} ${versionName(latestVersion)}`,
unknownConst: (charts || b50).filter((s) => s.played && s.const_unknown).map((s) => `${s.difficulty} [${s.kind}] ${s.title} (${s.const_unknown})`).slice(0, 100),
matchLog,
diagnostics,
sampleHtml: sampleHtml.replace(/\s+/g, " ").slice(0, 3000),
}, null, 1);
let box = more.querySelector("textarea");
if (!box) {
box = document.createElement("textarea");
box.readOnly = true;
box.style.cssText = "width:100%;height:200px;font:11px monospace;box-sizing:border-box;margin:6px 0";
moreBtns.after(box);
}
box.value = info;
try {
await navigator.clipboard.writeText(info);
alert("调试信息已复制，粘贴发给开发者即可。");
} catch (e) {
box.focus();
box.select();
}
}, moreBtns);
panel.appendChild(more);
const table = (rows, keys) =>
`<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;background:#fff"><table style="border-collapse:collapse;white-space:nowrap">` +
`<tr>${keys.map((k) => `<th style="border:1px solid #ccc;padding:2px 6px;background:#eee">${esc(k)}</th>`).join("")}</tr>` +
rows.map((r) => `<tr${r.frame ? ' style="background:#fff4d6"' : ""}>${keys.map((k) => {
let v = r[k];
if (v === true) v = "✓";
else if (v === false || v == null) v = "";
else if (k === "achievement" && typeof v === "number") v = r.played ? v.toFixed(4) + "%" : "";
else if (k === "const") v = constText(r);
else if ((k === "rating" || k === "dx_score" || k === "dx_star") && !r.played) v = "";
return `<td style="border:1px solid #ccc;padding:2px 6px">${esc(v)}</td>`;
}).join("")}</tr>`).join("") +
`</table></div>`;
const showImage = ({ url, blob }, name, pager) => {
view.innerHTML = "";
const tip = document.createElement("div");
tip.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px;color:#555";
if (pager) tip.appendChild(pager);
mkBtn("保存图片", () => saveFile(name, blob), tip);
tip.append(isIOS ? "点「保存图片」→「存储图像」，或长按图片保存" : "也可以长按 / 右键图片保存");
const img = new Image();
img.src = url;
img.alt = name;
img.style.cssText = "width:100%;height:auto;display:block;border-radius:8px;-webkit-touch-callout:default;-webkit-user-select:auto;user-select:auto;pointer-events:auto";
view.append(tip, img);
};
let timer = null;
let renderSeq = 0;
let page = 0;
let loading = null;
const parseNum = (v) => parseFloat(norm(v).replace(",", "."));
async function filterRows() {
const diff = $("mc-diff").value;
const ver = $("mc-ver").value === "" ? null : +$("mc-ver").value;
const min = parseNum($("mc-min").value);
const max = parseNum($("mc-max").value);
const kind = $("mc-kind").value;
const played = $("mc-played").value;
if (ver != null && !membership.has(ver)) {
view.innerHTML = `<div style="padding:24px 0;color:#555">正在读取 ${esc(versionName(ver))} 的曲目 …</div>`;
await loadVersion(ver);
}
const sorters = {
rating: (a, b) => b.rating - a.rating || (b.const || 0) - (a.const || 0),
const: (a, b) => (b.const || 0) - (a.const || 0) || b.achievement - a.achievement,
ach: (a, b) => b.achievement - a.achievement || (b.const || 0) - (a.const || 0),
dx: (a, b) => b.dx_ratio - a.dx_ratio || b.dx_score - a.dx_score,
title: (a, b) => a.title.localeCompare(b.title, "ja") || DIFFS.findIndex((d) => d.name === a.difficulty) - DIFFS.findIndex((d) => d.name === b.difficulty),
};
shownRows = charts
.filter((s) =>
(!diff || s.difficulty === diff) &&
(ver == null || s.version_idx === ver) &&
(isNaN(min) || (s.const != null && s.const >= min - 1e-9)) &&
(isNaN(max) || (s.const != null && s.const <= max + 1e-9)) &&
(!kind || s.kind === kind) &&
(played === "all" || (played === "played") === s.played))
.sort(sorters[$("mc-sort").value]);
const desc = [];
if (diff) desc.push(diff);
if (ver != null) desc.push(versionName(ver));
if (!isNaN(min) || !isNaN(max)) desc.push(`定数 ${isNaN(min) ? "" : min.toFixed(1)}〜${isNaN(max) ? "" : max.toFixed(1)}`);
if (kind) desc.push(kind);
desc.push($("mc-played").selectedOptions[0].text);
return desc;
}
async function render() {
const seq = ++renderSeq;
for (const [k, b] of Object.entries(tabs)) {
b.style.background = k === tab ? "#d1127a" : "#fff";
b.style.color = k === tab ? "#fff" : "#222";
}
if (tab === "b50") {
filters.style.display = "none";
view.innerHTML = '<div style="padding:24px 0;color:#555">正在生成图片（加载曲绘中）…</div>';
b50Cache = b50Cache || (await b50Image());
if (seq === renderSeq) showImage(b50Cache, `maimai_b50_${stamp}.png`);
return;
}
if (!charts) {
filters.style.display = "none";
if (!loading) {
view.innerHTML = '<div style="padding:12px 0;color:#555">第一次查分需要读取 EXPERT / MASTER / Re:MASTER 的全曲成绩，大约 10 秒 …</div>';
logTarget = view;
loading = loadAllCharts().then((ok) => {
logTarget = panel;
if (ok) buildFilters();
else {
log("没有取到全曲成绩。可能是处于维护时间（4:00–7:00）、当前账号无法查看成绩页，或页面结构不同。");
showDiagnostics(view);
}
return ok;
});
}
if (!(await loading) || seq !== renderSeq) return;
}
if (!$("mc-diff")) buildFilters(); // 退回全曲计算 B50 时，全曲成绩启动时就读好了
filters.style.display = "flex";
const desc = await filterRows();
if (seq !== renderSeq) return;
const playedRows = shownRows.filter((s) => s.played);
if (tab === "table") {
view.innerHTML =
`<div style="margin:4px 0 6px"><b>${shownRows.length} 条</b>（已游玩 ${playedRows.length}，平均达成率 ${avg(playedRows, "achievement").toFixed(4)}%）· 黄色 = 计入 B50</div>` +
table(shownRows, innerWidth >= 768 ? songKeys : compactKeys);
return;
}
const pages = Math.max(1, Math.ceil(shownRows.length / IMG.PER_IMAGE));
page = Math.min(page, pages - 1);
const rows = shownRows.slice(page * IMG.PER_IMAGE, (page + 1) * IMG.PER_IMAGE);
view.innerHTML = '<div style="padding:24px 0;color:#555">正在生成图片（加载曲绘中）…</div>';
const cnt = (k, re) => playedRows.filter((s) => re.test(s[k])).length;
const img = await drawImage(
`${playedRows.length} / ${shownRows.length} 谱面`,
`${desc.join(" · ")} · 排序：${$("mc-sort").selectedOptions[0].text}${pages > 1 ? ` · 第 ${page + 1}/${pages} 张` : ""}`,
[
["已游玩", `${playedRows.length}`, shownRows.length ? `${((playedRows.length / shownRows.length) * 100).toFixed(1)}% · 平均 rating ${avg(playedRows, "rating").toFixed(1)}` : "—"],
["平均达成率", `${avg(playedRows, "achievement").toFixed(4)}%`, `SSS+ ${cnt("rank", /^SSS\+$/)} · SSS ${cnt("rank", /^SSS$/)} · SS+ ${cnt("rank", /^SS\+$/)}`],
["AP / FC", `${cnt("fc", /^AP/)} / ${cnt("fc", /^FC/)}`, `AP+ ${cnt("fc", /^AP\+$/)} · FC+ ${cnt("fc", /^FC\+$/)} · FDX ${cnt("sync", /^FDX/)}`],
["DX 分 ✦5", `${playedRows.filter((s) => s.dx_star >= 5).length}`, `✦4 ${playedRows.filter((s) => s.dx_star === 4).length} · ✦3 ${playedRows.filter((s) => s.dx_star === 3).length}`],
],
[{ name: "查分结果", note: pages > 1 ? `第 ${page + 1}/${pages} 张（${page * IMG.PER_IMAGE + 1}〜${page * IMG.PER_IMAGE + rows.length}）` : "", rows, label: (s, i) => `${page * IMG.PER_IMAGE + i + 1}` }]
);
if (seq !== renderSeq) return; // 期间又切换了标签/筛选条件时，丢弃旧结果
let pager = null;
if (pages > 1) {
pager = document.createElement("span");
pager.style.cssText = "display:inline-flex;align-items:center;gap:6px";
mkBtn("‹ 上一张", () => { if (page > 0) { page--; render(); } }, pager).disabled = page === 0;
pager.append(`${page + 1} / ${pages}`);
mkBtn("下一张 ›", () => { if (page < pages - 1) { page++; render(); } }, pager).disabled = page === pages - 1;
}
showImage(img, `maimai_${stamp}_${page + 1}.png`, pager);
}
const rerender = () => {
clearTimeout(timer);
savePrefs();
page = 0;
timer = setTimeout(render, 400);
};
filters.addEventListener("input", rerender);
filters.addEventListener("change", rerender);
render();
})().catch((e) => alert("出错了：" + e));
