(async () => {
const TEST = window.__MAI_TEST__;
if (!TEST && !["maimaidx.jp", "maimaidx-eng.com"].includes(location.hostname)) {
alert("请在登录后的 maimai DX NET（maimaidx.jp）页面上执行。");
return;
}
const NET = location.origin + "/maimai-mobile";
const CONST_URLS = [
"https://131a562.github.io/sbga-tool/data/feed/maimai-music-ex.json",
"https://otoge-db.net/maimai/data/music-ex.json",
];
const JACKET_URL = "https://otoge-db.net/maimai/jacket/";
const SYNC_URL_RAW = "https://otoge-sync.131a562-index01.workers.dev"; // build.js 替换为 config.json 的 syncUrl（历史记录云端同步）
const SYNC_URL = TEST ? TEST.syncUrl || "" : /^https?:\/\//.test(SYNC_URL_RAW) ? SYNC_URL_RAW : "";
const DASH_SRC = (TEST && TEST.dashSrc) || "https://131a562.github.io/sbga-dashboard/src/";
const sharedLoading = Promise.all(["draw-maimai.js", "sync.js"].map((f) => import(`${DASH_SRC}${f}?t=${Date.now()}`))).catch((e) => e);
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
const constText = (s) => {
const p = constParts(s);
return p ? p.int + (p.plus ? "+" : "") + p.dec : "";
};
function rowScope(el) {
const parent = el.parentElement;
if (parent && parent.querySelectorAll("[class*=_score_back]").length === 1) return { id: parent.id || el.id, nodes: [parent] };
const nodes = [el];
for (let n = el.nextElementSibling; n && !/_score_back/.test(String(n.className)) && !n.querySelector("[class*=_score_back]"); n = n.nextElementSibling) nodes.push(n);
return { id: el.id, nodes };
}
const within = (nodes, sel) => nodes.flatMap((n) => (n.matches(sel) ? [n] : []).concat([...n.querySelectorAll(sel)]));
function parseRow(el, genre) {
const cls = (String(el.className).match(/music_([a-z]+)_score_back/) || [])[1];
const diff = ALL_DIFFS.find((d) => d.cls === cls);
if (!diff) return null; // 宴谱面等
const title = norm(el.querySelector(".music_name_block")?.textContent);
if (!title) return null;
const { id = "", nodes } = rowScope(el);
const idx = within(nodes, "input[name=idx]")[0]?.value || "";
const imgs = within(nodes, "img").map((i) => i.getAttribute("src") || "");
let kind = "";
if (/^(sta|dx)_/i.test(id)) kind = /^sta/i.test(id) ? "STD" : "DX";
else {
const icon = imgs.find((src) => /music_(standard|dx)\.png/.test(src));
if (icon) kind = /standard/.test(icon) ? "STD" : "DX";
}
const jacket = (imgs.join(" ").match(/img\/Music\/([0-9a-z]+\.png)/i) || [])[1] || "";
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
if (!sampleHtml && played) sampleHtml = nodes.map((n) => n.outerHTML).join("");
return {
idx,
difficulty: diff.name,
diffShort: diff.short,
diffKey: diff.key,
title,
kind,
genre,
jacket,
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
const chartKeys = (s) => [s.idx && `id:${s.idx}|${s.difficulty}`, `${keyOf(s)}|${s.difficulty}`].filter(Boolean);
const songSet = (list) => ({ ids: new Set(list.map((s) => s.idx).filter(Boolean)), names: new Set(list.map(keyOf)) });
const inSet = (set, s) => (s.idx && set.ids.size ? set.ids.has(s.idx) : set.names.has(keyOf(s)));
const idStats = { b50WithId: 0, joinedById: 0, joinedByName: 0, notJoined: 0 }; // 调试用
log("正在读取谱面定数表 ...");
let constData = [];
for (const [i, url] of CONST_URLS.entries()) {
try {
const r = await fetch(url);
if (!r.ok) throw new Error("HTTP " + r.status);
const j = await r.json();
if (!Array.isArray(j) || j.length < 100) throw new Error("内容不对");
constData = j;
log(`✓ 定数表：${constData.length} 首${i ? "（SBGA TOOL 读不到，用的是 otoge-db）" : ""}`);
break;
} catch (e) {
if (i === CONST_URLS.length - 1) log(`× 定数表读取失败（${e}），将按等级估算定数，且不显示曲绘。`);
}
}
const titleIndex = new Map(); // 曲名 → [{ m, pre, kind }]
const jacketIndex = new Map(); // 曲绘文件名 → [{ m, pre, kind }]
const push = (map, k, v) => (map.has(k) ? map.get(k).push(v) : map.set(k, [v]));
for (const m of constData) {
if (m.catcode === "宴会場" || m.lev_utage) continue;
for (const [kind, pre] of [["STD", ""], ["DX", "dx_"]]) {
if (!m[pre + "lev_bas"] && !m[pre + "lev_mas"]) continue;
push(titleIndex, norm(m.title), { m, pre, kind });
if (m.image_url) push(jacketIndex, m.image_url, { m, pre, kind });
}
}
const matchLog = []; // 调试用：同名 / 找不到 / 改了种类的曲目
function findMeta(s) {
let c = (s.jacket && jacketIndex.get(s.jacket)) || titleIndex.get(norm(s.title)) || [];
if (c.length > 1) {
const d = c.filter(({ m, pre }) => m[`${pre}lev_${s.diffKey}`]);
if (d.length) c = d;
}
if (c.length > 1 && s.kind) {
const k = c.filter((x) => x.kind === s.kind);
if (k.length) c = k;
}
if (c.length > 1 && s.genre) {
const g = c.filter(({ m }) => norm(m.catcode) === s.genre);
if (g.length) c = g;
}
if (c.length > 1) {
const l = c.filter(({ m, pre }) => norm(m[`${pre}lev_${s.diffKey}`]) === s.level);
if (l.length) c = l;
}
if ((c.length !== 1 || (s.kind && c[0].kind !== s.kind)) && matchLog.length < 200) {
matchLog.push(`${s.difficulty} [${s.kind || "种类未知"}] ${s.title} (${s.genre}) → ${c.length ? (c.length > 1 ? c.length + " 个候选" : "按定数表改为 " + c[0].kind) : "定数表里没有"}`);
}
if (c[0]) s.kind = c[0].kind;
s.kind = s.kind || "DX";
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
s.img = m?.image_url || s.jacket || "";
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
log(`✓ BEST35 ${old35.length} 首 · NEW15 ${new15.length} 首${target.guessed ? "（没认出页面上的标题，按顺序划分）" : ""}`);
}
let charts = null;
let findChart = () => [null, ""]; // B50 的谱面 → 全曲成绩里的同一谱面（读完全曲成绩后才可用）
let latestVersion = Math.max(versionNames.length - 1, ...constData.map((m) => versionIndexOf(m.version)));
const newVersions = () => (latestVersion >= 25 ? [latestVersion, latestVersion - 1] : [latestVersion]);
const membership = new Map(); // 版本序号 → songSet（曲目 ID + 曲名|STD/DX）
async function loadVersion(v) {
if (membership.has(v)) return membership.get(v);
let set = songSet([]);
try {
const page = await getDoc(`${NET}/record/musicVersion/search/?version=${v}&diff=3`);
set = songSet(parseList(page.doc));
if (!set.names.size) diagnostics.push(`[version=${v}] ${diagnose(page)}`);
} catch (e) {
diagnostics.push(`[version=${v}] ${e}`);
}
membership.set(v, set);
applyVersions();
return set;
}
function applyVersions() {
if (!charts) return;
for (const s of charts) {
let v = s.otoge_version;
for (const [ver, set] of membership) if (set.names.size && inSet(set, s)) v = ver;
s.version_idx = v;
s.version = versionName(v);
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
const byKey = new Map();
for (const s of charts) for (const k of chartKeys(s)) if (!byKey.has(k)) byKey.set(k, s);
findChart = (s) => {
const [first, second] = chartKeys(s);
const byId = s.idx && byKey.get(first);
if (byId) return [byId, "id"];
const byName = byKey.get(second || first) ||
charts.find((x) => x.difficulty === s.difficulty && norm(x.title) === norm(s.title) && Math.abs(x.achievement - s.achievement) < 1e-6);
return [byName, byName ? "name" : ""];
};
for (const s of charts) s.frame = "";
for (const s of new15.concat(old35)) {
const [c] = findChart(s);
if (c) c.frame = s.frame;
}
applyVersions();
if (b50.length && b50Source === "rating 对象曲页面") {
Object.assign(idStats, { b50WithId: b50.filter((s) => s.idx).length, joinedById: 0, joinedByName: 0, notJoined: 0 });
for (const s of b50) {
const [c, how] = findChart(s);
if (!c || Math.abs(c.achievement - s.achievement) > 1e-6) {
idStats.notJoined++;
continue;
}
idStats[how === "id" ? "joinedById" : "joinedByName"]++;
Object.assign(s, { kind: c.kind, genre: c.genre, fc: s.fc || c.fc, sync: s.sync || c.sync, dx_score: s.dx_score || c.dx_score, dx_max: s.dx_max || c.dx_max });
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
const vs = newVersions();
log(`正在读取新曲范围（${vs.map(versionName).join(" / ")}）的曲目 ...`);
const sets = [];
for (const v of vs) {
sets.push(await loadVersion(v));
await sleep(1000);
}
const official = sets.some((set) => set.names.size);
const isNew = (s) => (official ? sets.some((set) => inSet(set, s)) : vs.includes(s.otoge_version));
const byRating = (a, b) => b.rating - a.rating || b.achievement - a.achievement;
const rated = charts.filter((s) => s.rating > 0);
new15 = rated.filter(isNew).sort(byRating).slice(0, 15);
old35 = rated.filter((s) => !isNew(s)).sort(byRating).slice(0, 35);
b50Source = "全曲成绩计算（EXPERT 以上）";
}
new15.forEach((s, i) => (s.frame = `N${i + 1}`));
old35.forEach((s, i) => (s.frame = `B${i + 1}`));
b50 = new15.concat(old35);
ratingInfo.new15 = sum(new15, "rating");
ratingInfo.old35 = sum(old35, "rating");
ratingInfo.total = ratingInfo.new15 + ratingInfo.old35;
if (b50Source === "rating 对象曲页面" && b50.length && b50.every((s) => !s.dx_max && !s.fc)) {
log("对象曲页面上没有 FC/AP、DX 分，读取成绩列表补上 ...");
if (!(await loadAllCharts())) log("× 没有读到成绩列表，B50 图不显示 FC/AP、DX 分");
}
const shared = await sharedLoading;
if (shared instanceof Error) {
log(`× 读不到 SBGA DASHBOARD 的 draw-maimai.js / sync.js：${shared.message}`);
return;
}
const [draw, syncLib] = shared;
const { C, f, rrect, fit, constParts, pill, constPill, drawStars } = draw;
const PER_IMAGE = 150; // 查分图每张最多几首，多了拆成几张
const jacketCache = new Map();
const jacketFails = new Set(); // 调试用：两个地址都没加载成功的曲绘
const loadImg = (src, cors) => new Promise((resolve) => {
const img = new Image();
if (cors) img.crossOrigin = "anonymous";
const t = setTimeout(() => resolve(null), 15000);
img.onload = () => { clearTimeout(t); resolve(img); };
img.onerror = () => { clearTimeout(t); resolve(null); };
img.src = src;
});
function loadJacket(id) {
if (!id) return Promise.resolve(null);
if (!jacketCache.has(id)) {
jacketCache.set(id, loadImg(JACKET_URL + id, true)
.then((img) => img || (TEST ? null : loadImg(`${NET}/img/Music/${id}`, false)))
.then((img) => (img || jacketFails.add(id), img)));
}
return jacketCache.get(id);
}
async function drawImage(title, subtitle, stats, sections, profile) {
const jackets = new Map();
const queue = sections.flatMap((sec) => sec.rows);
await Promise.all(Array.from({ length: 6 }, async () => {
while (queue.length) {
const s = queue.shift();
jackets.set(s, await loadJacket(s.img));
}
}));
const cv = draw.drawImage({
head: `maimai でらっくす ${versionName(latestVersion)}${player.name ? "  ·  " + player.name : ""}`,
title, subtitle, stats, sections, jackets, profile,
footer: `${new Date().toLocaleString("ja-JP")}  ·  成绩：maimai DX NET  ·  定数・曲绘：otoge-db（定数为 ".?" 的还未公开）  ·  AP/AP+ 单曲 rating +1`,
});
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
if ([...jackets.values()].some(Boolean)) {
for (const k of jacketCache.keys()) jacketCache.set(k, Promise.resolve(null));
return drawImage(title, subtitle, stats, sections, profile);
}
throw e;
}
}
const stamp = new Date().toISOString().slice(0, 10);
const maxMin = (arr) => {
const r = arr.map((s) => s.rating);
return r.length ? `最高 ${Math.max(...r)} · 最低 ${Math.min(...r)}` : "—";
};
const b50Image = () => {
const calc = ratingInfo.total;
const diff = player.rating ? calc - player.rating : 0;
const subtitle = player.rating
? `游戏内 Rating（maimai DX NET）· 按定数计算 ${calc}${diff === 0 ? "（一致）" : `（差 ${diff > 0 ? "+" : ""}${diff}）`}`
: `BEST35 ${ratingInfo.old35} + NEW15 ${ratingInfo.new15}（按定数计算）`;
return drawImage(
`DX Rating ${player.rating || calc}`,
subtitle,
[
["BEST35", `${ratingInfo.old35}`, `${old35.length}曲 · ${maxMin(old35)}`],
["NEW15", `${ratingInfo.new15}`, `${new15.length}曲 · ${maxMin(new15)}`],
],
[
{ name: "BEST35", note: `${old35.length}曲 · 合计 ${ratingInfo.old35} · ${maxMin(old35)}`, rows: old35, label: (s) => s.frame },
{ name: "NEW15", note: `${newVersions().map(versionName).join(" / ")} · ${new15.length}曲 · 合计 ${ratingInfo.new15} · ${maxMin(new15)}`, rows: new15, label: (s) => s.frame },
],
{
kicker: `maimai でらっくす ${versionName(latestVersion)}  ·  DX RATING  BEST 50`,
name: player.name || "", rating: `${player.rating || calc}`, ratingLabel: "DX RATING",
stats: [["BEST35", `${ratingInfo.old35}`], ["NEW15", `${ratingInfo.new15}`, C.plat]],
note: subtitle,
}
);
};
if (!charts) {
log("正在读取全曲成绩（历史记录用）...");
await loadAllCharts();
}
const allCharts = charts || [];
const pad2 = (n) => String(n).padStart(2, "0");
const nowStr = () => {
const d = new Date();
return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const normTime = (s) => {
const m = (s || "").match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
return m ? `${m[1]}/${pad2(m[2])}/${pad2(m[3])} ${pad2(m[4])}:${m[5]}` : null;
};
const timeMs = (t) => {
const m = t.match(/(\d+)\/(\d+)\/(\d+) (\d+):(\d+)/);
return new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]).getTime();
};
const byTime = (a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0);
const nameKeyOf = (title, kind, diff) => `${norm(title)}|${kind}|${diff}`;
const HIST_V = 2;
const emptyHist = () => ({ v: HIST_V, game: "maimai", name: "", since: "", resetAt: "", obs: [], snaps: [] });
const playId = (o) => `${o.t}|${norm(o.n)}|${o.d}|${o.a}`;
const obsId = (o) => (o.src === "p" ? "p|" + playId(o) : [o.t, o.k, o.a, o.fc, o.sy, o.x, o.src].join("|"));
const FC_RANK = { "": 0, FC: 1, "FC+": 2, AP: 3, "AP+": 4 };
const SYNC_RANK = { "": 0, SYNC: 1, FS: 2, "FS+": 3, FDX: 4, "FDX+": 5 };
const chartsByName = new Map(); // 曲名|DX/STD|难度 → [谱面]
for (const s of allCharts) {
const k = nameKeyOf(s.title, s.kind, s.difficulty);
chartsByName.set(k, (chartsByName.get(k) || []).concat(s));
}
const stableKey = (nk, j) => (chartsByName.get(nk)?.length > 1 && j ? `${nk}|${j}` : nk);
const histKeyOf = (s) => stableKey(nameKeyOf(s.title, s.kind, s.difficulty), s.img);
const chartByK = new Map(allCharts.map((s) => [histKeyOf(s), s])); // 谱面键 → 现在的谱面
const chartByName = (nk, j) => {
let c = chartsByName.get(nk) || [];
if (c.length > 1 && j) c = c.filter((s) => s.img === j);
return c.length === 1 ? c[0] : null;
};
const byTitleDiff = new Map(), byJacketDiff = new Map();
for (const s of allCharts) {
const a = `${norm(s.title)}|${s.difficulty}`;
byTitleDiff.set(a, (byTitleDiff.get(a) || []).concat(s));
if (s.img) byJacketDiff.set(`${s.img}|${s.difficulty}`, (byJacketDiff.get(`${s.img}|${s.difficulty}`) || []).concat(s));
}
const narrow = (c, fn) => {
const f = c.filter(fn);
return f.length ? f : c;
};
const resolveChart = (o) => {
let c = byTitleDiff.get(`${norm(o.n)}|${o.d}`) || (o.j && byJacketDiff.get(`${o.j}|${o.d}`)) || [];
if (c.length > 1 && o.xm) c = narrow(c, (s) => s.dx_max === o.xm);
if (c.length > 1 && o.kd) c = narrow(c, (s) => s.kind === o.kd);
if (c.length > 1 && o.j) c = narrow(c, (s) => s.img === o.j);
return c.length === 1 ? c[0] : null;
};
const playMiss = []; // 调试用：对应不到谱面的游玩
const canonCache = new Map();
const canon = (o) => {
const ck = `${o.n}|${o.kd}|${o.d}|${o.j || ""}|${o.xm || 0}|${o.nk}`;
if (!canonCache.has(ck)) {
const c = o.n ? resolveChart(o) : null;
canonCache.set(ck, c ? histKeyOf(c) : stableKey(o.nk, o.j));
}
return canonCache.get(ck);
};
const rowKey = (e) => stableKey(nameKeyOf(e[1], e[6], e[5]), e[7]);
const b50Chart = (s) => findChart(s)[0] || s;
let playlogSample = ""; // 调试用：プレイ履歴第一条的原始 HTML
const PLAY_FC = { app: "AP+", applus: "AP+", ap: "AP", fcp: "FC+", fcplus: "FC+", fc: "FC" };
const PLAY_SYNC = { fsdp: "FDX+", fsdplus: "FDX+", fdxp: "FDX+", fdxplus: "FDX+", fsd: "FDX", fdx: "FDX", fsp: "FS+", fsplus: "FS+", fs: "FS", sync: "SYNC", maxsync: "SYNC" };
function parsePlaylog(doc) {
const tops = [...doc.querySelectorAll(".playlog_top_container")];
return tops.map((top) => {
const parent = top.parentElement;
const nodes = parent && parent.querySelectorAll(".playlog_top_container").length === 1 ? [parent] : [top];
if (nodes[0] === top) for (let n = top.nextElementSibling; n && !n.querySelector(".playlog_top_container") && !n.classList.contains("playlog_top_container"); n = n.nextElementSibling) nodes.push(n);
if (!playlogSample) playlogSample = nodes.map((n) => n.outerHTML).join("").replace(/\s+/g, " ").slice(0, 3000);
const srcs = within(nodes, "img").map((i) => i.getAttribute("src") || "");
const text = nodes.map((n) => n.textContent).join(" ");
const t = normTime(text);
const dm = srcs.join(" ").match(/diff_(basic|advanced|expert|master|remaster)\.png/);
const diff = dm && ALL_DIFFS.find((d) => d.cls === dm[1]);
const nameEl = within(nodes, ".basic_block.break")[0];
const nameNode = nameEl && [...nameEl.childNodes].reverse().find((c) => c.nodeType === 3 && c.textContent.trim());
const n = norm(nameNode?.textContent);
const a = parseFloat((within(nodes, ".playlog_achievement_txt")[0]?.textContent || "").replace(/[^\d.]/g, ""));
if (!t || !n || !diff || !(a >= 0) || !DIFFS.includes(diff)) return null;
const badge = (map) => {
for (const src of srcs) {
const m = src.match(/playlog\/([a-z_]+)\.png/);
if (m && !/dummy/.test(m[1]) && map[m[1]]) return map[m[1]];
}
return "";
};
const kindSrc = srcs.find((src) => /music_(dx|standard)\.png/.test(src));
const j = (srcs.join(" ").match(/img\/Music\/([0-9a-z]+\.png)/i) || [])[1] || "";
const dx = (within(nodes, ".playlog_score_block")[0]?.textContent || "").match(/([\d,]+)\s*\/\s*([\d,]+)/);
const o = { t, k: "", nk: "", n, kd: kindSrc ? (/standard/.test(kindSrc) ? "STD" : "DX") : "", d: diff.name, src: "p",
a: Math.round(a * 10000), fc: badge(PLAY_FC), sy: badge(PLAY_SYNC), x: dx ? num(dx[1]) : 0, xm: dx ? num(dx[2]) : 0 };
if (j) o.j = j;
const c = resolveChart(o);
if (c) Object.assign(o, { kd: c.kind, j: c.img || o.j });
o.nk = nameKeyOf(n, o.kd, diff.name);
o.k = c ? histKeyOf(c) : o.nk;
if (!c && playMiss.length < 30) playMiss.push(`${t} ${diff.short} [${o.kd || "种类未知"}] ${n} DX满分=${o.xm} 曲绘=${j || "无"}`);
if (srcs.some((src) => /new_?record/i.test(src))) o.nr = 1;
Object.defineProperty(o, "pid", { value: within(nodes, "input[name=idx]")[0]?.value || "", enumerable: false });
return o;
}).filter(Boolean);
}
function parsePlaylogDetail(doc) {
const html = doc.body ? doc.body.innerHTML : "";
const out = {};
const r = num(doc.querySelector(".rating_block")?.textContent);
if (r > 0) {
out.r = r;
const i = html.indexOf("rating_block");
const m = html.slice(i, i + 800).replace(/<[^>]+>/g, " ").match(/\(\s*([+\-−]?\s*\d+)\s*\)/);
if (m) out.dr = parseInt(m[1].replace(/[−\s]/g, (c) => (c === "−" ? "-" : "")));
}
const ids = [...html.matchAll(/musicDetail\/\?idx=([^"&]+)/g)];
const jpos = html.search(/img\/Music\//);
const best = ids.sort((a, b) => Math.abs(a.index - jpos) - Math.abs(b.index - jpos))[0];
if (best) out.id = decodeURIComponent(best[1].replace(/&amp;/g, "&"));
if (!playlogDetailSample) playlogDetailSample = (html.slice(Math.max(0, html.indexOf("rating_block") - 600), html.indexOf("rating_block") + 600) || html.slice(0, 1200)).replace(/\s+/g, " ");
return out;
}
let playlogDetailSample = ""; // 调试用：游玩详情页 Rating 附近的原始 HTML
const blankState = () => ({ a: -1, fc: "", sy: "", x: 0, xm: 0 });
function absorb(state, o) {
const ch = [];
const next = { ...state };
const first = state.a < 0;
if (o.a > state.a) { if (!first) ch.push({ type: "ach", from: state.a, to: o.a }); next.a = o.a; }
if (FC_RANK[o.fc] > FC_RANK[state.fc]) { if (!first) ch.push({ type: "fc", from: state.fc, to: o.fc }); next.fc = o.fc; }
if (SYNC_RANK[o.sy] > SYNC_RANK[state.sy]) { if (!first) ch.push({ type: "sync", from: state.sy, to: o.sy }); next.sy = o.sy; }
if (o.x > state.x) {
next.x = o.x;
next.xm = o.xm || state.xm;
const s0 = dxStarOf(state.x, next.xm), s1 = dxStarOf(o.x, next.xm);
if (!first) ch.push(s1 > s0 ? { type: "star", from: s0, to: s1 } : { type: "dx", from: state.x, to: o.x });
}
return { next, ch };
}
const isPush = (c) => c.type !== "dx";
const isFirstPlay = (o, since) => !!since && (o.src === "p" || o.t > since);
function derive(hist) {
const state = {}, scanned = new Set(), fresh = new Set(), updates = [];
const since = hist.since || "";
hist.obs.slice().sort(byTime).forEach((o0) => {
const o = { ...o0, k: canon(o0) };
const before = state[o.k];
const known = scanned.has(o.k) || fresh.has(o.k);
if (o.src === "b") scanned.add(o.k);
if (!before) {
state[o.k] = absorb(blankState(), o).next;
const first = isFirstPlay(o, since);
if (first) fresh.add(o.k); // 第一次打之后，最佳是确定的
if (first || (o.src === "p" && o.nr)) {
const s1 = state[o.k];
const changes = [{ type: "ach", from: null, to: s1.a }];
if (s1.fc) changes.push({ type: "fc", from: "", to: s1.fc });
if (s1.sy && s1.sy !== "SYNC") changes.push({ type: "sync", from: "", to: s1.sy });
updates.push({ ...o, before: null, after: s1, changes });
}
return;
}
const { next, ch } = absorb(before, o);
state[o.k] = next;
if (!ch.some(isPush)) return;
if (known || (o.src === "p" && o.nr)) updates.push({ ...o, before, after: next, changes: ch });
});
return { state, updates };
}
function mergeHist(a, b) {
const out = emptyHist();
out.name = b.name || a.name;
out.resetAt = [a.resetAt || "", b.resetAt || ""].sort().pop();
const sinces = [a.since, b.since].filter(Boolean).sort();
out.since = [out.resetAt, sinces[0] || ""].sort().pop();
const seen = new Map();
[...a.obs, ...b.obs].forEach((o) => {
const id = obsId(o);
const prev = seen.get(id);
if (!prev) { seen.set(id, o); out.obs.push(o); }
else if (prev.r == null && o.r != null) Object.assign(prev, { r: o.r, dr: o.dr });
});
out.obs = out.obs.filter((o) => o.t >= out.since).sort(byTime);
const snaps = new Map();
[...a.snaps, ...b.snaps].forEach((s) => snaps.set(s.t, s));
out.snaps = [...snaps.values()].filter((s) => s.t >= out.since).sort(byTime);
return out;
}
const ratingOfState = (k, st) => {
const c = chartByK.get(k);
if (!c || !c.const || !st || st.a < 0) return null;
return calcRating(c.const, { played: true, achievement: st.a / 10000, fc: st.fc });
};
const sameSnap = (a, b) => a && b && a.r === b.r && a.c === b.c && JSON.stringify([a.best, a.news]) === JSON.stringify([b.best, b.news]);
function applyUpdate(hist, plays) {
const t = nowStr();
if (player.name) hist.name = player.name;
if (!hist.since) hist.since = t; // 起点：这次的成绩扫描和快照就是历史的开始
const first = new Map();
hist.obs = hist.obs.filter((o) => {
const prev = first.get(obsId(o));
if (!prev) { first.set(obsId(o), o); return true; }
if (prev.r == null && o.r != null) Object.assign(prev, { r: o.r, dr: o.dr });
return false;
});
const ids = new Set(hist.obs.map(obsId));
const playIds = new Set(hist.obs.filter((o) => o.src === "p").map(playId));
plays.forEach((o) => {
if (ids.has(obsId(o)) || playIds.has(playId(o))) return;
ids.add(obsId(o));
playIds.add(playId(o));
hist.obs.push(o);
});
const { state } = derive(hist);
for (const s of allCharts) {
if (!s.played) continue;
const o = { t, k: histKeyOf(s), nk: nameKeyOf(s.title, s.kind, s.difficulty), n: s.title, kd: s.kind, d: s.difficulty, src: "b",
a: Math.round(s.achievement * 10000), fc: s.fc || "", sy: s.sync || "", x: s.dx_score || 0, xm: s.dx_max || 0 };
if (s.img) o.j = s.img;
const old = state[o.k];
if (!old || absorb(old, o).ch.length) hist.obs.push(o);
}
hist.obs.sort(byTime);
const row = (s) => {
const c = b50Chart(s);
return [histKeyOf(c), s.title, Math.round(s.achievement * 10000), s.rating, s.fc || "", s.difficulty, c.kind, c.img || ""];
};
const snap = {
t,
r: player.rating || ratingInfo.total,
c: ratingInfo.total,
n15: Math.round(avg(new15, "rating") * 100) / 100,
b35: Math.round(avg(old35, "rating") * 100) / 100,
parts: [ratingInfo.new15, ratingInfo.old35],
best: old35.map(row),
news: new15.map(row),
};
const last = hist.snaps[hist.snaps.length - 1];
if (!(sameSnap(last, snap) && last.t.slice(0, 10) === t.slice(0, 10))) hist.snaps.push(snap);
return hist;
}
function accountImpact(hist, updates) {
const snaps = hist.snaps;
const out = new Map();
const rowRating = (e) => {
const r = ratingOfState(rowKey(e), { a: e[2], fc: e[4] });
return r != null ? r : e[3];
};
const fromSnap = (s) => ({ news: new Map(s.news.map((e) => [rowKey(e), rowRating(e)])), best: new Map(s.best.map((e) => [rowKey(e), rowRating(e)])) });
const sum = (st) => [...st.news.values(), ...st.best.values()].reduce((a, v) => a + v, 0);
const hasRows = (s) => !!s && !!(s.best?.length || s.news?.length);
const put = (m, k, v, cap, keep) => {
const was = m.has(k);
if (!was || v > m.get(k)) m.set(k, v);
if (m.size > cap) {
let low = null, lowV = Infinity;
m.forEach((x, kk) => { if (keep && kk === k) return; if (x < lowV || (x === lowV && kk === k)) { low = kk; lowV = x; } });
m.delete(low);
}
return { entered: !was && m.has(k), inFrame: m.has(k) };
};
const rated = (u) => u.changes.some((x) => x.type === "ach" || (x.type === "fc" && /^AP/.test(x.to)));
const groups = new Map();
updates.slice().sort(byTime).forEach((u) => {
let i = -1;
while (i + 1 < snaps.length && snaps[i + 1].t < u.t) i++;
if (i < 0 || !hasRows(snaps[i])) { out.set(u, { noSnap: true }); return; }
if (!groups.has(i)) groups.set(i, []);
groups.get(i).push(u);
});
groups.forEach((list, i) => {
const prev = snaps[i], next = hasRows(snaps[i + 1]) ? snaps[i + 1] : null;
const nextBest = next ? new Set(next.best.map(rowKey)) : null;
const nextNew = next ? new Set(next.news.map(rowKey)) : null;
const st = fromSnap(prev);
const s0 = sum(st);
const lastPush = new Map();
list.forEach((u) => { if (rated(u)) lastPush.set(u.k, u); });
const steps = []; // [{u, res, d}]  d = 50 首合计的变化
list.forEach((u) => {
const c = chartByK.get(u.k);
if (!c || !c.const) { steps.push({ u, res: { noConst: true }, d: 0 }); return; }
if (!rated(u)) { steps.push({ u, res: { noRating: true }, d: 0 }); return; }
const frame = nextBest && nextBest.has(u.k) ? "best" : nextNew && nextNew.has(u.k) ? "news"
: st.best.has(u.k) ? "best" : st.news.has(u.k) ? "news" : newVersions().includes(c.version_idx) ? "news" : "best";
const before = sum(st);
const res = { frame: frame === "best" ? "BEST35" : "NEW15" };
const inNext = next ? nextBest.has(u.k) || nextNew.has(u.k) : null;
if (inNext === false && !st[frame].has(u.k)) Object.assign(res, { entered: false, inFrame: false });
else Object.assign(res, put(st[frame], u.k, ratingOfState(u.k, u.after), frame === "best" ? 35 : 15, inNext === true && lastPush.get(u.k) === u));
steps.push({ u, res, d: sum(st) - before });
});
const total = steps.reduce((a, x) => a + x.d, 0);
const t0 = prev.r || s0; // 起点 = 前一个快照的游戏 Rating
const gap = next && next.r && prev.r ? next.r - (t0 + total) : 0;
let cur = t0;
steps.forEach((x, k) => {
x.res.ratingBefore = cur; // 这次推分前后的账号 Rating
cur += x.d;
if (x.res.frame) x.res.delta = x.d;
if (gap && k === steps.length - 1) x.res.gap = gap;
x.res.ratingAfter = cur + (k === steps.length - 1 ? gap : 0);
out.set(x.u, x.res);
});
});
return out;
}
const GOOD = "#7ee0a0";
function impactText(im) {
if (!im || im.noSnap) return ["之前没有快照，算不出账号 Rating 的变化", C.line];
const gap = im.gap ? ` · 另有 ${signedInt(im.gap)} 来自没记录到的变化` : "";
if (im.noConst) return ["定数未知，算不出账号 Rating 的变化" + gap, C.muted];
if (im.noRating) return ["只有标记 / DX 分提升 · 单曲 Rating 和账号 Rating 不变" + gap, C.muted];
const head = im.entered ? "进入 " + im.frame : im.inFrame ? im.frame + " 内提升" : "未进入 " + im.frame;
if (im.delta > 0) return [head + " · 账号 Rating +" + im.delta + gap, GOOD];
return [head + " · 账号 Rating 不变" + gap, C.muted];
}
const fmtAch = (a) => (a / 10000).toFixed(4) + "%";
const signedInt = (x) => (x > 0 ? "+" : x < 0 ? "−" : "±") + Math.abs(x);
function changeText(u) {
const parts = [];
for (const c of u.changes) {
if (c.type === "ach") parts.push(c.from != null ? `${fmtAch(c.from)} → ${fmtAch(c.to)}（+${((c.to - c.from) / 10000).toFixed(4)}%）` : `${fmtAch(c.to)}（首次）`);
else if (c.type === "fc" || c.type === "sync") parts.push(u.before ? `${c.from || "—"}→${c.to}` : c.to);
else if (c.type === "star") parts.push(`DX★${c.from}→★${c.to}`);
}
return parts.join(" · ");
}
const histKey = () => "maimai-hist:" + (player.name || "_");
const loadLocalHist = () => {
try {
const h = JSON.parse(localStorage.getItem(histKey()) || "null");
return h && h.obs && h.v === HIST_V ? h : emptyHist();
} catch (e) {
return emptyHist();
}
};
const saveLocalHist = (h) => {
try { localStorage.setItem(histKey(), JSON.stringify(h)); return true; } catch (e) { return false; }
};
const SYNC_GAME = "maimai";
const { cleanAccount } = syncLib;
const { fetch: syncFetch, get: syncGet, merge: syncMerge } = syncLib.createSync(SYNC_URL, SYNC_GAME, (data, local) => (data.obs && data.v === HIST_V ? mergeHist(data, local) : local));
const ACC_KEY = "maimai-accounts"; // 这台设备上「maimai 玩家名 → 同步用的名字」
const loadAccounts = () => { try { return JSON.parse(localStorage.getItem(ACC_KEY) || "{}"); } catch (e) { return {}; } };
const saveAccounts = (a) => { try { localStorage.setItem(ACC_KEY, JSON.stringify(a)); } catch (e) {} };
const askAccount = async () => {
for (;;) {
const input = prompt(
"历史记录要同步到云端的哪个名字？\n每个人请用不同的名字；换手机时填相同的名字即可接着同步。\n点「取消」= 只保存在本机",
cleanAccount(player.name || ""));
if (input == null) return null;
const acc = cleanAccount(input);
if (!acc) continue;
const { data } = await syncGet(acc);
if (data && data.name && player.name && data.name !== player.name &&
!confirm(`「${acc}」里已经有玩家「${data.name}」的记录。\n确定要把你的记录也存进去吗？（不是同一个人的话请换一个名字）`)) continue;
return acc;
}
};
let syncNote = "";
let hist = emptyHist();
async function getAccount(forceAsk) {
const accounts = loadAccounts();
let acc = forceAsk ? undefined : accounts[player.name];
if (acc === undefined) {
await syncFetch("_ping"); // 先确认连得上，连不上就不弹窗询问（抛出的错误会显示在「历史」页）
acc = await askAccount();
accounts[player.name] = acc;
saveAccounts(accounts);
}
return acc;
}
async function recordAndSync(forceAsk, reset) {
let plays = [];
let playNote = "";
if (!allCharts.length) {
syncNote = "没有读到全曲成绩，本次没有记录历史";
return;
}
if (!player.name) {
syncNote = "没有读到玩家名，本次没有记录历史";
return;
}
try {
log("正在读取プレイ履歴 ...");
plays = parsePlaylog((await getDoc(NET + "/record/")).doc);
if (!plays.length) playNote = "（プレイ履歴未能解析，只用成绩扫描）";
} catch (e) {
playNote = "（プレイ履歴读取失败）";
}
let local = reset ? emptyHist() : loadLocalHist();
let acc = null, syncErr = null;
if (SYNC_URL) {
try {
acc = await getAccount(forceAsk);
if (acc && !reset && !local.since) {
log("本机没有历史记录，正在读取云端的记录 ...");
const { data } = await syncGet(acc);
if (data && data.obs && data.v === HIST_V) local = mergeHist(data, local);
}
} catch (e) {
syncErr = e;
}
}
if (!local.since) log("历史记录从这次开始：保存当前全部已游玩谱面的成绩作为起点（之前的游玩不记）");
const lastQuery = [...local.snaps.map((s) => s.t), ...local.obs.filter((o) => o.src === "b").map((o) => o.t)].sort().pop() || "";
plays = lastQuery ? plays.filter((o) => o.t >= lastQuery) : [];
const recorded = new Set(local.obs.filter((o) => o.src === "p").map(playId));
const seenCharts = new Set(local.obs.map(canon));
const need = plays.filter((o) => o.pid && (o.nr || (local.since && !seenCharts.has(canon(o)))) && !recorded.has(playId(o)));
if (need.length) log(`上次查询（${lastQuery}）之后有 ${need.length} 次刷新纪录 / 第一次打的游玩，读取游玩详情 ...`);
for (const [i, o] of need.entries()) {
log(`正在读取游玩详情（${i + 1}/${need.length}）...`);
try {
const det = parsePlaylogDetail((await getDoc(`${NET}/record/playlogDetail/?idx=${encodeURIComponent(o.pid)}`)).doc);
if (det.r) { o.r = det.r; if (det.dr != null) o.dr = det.dr; }
const c = det.id && allCharts.find((x) => x.idx === det.id && x.difficulty === o.d);
if (c) Object.assign(o, { k: histKeyOf(c), nk: nameKeyOf(c.title, c.kind, c.difficulty), kd: c.kind, j: c.img || o.j });
} catch (e) {}
await sleep(1000);
}
hist = applyUpdate(local, plays);
if (reset) hist.resetAt = hist.since; // 「从现在重新开始记录」：同步时，这个时间之前的记录（包括别的设备上的）都不要
syncNote = (saveLocalHist(hist) ? "历史记录已保存在本机" : "本机存储空间不足，历史记录未保存") + playNote;
if (!SYNC_URL) return;
if (syncErr) {
syncNote = "同步失败：" + syncErr.message + "。已保存在本机，下次运行会重试" + playNote;
return;
}
if (!acc) { syncNote += "（未开启云端同步）"; return; }
try {
log("正在同步历史记录 ...");
hist = await syncMerge(acc, hist);
saveLocalHist(hist);
syncNote = "历史记录已同步（" + SYNC_GAME + "/" + acc + "）" + playNote;
} catch (e) {
syncNote = "同步失败：" + e.message + "。已保存在本机，下次运行会重试" + playNote;
}
}
await recordAndSync(false);
const HW = 1200, HP = 32;
const newCanvas = (w, h) => {
const cv = document.createElement("canvas");
cv.width = w;
cv.height = h;
const ctx = cv.getContext("2d");
if (!ctx) throw new Error(`浏览器无法创建这么大的图片（${w}×${h}）`);
ctx.fillStyle = C.bg;
ctx.fillRect(0, 0, w, h);
ctx.textBaseline = "alphabetic";
return { cv, ctx };
};
const toImage = (cv) => new Promise((resolve, reject) => {
try {
cv.toBlob((b) => (b ? resolve({ blob: b, url: URL.createObjectURL(b) }) : reject(new Error("toBlob failed"))), "image/png");
} catch (e) {
reject(e);
}
});
function histStat(ctx, label, value, right, color, big) {
ctx.textAlign = "right";
ctx.fillStyle = C.muted;
ctx.font = f(700, 14);
ctx.fillText(label, right, 52);
ctx.fillStyle = color;
ctx.font = f(800, big ? 46 : 32);
ctx.fillText(value, right, 100);
ctx.textAlign = "left";
}
function histSection(ctx, label, y, color) {
ctx.fillStyle = C.line;
ctx.fillRect(HP, y, HW - HP * 2, 1);
ctx.fillStyle = color;
ctx.font = f(800, 20);
ctx.fillText(label, HP, y + 32);
}
const diffShortOf = (d) => ALL_DIFFS.find((x) => x.name === d)?.short || d;
function diffBadge(ctx, d, x, y, kd) {
let w = pill(ctx, diffShortOf(d), x, y, C[d] || C.muted, 13, d === "Re:MASTER" ? "#3b1d5e" : "#16151c");
if (kd) w += 4 + pill(ctx, kd, x + w + 4, y, C[kd] || C.muted, 11, "#fff");
return w;
}
function lineChart(ctx, x, y, w, h, series, opt) {
const pts = series.flatMap((s) => s.pts);
if (!pts.length) return;
let t0 = Math.min(...pts.map((p) => p[0])), t1 = Math.max(...pts.map((p) => p[0]));
let v0 = Math.min(...pts.map((p) => p[1])), v1 = Math.max(...pts.map((p) => p[1]));
if (t1 - t0 < 864e5) { t0 -= 432e5; t1 += 432e5; }
const span = Math.max(v1 - v0, opt.minSpan);
const mid = (v0 + v1) / 2;
v0 = mid - span * 0.6;
v1 = mid + span * 0.6;
if (opt.maxV != null) v1 = Math.min(v1, opt.maxV);
const L = x + 100, R = x + w - 16, T = y + 16, B = y + h - 70;
const X = (t) => L + ((t - t0) / (t1 - t0)) * (R - L);
const Y = (v) => B - ((v - v0) / (v1 - v0)) * (B - T);
rrect(ctx, x, y, w, h, 12);
ctx.fillStyle = C.card;
ctx.fill();
ctx.font = f(500, 14);
ctx.textAlign = "right";
for (let i = 0; i <= 4; i++) {
const v = v0 + ((v1 - v0) * i) / 4;
ctx.strokeStyle = "rgba(255,255,255,0.08)";
ctx.lineWidth = 1;
ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(R, Y(v)); ctx.stroke();
ctx.fillStyle = C.muted;
ctx.fillText(opt.fmt(v), L - 10, Y(v) + 5);
}
(opt.refs || []).forEach((r) => {
if (r.v < v0 || r.v > v1) return;
ctx.strokeStyle = "rgba(255,211,107,0.35)";
ctx.setLineDash([6, 6]);
ctx.beginPath(); ctx.moveTo(L, Y(r.v)); ctx.lineTo(R, Y(r.v)); ctx.stroke();
ctx.setLineDash([]);
ctx.fillStyle = C["SSS+"];
ctx.textAlign = "left";
ctx.fillText(r.label, L + 6, Y(r.v) - 5);
ctx.textAlign = "right";
});
ctx.textAlign = "center";
ctx.fillStyle = C.muted;
const ticks = Math.min(6, Math.max(2, Math.round((t1 - t0) / 864e5) + 1));
for (let i = 0; i < ticks; i++) {
const t = t0 + ((t1 - t0) * i) / (ticks - 1);
const d = new Date(t);
ctx.fillText(`${d.getMonth() + 1}/${d.getDate()}`, X(t), B + 24);
}
ctx.textAlign = "left";
series.forEach((s) => {
if (!s.pts.length) return;
ctx.strokeStyle = s.color;
ctx.fillStyle = s.color;
ctx.lineWidth = s.width || 3;
if (s.line !== false) {
ctx.beginPath();
s.pts.forEach((p, i) => {
if (i === 0) ctx.moveTo(X(p[0]), Y(p[1]));
else if (s.step) { ctx.lineTo(X(p[0]), Y(s.pts[i - 1][1])); ctx.lineTo(X(p[0]), Y(p[1])); }
else ctx.lineTo(X(p[0]), Y(p[1]));
});
if (s.step) ctx.lineTo(R, Y(s.pts[s.pts.length - 1][1]));
ctx.stroke();
}
if (s.dots !== false) s.pts.forEach((p) => { ctx.beginPath(); ctx.arc(X(p[0]), Y(Math.min(p[1], v1)), s.dot || 4, 0, Math.PI * 2); ctx.fill(); });
});
let lx = L;
series.forEach((s) => {
if (!s.label) return;
ctx.fillStyle = s.color;
ctx.fillRect(lx, y + h - 22, 18, 4);
ctx.fillStyle = C.fg;
ctx.font = f(500, 14);
ctx.fillText(s.label, lx + 24, y + h - 15);
lx += 40 + ctx.measureText(s.label).width;
});
}
function stepChart(ctx, x, y, w, h, steps) {
rrect(ctx, x, y, w, h, 12);
ctx.fillStyle = C.card;
ctx.fill();
if (steps.length < 2) {
ctx.fillStyle = C.muted;
ctx.font = f(500, 16);
ctx.textAlign = "center";
ctx.fillText(steps.length ? "这段时间 DX Rating 没有增加" : "这段时间没有记录", x + w / 2, y + h / 2);
ctx.textAlign = "left";
return;
}
let v0 = Math.min(...steps.map((s) => s.v)), v1 = Math.max(...steps.map((s) => s.v));
const span = Math.max(v1 - v0, 10);
v0 = (v0 + v1) / 2 - span * 0.6;
v1 = v0 + span * 1.2;
const L = x + 100, R = x + w - 40, T = y + 40, B = y + h - 70;
const X = (i) => L + ((R - L) * i) / (steps.length - 1);
const Y = (v) => B - ((v - v0) / (v1 - v0)) * (B - T);
ctx.font = f(500, 14);
ctx.textAlign = "right";
for (let i = 0; i <= 4; i++) {
const v = v0 + ((v1 - v0) * i) / 4;
ctx.strokeStyle = "rgba(255,255,255,0.08)";
ctx.lineWidth = 1;
ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(R, Y(v)); ctx.stroke();
ctx.fillStyle = C.muted;
ctx.fillText(String(Math.round(v)), L - 10, Y(v) + 5);
}
ctx.strokeStyle = C["SSS+"];
ctx.lineWidth = 4;
ctx.beginPath();
steps.forEach((s, i) => (i ? ctx.lineTo(X(i), Y(s.v)) : ctx.moveTo(X(i), Y(s.v))));
ctx.stroke();
const every = Math.max(1, Math.ceil(70 / ((R - L) / (steps.length - 1))));
const colW = Math.min(150, ((R - L) / (steps.length - 1)) * every - 6);
steps.forEach((s, i) => {
ctx.fillStyle = C["SSS+"];
ctx.beginPath(); ctx.arc(X(i), Y(s.v), 5, 0, Math.PI * 2); ctx.fill();
ctx.textAlign = "center";
if (s.top) {
ctx.fillStyle = GOOD;
ctx.font = f(800, 14);
ctx.fillText(s.top, X(i), Y(s.v) - 12);
}
if (i % every && i !== steps.length - 1) { ctx.textAlign = "left"; return; }
ctx.fillStyle = C.muted;
ctx.font = f(600, 13);
ctx.fillText(s.time, X(i), B + 22);
if (s.song) {
ctx.font = f(500, 12);
ctx.fillText(fit(ctx, s.song, colW), X(i), B + 40);
}
ctx.textAlign = "left";
});
ctx.fillStyle = C.fg;
ctx.font = f(500, 14);
ctx.fillStyle = C["SSS+"];
ctx.fillRect(L, y + h - 22, 18, 4);
ctx.fillStyle = C.fg;
ctx.fillText(`DX RATING（每次增加，共 ${steps.length - 1} 次）`, L + 24, y + h - 15);
}
function drawRatingChange(ctx, right, y, u, size = 14) {
const r1 = ratingOfState(u.k, u.after);
const r0 = u.before && u.before.a >= 0 ? ratingOfState(u.k, u.before) : null;
let x = right;
const seg = (text, color, weight = 500) => {
ctx.font = f(weight, size);
ctx.fillStyle = color;
const w = ctx.measureText(text).width;
ctx.fillText(text, x - w, y);
x -= w + 8;
};
if (r1 == null) { seg("定数未知", C.muted); return right - x; }
const d = r0 != null ? r1 - r0 : null;
if (d != null) seg((d > 0 ? "+" : "±") + Math.abs(d), d > 0 ? GOOD : C.muted, 800);
seg(String(r1), C.accent, 800);
seg("Rating " + (r0 != null ? r0 + " →" : "→"), C.muted);
return right - x;
}
const inRange = (t, range) => (!range.from || t >= range.from) && (!range.to || t <= range.to);
const changedAccount = (u, im) => !!im && im.delta > 0;
async function drawTrend(range, onlyRating) {
const { updates: allUpdates } = derive(hist);
const impact = accountImpact(hist, allUpdates);
const updates = allUpdates.filter((u) => inRange(u.t, range));
const snaps = hist.snaps;
const beforeEnd = snaps.filter((s) => !range.to || s.t <= range.to);
const last = beforeEnd[beforeEnd.length - 1];
const startSnaps = snaps.filter((s) => range.from && s.t <= range.from);
let prev = startSnaps[startSnaps.length - 1] || beforeEnd.find((s) => inRange(s.t, range));
if (prev === last) prev = null;
const rows = []; // {side:'L'|'R', e, color, right, sub}
let upMore = 0;
if (last && prev) {
const toMap = (s) => new Map([...s.best, ...s.news].map((e) => [rowKey(e), e]));
const a = toMap(prev), b = toMap(last);
const loose = (e) => `${norm(e[1])}|${e[5]}`;
const onlyA = [...a.keys()].filter((k) => !b.has(k)), onlyB = [...b.keys()].filter((k) => !a.has(k));
for (const kb of onlyB) {
const same = onlyA.filter((ka) => a.has(ka) && loose(a.get(ka)) === loose(b.get(kb)));
const sameB = onlyB.filter((x) => loose(b.get(x)) === loose(b.get(kb)));
if (same.length === 1 && sameB.length === 1) {
a.set(kb, a.get(same[0]));
a.delete(same[0]);
}
}
const stateAt = (t) => derive({ ...hist, obs: hist.obs.filter((o) => o.t <= t) }).state;
const st0 = stateAt(prev.t), st1 = stateAt(last.t);
const diffText = (k, e0, e1) => {
const s0 = st0[k], s1 = st1[k] || { a: e1[2], fc: e1[4], sy: "", x: 0, xm: 0 };
const a0 = s0 && s0.a >= 0 ? s0.a : e0 ? e0[2] : -1;
const parts = [a0 >= 0 && s1.a > a0 ? `${fmtAch(a0)} → ${fmtAch(s1.a)}` : fmtAch(s1.a)];
const ch = (from, to) => (from ? `${from}→${to}` : to);
if (s1.fc && s1.fc !== (s0?.fc || "")) parts.push(ch(s0?.fc, s1.fc));
if (s1.sy && s1.sy !== "SYNC" && s1.sy !== (s0?.sy || "")) parts.push(ch(s0?.sy && s0.sy !== "SYNC" ? s0.sy : "", s1.sy));
const x0 = s0 && s0.xm ? dxStarOf(s0.x, s0.xm) : 0, x1 = s1.xm ? dxStarOf(s1.x, s1.xm) : 0;
if (x1 > x0) parts.push(`★${x0}→★${x1}`);
return parts.join(" · ");
};
const ups = [];
b.forEach((e, k) => {
const o = a.get(k);
if (!o) { rows.push({ side: "L", e, color: GOOD, right: "新进 " + e[3], sub: diffText(k, null, e) }); return; }
const dr = e[3] - o[3];
if (e[2] > o[2] || FC_RANK[e[4]] > FC_RANK[o[4]] || dr > 0) ups.push({ e, k, o, dr });
});
ups.sort((p, q) => q.dr - p.dr);
upMore = Math.max(0, ups.length - 10);
ups.slice(0, 10).forEach(({ e, k, o, dr }) => rows.push({ side: "L", e, color: dr > 0 ? C["SSS+"] : C.muted, right: dr > 0 ? `${o[3]} → ${e[3]}（+${dr}）` : `${e[3]}（rating 不变）`, sub: diffText(k, o, e) }));
a.forEach((e, k) => { if (!b.has(k)) rows.push({ side: "R", e, color: "#ff8a8a", right: "移出 " + e[3] }); });
}
const listed = onlyRating ? updates.filter((u) => changedAccount(u, impact.get(u))) : updates;
const recent = listed.slice(-20).reverse(); // 时间段内最近的 20 次
const ROW = 34, SUBROW = 20, PB_ROW = 58;
const colRows = (side) => rows.filter((r) => r.side === side).reduce((a, r) => a + ROW + (r.sub ? SUBROW : 0), 0);
const changeH = Math.max(colRows("L") + (upMore ? ROW : 0), colRows("R"), ROW);
const H = 150 + 380 + 30 + 86 + changeH + 30 + 64 + Math.max(recent.length, 1) * PB_ROW + 50;
const { cv, ctx } = newCanvas(HW, H);
ctx.fillStyle = C.accent;
ctx.font = f(800, 16);
ctx.fillText("maimai でらっくす  RATING HISTORY", HP, 42);
ctx.fillStyle = C.fg;
ctx.font = f(800, 42);
ctx.fillText(fit(ctx, player.name || hist.name || "", 520), HP, 96);
const all = [];
for (const s of snaps) if (s.r) all.push([s.t, timeMs(s.t), s.r]);
for (const o of hist.obs) {
if (o.src !== "p" || !o.r) continue;
if (o.dr != null) all.push([o.t, timeMs(o.t) - 1, o.r - o.dr]);
all.push([o.t, timeMs(o.t), o.r, o.n]);
}
all.sort((a, b) => a[1] - b[1]);
const line = all.filter((p) => inRange(p[0], range));
const before = all.filter((p) => range.from && p[0] < range.from);
const startPt = before[before.length - 1] || line[0];
const days = new Map();
for (const [, ms, r] of line) {
const d = new Date(ms);
days.set(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime(), r);
}
const daily = [...days.entries()];
if (line.length) {
const end = line[line.length - 1][2];
histStat(ctx, "DX RATING", String(end), HW - HP, C["SSS+"], true);
histStat(ctx, "这段时间", signedInt(end - startPt[2]), HW - HP - 230, C.plat);
histStat(ctx, "推分", `${updates.length} 次`, HW - HP - 400, C.accent);
}
ctx.fillStyle = C.muted;
ctx.font = f(500, 14);
const fmtDay = (ms) => new Date(ms).toLocaleDateString("ja-JP");
ctx.fillText(fit(ctx, `${range.label}${line.length ? `：${fmtDay(line[0][1])} – ${fmtDay(line[line.length - 1][1])}，${daily.length} 天有记录` : "：这段时间没有记录"}`, 640), HP, 128);
let y = 150;
const oneDay = range.oneDay || daily.length <= 1;
if (oneDay) {
const steps = [];
if (startPt) {
let cur = startPt[2];
steps.push({ v: cur, top: "", time: "开始", song: "" });
for (const p of line) {
if (p[2] > cur) steps.push({ v: p[2], top: "+" + (p[2] - cur), time: p[0].slice(11), song: p[3] || "" });
cur = p[2];
}
}
stepChart(ctx, HP, y, HW - HP * 2, 360, steps);
} else lineChart(ctx, HP, y, HW - HP * 2, 360, [
{ label: "DX RATING（每天）", color: C["SSS+"], pts: daily, width: 4 },
], { minSpan: 20, fmt: (v) => String(Math.round(v)) });
if (!oneDay && daily.length === 1) {
ctx.fillStyle = C.muted;
ctx.font = f(500, 16);
ctx.textAlign = "center";
ctx.fillText("目前只有 1 天的记录，以后每天运行一次就能连成线", HW / 2, y + 60);
ctx.textAlign = "left";
}
y += 380;
histSection(ctx, "B50 变化" + (prev ? `（${prev.t} → ${last.t}）` : ""), y, C.accent);
if (prev) {
const dr = last.r - prev.r;
ctx.textAlign = "right";
ctx.font = f(800, 18);
ctx.fillStyle = dr > 0 ? GOOD : dr < 0 ? "#ff8a8a" : C.muted;
ctx.fillText(`DX Rating ${prev.r} → ${last.r}　${signedInt(dr)}`, HW - HP, y + 32);
ctx.textAlign = "left";
}
y += 86;
const colW = (HW - HP * 2 - 24) / 2;
const rowText = (x, yy, r) => {
const bw = diffBadge(ctx, r.e[5], x, yy, r.e[6]);
ctx.font = f(700, 15);
const rw = ctx.measureText(r.right).width;
ctx.fillStyle = C.fg;
ctx.font = f(500, 16);
ctx.fillText(fit(ctx, r.e[1], colW - bw - rw - 24), x + bw + 8, yy);
ctx.textAlign = "right";
ctx.fillStyle = r.color;
ctx.font = f(700, 15);
ctx.fillText(r.right, x + colW - 6, yy);
if (r.sub) {
ctx.fillStyle = C.muted;
ctx.font = f(500, 13);
ctx.fillText(fit(ctx, r.sub, colW - 12), x + colW - 6, yy + SUBROW);
}
ctx.textAlign = "left";
return ROW + (r.sub ? SUBROW : 0);
};
ctx.font = f(700, 15);
if (!prev) {
ctx.fillStyle = C.muted;
ctx.fillText("这段时间里没有两个快照可以对比", HP, y);
} else if (!rows.length) {
ctx.fillStyle = C.muted;
ctx.fillText("和上次相比没有变化", HP, y);
} else {
let yy = y;
rows.filter((r) => r.side === "L").forEach((r) => { yy += rowText(HP, yy, r); });
if (upMore) {
ctx.fillStyle = C.muted;
ctx.font = f(500, 15);
ctx.fillText(`另有 ${upMore} 首提升`, HP, yy);
}
yy = y;
rows.filter((r) => r.side === "R").forEach((r) => { yy += rowText(HP + colW + 24, yy, r); });
}
y += changeH;
y += 6;
histSection(ctx, `${onlyRating ? "让账号 Rating 变化的推分" : "推分"}（${listed.length > 20 ? `共 ${listed.length} 次，显示最近 20 次` : `${listed.length} 次`}）`, y, C["SSS+"]);
y += 64;
if (!recent.length) {
ctx.fillStyle = C.muted;
ctx.font = f(700, 15);
ctx.fillText(onlyRating ? "这段时间没有让账号 Rating 变化的推分" : "暂无记录。达成率、FC/AP、FS/FDX、DX 分星级有提升时会记在这里", HP, y);
}
recent.forEach((u) => {
ctx.fillStyle = C.muted;
ctx.font = f(500, 14);
ctx.fillText(u.t + (u.src === "b" ? "*" : ""), HP, y);
const bw = diffBadge(ctx, u.d, HP + 150, y, u.kd);
const what = changeText(u);
ctx.font = f(800, 15);
const ww = Math.min(ctx.measureText(what).width, 560);
ctx.fillStyle = C.fg;
ctx.font = f(500, 16);
ctx.fillText(fit(ctx, u.n, HW - HP * 2 - 150 - bw - ww - 30), HP + 150 + bw + 8, y);
ctx.textAlign = "right";
ctx.fillStyle = C["SSS+"];
ctx.font = f(800, 15);
ctx.fillText(fit(ctx, what, 560), HW - HP, y);
ctx.textAlign = "left";
const rw = drawRatingChange(ctx, HW - HP, y + 24, u, 14);
const [itext, icolor] = impactText(impact.get(u), u);
ctx.fillStyle = icolor;
ctx.font = f(icolor === GOOD ? 700 : 500, 14);
ctx.fillText(fit(ctx, itext, HW - HP * 2 - 150 - rw - 20), HP + 150, y + 24);
ctx.fillStyle = "rgba(255,255,255,0.06)";
ctx.fillRect(HP, y + 36, HW - HP * 2, 1);
y += PB_ROW;
});
ctx.fillStyle = C.muted;
ctx.font = f(500, 13);
ctx.fillText(fit(ctx, `${new Date().toLocaleString("ja-JP")}  ·  时间后的 * = 由成绩扫描发现（时间为运行书签的时间）  ·  单曲 rating 按现在的定数计算  ·  账号 Rating = 50 首单曲 rating 的合计`, HW - HP * 2), HP, H - 18);
return toImage(cv);
}
async function drawSongCurve(e, range) {
const obs = hist.obs.filter((o) => canon(o) === e.k).sort(byTime);
const plays = obs.filter((o) => o.src === "p" && inRange(o.t, range));
const { state, updates } = derive(hist);
const impact = accountImpact(hist, updates);
const mine = updates.filter((u) => u.k === e.k && inRange(u.t, range)).reverse().slice(0, 12);
const cur = state[e.k];
const pbAll = [];
let best = -1;
obs.forEach((o) => { if (o.a > best) { best = o.a; pbAll.push([timeMs(o.t), o.a / 10000, o.t]); } });
const pbStart = range.from ? [...pbAll].reverse().find((p) => p[2] < range.from) : null;
const pbPts = [...(pbStart ? [[timeMs(range.from), pbStart[1]]] : []),
...pbAll.filter((p) => inRange(p[2], range)).map((p) => [p[0], p[1]])];
const chart = chartByK.get(e.k);
const jacket = chart ? await loadJacket(chart.img) : null;
const rows = plays.slice(-15).reverse();
const ROW = 32, UROW = 58;
const H = 170 + 400 + 30 + 64 + Math.max(mine.length, 1) * UROW + 20 + 64 + Math.max(rows.length, 1) * ROW + 50;
const { cv, ctx } = newCanvas(HW, H);
const J = 120;
if (jacket) {
ctx.save();
rrect(ctx, HP, 24, J, J, 10);
ctx.clip();
ctx.drawImage(jacket, HP, 24, J, J);
ctx.restore();
}
const tx = jacket ? HP + J + 20 : HP;
ctx.fillStyle = C.accent;
ctx.font = f(800, 16);
ctx.fillText("maimai でらっくす  SCORE HISTORY  ·  " + (player.name || hist.name || ""), tx, 46);
ctx.fillStyle = C.fg;
ctx.font = f(800, 36);
ctx.fillText(fit(ctx, e.n, HW - tx - 320), tx, 92);
let px = tx + (chart ? constPill(ctx, chart, tx, 128, 14) : diffBadge(ctx, e.d, tx, 128)) + 8;
px += pill(ctx, e.kd || chart?.kind || "", px, 128, C[e.kd || chart?.kind] || C.muted, 13, "#fff") + 6;
if (cur) {
if (cur.fc) px += pill(ctx, cur.fc, px, 128, C[cur.fc] || C.muted, 13) + 6;
if (cur.sy && cur.sy !== "SYNC") px += pill(ctx, cur.sy, px, 128, C[cur.sy] || C.muted, 13) + 6;
if (cur.xm) drawStars(ctx, dxStarOf(cur.x, cur.xm), px + 72, 129, 13, 2);
}
histStat(ctx, "BEST", best >= 0 ? fmtAch(best) : "-", HW - HP, C["SSS+"], true);
const rNow = cur ? ratingOfState(e.k, cur) : null;
ctx.fillStyle = C.muted;
ctx.font = f(500, 14);
ctx.textAlign = "right";
ctx.fillText([best >= 0 ? rankOf(best / 10000) : "", rNow != null ? "单曲 Rating " + rNow : "",
cur && cur.xm ? `DX ${cur.x.toLocaleString("en-US")} / ${cur.xm.toLocaleString("en-US")}` : "", `${range.label} ${plays.length} 次游玩`].filter(Boolean).join("　·　"), HW - HP, 128);
ctx.textAlign = "left";
let y = 170;
const CHART_MIN = 94;
const shownPlays = plays.filter((o) => o.a / 10000 >= CHART_MIN);
const shownPb = pbPts.filter((p) => p[1] >= CHART_MIN);
if (!shownPlays.length && !shownPb.length) {
rrect(ctx, HP, y, HW - HP * 2, 400, 12);
ctx.fillStyle = C.card;
ctx.fill();
ctx.fillStyle = C.muted;
ctx.font = f(500, 16);
ctx.textAlign = "center";
ctx.fillText("还没有 AAA（94%）以上的成绩，曲线图只画 AAA 以上的成绩", HW / 2, y + 200);
ctx.textAlign = "left";
}
lineChart(ctx, HP, y, HW - HP * 2, 400, [
...(shownPlays.length >= 2 ? [{ label: "个人最佳", color: C["SSS+"], pts: shownPb, step: true, dots: false, width: 3 }] : []),
{ label: "每次游玩（AAA 以上）", color: C.plat, pts: shownPlays.map((o) => [timeMs(o.t), o.a / 10000]), line: false, dot: 5 },
], {
minSpan: 0.5, maxV: 101, fmt: (v) => v.toFixed(2) + "%",
refs: [{ v: 100.5, label: "SSS+" }, { v: 100, label: "SSS" }, { v: 99.5, label: "SS+" }, { v: 99, label: "SS" }, { v: 98, label: "S+" }, { v: 97, label: "S" }],
});
y += 430;
histSection(ctx, "推分记录", y, C["SSS+"]);
y += 64;
if (!mine.length) {
ctx.fillStyle = C.muted;
ctx.font = f(700, 15);
ctx.fillText("这段时间没有这首歌的推分记录", HP, y);
}
mine.forEach((u) => {
ctx.fillStyle = C.muted;
ctx.font = f(500, 15);
ctx.fillText(u.t + (u.src === "b" ? "*" : ""), HP, y);
ctx.fillStyle = C["SSS+"];
ctx.font = f(800, 16);
ctx.fillText(fit(ctx, changeText(u), HW - HP * 2 - 180), HP + 170, y);
const rw = drawRatingChange(ctx, HW - HP, y + 24, u, 14);
const [itext, icolor] = impactText(impact.get(u), u);
ctx.fillStyle = icolor;
ctx.font = f(icolor === GOOD ? 700 : 500, 14);
ctx.fillText(fit(ctx, itext, HW - HP * 2 - 170 - rw - 20), HP + 170, y + 24);
ctx.fillStyle = "rgba(255,255,255,0.06)";
ctx.fillRect(HP, y + 36, HW - HP * 2, 1);
y += UROW;
});
y += 20;
histSection(ctx, "最近的游玩", y, C.plat);
y += 64;
if (!rows.length) {
ctx.fillStyle = C.muted;
ctx.font = f(700, 15);
ctx.fillText("这段时间没有这首歌的游玩记录", HP, y);
}
const pbAt = new Map();
let run = -1;
obs.forEach((o) => {
if (o.src === "p") pbAt.set(o, run);
if (o.a > run) run = o.a;
});
rows.forEach((o) => {
ctx.fillStyle = C.muted;
ctx.font = f(500, 15);
ctx.fillText(o.t, HP, y);
ctx.fillStyle = C.fg;
ctx.font = f(800, 18);
ctx.fillText(fmtAch(o.a), HP + 190, y);
const rk = rankOf(o.a / 10000);
ctx.fillStyle = C[rk] || C.fg;
ctx.font = f(800, 15);
ctx.fillText(rk, HP + 320, y);
let bx = HP + 380;
for (const t of [o.fc, o.sy === "SYNC" ? "" : o.sy]) if (t) bx += pill(ctx, t, bx, y, C[t] || C.muted, 11) + 4;
const before = pbAt.get(o);
ctx.font = f(700, 15);
const nx = Math.max(bx + 8, HP + 500);
if (before >= 0 && o.a > before) { ctx.fillStyle = GOOD; ctx.fillText("NEW RECORD  +" + ((o.a - before) / 10000).toFixed(4) + "%", nx, y); }
else if (before < 0 && o.nr) { ctx.fillStyle = GOOD; ctx.fillText("NEW RECORD", nx, y); }
else if (before >= 0) { ctx.fillStyle = C.muted; ctx.font = f(500, 14); ctx.fillText("距最佳 −" + ((before - o.a) / 10000).toFixed(4) + "%", nx, y); }
const r = ratingOfState(e.k, { a: o.a, fc: o.fc });
let rx = HW - HP;
const segR = (text, color, w = 500) => {
ctx.font = f(w, 14);
ctx.fillStyle = color;
ctx.textAlign = "right";
ctx.fillText(text, rx, y);
rx -= ctx.measureText(text).width + 12;
ctx.textAlign = "left";
};
if (o.r != null) segR(`DX Rating ${o.r}${o.dr != null ? "（" + signedInt(o.dr) + "）" : ""}`, o.dr > 0 ? GOOD : C.muted, o.dr > 0 ? 700 : 500);
if (r != null) segR("单曲 " + r, C.muted);
y += ROW;
});
ctx.fillStyle = C.muted;
ctx.font = f(500, 13);
ctx.fillText(`${new Date().toLocaleString("ja-JP")}  ·  data: maimai DX NET プレイ履歴 / 成绩扫描  ·  * = 由成绩扫描发现`, HP, H - 18);
return toImage(cv);
}
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
const songKeys = ["frame", "difficulty", "kind", "const", "title", "genre", "version", "achievement", "rank", "fc", "sync", "dx_score", "dx_max", "dx_star", "rating", "const_unknown", "idx"];
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
for (const [k, label] of [["b50", "B50 图"], ["filter", "查分图"], ["table", "表格"], ["history", "历史"]]) {
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
idStats,
history: { snaps: hist.snaps.length, obs: hist.obs.length, plays: hist.obs.filter((o) => o.src === "p").length, syncNote },
playlogSample,
playlogDetailSample,
playMiss,
impactCheck: (() => {
const { updates } = derive(hist);
const im = accountImpact(hist, updates);
return hist.snaps.slice(1).map((s, i) => {
const p0 = hist.snaps[i];
const list = updates.filter((u) => u.t > p0.t && u.t <= s.t).map((u) => im.get(u) || {});
const sumD = list.reduce((a, r) => a + (r.delta || 0), 0), gap = list.reduce((a, r) => a + (r.gap || 0), 0);
return `${p0.t} → ${s.t}：快照差 ${s.r - p0.r}，推分合计 ${sumD}，差额 ${gap}`;
});
})(),
matchLog,
noJacket: b50.filter((s) => !s.img || jacketFails.has(s.img)).map((s) => `${s.frame} ${s.title} [${s.kind}] img=${s.img || "无"}${s.jacket ? " 页面曲绘=" + s.jacket : ""}`),
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
const showImage = ({ url, blob }, name, pager, target = view) => {
target.innerHTML = "";
const tip = document.createElement("div");
tip.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px;color:#555";
if (pager) tip.appendChild(pager);
mkBtn("保存图片", () => saveFile(name, blob), tip);
tip.append(isIOS ? "点「保存图片」→「存储图像」，或长按图片保存" : "也可以长按 / 右键图片保存");
const img = new Image();
img.src = url;
img.alt = name;
img.style.cssText = "width:100%;height:auto;display:block;border-radius:8px;-webkit-touch-callout:default;-webkit-user-select:auto;user-select:auto;pointer-events:auto";
target.append(tip, img);
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
const RANGE_KEY = "maimai-hist-range";
let rangePref = { mode: "last" };
try { rangePref = JSON.parse(localStorage.getItem(RANGE_KEY) || "null") || rangePref; } catch (e) {}
if (!["last", "today", "7", "30", "all", "custom"].includes(rangePref.mode)) rangePref = { mode: "last" };
const RANGE_MODES = [["last", "上次以来"], ["today", "今天"], ["7", "最近 7 天"], ["30", "最近 30 天"], ["all", "全部"]];
const dayStr = (d) => `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dayStr(d); };
function currentRange() {
const m = rangePref.mode;
if (m === "last") {
const prev = hist.snaps[hist.snaps.length - 2];
return prev ? { from: prev.t, to: "", label: "上次查询以来" } : { from: "", to: "", label: "全部" };
}
if (m === "today") return { from: daysAgo(0) + " 00:00", to: "", label: "今天", oneDay: true };
if (m === "7" || m === "30") return { from: daysAgo(+m - 1) + " 00:00", to: "", label: `最近 ${m} 天` };
if (m === "custom") {
const f = (rangePref.from || "").replace(/-/g, "/"), t = (rangePref.to || "").replace(/-/g, "/");
return { from: f ? f + " 00:00" : "", to: t ? t + " 23:59" : "", label: f && f === t ? f : `${f || "起点"} ~ ${t || "现在"}`, oneDay: !!f && f === t };
}
return { from: "", to: "", label: "全部" };
}
const trendCache = new Map(); // 时间段 + 推分筛选 → 走势图
const PUSH_KEY = "maimai-hist-push";
let pushFilter = "all";
try { pushFilter = localStorage.getItem(PUSH_KEY) === "rating" ? "rating" : "all"; } catch (e) {}
async function renderHistory(seq) {
view.innerHTML = "";
const card = (css) => {
const d = document.createElement("div");
d.style.cssText = "background:#fff;border-radius:10px;padding:10px;margin-bottom:8px;line-height:1.7;" + (css || "");
view.appendChild(d);
return d;
};
const { state, updates } = derive(hist);
const info = card();
info.innerHTML = `<div>${esc(syncNote)}</div><div style="color:#555">${hist.since ? "从 " + esc(hist.since) + " 开始记录 · " : ""}${hist.snaps.length} 个 Rating 快照 · ` +
`${hist.obs.filter((o) => o.src === "p").length} 条游玩记录 · ${updates.length} 次推分</div>`;
const row = document.createElement("div");
row.style.cssText = "margin-top:6px;display:flex;flex-wrap:wrap;gap:6px";
if (SYNC_URL) {
mkBtn("更改同步名字", async () => {
await recordAndSync(true);
trendCache.clear();
render();
}, row);
}
mkBtn("从现在重新开始记录", async () => {
if (!confirm("清空这个账号的全部历史记录" + (SYNC_URL ? "（本机和云端）" : "") + "，把现在全部谱面的成绩当作新的起点，从现在开始重新记录？\n清空后无法恢复。")) return;
await recordAndSync(false, true);
trendCache.clear();
render();
}, row);
info.appendChild(row);
const range = currentRange();
const rangeCard = card("display:flex;flex-wrap:wrap;align-items:center;gap:6px");
rangeCard.innerHTML = "<b style=\"margin-right:4px\">时间段</b>";
for (const [mode, label] of RANGE_MODES) {
const b = mkBtn(label, () => {
rangePref = { mode };
try { localStorage.setItem(RANGE_KEY, JSON.stringify(rangePref)); } catch (e) {}
render();
}, rangeCard);
b.style.padding = "6px 10px";
b.style.fontSize = "14px";
if (rangePref.mode === mode) Object.assign(b.style, { background: "#d1127a", color: "#fff" });
}
const dates = document.createElement("span");
dates.style.cssText = "display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px";
const toInput = (t) => (t ? t.slice(0, 10).replace(/\//g, "-") : "");
dates.innerHTML = `<input id="mc-hfrom" type="date" style="font-size:15px;padding:3px"> ~ <input id="mc-hto" type="date" style="font-size:15px;padding:3px">`;
rangeCard.appendChild(dates);
const fromEl = dates.querySelector("#mc-hfrom"), toEl = dates.querySelector("#mc-hto");
fromEl.value = rangePref.mode === "custom" ? rangePref.from || "" : toInput(range.from);
toEl.value = rangePref.mode === "custom" ? rangePref.to || "" : toInput(range.to);
if (hist.since) fromEl.min = toEl.min = toInput(hist.since);
const onDate = () => {
rangePref = { mode: "custom", from: fromEl.value, to: toEl.value };
try { localStorage.setItem(RANGE_KEY, JSON.stringify(rangePref)); } catch (e) {}
render();
};
fromEl.onchange = onDate;
const pushRow = document.createElement("div");
pushRow.style.cssText = "flex-basis:100%;display:flex;flex-wrap:wrap;align-items:center;gap:6px";
pushRow.innerHTML = "<b style=\"margin-right:4px\">推分</b>";
for (const [v, label] of [["all", "全部推分"], ["rating", "只看账号 Rating 有变化的"]]) {
const b = mkBtn(label, () => {
pushFilter = v;
try { localStorage.setItem(PUSH_KEY, v); } catch (e) {}
render();
}, pushRow);
b.style.padding = "6px 10px";
b.style.fontSize = "14px";
if (pushFilter === v) Object.assign(b.style, { background: "#d1127a", color: "#fff" });
}
rangeCard.appendChild(pushRow);
toEl.onchange = onDate;
const songs = new Map();
hist.obs.forEach((o) => {
if (!inRange(o.t, range)) return;
const k = canon(o);
const ch = chartByK.get(k);
const e = songs.get(k) || { k, n: ch?.title || o.n, d: o.d, kd: ch?.kind || o.kd, plays: 0, last: "" };
if (o.src === "p") e.plays++;
if (o.t > e.last) e.last = o.t;
songs.set(k, e);
});
const trendBox = card("padding:0;background:none");
trendBox.textContent = "正在生成走势图…";
const search = card();
search.innerHTML = '<b>单曲分数曲线</b><input id="mc-hq" placeholder="输入曲名搜索" autocomplete="off" ' +
'style="display:block;width:100%;box-sizing:border-box;margin:6px 0;padding:6px 8px;font-size:16px"><div id="mc-hlist"></div>';
const curveBox = card("display:none");
const listEl = search.querySelector("#mc-hlist");
const renderList = () => {
const q = norm(search.querySelector("#mc-hq").value).toLowerCase();
const items = [...songs.values()]
.filter((e) => e.plays > 0 && (!q || norm(e.n).toLowerCase().includes(q)))
.sort((a, b) => b.plays - a.plays || (a.last < b.last ? 1 : -1))
.slice(0, 30);
listEl.innerHTML = items.length ? "" : `<div style="color:#888">${esc(range.label)}：没有游玩记录（プレイ履歴里出现过的谱面才会列在这里）</div>`;
for (const e of items) {
const b = document.createElement("button");
b.style.cssText = "display:flex;width:100%;align-items:center;gap:6px;text-align:left;margin:3px 0;padding:7px 8px;" +
"border:1px solid #ddd;border-radius:8px;background:#fafafa;color:#222;font-size:14px";
const best = state[e.k]?.a;
b.innerHTML = `<span style="background:${C[e.d] || "#999"};color:#16151c;border-radius:4px;padding:0 5px;font-size:12px;font-weight:bold">${esc(diffShortOf(e.d))}</span>` +
`<span style="background:${C[e.kd] || "#999"};color:#fff;border-radius:4px;padding:0 5px;font-size:11px;font-weight:bold">${esc(e.kd || "?")}</span>` +
`<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.n)}</span>` +
`<span style="color:#777;font-size:12px">${best >= 0 ? fmtAch(best) : "—"} · ${e.plays} 次</span>`;
b.onclick = async () => {
curveBox.style.display = "";
curveBox.textContent = "正在生成…";
curveBox.scrollIntoView({ behavior: "smooth", block: "start" });
try {
showImage(await drawSongCurve(e, range), `maimai_${e.n.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40)}_${stamp}.png`, null, curveBox);
} catch (err) {
curveBox.textContent = "生成失败：" + err;
}
};
listEl.appendChild(b);
}
};
search.querySelector("#mc-hq").oninput = renderList;
renderList();
try {
const rk = JSON.stringify(range) + pushFilter;
if (!trendCache.has(rk)) trendCache.set(rk, await drawTrend(range, pushFilter === "rating"));
const img = trendCache.get(rk);
if (seq === renderSeq) showImage(img, `maimai_history_${stamp}.png`, null, trendBox);
} catch (err) {
trendBox.textContent = "走势图生成失败：" + err;
}
}
async function render() {
const seq = ++renderSeq;
for (const [k, b] of Object.entries(tabs)) {
b.style.background = k === tab ? "#d1127a" : "#fff";
b.style.color = k === tab ? "#fff" : "#222";
}
if (tab === "history") {
filters.style.display = "none";
renderHistory(seq);
return;
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
const pages = Math.max(1, Math.ceil(shownRows.length / PER_IMAGE));
page = Math.min(page, pages - 1);
const rows = shownRows.slice(page * PER_IMAGE, (page + 1) * PER_IMAGE);
view.innerHTML = '<div style="padding:24px 0;color:#555">正在生成图片（加载曲绘中）…</div>';
const cnt = (k, re) => playedRows.filter((s) => re.test(s[k])).length;
const img = await drawImage(
`${playedRows.length} / ${shownRows.length} 谱面`,
`${desc.join(" · ")} · 排序：${$("mc-sort").selectedOptions[0].text}${pages > 1 ? ` · 第 ${page + 1}/${pages} 张` : ""}`,
[
["已游玩", `${playedRows.length}`, shownRows.length ? `${((playedRows.length / shownRows.length) * 100).toFixed(1)}% · 平均 rating ${avg(playedRows, "rating").toFixed(1)}` : "—"],
["平均达成率", `${avg(playedRows, "achievement").toFixed(4)}%`, `SSS+ ${cnt("rank", /^SSS\+$/)} · SSS ${cnt("rank", /^SSS$/)} · SS+ ${cnt("rank", /^SS\+$/)}`],
["AP / FC", `${cnt("fc", /^AP/)} / ${cnt("fc", /^FC/)}`, `AP+ ${cnt("fc", /^AP\+$/)} · FC+ ${cnt("fc", /^FC\+$/)} · FDX ${cnt("sync", /^FDX/)}`],
["DX 分 ★5", `${playedRows.filter((s) => s.dx_star >= 5).length}`, `★4 ${playedRows.filter((s) => s.dx_star === 4).length} · ★3 ${playedRows.filter((s) => s.dx_star === 3).length}`],
],
[{ name: "查分结果", note: pages > 1 ? `第 ${page + 1}/${pages} 张（${page * PER_IMAGE + 1}〜${page * PER_IMAGE + rows.length}）` : "", rows, label: (s, i) => `${page * PER_IMAGE + i + 1}` }]
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
