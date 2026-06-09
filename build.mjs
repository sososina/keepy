import fs from "node:fs";
import path from "node:path";

const root = path.resolve("..");
const publicDir = path.resolve("public");
const siteUrl = (process.env.SITE_URL || "https://keepy.kr").replace(/\/$/, "");
const categories = {
  iphone: "아이폰",
  mac: "맥",
  ipad: "아이패드",
  "apple-watch": "애플워치",
  troubleshooting: "문제해결",
  "news-analysis": "뉴스해설",
};
const categoryDescriptions = {
  iphone: "아이폰을 처음 설정하는 순간부터 저장공간, 배터리, 사진 관리, 중고 구매까지 실제 사용자가 자주 막히는 지점을 순서대로 정리합니다.",
  mac: "Mac을 오래 쓰기 위해 필요한 초기 설정, 백업, 저장공간 관리, 생산성 기능과 구매 전 판단 기준을 다룹니다.",
  ipad: "아이패드를 노트북처럼 쓸 수 있는지, 필기와 문서 작업에 어떤 구성이 맞는지 실사용 관점으로 설명합니다.",
  "apple-watch": "애플워치의 알림, 운동 기록, 배터리, 연결 문제, 건강 기능을 과하지 않게 꾸준히 쓰는 방법을 안내합니다.",
  troubleshooting: "iCloud, AirDrop, Apple ID, 문자 연동처럼 애플 기기에서 자주 꼬이는 문제를 안전한 순서로 해결합니다.",
  "news-analysis": "발표, 루머, 가격, 호환성 소식을 단순 뉴스가 아니라 구매와 사용 판단에 필요한 맥락으로 해석합니다.",
};

const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const stripWpBlocks = (html) => html.replace(/<!--\s*\/?wp:[^>]*-->/g, "");
const slugify = (title) => title.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "post";

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function parseSlugMap() {
  const source = read("wp_agl_update_slugs.php");
  const map = new Map();
  for (const match of source.matchAll(/'([^']+)'\s*=>\s*'([^']+)'/g)) {
    map.set(match[1], match[2]);
  }
  return map;
}

function parsePosts() {
  const source = read("wp_agl_setup.php");
  const block = source.match(/\$posts\s*=\s*\[([\s\S]*?)\n\];\n\nforeach \(\$posts/);
  if (!block) throw new Error("Could not locate $posts block in wp_agl_setup.php");
  const posts = [];
  const re = /^\s{4}\['([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*\[/gm;
  for (const match of block[1].matchAll(re)) {
    if (!categories[match[2]]) continue;
    posts.push({ title: match[1], category: match[2], intro: match[3] });
  }
  return posts;
}

function context(title) {
  const base = {
    angle: "애플 제품을 오래 쓰는 사용자가 실제 생활에서 겪는 불편을 줄이는 관점",
    situations: ["기능 이름은 알고 있지만 어디서 설정해야 하는지 헷갈릴 때", "문제가 가끔 반복되지만 원인을 단정하기 어려울 때", "새 기기를 살지 기존 기기를 더 쓸지 판단해야 할 때"],
    menus: ["설정 앱 검색", "Apple ID 설정", "iCloud 상태", "배터리와 저장공간 화면"],
    signals: ["같은 문제가 하루 이상 반복되는 경우", "여러 기기에서 동시에 증상이 보이는 경우", "데이터 삭제나 계정 변경이 필요한 경우"],
    routine: "한 번에 모든 설정을 바꾸지 말고, 현재 상태를 기록한 뒤 한 항목씩 바꾸며 체감 변화를 확인합니다.",
  };
  const cases = [
    ["저장공간", "사진 몇 장을 지우는 임시 처방이 아니라, 저장공간이 반복해서 부족해지는 구조를 줄이는 관점", ["업데이트를 하려는데 여유 공간이 부족하다고 나올 때", "사진과 동영상이 많지만 무엇을 지워야 할지 모를 때", "앱은 많지 않은데 시스템 데이터가 크게 보일 때"], ["설정 > 일반 > iPhone 저장 공간", "사진 > 최근 삭제된 항목", "메시지 > 대용량 첨부파일", "iCloud 사진 설정"], ["저장공간 막대에서 사진보다 앱 데이터가 더 클 때", "메시지 첨부파일이 수 GB 이상 쌓였을 때", "오래된 기기 백업이 iCloud 용량을 차지할 때"], "매달 한 번 저장공간 화면을 열고, 삭제 전 백업이 필요한 항목과 다시 받을 수 있는 항목을 분리합니다."],
    ["배터리", "배터리 성능 최대치 하나로 결론 내리지 않고, 실제 사용 패턴과 설정을 함께 보는 관점", ["아침에 충전했는데 오후 전에 배터리가 크게 줄 때", "업데이트 이후 며칠간 발열과 소모가 늘어난 느낌이 들 때", "특정 앱을 쓴 날만 배터리가 빨리 닳을 때"], ["설정 > 배터리", "설정 > 개인정보 보호 및 보안 > 위치 서비스", "설정 > 일반 > 백그라운드 앱 새로 고침", "디스플레이 및 밝기"], ["화면 꺼짐 상태에서도 특정 앱 사용량이 높을 때", "위치 서비스 아이콘이 자주 표시될 때", "신호가 약한 장소에서 셀룰러 사용이 길 때"], "배터리 설정을 바꾼 뒤 최소 이틀은 비슷한 사용 조건으로 비교해 실제 효과를 확인합니다."],
    ["AirDrop", "무선 전송 실패를 기기 고장으로 단정하지 않고 네트워크, 수신 범위, 계정 조건을 나눠 확인하는 관점", ["상대 기기가 목록에 뜨지 않을 때", "전송 중 대기 상태에서 멈출 때", "사진은 되는데 파일 전송만 실패할 때"], ["제어센터의 AirDrop 수신 설정", "Wi-Fi와 Bluetooth", "개인용 핫스팟", "연락처 카드와 Apple ID"], ["회사나 학교 네트워크에서만 실패할 때", "연락처만 수신 상태에서 상대가 보이지 않을 때", "개인용 핫스팟이 켜져 있을 때"], "수신 범위를 잠시 모두로 바꾸고 전송이 끝나면 다시 제한하는 방식으로 개인정보와 편의성을 균형 있게 맞춥니다."],
    ["iCloud", "동기화 오류를 삭제로 해결하지 않고, 원본 데이터 위치와 계정 상태를 먼저 확인하는 관점", ["한 기기에서 보이는 사진이나 메모가 다른 기기에는 보이지 않을 때", "삭제한 데이터가 다시 나타날 때", "iCloud 용량이 부족하다는 안내가 반복될 때"], ["iCloud.com", "설정 > Apple ID > iCloud", "사진과 메모의 iCloud 토글", "iCloud 저장 공간 관리"], ["기기마다 Apple ID가 다를 때", "저전력 모드나 네트워크 제한 때문에 업로드가 멈춰 있을 때", "최근 삭제된 항목에 데이터가 남아 있을 때"], "삭제보다 복사본 만들기를 먼저 하고, 동기화가 끝날 시간을 충분히 둔 다음 결과를 확인합니다."],
    ["구매", "스펙 표보다 본인의 사용 기간, 저장공간, 액세서리, 보상 판매까지 합쳐 실제 비용을 계산하는 관점", ["새 제품 발표가 가까워 보여 구매를 미루고 싶을 때", "현재 기기가 느리지만 배터리 교체로 버틸 수 있을지 고민될 때", "기본형과 상위 모델 가격 차이가 애매할 때"], ["현재 기기의 배터리 상태", "저장공간 사용량", "보상 판매 가능 여부", "필수 액세서리 비용"], ["필요한 기능이 특정 고급 모델에만 있을 때", "현재 기기의 불편이 배터리나 저장공간 정리로 해결될 때", "출시 초기 이슈가 아직 정리되지 않았을 때"], "구매 전 현재 기기의 불편을 세 가지로 적고, 새 기기가 그 문제를 직접 해결하는지 확인합니다."],
    ["알림", "모든 알림을 받는 방식에서 벗어나, 손목과 화면에 올라올 가치가 있는 알림만 남기는 관점", ["하루 종일 알림 때문에 집중이 깨질 때", "애플워치가 계속 울려 피로감이 커질 때", "업무와 개인 알림이 섞여 중요한 연락을 놓칠 때"], ["설정 > 알림", "집중 모드", "애플워치 앱의 알림 설정", "시간 지정 요약"], ["쇼핑과 뉴스 알림이 전화나 메시지보다 자주 뜰 때", "집중 모드 예외가 너무 많을 때", "손목 알림을 보고도 바로 처리하지 않는 앱이 많을 때"], "일주일 동안 실제로 바로 처리한 알림만 남기고, 나머지는 요약이나 끄기로 돌립니다."],
  ];
  const found = cases.find(([needle]) => title.includes(needle));
  return found ? { angle: found[1], situations: found[2], menus: found[3], signals: found[4], routine: found[5] } : base;
}

function article(post) {
  const ctx = context(post.title);
  const list = (items) => `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
  return `
    <p>${esc(post.intro)}</p>
    <p>이 글은 단순한 기능 소개가 아니라 ${esc(ctx.angle)}에서 정리한 실전 가이드입니다. 애플 제품은 기능이 서로 연결되어 있기 때문에 한 가지 설정만 보고 판단하면 문제의 원인을 놓치기 쉽습니다.</p>
    <h2>이 글이 필요한 상황</h2>${list(ctx.situations)}
    <h2>먼저 확인할 설정과 화면</h2>${list(ctx.menus.map((item) => `${item}을 확인합니다.`))}
    <h2>단계별 점검 방법</h2>
    <h3>1. 현재 상태를 기록합니다</h3><p>설정값을 바꾸기 전에 현재 화면을 캡처하거나 숫자를 적어 둡니다. 그래야 변경 후 좋아졌는지 비교할 수 있습니다.</p>
    <h3>2. 영향이 작은 설정부터 바꿉니다</h3><p>데이터 삭제, 계정 로그아웃, 초기화처럼 되돌리기 어려운 조치보다 쉽게 되돌릴 수 있는 설정부터 조정합니다.</p>
    <h3>3. 기기 하나만 보지 않습니다</h3><p>아이폰, Mac, 아이패드, 애플워치는 같은 Apple ID와 iCloud를 공유할 때가 많습니다.</p>
    <h3>4. 변경 후 관찰 시간을 둡니다</h3><p>사진 동기화, 백업, 인덱싱, 업데이트 직후 정리 작업은 시간이 걸릴 수 있습니다.</p>
    <h2>주의해야 할 신호</h2>${list(ctx.signals)}
    <h2>유지 관리 루틴</h2><p>${esc(ctx.routine)}</p>
    <h2>FAQ</h2><h3>문제가 계속되면 바로 초기화해야 하나요?</h3><p>초기화는 마지막 선택지입니다. 백업, 계정, 동기화, 네트워크, 앱 권한을 먼저 확인하고도 문제가 반복될 때 고려하는 편이 안전합니다.</p>`;
}

function layout(title, body, description = "아이폰, 맥, 아이패드, 애플워치를 더 오래 잘 쓰기 위한 실전 가이드") {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="stylesheet" href="/styles.css"><link rel="alternate" type="application/rss+xml" href="/feed.xml"></head><body><header class="agl-header"><div class="agl-wrap agl-header-inner"><a class="agl-brand" href="/"><div class="agl-brand-title">애플가이드랩</div><div class="agl-brand-subtitle">아이폰, 맥, 아이패드, 애플워치를 더 오래 잘 쓰기 위한 실전 가이드</div></a><nav class="agl-nav" aria-label="주 메뉴"><a href="/">홈</a><a href="/category/iphone/">아이폰</a><a href="/category/mac/">맥</a><a href="/category/ipad/">아이패드</a><a href="/category/apple-watch/">애플워치</a><a href="/category/troubleshooting/">문제해결</a><a href="/category/news-analysis/">뉴스해설</a><a href="/products/">상품구매하기</a><a href="/about/">소개</a><a href="/contact/">문의</a></nav></div></header>${body}<footer class="agl-footer"><div class="agl-wrap agl-footer-inner"><div>© 2026 애플가이드랩. Apple 제품 활용을 위한 독립 가이드 블로그입니다.</div><div class="agl-footer-links"><a href="/about/">소개</a><a href="/contact/">문의</a><a href="/privacy-policy/">개인정보처리방침</a></div></div></footer></body></html>`;
}

function writePage(route, html) {
  const dir = path.join(publicDir, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
}

function postCard(post) {
  return `<li class="agl-card"><h2 class="agl-card-title"><a href="${post.url}">${esc(post.title)}</a></h2><div class="agl-date">${post.date}</div><div class="agl-card-body"><a class="agl-thumb" href="${post.url}" data-label="${esc(post.categoryName)}"></a><div class="agl-card-copy"><p class="agl-excerpt">${esc(post.intro)}</p><a class="agl-readmore" href="${post.url}">내용 보기 →</a></div></div></li>`;
}

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(path.join(root, "appleguidelab/style.css"), path.join(publicDir, "styles.css"));
copyDir(path.join(root, "assets"), path.join(publicDir, "assets"));

const slugMap = parseSlugMap();
const missingSlugMap = new Map([
  ["아이폰 집중 모드를 생활 패턴에 맞게 쓰는 방법", "iphone-focus-mode-guide"],
  ["Mac 단축키를 업무 흐름에 맞게 익히는 순서", "mac-keyboard-shortcuts-workflow"],
  ["아이패드로 문서 작업할 때 편한 파일 정리법", "ipad-file-organization-guide"],
  ["애플워치를 처음 쓰는 사람이 켜두면 좋은 기능", "new-apple-watch-essential-settings"],
  ["Apple ID 비밀번호를 잊었을 때 당황하지 않는 순서", "apple-id-password-reset-guide"],
]);
const unpublishedTitles = new Set([...missingSlugMap.keys()]);
const posts = parsePosts().filter((post) => !unpublishedTitles.has(post.title)).map((post, index) => {
  const slug = slugMap.get(post.title) || missingSlugMap.get(post.title) || slugify(post.title);
  return { ...post, slug, url: `/${slug}/`, categoryName: categories[post.category], date: new Date(Date.UTC(2026, 5, 3 - index)).toISOString().slice(0, 10).replaceAll("-", ".") };
});

for (const post of posts) {
  const body = `<main class="agl-single" id="main"><article><p class="agl-kicker">${esc(post.categoryName)}</p><h1 class="agl-single-title">${esc(post.title)}</h1><div class="agl-single-meta"><span>${post.date}</span><span>애플가이드랩 편집부</span></div><div class="agl-single-image" data-label="${esc(post.categoryName)}"></div><section class="agl-summary-box"><h2>요약</h2><p>${esc(post.intro)}</p></section><div class="agl-article-content">${article(post)}</div></article></main>`;
  writePage(post.slug, layout(`${post.title} - 애플가이드랩`, body, post.intro));
}

const topics = [
  ["아이폰", "/category/iphone/", "저장공간, 배터리, 사진, 초기 설정과 구매 전 확인할 기준을 정리합니다."],
  ["맥", "/category/mac/", "처음 설정, 백업, 저장공간, 생산성 기능과 Mac 구매 판단을 안내합니다."],
  ["아이패드", "/category/ipad/", "필기, 문서 작업, 배터리 관리, 모델 선택 기준을 실사용 관점으로 다룹니다."],
  ["애플워치", "/category/apple-watch/", "알림 피로, 운동 기록, 배터리와 연결 문제를 차분히 해결합니다."],
  ["문제해결", "/category/troubleshooting/", "iCloud, AirDrop, Apple ID처럼 실패하면 불안한 문제를 안전한 순서로 풉니다."],
  ["뉴스해설", "/category/news-analysis/", "발표와 루머를 구매 판단에 필요한 맥락으로 다시 정리합니다."],
];
let home = `<main class="agl-wrap" id="main"><section class="agl-hero"><p class="agl-kicker">APPLE GUIDE LAB</p><h1>Apple 기기와 일상을 연결하는 실전 가이드</h1><p>아이폰, 맥, 아이패드, 애플워치를 오래 잘 쓰기 위해 필요한 설정, 문제해결, 구매 판단, 제품 흐름을 한국어로 깊게 정리합니다.</p></section><section class="agl-section-label"><h2>최신 가이드</h2><a href="/category/news-analysis/">뉴스해설 보기</a></section><ul class="agl-post-list">${posts.slice(0, 10).map(postCard).join("")}</ul><section class="agl-section-label"><h2>주제별로 보기</h2></section><section class="agl-topic-grid" aria-label="주제별 카테고리">${topics.map(([name, url, text]) => `<article class="agl-topic-card"><a href="${url}">${name}</a><p>${text}</p></article>`).join("")}</section></main>`;
writePage("", layout("애플가이드랩", home));

for (const [slug, name] of Object.entries(categories)) {
  const body = `<main class="agl-wrap" id="main"><section class="agl-archive-head"><p class="agl-kicker">CATEGORY</p><h1>${esc(name)}</h1><p>${esc(categoryDescriptions[slug])}</p></section><ul class="agl-post-list">${posts.filter((post) => post.category === slug).map(postCard).join("")}</ul></main>`;
  writePage(path.join("category", slug), layout(`${name} - 애플가이드랩`, body, categoryDescriptions[slug]));
}

const pages = [
  ["about", "소개", "<h2>애플 제품을 더 오래, 더 편하게 쓰는 기록</h2><p>애플가이드랩은 아이폰, 맥, 아이패드, 애플워치를 사용하는 사람이 매일 마주치는 설정, 오류, 구매 전 고민을 차분하게 정리하는 한국어 전문 블로그입니다.</p><p>글은 문제 해결 순서, 설정 체크리스트, 제품군별 활용법, 애플 생태계 변화 해설로 구성됩니다.</p>"],
  ["contact", "문의", '<h2>문의하기</h2><p>애플가이드랩의 글 내용, 오류 제보, 일반 문의는 이메일로 보내주세요.</p><p><strong>이메일:</strong> <a href="mailto:hello@appleguidelab.com">hello@appleguidelab.com</a></p>'],
  ["privacy-policy", "개인정보처리방침", "<h2>개인정보처리방침</h2><p>애플가이드랩은 문의 응대, 사이트 운영, 보안 및 통계 확인을 위해 필요한 최소한의 정보를 처리할 수 있습니다.</p><p>추후 Google AdSense 또는 Google Analytics를 연결하는 경우 쿠키와 광고 식별자가 사용될 수 있습니다.</p>"],
];
for (const [slug, title, content] of pages) {
  writePage(slug, layout(`${title} - 애플가이드랩`, `<main class="agl-single" id="main"><article><p class="agl-kicker">PAGE</p><h1 class="agl-single-title">${title}</h1><div class="agl-article-content">${stripWpBlocks(content)}</div></article></main>`));
}

const productNames = ["아이폰 충전기와 케이블", "맥세이프 보조배터리", "아이폰 케이스와 보호필름", "아이패드 키보드 케이스", "맥북 USB-C 허브", "애플워치 스트랩"];
const products = `<main class="agl-wrap" id="main"><section class="agl-archive-head"><p class="agl-kicker">SHOPPING GUIDE</p><h1>상품구매하기</h1><p>애플 제품을 더 편하게 쓰는 데 도움이 되는 액세서리를 용도별로 정리했습니다.</p></section><section class="agl-topic-grid">${productNames.map((title) => `<article class="agl-topic-card"><a href="https://www.coupang.com/np/search?q=${encodeURIComponent(title)}">${title}</a><p>호환 모델, 발열, 내구성, 휴대성을 먼저 확인하고 고르는 편이 좋습니다.</p></article>`).join("")}</section></main>`;
writePage("products", layout("상품구매하기 - 애플가이드랩", products));

const routes = ["", ...posts.map((post) => post.slug), ...pages.map(([slug]) => slug), "products"];
fs.writeFileSync(path.join(publicDir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((route) => `  <url><loc>${siteUrl}/${route ? `${route}/` : ""}</loc></url>`).join("\n")}\n</urlset>\n`);
fs.writeFileSync(path.join(publicDir, "feed.xml"), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>애플가이드랩</title><link>${siteUrl}/</link><description>애플 제품 실전 가이드</description>${posts.slice(0, 20).map((post) => `<item><title>${esc(post.title)}</title><link>${siteUrl}${post.url}</link><description>${esc(post.intro)}</description></item>`).join("")}</channel></rss>`);
fs.writeFileSync(path.join(publicDir, "_headers"), "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n");

console.log(`Built ${posts.length} posts, ${Object.keys(categories).length} categories, 4 pages into ${publicDir}`);
