/* Planta do escritório — módulo independente.
   Uso: no index.html, adicione a linha  <script src="planta.js">  (tag script) logo DEPOIS da tag que carrega app.js.
   Regra: o campo "Posição" do item guarda o nº da mesa (ex.: 20 ou "Mesa 20") ou o nome da sala (Creta, Ios, Fábio, Paros). */
(function () {
  /* ---------- Layout (coordenadas da imagem original, 2485×1484) ---------- */
  const ROOMS = [
    { k: "creta", n: "Creta", x: 110, y: 100, w: 620, h: 340 },
    { k: "ios", n: "Ios", x: 735, y: 100, w: 345, h: 340 },
    { k: "fabio", n: "Fábio", x: 1265, y: 100, w: 325, h: 340 },
    { k: "paros", n: "Paros", x: 1595, y: 100, w: 765, h: 340 },
  ];
  const D = [];
  const add = (nums, x0, y, w, h, side) =>
    nums.forEach((n, i) => D.push({ k: "d" + n, n, x: x0 + i * 191, y, w, h, side }));
  add(["26", "25", "24"], 147, 607, 190, 85, "t");
  add(["23", "22", "21"], 147, 692, 190, 85, "b");
  add(["20", "19", "18"], 152, 917, 190, 85, "t");
  add(["17", "16", "15", "14"], 831, 605, 190, 82, "t");
  add(["13", "12", "11", "10"], 831, 687, 190, 82, "b");
  add(["09", "08", "07"], 1766, 602, 190, 85, "t");
  add(["06", "05", "04"], 1766, 687, 190, 85, "b");
  add(["03", "02", "01"], 1771, 912, 190, 84, "t");
  D.push({ k: "d27", n: "27", x: 1374, y: 997, w: 226, h: 60, side: "" });
  const BL = [
    [1718, 603, 47, 84, "TI"], [1718, 687, 47, 84, "Escritório"], [1724, 912, 47, 84, "O&M"],
    [153, 1320, 497, 60, "O&M"], [1620, 1378, 230, 48, "O&M"], [1850, 1378, 225, 48, "RH/NETZ"],
    [840, 999, 251, 58, ""], [1091, 999, 94, 58, "Financeiro"], [1185, 999, 94, 58, "Financeiro"],
    [1280, 999, 94, 58, "Legal"], [2318, 117, 40, 296, "NETZ"],
  ];
  const PAL = ["#5b5bf0", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#ef4444", "#64748b"];
  const PL = { q: "", sel: null };
  let M = null;

  /* ---------- Utilitários ---------- */
  const lab = (k) => (k[0] == "d" ? "Mesa " + k.slice(1) : ROOMS.find((r) => r.k == k).n);
  const qt = (x) => +x.qtd || 1;
  const short = (n) => { const p = n.trim().split(/\s+/); return p[0] + (p[1] ? " " + p[1][0] + "." : ""); };
  const ini = (n) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const col = (n) => PAL[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % PAL.length];
  const plural = (n) => n + (n == 1 ? " item" : " itens");
  function keyOf(p) {
    const t = nz(p || "");
    if (!t) return null;
    const r = ROOMS.find((r) => t.includes(nz(r.n)));
    if (r) return r.k;
    const m = String(p).match(/\d+/);
    if (m && +m[0] >= 1 && +m[0] <= 27) return "d" + String(+m[0]).padStart(2, "0");
    return null;
  }
  function model() {
    const sp = {}, per = {}, sem = [];
    [...D, ...ROOMS].forEach((s) => (sp[s.k] = { items: [] }));
    S.forEach((x) => {
      const k = keyOf(x.pos), n = (x.colab || "").trim();
      k ? sp[k].items.push(x) : sem.push(x);
      if (n) {
        const p = per[n] || (per[n] = { name: n, keys: new Set(), qtd: 0, sem: 0 });
        p.qtd += qt(x);
        k ? p.keys.add(k) : p.sem++;
      }
    });
    Object.entries(collaboratorPositions || {}).forEach(([name, pos]) => {
      const k = keyOf(pos);
      if (!k) return;
      const p = per[name] || (per[name] = { name, keys: new Set(), qtd: 0, sem: 0 });
      p.keys.add(k);
      sp[k].mappedPpl = [...(sp[k].mappedPpl || []), name];
    });
    Object.values(sp).forEach((s) => {
      s.ppl = [...new Set([...s.items.map((i) => (i.colab || "").trim()).filter(Boolean), ...(s.mappedPpl || [])])];
      s.qtd = s.items.reduce((t, i) => t + qt(i), 0);
    });
    return { sp, per, sem };
  }
  function hlKeys(m) {
    const s = PL.sel, q = nz(PL.q);
    if (s) {
      const r = s.t == "spot" ? new Set([s.k]) : s.t == "person" ? new Set(m.per[s.n]?.keys || []) : new Set();
      return r.size ? r : null;
    }
    if (!q) return null;
    const r = new Set();
    Object.entries(m.sp).forEach(([k, p]) => {
      if (nz(lab(k)).includes(q) || p.ppl.some((n) => nz(n).includes(q))) r.add(k);
    });
    return r;
  }

  /* ---------- Desenho da planta ---------- */
  const ROT = { t: 0, b: 180, l: -90, r: 90 };
  const chair = (cx, cy, dir, c = "cr") =>
    `<g class="${c}" transform="translate(${cx} ${cy}) rotate(${ROT[dir]})"><rect class="cs" x="-22" y="-18" width="44" height="36" rx="14"/><rect class="cb" x="-22" y="-30" width="44" height="10" rx="5"/></g>`;
  const meet = (x, y, w, h, n, side) => {
    let s = `<rect class="mt" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>`;
    for (let i = 0; i < n; i++) { const cx = x + (w / n) * (i + 0.5); s += chair(cx, y - 30, "t") + chair(cx, y + h + 30, "b"); }
    return side ? s + chair(x - 30, y + h / 2, "l") + chair(x + w + 30, y + h / 2, "r") : s;
  };
  function mapSvg(m, H) {
    const st = (k) => (H ? (H.has(k) ? " hl" : " dim") : "");
    let o = `<svg viewBox="0 0 2485 1484" class="pl-svg"><rect x="100" y="92" width="2265" height="1305" rx="10" class="pl-floor"/>`;
    ROOMS.forEach((r) => {
      const p = m.sp[r.k];
      o += `<g class="sp room${st(r.k)}" data-k="${r.k}"><rect class="dk" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/><text class="rn" x="${r.x + 24}" y="${r.y + 52}">${r.n}</text>${p.items.length ? `<text class="rc" x="${r.x + r.w - 24}" y="${r.y + 52}" text-anchor="end">${plural(p.qtd)}</text>` : ""}</g>`;
    });
    o += `<g class="dc">${meet(230, 214, 254, 125, 3, 1)}${meet(911, 206, 166, 125, 2, 0)}${meet(1885, 207, 254, 125, 3, 1)}<rect class="mt" x="1268" y="242" width="188" height="84" rx="6"/>${chair(1362, 212, "t")}`;
    o += `<rect class="wall" x="100" y="92" width="2265" height="1305" rx="10" fill="none" stroke-width="14"/>`;
    [[110, 440, 2360, 440], [732, 100, 732, 440], [1080, 100, 1080, 440], [1265, 100, 1265, 440], [1592, 100, 1592, 440]].forEach(([a, b, c, d]) => (o += `<line class="wall" x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke-width="8"/>`));
    [[617, 440, 707, 338], [760, 440, 850, 335], [1165, 430, 1262, 333], [1480, 440, 1570, 333], [1605, 440, 1695, 328]].forEach(([a, b, c, d]) => (o += `<path class="door" d="M${a} ${b} A95 105 0 0 1 ${c} ${d}"/>`));
    [[724, 1365], [1178, 1363], [2203, 1360]].forEach(([x, y]) => (o += `<rect class="mt" x="${x}" y="${y}" width="120" height="28"/><path class="door" stroke-dasharray="8 8" d="M${x + 4} ${y - 100} A110 100 0 0 1 ${x + 116} ${y - 2}"/>`));
    BL.forEach(([x, y, w, h, t]) => {
      const v = h > w * 1.5, L = (v ? h : w) - 10, fit = t.length * 20 * 0.56 > L ? ` textLength="${L}" lengthAdjust="spacingAndGlyphs"` : "";
      o += `<rect class="bk" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>` + (t ? `<text class="bt" transform="translate(${x + w / 2} ${y + h / 2 + 7})${v ? " rotate(-90)" : ""}" text-anchor="middle"${fit}>${t}</text>` : "");
    });
    o += `</g>`;
    D.forEach((d) => {
      const p = m.sp[d.k], occ = p.ppl.length > 0, cx = d.x + d.w / 2;
      o += `<g class="sp${occ ? " occ" : p.items.length ? " only" : ""}${st(d.k)}" data-k="${d.k}" style="--p:${Math.min(62, 20 + p.qtd * 6)}%">`;
      if (d.side) o += chair(cx, d.side == "t" ? d.y - 30 : d.y + d.h + 30, d.side, "chair");
      o += `<rect class="dk" x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" rx="8"/><text class="dn" x="${d.x + 12}" y="${d.y + 26}">${d.n}</text>`;
      if (occ) o += `<text class="nm" x="${cx}" y="${d.y + d.h / 2 + 6}" text-anchor="middle">${esc(short(p.ppl[0]))}${p.ppl.length > 1 ? " +" + (p.ppl.length - 1) : ""}</text><text class="ct" x="${cx}" y="${d.y + d.h - 10}" text-anchor="middle">${plural(p.qtd)}</text>`;
      else o += `<text class="${p.items.length ? "ct" : "fr"}" x="${cx}" y="${d.y + d.h / 2 + 12}" text-anchor="middle">${p.items.length ? plural(p.qtd) : "Livre"}</text>`;
      o += `</g>`;
    });
    return o + `</svg>`;
  }

  /* ---------- Painel lateral ---------- */
  const row = (x) => { const k = keyOf(x.pos); return `<div class="pl-it" data-id="${esc(x.id)}"><b>${esc(x.id)}</b><span>${esc(dsc(x))}<em>${k ? lab(k) : "sem mesa"}</em></span>${stp(x.status)}</div>`; };
  const chips = (keys) => [...keys].sort().map((k) => `<button class="pl-chip" data-k="${k}">${lab(k)}</button>`).join("");
  function side(m) {
    const s = PL.sel;
    if (s) {
      let h = `<button class="btn" data-back style="margin-bottom:14px">← Todos os colaboradores</button>`;
      if (s.t == "spot") {
        const p = m.sp[s.k];
        h += `<h3>${lab(s.k)}</h3><div class="sub" style="margin-bottom:12px">${p.ppl.length ? p.ppl.map(esc).join(", ") : "Sem colaborador"} · ${plural(p.qtd)}</div>`;
        h += p.ppl.map((n) => `<div class="pl-pr" data-p="${esc(n)}"><span class="pl-av" style="background:${col(n)}">${ini(n)}</span><b>${esc(n)}</b></div>`).join("");
        return h + (p.items.length ? `<div class="pl-list">${p.items.map(row).join("")}</div>` : `<div class="sub">Livre — nenhum item com essa posição.</div>`);
      }
      if (s.t == "person") {
        const p = m.per[s.n], its = S.filter((x) => (x.colab || "").trim() == s.n);
        const position = positionForCollaborator(s.n);
        const options = [
          ...D.map((d) => ({ value: String(Number(d.n)), label: lab(d.k) })),
          ...ROOMS.map((r) => ({ value: r.n, label: r.n })),
        ];
        const positionOptions = options
          .map(({ value, label }) => `<option value="${esc(value)}" ${value === position ? "selected" : ""}>${esc(label)}</option>`)
          .join("");
        h += `<div style="margin:10px 0 12px"><label for="pl-seat" class="sub" style="display:block;margin-bottom:5px">Posição do colaborador</label><select id="pl-seat" data-person="${esc(s.n)}" style="width:100%"><option value="">Sem posição definida</option>${positionOptions}</select></div>`;
        return h + `<div class="pl-pr" style="cursor:default"><span class="pl-av" style="background:${col(s.n)}">${ini(s.n)}</span><b>${esc(s.n)}</b><span class="pl-n">${plural(p ? p.qtd : 0)}</span></div><div class="pl-ch" style="margin:8px 0 12px">${p && p.keys.size ? chips(p.keys) : '<span class="sub">Sem mesa definida</span>'}</div><div class="pl-list">${its.map(row).join("")}</div>`;
      }
      return h + `<h3>Itens sem posição</h3><div class="sub" style="margin-bottom:10px">Edite o campo Posição do item para colocá-lo na planta.</div><div class="pl-list">${m.sem.slice(0, 150).map(row).join("")}</div>`;
    }
    const q = nz(PL.q);
    const ppl = Object.values(m.per).filter((p) => !q || nz(p.name).includes(q) || [...p.keys].some((k) => nz(lab(k)).includes(q))).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return `<h3>Colaboradores <span class="pill">${ppl.length}</span></h3>` + (ppl.map((p) => `<div class="pl-pr" data-p="${esc(p.name)}"><span class="pl-av" style="background:${col(p.name)}">${ini(p.name)}</span><div style="min-width:0"><b>${esc(p.name)}</b><div class="pl-ch">${[...p.keys].sort().map((k) => `<i>${lab(k)}</i>`).join("")}${p.sem ? `<i class="w">${p.sem} sem mesa</i>` : ""}</div></div><span class="pl-n">${p.qtd}</span></div>`).join("") || `<div class="sub">Nenhum colaborador encontrado.</div>`);
  }

  function draw() {
    M = model();
    const occ = D.filter((d) => M.sp[d.k].ppl.length).length;
    const pessoas = Object.values(M.per).filter((p) => p.keys.size).length;
    const nasMesas = D.reduce((t, d) => t + M.sp[d.k].qtd, 0);
    const sem = M.sem.reduce((t, x) => t + qt(x), 0);
    $("#pl-kpis").innerHTML = [["Mesas ocupadas", occ + " / " + D.length], ["Colaboradores na planta", pessoas], ["Itens nas mesas", nasMesas]].map((k) => `<div class="card kpi"><span>${k[0]}</span><b>${k[1]}</b></div>`).join("") + `<div class="card kpi" data-sem style="cursor:pointer"><span>Itens sem posição</span><b>${sem}</b></div>`;
    $("#pl-map").innerHTML = mapSvg(M, hlKeys(M)) + `<div class="pl-leg"><span><i class="l0"></i>Livre</span><span><i class="l1"></i>Ocupada (mais escura = mais itens)</span><span><i class="l2"></i>Só equipamentos</span></div><div class="pl-tip" id="pl-tip"></div>`;
    $("#pl-side").innerHTML = side(M);
  }

  /* ---------- Montagem da aba ---------- */
  const css = document.createElement("style");
  css.textContent = `
.pl-top{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.pl-top input{max-width:360px}
.pl-wrap{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}
@media(max-width:1100px){.pl-wrap{grid-template-columns:1fr}}
#pl-map{position:relative}
.pl-svg{width:100%;height:auto;display:block}
.pl-floor{fill:var(--bg);stroke:none}
.wall{stroke:var(--mut);stroke-linecap:round}
.door{fill:none;stroke:var(--mut);stroke-width:3;opacity:.7}
.mt{fill:var(--card);stroke:var(--bd);stroke-width:3}
.cs,.cb{fill:var(--bd)}.cb{opacity:.75}
.bk{fill:#c99b6d}.bt{fill:#fff;font-size:20px;font-weight:600}
.dc{pointer-events:none}
.sp{cursor:pointer;transition:opacity .2s}
.sp .dk{fill:var(--card);stroke:var(--bd);stroke-width:3;transition:fill .2s,stroke .15s}
.sp.room .dk{fill:color-mix(in srgb,var(--card) 55%,transparent);stroke-width:0}
.sp.occ .dk{fill:color-mix(in srgb,var(--ac) var(--p),var(--card));stroke:var(--ac)}
.sp.occ .chair .cs,.sp.occ .chair .cb{fill:var(--ac)}
.sp.only .dk{fill:color-mix(in srgb,#f59e0b 22%,var(--card));stroke:#f59e0b}
.sp:hover .dk{stroke:var(--ac);stroke-width:6}
.sp.room:hover .dk{fill:color-mix(in srgb,var(--ac) 12%,var(--card));stroke-width:0}
.sp.dim{opacity:.28}
.sp.hl .dk{stroke:var(--ac);stroke-width:7}
.sp.hl{animation:plp 1.4s ease-in-out infinite}
@keyframes plp{50%{filter:drop-shadow(0 0 16px var(--ac))}}
.dn{font-size:22px;fill:var(--mut);font-weight:600}
.nm{font-size:23px;font-weight:700;fill:var(--tx)}
.ct{font-size:24px;fill:var(--mut);font-weight:600}
.fr{font-size:24px;fill:var(--mut);opacity:.7}
.rn{font-size:40px;font-weight:700;fill:var(--tx)}.rc{font-size:28px;font-weight:600;fill:var(--ac)}
.pl-leg{display:flex;gap:18px;flex-wrap:wrap;margin-top:10px;font-size:12px;color:var(--mut)}
.pl-leg span{display:flex;align-items:center;gap:6px}
.pl-leg i{width:14px;height:14px;border-radius:4px;border:2px solid var(--bd);background:var(--card)}
.pl-leg .l1{background:color-mix(in srgb,var(--ac) 45%,var(--card));border-color:var(--ac)}
.pl-leg .l2{background:color-mix(in srgb,#f59e0b 22%,var(--card));border-color:#f59e0b}
.pl-tip{position:absolute;display:none;pointer-events:none;background:var(--tx);color:var(--bg);padding:9px 12px;border-radius:10px;font-size:12px;line-height:1.5;max-width:260px;z-index:5;box-shadow:var(--sh)}
#pl-side{max-height:calc(100vh - 150px);overflow:auto;position:sticky;top:16px}
.pl-pr{display:flex;align-items:center;gap:10px;padding:8px;border-radius:12px;cursor:pointer}
.pl-pr:hover{background:var(--bg)}
.pl-pr b{font-size:13px}
.pl-av{width:32px;height:32px;border-radius:10px;color:#fff;font-size:12px;font-weight:700;display:grid;place-items:center;flex:none}
.pl-n{margin-left:auto;font-weight:700;font-size:12px;background:var(--bg);border-radius:99px;padding:2px 9px}
.pl-ch{display:flex;gap:4px;flex-wrap:wrap;margin-top:3px}
.pl-ch i,.pl-chip{font-style:normal;font-size:11px;font-weight:600;background:#5b5bf022;color:var(--ac);border-radius:99px;padding:2px 8px;border:0;font-family:inherit}
.pl-chip{cursor:pointer}
.pl-ch i.w{background:#d9770622;color:var(--wa)}
.pl-list{margin-top:10px}
.pl-it{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:9px 6px;border-bottom:1px solid var(--bd);cursor:pointer;font-size:13px}
.pl-it:hover{background:var(--bg)}
.pl-it em{display:block;font-style:normal;font-size:11px;color:var(--mut)}`;
  document.head.appendChild(css);

  const btn = document.createElement("button");
  btn.className = "nav";
  btn.dataset.t = "plan";
  btn.innerHTML = '<i class="fa-solid fa-map-location-dot"></i> Planta do escritório';
  btn.onclick = () => go("plan");
  const navs = document.querySelectorAll(".nav");
  navs[navs.length - 1].after(btn);

  const sec = document.createElement("section");
  sec.id = "plan";
  sec.className = "hide";
  sec.innerHTML = `<div class="pl-top"><input id="pl-q" placeholder="Buscar colaborador ou mesa… (ex.: Ana, 20)"><button class="btn" id="pl-clr">Limpar</button><span class="sub">Clique em uma mesa ou colaborador para ver os itens.</span></div>
<div class="kpis" id="pl-kpis"></div>
<div class="pl-wrap"><div class="card" id="pl-map"></div><div class="card" id="pl-side"></div></div>`;
  $("#mov").after(sec);

  $("#pl-q").oninput = (e) => { PL.q = e.target.value; PL.sel = null; draw(); };
  $("#pl-clr").onclick = () => { PL.q = ""; PL.sel = null; $("#pl-q").value = ""; draw(); };
  sec.addEventListener("click", (e) => {
    const mesa = e.target.closest("#pl-map .sp[data-k]");
    const chip = e.target.closest("#pl-side .pl-chip[data-k]");
    const p = e.target.closest("[data-p]");
    const k = mesa?.dataset.k || chip?.dataset.k;
    if (mesa) e.__plMesaClick = true;
    if (k) {
      PL.sel = PL.sel?.t === "spot" && PL.sel.k === k ? null : { t: "spot", k };
    }
    else if (p) PL.sel = { t: "person", n: p.dataset.p };
    else if (e.target.closest("[data-back]")) PL.sel = null;
    else if (e.target.closest("[data-sem]")) PL.sel = { t: "sem" };
    else if (PL.sel?.t === "spot") PL.sel = null;
    else return;
    draw();
  });
  sec.addEventListener("change", async (e) => {
    const seat = e.target.closest("#pl-seat");
    if (!seat || !window.setCollaboratorPosition) return;
    seat.disabled = true;
    try { await window.setCollaboratorPosition(seat.dataset.person, seat.value); }
    catch (error) { seat.disabled = false; }
  });
  document.addEventListener("click", (e) => {
    if (e.__plMesaClick || PL.sel?.t !== "spot" || e.target.closest("#pl-map .sp[data-k]")) return;
    if (e.target.closest("#pl-side [data-k], #pl-side [data-p], #pl-side [data-back], #pl-side [data-sem]")) return;
    PL.sel = null;
    draw();
  });
  sec.addEventListener("mousemove", (e) => {
    const tip = $("#pl-tip"), g = e.target.closest("#pl-map .sp");
    if (!tip) return;
    if (!g || !M) { tip.style.display = "none"; return; }
    const k = g.dataset.k, p = M.sp[k], tipos = {};
    p.items.forEach((x) => (tipos[x.tipo] = (tipos[x.tipo] || 0) + qt(x)));
    tip.innerHTML = `<b>${lab(k)}</b><br>${p.ppl.length ? p.ppl.map(esc).join(", ") : p.items.length ? "Sem colaborador" : "Livre"}${p.items.length ? "<br>" + Object.entries(tipos).map(([t, n]) => esc(t) + " ×" + n).join(" · ") : ""}`;
    const r = $("#pl-map").getBoundingClientRect();
    tip.style.display = "block";
    tip.style.left = Math.min(e.clientX - r.left + 14, r.width - 270) + "px";
    tip.style.top = e.clientY - r.top + 16 + "px";
  });
  sec.addEventListener("mouseleave", () => { const t = $("#pl-tip"); if (t) t.style.display = "none"; });

  /* ---------- Integração com o app.js ---------- */
  TT.plan = "Planta do escritório";
  const _go = go, _render = render;
  go = function (t) { $("#plan").classList.toggle("hide", t != "plan"); _go(t); };
  render = function () { tab == "plan" ? draw() : _render(); };
})();
