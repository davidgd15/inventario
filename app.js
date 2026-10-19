const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );

const BASE = ["Em uso", "Disponível", "Indisponível", "Descartado"];

const statuses = () => [
  ...new Set([...BASE, ...S.map((x) => x.status).filter(Boolean)]),
];
const F = [
  ["id", "ID do Ativo"],
  ["tipo", "Tipo de Equipamento"],
  ["marca", "Marca"],
  ["modelo", "Modelo"],
  ["serie", "n° de Série"],
  ["qtd", "Qtd"],
  ["colab", "Colaborador"],
  ["empresa", "Empresa Proprietária"],
  ["local", "Localização"],
  ["pos", "Posição"],
  ["data", "Data de Aquisição"],
  ["nf", "NF"],
  ["valor", "Valor"],
  ["garantia", "Garantia"],
  ["status", "Status"],
  ["obs", "Obs"],
  ["imei", "Imei"],
];
const TRACK = ["colab", "local", "pos", "status", "empresa"];
const brl = (v) =>
  (+v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const now = () => new Date().toISOString();
const fd = (s) =>
  s
    ? new Date(s).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "";
const ld = (d) =>
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0"),
  lday = (n) => ld(new Date(Date.now() + n * 864e5));
const iso = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
function seed() {
  const T = [
    ["Notebook", "Dell", "Latitude 5440", 4800],
    ["Notebook", "Lenovo", "ThinkPad E14", 4200],
    ["Monitor", "LG", "24MK430H", 900],
    ["Celular", "Samsung", "Galaxy A54", 2100],
    ["Headset", "Jabra", "Evolve 20", 450],
    ["Impressora", "HP", "LaserJet M404", 2300],
    ["Switch", "Cisco", "SG350", 3500],
  ];
  const N = [
      "Ana Souza",
      "Bruno Lima",
      "Carla Dias",
      "Diego Alves",
      "Elisa Prado",
      "Fábio Rocha",
    ],
    L = ["Escritório", "Remoto", "Escritório", "Remoto"],
    P = ["Financeiro", "TI", "RH", "Comercial", "Operações"],
    E = ["Matriz", "Filial SP"];
  return Array.from({ length: 24 }, (_, i) => {
    const t = T[i % 7],
      st =
        i % 9 == 0
          ? "Indisponível"
          : i % 5 == 4
            ? "Disponível"
            : i % 13 == 0
              ? "Descartado"
              : "Em uso";
    return {
      demo: 1,
      id: "SN" + String(i + 1).padStart(3, "0"),
      tipo: t[0],
      marca: t[1],
      modelo: t[2],
      serie: "S" + (700000 + i * 137),
      qtd: 1,
      colab: st == "Em uso" ? N[i % 6] : "",
      empresa: E[i % 2],
      local: i % 6 == 5 ? "Estoque" : L[i % 4],
      pos: P[i % 5],
      data: iso(-300 - i * 20),
      nf: "NF-" + (1200 + i),
      valor: t[3],
      garantia: iso(-60 + i * 35),
      status: st,
      obs: "",
      imei: t[0] == "Celular" ? "35" + (1e13 + i * 7919) : "",
      hist: [{ d: now(), t: "Item cadastrado" }],
    };
  });
}
let S = [];
let assetImportLocked = false;
let collaboratorPositions = {};
const save = async () => {
  if (!S.length) return;
  const { error } = await window.assetsDb.from("ativos").upsert(
    S.map(({ demo, ...item }) => ({
      ...item,
      updated_at: item.updated_at || now(),
    })),
    { onConflict: "id" },
  );
  if (error) {
    console.error("Falha ao salvar ativos no Supabase", error);
    dlg("Não foi possível salvar no banco compartilhado: " + error.message);
    return false;
  }
  assetImportLocked = true;
  if ($("#bImp")) $("#bImp").disabled = true;
  return true;
};
let assetRequests = [];
let assetRequestsUnsub = null;
let syncingApprovedRequestIds = new Set();
let tab = "dash",
  flt = { q: "", tipo: "", status: "", empresa: "", local: "" },
  sort = { k: "id", d: 1 },
  charts = [];
const uniq = (k) => [...new Set(S.map((x) => x[k]).filter(Boolean))].sort();
const cnt = (k, w) => {
  const o = {};
  S.forEach((x) => {
    const v = x[k] || "—";
    o[v] = (o[v] || 0) + (w ? +x.valor || 0 : +x.qtd || 1);
  });
  return o;
};
const days = (g) =>
  g ? Math.ceil((new Date(g) - new Date(iso(0))) / 864e5) : null;
function gar(g) {
  const d = days(g);
  if (d === null) return '<span class="pill">—</span>';
  return d < 0
    ? `<span class="pill er">Vencida</span>`
    : d < 90
      ? `<span class="pill wa">${d}d</span>`
      : `<span class="pill ok">${new Date(g + "T00:00").toLocaleDateString("pt-BR")}</span>`;
}
const stp = (s) =>
  `<span class="pill ${{ "Em uso": "ac", Disponível: "ok", Indisponível: "wa", Descartado: "er" }[s] || ""}">${esc(s)}</span>`;
const nextId = () =>
  "SN" +
  String(
    Math.max(0, ...S.map((x) => +(x.id.match(/\d+$/) || [0])[0])) + 1,
  ).padStart(3, "0");
const actorName = () => {
  const user = firebase.auth().currentUser;
  const email = user?.email?.toLowerCase();
  return (
    window.ASSET_ALLOWED_USERS?.[email] ||
    user?.displayName ||
    user?.email ||
    "Usuário"
  );
};
const log = (it, t, c) =>
  it.hist.unshift({ d: now(), t, ...(c ? { c } : {}), autor: actorName() });

/* navegação */
const TT = { dash: "Dashboard", inv: "Inventário", mov: "Movimentações", req: "Solicitações" };
function go(t) {
  tab = t;
  ["dash", "inv", "mov", "req"].forEach((x) =>
    $("#" + x).classList.toggle("hide", x != t),
  );
  document
    .querySelectorAll(".nav")
    .forEach((b) => b.classList.toggle("on", b.dataset.t == t));
  $("#title").textContent = TT[t];
  if (firebase.auth().currentUser) {
    window.assetsDb.from("ativos").select("*").order("id").then(({ data, error }) => {
      if (error) throw error;
      S = (data || []).map((item) => ({
        ...item,
        qtd: +item.qtd || 1,
        valor: +item.valor || 0,
        hist: item.hist || [],
      }));
      render();
    }).catch((error) => dlg("Não foi possível atualizar os ativos do banco compartilhado: " + error.message));
  } else render();
}
document
  .querySelectorAll(".nav")
  .forEach((b) => (b.onclick = () => go(b.dataset.t)));
const isDark = () =>
  (document.documentElement.dataset.theme ||
    (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light")) ==
  "dark";
try {
  const t = localStorage.getItem("inv-theme");
  if (t) document.documentElement.dataset.theme = t;
} catch (e) {}
$("#themeSw").checked = isDark();
$("#themeSw").onchange = (e) => {
  const t = e.target.checked ? "dark" : "light";
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("inv-theme", t);
  } catch (x) {}
  render();
};

/* dashboard */
const PAL = [
  "#5b5bf0",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#64748b",
];
function mk(id, type, obj, key, money) {
  let grp = 0;
  if (type == "doughnut" && Object.keys(obj).length > 9) {
    const e = Object.entries(obj).sort((a, b) => b[1] - a[1]),
      rest = e.slice(8);
    obj = Object.fromEntries(e.slice(0, 8));
    obj["Outros (" + rest.length + ")"] = rest.reduce((t, r) => t + r[1], 0);
    grp = 1;
  }
  const cs = getComputedStyle(document.documentElement),
    tx = cs.getPropertyValue("--mut"),
    lb = Object.keys(obj),
    ho = type == "bar";
  const c = new Chart($("#" + id), {
    type,
    data: {
      labels: lb,
      datasets: [
        {
          data: Object.values(obj),
          backgroundColor: grp ? [...PAL, "#94a3b8"] : PAL,
          borderRadius: ho ? 6 : 0,
          borderWidth: 0,
        },
      ],
    },
    options: {
      indexAxis: ho && id == "c3" ? "y" : "x",
      maintainAspectRatio: false,
      onHover: (e, a) =>
        (e.native.target.style.cursor = a.length ? "pointer" : "default"),
      onClick: (e, a) => {
        if (a.length && !(grp && a[0].index == 8)) {
          flt = {
            q: "",
            tipo: "",
            status: "",
            empresa: "",
            local: "",
            [key]: lb[a[0].index],
          };
          go("inv");
        }
      },
      plugins: {
        legend: {
          display: !ho,
          position:
            $("#" + id).parentElement.clientWidth > 480 ? "right" : "bottom",
          labels: {
            color: tx,
            boxWidth: 10,
            generateLabels: (ch) =>
              Chart.overrides.doughnut.plugins.legend.labels
                .generateLabels(ch)
                .map((l) => {
                  const t = String(l.text || "");
                  return {
                    ...l,
                    text: t.length > 24 ? t.slice(0, 23) + "…" : t,
                  };
                }),
          },
        },
        tooltip: {
          callbacks: { label: (x) => " " + (money ? brl(x.raw) : x.raw) },
        },
      },
      scales: ho
        ? {
            x: { ticks: { color: tx }, grid: { display: false } },
            y: { ticks: { color: tx }, grid: { color: "#8883" } },
          }
        : {},
    },
  });
  charts.push(c);
}
function dash() {
  charts.forEach((c) => c.destroy());
  charts = [];
  const q = (x) => +x.qtd || 1,
    n = (k, v) =>
      S.filter((x) => nz(x[k]) == nz(v)).reduce((t, x) => t + q(x), 0),
    tot = S.reduce((t, x) => t + q(x), 0),
    est = S.filter(
      (x) => nz(x.local) == "estoque" || nz(x.status) == "estoque",
    ).reduce((t, x) => t + q(x), 0);
  $("#kpis").innerHTML = [
    ["Total", tot],
    ["Em uso", n("status", "Em uso")],
    ["Disponível", n("status", "Disponível")],
    ["Escritório", n("local", "Escritório")],
    ["Remoto", n("local", "Remoto")],
    ["Estoque", est],
  ]
    .map(
      (k) => `<div class="card kpi"><span>${k[0]}</span><b>${k[1]}</b></div>`,
    )
    .join("");
  [
    ["c1", "doughnut", cnt("tipo"), "tipo"],
    ["c2", "doughnut", cnt("status"), "status"],
    ["c3", "bar", cnt("local"), "local"],
    ["c4", "bar", cnt("empresa", 1), "empresa", 1],
  ].forEach((a) => {
    try {
      mk(...a);
    } catch (e) {
      console.error(e);
    }
  });
  $("#gar").innerHTML =
    S.filter((x) => x.garantia)
      .sort((a, b) => a.garantia.localeCompare(b.garantia))
      .filter((x) => days(x.garantia) >= -30)
      .slice(0, 6)
      .map(
        (x) =>
          `<div data-id="${esc(x.id)}" style="cursor:pointer"><span>${esc(x.id)} · ${esc(x.marca)} ${esc(x.modelo)}</span>${gar(x.garantia)}</div>`,
      )
      .join("") || '<div class="sub">Nada por aqui.</div>';
  $("#rec").innerHTML = feed(6);
}
function feed(n, f, t) {
  return (
    S.flatMap((x) => x.hist.map((h) => ({ ...h, id: x.id })))
      .filter((h) => {
        const k = ld(new Date(h.d));
        return (!f || k >= f) && (!t || k <= t);
      })
      .sort((a, b) => b.d.localeCompare(a.d))
      .slice(0, n)
      .map(
        (h) =>
          `<div data-id="${esc(h.id)}" style="cursor:pointer"><span><b>${esc(h.id)}</b> ${h.c ? "💬 " : ""}${esc(h.t)}</span><span class="sub">${fd(h.d)} · ${esc(h.autor || "Responsável não registrado")}</span></div>`,
      )
      .join("") || '<div class="sub">Sem movimentações.</div>'
  );
}

/* inventário */
let SEL = new Set(),
  vis = [];
const COLS = [
  ["id", "ID"],
  ["modelo", "Equipamento"],
  ["serie", "Série"],
  ["colab", "Colaborador"],
  ["empresa", "Empresa"],
  ["local", "Localização"],
  ["pos", "Posição"],
  ["garantia", "Garantia"],
  ["status", "Status"],
  ["valor", "Valor"],
];
function opts(el, k, label) {
  const v = flt[k];
  el.innerHTML =
    `<option value="">${label}</option>` +
    (k == "status" ? statuses() : uniq(k))
      .map((o) => `<option ${o == v ? "selected" : ""}>${esc(o)}</option>`)
      .join("");
}
function inv() {
  [
    ["#fTipo", "tipo", "Tipo"],
    ["#fStatus", "status", "Status"],
    ["#fEmp", "empresa", "Empresa"],
    ["#fLoc", "local", "Localização"],
  ].forEach((a) => opts($(a[0]), a[1], a[2]));
  $("#q").value = flt.q;
  $("#thead").innerHTML =
    '<tr><th class="ck"><input type="checkbox" id="all"></th>' +
    COLS.map(
      (c) =>
        `<th data-k="${c[0]}">${c[1]}${sort.k == c[0] ? (sort.d > 0 ? " ▲" : " ▼") : ""}</th>`,
    ).join("") +
    "</tr>";
  const q = flt.q.toLowerCase();
  const r = S.filter(
    (x) =>
      (!flt.tipo || x.tipo == flt.tipo) &&
      (!flt.status || x.status == flt.status) &&
      (!flt.empresa || x.empresa == flt.empresa) &&
      (!flt.local || x.local == flt.local) &&
      (!q ||
        F.some((f) =>
          String(x[f[0]] ?? "")
            .toLowerCase()
            .includes(q),
        )),
  ).sort(
    (a, b) =>
      String(a[sort.k]).localeCompare(String(b[sort.k]), "pt-BR", {
        numeric: true,
      }) * sort.d,
  );
  $("#cnt").textContent = r.length + " de " + S.length + " itens";
  $("#tbody").innerHTML = r
    .map(
      (x) =>
        `<tr data-id="${esc(x.id)}"><td class="ck"><input type="checkbox" data-c="${esc(x.id)}" ${SEL.has(x.id) ? "checked" : ""}></td><td><b>${esc(x.id)}</b></td><td>${esc(x.tipo)}<div class="sub">${esc(x.marca)} ${esc(x.modelo)}</div></td><td>${esc(x.serie)}</td><td>${esc(x.colab) || '<span class="sub">—</span>'}</td><td>${esc(x.empresa)}</td><td>${esc(x.local)}</td><td>${esc(x.pos)}</td><td>${gar(x.garantia)}</td><td>${stp(x.status)}</td><td>${brl(x.valor)}</td></tr>`,
    )
    .join("");
  vis = r.map((x) => x.id);
  bar();
}
$("#thead").onclick = (e) => {
  const k = e.target.closest("th")?.dataset.k;
  if (k) {
    sort = { k, d: sort.k == k ? -sort.d : 1 };
    inv();
  }
};
$("#q").oninput = (e) => {
  flt.q = e.target.value;
  const p = e.target.selectionStart;
  inv();
  $("#q").focus();
  $("#q").setSelectionRange(p, p);
};
[
  ["#fTipo", "tipo"],
  ["#fStatus", "status"],
  ["#fEmp", "empresa"],
  ["#fLoc", "local"],
].forEach(
  (a) =>
    ($(a[0]).onchange = (e) => {
      flt[a[1]] = e.target.value;
      inv();
    }),
);
$("#clr").onclick = () => {
  flt = { q: "", tipo: "", status: "", empresa: "", local: "" };
  inv();
};
document.addEventListener("click", (e) => {
  const r = e.target.closest("[data-id]");
  if (r && !e.target.closest(".mask") && !e.target.closest(".ck"))
    openItem(r.dataset.id);
});
$("#mov .list").id = "feed";
function render() {
  tab == "dash" ? dash() : tab == "inv" ? inv() : tab == "req" ? renderAssetRequests() : mov();
}

function renderAssetRequests() {
  const pending = assetRequests.filter((request) => request.status === "Pendente").length;
  if ($("#requestCount")) {
    $("#requestCount").textContent = pending;
    $("#requestCount").hidden = pending === 0;
  }
  if ($("#requestActiveCount")) $("#requestActiveCount").textContent = `${pending} ativa${pending === 1 ? "" : "s"}`;
  const rows = $("#requestRows");
  if (!rows) return;
  rows.innerHTML = assetRequests.length ? assetRequests.map((request) => {
    const date = request.criadoEm ? new Date(request.criadoEm).toLocaleString("pt-BR") : "—";
    const title = [request.tipo, request.marca, request.modelo].filter(Boolean).map(esc).join(" · ") || "—";
    const canDecide = request.status === "Pendente";
    return `<tr data-request-id="${esc(request.id)}" onclick="openAssetRequestDetails(this.dataset.requestId)" title="Ver detalhes da solicitação" style="cursor:pointer"><td>${esc(request.solicitanteNome || "—")}<div class="sub">${esc(request.solicitanteEmail || "")}</div></td><td>${esc(request.assetId || "—")} · ${title}</td><td>${esc(request.qtd || 1)}</td><td>${esc(request.obs || request.justificativa || "—")}</td><td>${esc(date)}</td><td><span class="pill ${requestStatusClass(request.status)}">${esc(request.status || "Pendente")}</span>${request.revisorNome ? `<div class="sub">por ${esc(request.revisorNome)}</div>` : ""}</td><td>${canDecide ? `<div class="row request-actions"><button class="btn pri" onclick="event.stopPropagation();decideAssetRequest('${esc(request.id)}','Aprovada')">Aprovar</button><button class="btn" onclick="event.stopPropagation();decideAssetRequest('${esc(request.id)}','Reprovada')">Reprovar</button></div>` : "—"}</td></tr>`;
  }).join("") : '<tr><td colspan="7"><div class="empty">Nenhuma solicitação cadastrada.</div></td></tr>';
}

function requestStatusClass(status) {
  return status === "Aprovada" ? "request-status-approved" : status === "Reprovada" ? "request-status-rejected" : "request-status-pending";
}

function assetPayloadFromRequest(request) {
  const colab = String(request.colab || "").trim();
  let local = String(request.local || "").trim();
  let pos = String(request.pos || "").trim();
  const deskPosition = pos.match(/^mesa\s*(\d+)$/i);
  if (deskPosition) pos = String(Number(deskPosition[1]));
  let status = String(request.statusItem || "").trim();
  if (colab) {
    status ||= "Em uso";
    if (!local || nz(local) === "estoque") local = pos && pos !== "-" ? "Escritório" : "Remoto";
    if (!pos) pos = "-";
  } else {
    if (!local || nz(local) === "estoque") local = "Estoque";
    if (nz(local) === "estoque") pos = "-";
    status ||= "Disponível";
  }
  return {
    id: String(request.assetId || "").trim(),
    tipo: String(request.tipo || "").trim(),
    marca: String(request.marca || "").trim(),
    modelo: String(request.modelo || "").trim(),
    serie: String(request.serie || "").trim(),
    qtd: Math.max(1, Number(request.qtd) || 1),
    colab,
    empresa: String(request.empresa || "").trim(),
    local,
    pos,
    status,
    data: String(request.data || "").trim(),
    nf: String(request.nf || "").trim(),
    valor: Number(request.valor) || 0,
    garantia: String(request.garantia || "").trim(),
    imei: String(request.imei || "").trim(),
    obs: String(request.obs || "").trim(),
    updated_at: now(),
    hist: [{ d: now(), t: "Item cadastrado a partir de uma solicitação aprovada", autor: actorName() }],
  };
}

async function ensureAssetForRequest(request) {
  const payload = assetPayloadFromRequest(request);
  if (!payload.id || !payload.tipo) throw new Error("A solicitação precisa ter ID do ativo e tipo de equipamento.");
  const { data: existing, error: lookupError } = await window.assetsDb
    .from("ativos").select("*").eq("id", payload.id).maybeSingle();
  if (lookupError) throw lookupError;
  const matchesRequest = (item) => ["tipo", "marca", "modelo", "serie"].every((key) =>
    String(item?.[key] ?? "") === String(payload[key] ?? ""),
  );
  if (existing) {
    if (!matchesRequest(existing)) throw new Error(`O ID ${payload.id} já está em uso por outro ativo. Não fiz alterações nesse item.`);
    return existing;
  }
  let { data, error } = await window.assetsDb.from("ativos").insert(payload).select().maybeSingle();
  if (error) {
    const { data: racedItem, error: racedLookupError } = await window.assetsDb
      .from("ativos").select("*").eq("id", payload.id).maybeSingle();
    if (!racedLookupError && racedItem && matchesRequest(racedItem)) data = racedItem;
    else throw error;
  }
  const saved = data || payload;
  S = S.filter((item) => item.id !== payload.id);
  S.push({ ...saved, qtd: +saved.qtd || 1, valor: +saved.valor || 0, hist: saved.hist || payload.hist });
  assetImportLocked = true;
  if (tab === "inv") render();
  return saved;
}

async function syncApprovedRequestItems(requests) {
  for (const request of requests) {
    if (request.status !== "Aprovada" || !request.assetId || !request.tipo || syncingApprovedRequestIds.has(request.id)) continue;
    syncingApprovedRequestIds.add(request.id);
    try {
      await ensureAssetForRequest(request);
    } catch (error) {
      syncingApprovedRequestIds.delete(request.id);
      console.error("Falha ao cadastrar item de solicitação aprovada", request.id, error);
      toast(`A solicitação ${request.assetId || "aprovada"} não pôde entrar no inventário: ${error.message}`);
    }
  }
}

function openAssetRequestDetails(id) {
  const request = assetRequests.find((item) => item.id === id);
  if (!request) return;
  const field = (label, value, type = "text") => `<div><label>${label}</label><input type="${type}" value="${esc(value || "—")}" disabled></div>`;
  const values = [
    field("ID do Ativo (SN)", request.assetId), field("Tipo de Equipamento", request.tipo),
    field("Marca", request.marca), field("Modelo", request.modelo), field("n° de Série", request.serie),
    field("Qtd", request.qtd), field("Colaborador", request.colab), field("Empresa Proprietária", request.empresa),
    field("Localização", request.local), field("Posição", request.pos), field("Status", request.statusItem),
    field("Data de Aquisição", request.data, "text"), field("NF", request.nf), field("Valor (R$)", request.valor),
    field("Garantia (até)", request.garantia), field("Imei", request.imei),
    `<div style="grid-column:1/-1"><label>Observações</label><textarea rows="2" disabled>${esc(request.obs || request.justificativa || "")}</textarea></div>`,
  ].join("");
  $("#mb").innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:14px"><div><h2 style="margin:0">Solicitação · ${esc(request.assetId || "Item")}</h2><div class="sub">Solicitado por ${esc(request.solicitanteNome || "—")} · ${esc(request.solicitanteEmail || "")}</div></div><button class="btn" onclick="closeAssetRequestDetails()">✕</button></div><div class="f">${values}</div><div class="row" style="justify-content:space-between;margin-top:14px"><span class="pill ${requestStatusClass(request.status)}">${esc(request.status || "Pendente")}</span><span class="sub">${request.revisorNome ? `Revisado por ${esc(request.revisorNome)}` : ""}</span><button class="btn" onclick="closeAssetRequestDetails()">Fechar</button></div>`;
  $("#m1").classList.add("on");
}

function closeAssetRequestDetails() {
  $("#m1").classList.remove("on");
}

async function decideAssetRequest(id, status) {
  const user = firebase.auth().currentUser;
  const email = user?.email?.toLowerCase();
  const name = window.ASSET_ALLOWED_USERS?.[email];
  if (!name) return dlg("Esta conta não pode aprovar solicitações.");
  try {
    const request = assetRequests.find((item) => item.id === id);
    if (!request) throw new Error("Não encontrei os dados da solicitação. Atualize a lista e tente novamente.");
    if (status === "Aprovada") await ensureAssetForRequest(request);
    await firebase.firestore().collection("solicitacoes_ativos").doc(id).update({
      status,
      revisorNome: name,
      revisorEmail: user.email,
      revisorUid: user.uid,
      revisadoEm: now(),
    });
  } catch (error) {
    dlg("Não foi possível atualizar a solicitação: " + error.message);
  }
}

/* modal item */
const HL = {
  id: "#5b5bf0",
  tipo: "#5b5bf0",
  colab: "#5b5bf0",
  local: "#5b5bf0",
  status: "#5b5bf0",
};

const inp = (k, l, v, t = "text", ex = "") =>
  `<div><label>${l}</label><input name="${k}" type="${t}" value="${esc(v)}" ${ex} ${HL[k] ? `style="border-bottom:3px solid ${HL[k]}"` : ""}></div>`;
function openItem(id) {
  const n = !id,
    x = n
      ? { id: nextId(), qtd: 1, status: "", hist: [] }
      : S.find((i) => i.id == id);
  if (!x) return;
  $("#mb").innerHTML =
    `<div class="row" style="justify-content:space-between;margin-bottom:14px"><h2 style="margin:0">${n ? "Novo item" : esc(x.id) + " · " + esc(x.marca) + " " + esc(x.modelo)}</h2><button class="btn" data-x="m1">✕</button></div>
<div class="f" id="ff">${inp("id", "ID do Ativo (SN)", x.id, "text", n ? "" : "readonly")}${inp("tipo", "Tipo de Equipamento", x.tipo, "text", 'list="dl-tipo"')}${inp("marca", "Marca", x.marca)}${inp("modelo", "Modelo", x.modelo)}${inp("serie", "n° de Série", x.serie)}${inp("qtd", "Qtd", x.qtd, "number", 'min="1"')}
${inp("colab", "Colaborador", x.colab, "text", 'list="dl-colab" onchange="previewCollaboratorAssignment(this)"')}${inp("empresa", "Empresa Proprietária", x.empresa, "text", 'list="dl-emp"')}${inp("local", "Localização", x.local, "text", 'list="dl-loc"')}${inp("pos", "Posição", x.pos, "text", 'list="dl-pos"')}
<div><label>Status</label><select name="status" style="border-bottom:3px solid ${HL.status}"><option value="">Selecione…</option>${[...BASE, ...(x.status && !BASE.includes(x.status) ? [x.status] : [])].map((o) => `<option ${o == x.status ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>
${inp("data", "Data de Aquisição", x.data, "date")}${inp("nf", "NF", x.nf)}${inp("valor", "Valor (R$)", x.valor, "number", 'step="0.01"')}${inp("garantia", "Garantia (até)", x.garantia, "date")}${inp("imei", "Imei", x.imei)}
<div style="grid-column:1/-1"><label>Observações</label><textarea name="obs" rows="2">${esc(x.obs)}</textarea></div></div>
<datalist id="dl-tipo">${uniq("tipo")
      .map((o) => `<option>${esc(o)}`)
      .join("")}</datalist><datalist id="dl-colab">${uniq("colab")
      .map((o) => `<option>${esc(o)}`)
      .join("")}</datalist><datalist id="dl-emp">${uniq("empresa")
      .map((o) => `<option>${esc(o)}`)
      .join("")}</datalist><datalist id="dl-loc">${uniq("local")
      .map((o) => `<option>${esc(o)}`)
      .join("")}</datalist><datalist id="dl-pos">${uniq("pos")
      .map((o) => `<option>${esc(o)}`)
      .join("")}</datalist>
<div class="row" style="margin-top:14px;justify-content:flex-end">${n ? "" : '<button class="btn" id="del" style="color:var(--er)">Excluir</button>'}<button class="btn pri" id="sv">Salvar</button></div>
${n ? "" : `<h3 style="margin-top:18px">Comentários e histórico</h3><div class="row"><input id="cm" placeholder="Escreva um comentário…" style="flex:1"><button class="btn" id="cb">💬 Comentar</button></div><div class="hist" id="hs"></div>`}`;
  const hs = () => {
    if ($("#hs"))
      $("#hs").innerHTML = x.hist
        .map(
          (h) =>
            `<div class="${h.c ? "c" : ""}">${h.c ? "💬 " : ""}${esc(h.t)}<div class="sub">${fd(h.d)} · ${esc(h.autor || "Responsável não registrado")}</div></div>`,
        )
        .join("");
  };
  hs();
  $("#m1").classList.add("on");
  $("#sv").onclick = () => {
    const v = {};
    document
      .querySelectorAll("#ff [name]")
      .forEach((el) => (v[el.name] = el.value.trim()));
    if (n) {
      const falta = Object.keys(HL).filter((k) => !v[k]);
      if (falta.length) {
        falta.forEach((k) => {
          const el = document.querySelector(`#ff [name=${k}]`);
          el.style.boxShadow = "0 0 0 2px var(--er)";
          el.addEventListener("input", () => (el.style.boxShadow = ""), {
            once: true,
          });
        });
        dlg(
          "Preencha os campos obrigatórios:\n• " +
            falta.map((k) => F.find((f) => f[0] == k)[1]).join("\n• "),
        );
        return;
      }
    }
    v.status = v.status || "Estoque";
    if (n && S.some((i) => i.id == v.id)) {
      dlg("Já existe um item com esse ID.");
      return;
    }
    v.status = v.status || "Estoque";
    v.qtd = +v.qtd || 1;
    v.valor = +v.valor || 0;
    if (v.colab && nz(v.colab) !== nz(x.colab)) {
      assignToCollaborator(v, v.colab);
    } else if (nz(v.local) === "estoque") {
      v.colab = "";
      v.local = "Estoque";
      v.pos = "-";
      v.status = "Disponível";
    }
    if (n) {
      Object.assign(x, v);
      log(x, "Item cadastrado");
      S.push(x);
    } else {
      TRACK.forEach((k) => {
        if ((x[k] || "") != v[k])
          log(
            x,
            `${F.find((f) => f[0] == k)[1]}: ${x[k] || "—"} → ${v[k] || "—"}`,
          );
      });
      Object.assign(x, v);
      delete x.demo;
    }
    save();
    $("#m1").classList.remove("on");
    render();
  };
  if (!n) {
    $("#cb").onclick = () => {
      const t = $("#cm").value.trim();
      if (!t) return;
      log(x, t, 1);
      save();
      $("#cm").value = "";
      hs();
    };
    $("#del").onclick = async () => {
      if (
        await dlg("Excluir " + x.id + "? Essa ação não pode ser desfeita.", {
          ask: 1,
          ok: "Excluir",
          danger: 1,
          title: "Excluir item",
        })
      ) {
        const { error } = await window.assetsDb.from("ativos").delete().eq("id", x.id);
        if (error) {
          dlg("Não foi possível excluir no banco compartilhado: " + error.message);
          return;
        }
        S = S.filter((i) => i != x);
        assetImportLocked = true;
        if ($("#bImp")) $("#bImp").disabled = assetImportLocked;
        $("#m1").classList.remove("on");
        render();
        toast("Item excluído");
      }
    };
  }
}

/* troca / transferência */
function doTransfer(ids, name) {
  ids.forEach((id) => {
    const x = S.find((i) => i.id == id);
    if (!x) return;
    if (name) {
      log(x, `Transferência: Colaborador ${x.colab || "—"} → ${name}`);
      assignToCollaborator(x, name);
    } else {
      log(x, `Enviado ao estoque (colaborador anterior: ${x.colab || "—"})`);
      x.colab = "";
      x.status = "Disponível";
      x.local = "Estoque";
      x.pos = "-";
    }
  });
  save();
}
const dsc = (x) => [x.tipo, x.marca, x.modelo].filter(Boolean).join(" ") || "—";
const PK = { a: "", b: "", t: "" };
const pkHtml = (id, l) =>
  `<div><label>${l}</label><input class="sr" data-s="${id}" placeholder="Buscar por ativo ou nome…"><div class="pk" id="pk-${id}"></div><div class="sub" id="sl-${id}" style="margin-top:6px"></div></div>`;
function pkFill(id) {
  const q = nz($(`.sr[data-s="${id}"]`).value),
    r = S.filter(
      (x) =>
        !q ||
        nz(
          [x.id, x.colab, x.tipo, x.marca, x.modelo, x.serie].join(" "),
        ).includes(q),
    );
  let h = r
    .slice(0, 60)
    .map(
      (x) =>
        `<div class="pr ${PK[id] == x.id ? "on" : ""}" data-p="${id}" data-v="${esc(x.id)}"><b>${esc(x.id)}</b><span>${esc(dsc(x))}</span><em>${esc(x.colab) || "Sem colaborador"}</em></div>`,
    )
    .join("");
  if (!h) h = '<div class="sub" style="padding:12px">Nenhum resultado</div>';
  else if (r.length > 60)
    h += `<div class="sub" style="padding:8px 12px">Mostrando 60 de ${r.length} — refine a busca</div>`;
  $("#pk-" + id).innerHTML = h;
  const x = S.find((i) => i.id == PK[id]);
  $("#sl-" + id).innerHTML = x
    ? `✔ <b>${esc(x.id)}</b> — ${esc(dsc(x))} · ${esc(x.colab) || "sem colaborador"}`
    : "Nenhum item selecionado";
}
function swPrev() {
  const A = S.find((i) => i.id == PK.a),
    B = S.find((i) => i.id == PK.b);
  $("#swp").textContent =
    A && B
      ? A == B
        ? "Escolha dois itens diferentes"
        : `${A.colab || "sem colaborador"}  ⇄  ${B.colab || "sem colaborador"}`
      : "Selecione os dois itens";
}
function openTr() {
  PK.a = PK.b = PK.t = "";
  $("#tb").innerHTML =
    `<div class="row" style="justify-content:space-between;margin-bottom:14px"><h2 style="margin:0">Troca e transferência</h2><button class="btn" data-x="m2">✕</button></div>
<div class="seg"><button class="on" data-m="sw">⇄ Trocar entre colaboradores</button><button data-m="tr">→ Transferir item</button></div>
<div id="psw" style="margin-top:16px"><p class="sub" style="margin:0 0 12px">Escolha dois itens: os colaboradores de cada um serão trocados entre si.</p>
<div class="f" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">${pkHtml("a", "Item A")}${pkHtml("b", "Item B")}</div>
<div class="row" style="margin-top:16px;justify-content:space-between"><span class="sub" id="swp"></span><button class="btn pri" id="swap">⇄ Trocar</button></div></div>
<div id="ptr" class="hide" style="margin-top:16px"><div class="f" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">${pkHtml("t", "Item")}
<div><label>Novo colaborador</label><input id="t2" list="dl-colab2" placeholder="Nome do colaborador"><datalist id="dl-colab2">${uniq(
      "colab",
    )
      .map((c) => `<option>${esc(c)}`)
      .join("")}</datalist></div></div>
<div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn" id="tst">📦 Enviar ao estoque</button><button class="btn pri" id="mv">→ Transferir</button></div></div>`;
  ["a", "b", "t"].forEach(pkFill);
  swPrev();
  document
    .querySelectorAll("#tb .sr")
    .forEach((i) => (i.oninput = () => pkFill(i.dataset.s)));
  $("#tb").onclick = (e) => {
    const p = e.target.closest("[data-p]");
    if (p) {
      PK[p.dataset.p] = p.dataset.v;
      pkFill(p.dataset.p);
      swPrev();
      return;
    }
    const m = e.target.closest("[data-m]");
    if (m) {
      document
        .querySelectorAll("#tb .seg button")
        .forEach((b) => b.classList.toggle("on", b == m));
      $("#psw").classList.toggle("hide", m.dataset.m != "sw");
      $("#ptr").classList.toggle("hide", m.dataset.m != "tr");
    }
  };
  $("#m2").classList.add("on");
  $("#swap").onclick = () => {
    const A = S.find((i) => i.id == PK.a),
      B = S.find((i) => i.id == PK.b);
    if (!A || !B || A == B) {
      dlg("Selecione dois itens diferentes.");
      return;
    }
    const ca = A.colab,
      cb = B.colab;
    log(A, `Troca com ${B.id}: Colaborador ${ca || "—"} → ${cb || "—"}`);
    log(B, `Troca com ${A.id}: Colaborador ${cb || "—"} → ${ca || "—"}`);
    assignToCollaborator(A, cb || "");
    assignToCollaborator(B, ca || "");
    save();
    $("#m2").classList.remove("on");
    render();
    toast("Troca realizada");
  };
  const go1 = (n) => {
    const A = S.find((i) => i.id == PK.t);
    if (!A) {
      dlg("Selecione um item.");
      return;
    }
    if (n === null) return;
    doTransfer([A.id], n);
    $("#m2").classList.remove("on");
    render();
    toast(n ? "Item transferido" : "Item enviado ao estoque");
  };
  $("#mv").onclick = () => {
    const n = $("#t2").value.trim();
    if (!n) {
      dlg('Informe o colaborador ou use "Enviar ao estoque".');
      return;
    }
    go1(n);
  };
  $("#tst").onclick = () => go1("");
}

/* popups */
function dlg(msg, o = {}) {
  return new Promise((res) => {
    const m = $("#m3");
    $("#dg").innerHTML =
      `<h3 style="font-size:17px;margin:0 0 8px">${esc(o.title || (o.ask ? "Confirmar" : "Atenção"))}</h3><p style="margin:0 0 20px;color:var(--mut);white-space:pre-line">${esc(msg)}</p><div class="row" style="justify-content:flex-end">${o.ask ? `<button class="btn" id="dn">${esc(o.no || "Cancelar")}</button>` : ""}<button class="btn ${o.danger ? "" : "pri"}" id="dy" ${o.danger ? 'style="background:var(--er);color:#fff;border:0"' : ""}>${esc(o.ok || "OK")}</button></div>`;
    const kd = (e) => {
      if (e.key == "Escape") done(false);
      else if (e.key == "Enter" && document.activeElement.id != "dn") {
        e.preventDefault();
        done(true);
      }
    };
    const done = (v) => {
      m.classList.remove("on");
      document.removeEventListener("keydown", kd, true);
      res(v);
    };
    document.addEventListener("keydown", kd, true);
    m.onclick = (e) => {
      if (e.target == m) done(false);
    };
    $("#dy").onclick = () => done(true);
    if (o.ask) $("#dn").onclick = () => done(false);
    m.classList.add("on");
    $("#dy").focus();
  });
}
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* modais, csv */
document.addEventListener("click", (e) => {
  const x = e.target.dataset?.x;
  if (x) $("#" + x).classList.remove("on");
  if (e.target.classList.contains("mask") && e.target.id != "m3")
    e.target.classList.remove("on");
});
$("#bNew").onclick = () => openItem(null);
$("#bTr").onclick = openTr;
$("#bExp").onclick = () => {
  const q = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"',
    t = [
      F.map((f) => q(f[1])).join(";"),
      ...S.map((x) => F.map((f) => q(x[f[0]])).join(";")),
    ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + t], { type: "text/csv" }));
  a.download = "inventario.csv";
  a.click();
};
if ($("#bImp")) $("#bImp").onclick = () => {
  if (assetImportLocked || S.length) {
    dlg("A importação Excel só fica disponível para popular o banco inicialmente. Depois, atualize os ativos pelo sistema.");
    return;
  }
  $("#file").click();
};
function parse(t) {
  const d =
      t.indexOf("\t") > -1 && t.split("\n")[0].includes("\t")
        ? "\t"
        : t.split("\n")[0].split(";").length >
            t.split("\n")[0].split(",").length
          ? ";"
          : ",",
    R = [];
  let r = [],
    c = "",
    q = 0;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch == '"' && t[i + 1] == '"') {
        c += '"';
        i++;
      } else if (ch == '"') q = 0;
      else c += ch;
    } else if (ch == '"') q = 1;
    else if (ch == d) {
      r.push(c);
      c = "";
    } else if (ch == "\n" || ch == "\r") {
      if (ch == "\r" && t[i + 1] == "\n") i++;
      r.push(c);
      c = "";
      R.push(r);
      r = [];
    } else c += ch;
  }
  if (c || r.length) {
    r.push(c);
    R.push(r);
  }
  return R.filter((r) => r.some((v) => v.trim()));
}
const nz = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f\s.°º_]/g, "");
function numericDeskPosition(value) {
  const desk = String(value || "").trim().match(/^mesa\s*(\d+)$/i);
  return desk ? String(Number(desk[1])) : value;
}
function positionForCollaborator(name) {
  const key = Object.keys(collaboratorPositions).find((n) => nz(n) === nz(name));
  if (!key) return "";
  return numericDeskPosition(collaboratorPositions[key]);
}
function assignToCollaborator(item, name) {
  item.colab = name;
  if (!name) return;
  item.status = "Em uso";
  const position = positionForCollaborator(name);
  if (position) {
    item.pos = position;
    item.local = "Escritório";
  } else {
    item.pos = "-";
    if (!item.local || nz(item.local) === "estoque") item.local = "Remoto";
  }
}
function previewCollaboratorAssignment(input) {
  const name = input.value.trim();
  if (!name) return;
  const form = input.closest("#ff, #requestAssetForm");
  const local = form?.querySelector('[name="local"]');
  const position = form?.querySelector('[name="pos"]');
  const status = form?.querySelector('[name="status"]');
  if (!local || !position || !status) return;
  const assignedPosition = positionForCollaborator(name);
  local.value = assignedPosition
    ? "Escritório"
    : !local.value || nz(local.value) === "estoque"
      ? "Remoto"
      : local.value;
  position.value = assignedPosition || "-";
  status.value = "Em uso";
}
async function persistCollaboratorPositions() {
  const { error } = await window.assetsDb
    .from("ativos_config")
    .update({ posicoes_colaboradores: collaboratorPositions })
    .eq("id", true);
  if (error) throw error;
}
window.setCollaboratorPosition = async (name, position) => {
  const oldPositions = { ...collaboratorPositions };
  const oldItems = S.map((item) => ({
    item,
    pos: item.pos,
    local: item.local,
    status: item.status,
    hist: [...(item.hist || [])],
  }));
  if (position) collaboratorPositions[name] = position;
  else delete collaboratorPositions[name];
  try {
    await persistCollaboratorPositions();
    S.filter((item) => nz(item.colab) === nz(name)).forEach((item) => {
      const oldLocation = item.local || "—";
      const oldPosition = item.pos || "—";
      assignToCollaborator(item, item.colab);
      if (oldLocation !== item.local || oldPosition !== item.pos) {
        log(item, `Localização/posição: ${oldLocation} / ${oldPosition} → ${item.local || "—"} / ${item.pos || "—"}`);
      }
    });
    if (S.some((item) => nz(item.colab) === nz(name))) {
      const saved = await save();
      if (!saved) throw new Error("Não foi possível atualizar os ativos do colaborador.");
    }
  } catch (error) {
    collaboratorPositions = oldPositions;
    oldItems.forEach(({ item, pos, local, status, hist }) => Object.assign(item, { pos, local, status, hist }));
    try { await persistCollaboratorPositions(); } catch (rollbackError) { console.error("Falha ao restaurar a posição do colaborador", rollbackError); }
    dlg("Não foi possível salvar a posição do colaborador: " + error.message);
    throw error;
  }
  render();
};
const dstr = (d) => new Date(d.getTime() + 43200000).toISOString().slice(0, 10);
function importRows(R) {
  let hi = -1,
    map;
  for (let i = 0; i < Math.min(R.length, 15); i++) {
    const m = R[i].map((h) => (F.find((f) => nz(f[1]) == nz(h)) || [])[0]);
    if (m.filter(Boolean).length >= 3) {
      hi = i;
      map = m;
      break;
    }
  }
  if (hi < 0) return null;
  const out = [];
  R.slice(hi + 1).forEach((r) => {
    const x = { hist: [{ d: now(), t: "Item importado da planilha" }] };
    map.forEach((k, i) => {
      if (!k) return;
      let v = r[i];
      if (v instanceof Date) v = dstr(v);
      else if (k == "valor" || k == "qtd") {
        if (typeof v != "number") v = String(v ?? "");
      } else v = String(v ?? "").trim();
      x[k] = v;
    });
    if (
      !["id", "tipo", "marca", "modelo", "serie"].some((k) =>
        String(x[k] || "").trim(),
      )
    )
      return;
    if (typeof x.valor != "number")
      x.valor =
        +String(x.valor || 0)
          .replace(/[^\d,.-]/g, "")
          .replace(/\.(?=\d{3})/g, "")
          .replace(",", ".") || 0;
    x.qtd = +x.qtd || 1;
    ["data", "garantia"].forEach((k) => {
      const m = (x[k] || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) x[k] = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    });
    F.forEach((f) => {
      if (x[f[0]] == null) x[f[0]] = "";
    });
    out.push(x);
  });
  return out;
}
async function loadFile(f) {
  try {
    let best = null;
    if (/\.(xlsx|xls|xlsm)$/i.test(f.name)) {
      const wb = XLSX.read(await f.arrayBuffer(), {
        type: "array",
        cellDates: true,
      });
      for (const n of wb.SheetNames) {
        const o = importRows(
          XLSX.utils.sheet_to_json(wb.Sheets[n], {
            header: 1,
            raw: true,
            defval: "",
          }),
        );
        if (o && o.length && (!best || o.length > best.length)) best = o;
      }
    } else best = importRows(parse((await f.text()).replace(/^\ufeff/, "")));
    if (!best || !best.length) {
      dlg(
        "Não encontrei as colunas do inventário (ex.: ID do Ativo, Tipo de Equipamento, Marca…). Confira o cabeçalho da planilha.",
      );
      return;
    }
    if (assetImportLocked || S.length) {
      dlg("A planilha só pode popular o banco quando ele ainda estiver vazio. Faça as alterações pelo sistema.");
      return;
    }
    best.forEach((x) => {
      if (!x.id || S.some((i) => i.id == x.id)) x.id = nextId();
      S.push(x);
    });
    if (!(await save())) return;
    toast(best.length + " itens importados");
    go("inv");
  } catch (err) {
    dlg("Não consegui ler o arquivo: " + err.message);
  }
}
$("#file").onchange = (e) => {
  const f = e.target.files[0];
  if (f) loadFile(f);
  e.target.value = "";
};
addEventListener("dragover", (e) => e.preventDefault());
addEventListener("drop", (e) => {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (f) loadFile(f);
});
function bar() {
  $("#bulk").classList.toggle("hide", !SEL.size);
  $("#bn").textContent = `${SEL.size} / ${S.length} itens selecionados`;
  const al = $("#all");
  if (al) al.checked = !!vis.length && vis.every((i) => SEL.has(i));
  $("#dl-bulk").innerHTML = uniq("colab")
    .map((c) => `<option>${esc(c)}`)
    .join("");
}
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.c) {
    t.checked ? SEL.add(t.dataset.c) : SEL.delete(t.dataset.c);
    bar();
  } else if (t.id == "all") {
    vis.forEach((i) => (t.checked ? SEL.add(i) : SEL.delete(i)));
    inv();
  }
});
const bulk = async (n) => {
  const ids = [...SEL].filter((i) => S.some((x) => x.id == i));
  if (!ids.length) return;
  if (
    !(await dlg(
      `Transferir ${ids.length} ${ids.length == 1 ? "item" : "itens"} ${n ? "para " + n : "para o estoque"}?`,
      {
        ask: 1,
        ok: n ? "Transferir" : "Enviar ao estoque",
        title: "Confirmar transferência",
      },
    ))
  )
    return;
  doTransfer(ids, n);
  toast(
    `${ids.length} ${ids.length == 1 ? "item transferido" : "itens transferidos"}`,
  );
  SEL.clear();
  $("#bp").value = "";
  render();
};
$("#bgo").onclick = () => {
  const n = $("#bp").value.trim();
  if (!n) {
    dlg('Informe o novo colaborador ou use "Enviar ao estoque".');
    return;
  }
  bulk(n);
};
$("#bst").onclick = () => bulk("");
$("#bcl").onclick = () => {
  SEL.clear();
  inv();
};
let mv = { f: "", t: "", r: "" };
function mov() {
  $("#mf").value = mv.f;
  $("#mt").value = mv.t;
  document
    .querySelectorAll("[data-r]")
    .forEach((b) => b.classList.toggle("pri", b.dataset.r == mv.r));
  const h = feed(500, mv.f, mv.t);
  $("#feed").innerHTML = h;
  $("#mc").textContent = (h.match(/data-id=/g) || []).length + " registros";
}
$("#mf").onchange = (e) => {
  mv = { f: e.target.value, t: mv.t, r: "" };
  mov();
};
$("#mt").onchange = (e) => {
  mv = { f: mv.f, t: e.target.value, r: "" };
  mov();
};
document.querySelectorAll("[data-r]").forEach(
  (b) =>
    (b.onclick = () => {
      const r = b.dataset.r;
      mv = r ? { f: lday(-r), t: "", r } : { f: "", t: "", r: "" };
      mov();
    }),
);
function showAssetLogin(message = "") {
  $("#authGate").style.display = "flex";
  $("#inventoryApp").style.display = "none";
  $("#authError").textContent = message;
}
$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#authError").textContent = "Entrando…";
  try {
    await firebase.auth().signInWithEmailAndPassword(
      $("#authEmail").value.trim(),
      $("#authPassword").value,
    );
  } catch (error) {
    showAssetLogin(error.message || "Não foi possível entrar.");
  }
});
$("#bLogout").onclick = () => firebase.auth().signOut();
let rejectedAssetUser = false;
firebase.auth().onAuthStateChanged(async (user) => {
  const email = user?.email?.toLowerCase();
  if (!user) {
    showAssetLogin(rejectedAssetUser ? "Esta conta não tem acesso ao inventário." : "");
    rejectedAssetUser = false;
    return;
  }
  if (!ASSET_ALLOWED_USERS[email]) {
    rejectedAssetUser = true;
    await firebase.auth().signOut();
    return;
  }
  if (assetRequestsUnsub) assetRequestsUnsub();
  assetRequestsUnsub = firebase.firestore().collection("solicitacoes_ativos")
    .orderBy("criadoEm", "desc")
    .onSnapshot((snapshot) => {
      assetRequests = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      syncApprovedRequestItems(assetRequests);
      renderAssetRequests();
    }, (error) => {
      console.error("Falha ao carregar solicitações", error);
      dlg("Não foi possível carregar as solicitações: " + error.message);
    });
  $("#authGate").style.display = "none";
  $("#inventoryApp").style.display = "";
  $("#authPassword").value = "";
  $("#connectedUser").textContent = "Conectado: " + ASSET_ALLOWED_USERS[email];
  try {
    const { data, error } = await window.assetsDb
      .from("ativos")
      .select("*")
      .order("id");
    if (error) throw error;
    const { data: config, error: configError } = await window.assetsDb
      .from("ativos_config")
      .select("excel_importada_em")
      .eq("id", true)
      .maybeSingle();
    if (configError) console.warn("Não foi possível ler a trava de importação", configError);
    const { data: positionConfig, error: positionError } = await window.assetsDb
      .from("ativos_config")
      .select("posicoes_colaboradores")
      .eq("id", true)
      .maybeSingle();
    if (positionError) {
      console.warn("Rode adicionar-posicao-colaboradores.sql para habilitar posições por colaborador.", positionError);
      collaboratorPositions = {};
    } else {
      collaboratorPositions = positionConfig?.posicoes_colaboradores && typeof positionConfig.posicoes_colaboradores === "object"
        ? positionConfig.posicoes_colaboradores
        : {};
    }
    S = (data || []).map((item) => ({
      ...item,
      qtd: +item.qtd || 1,
      valor: +item.valor || 0,
      pos: numericDeskPosition(item.pos),
      hist: item.hist || [],
    }));
    const posicoesNormalizadas = S.filter((item) =>
      String(item.pos || "").trim() !== String((data || []).find((original) => original.id === item.id)?.pos || "").trim()
    );
    if (posicoesNormalizadas.length) {
      const { error: normalizacaoError } = await window.assetsDb
        .from("ativos")
        .upsert(posicoesNormalizadas, { onConflict: "id" });
      if (normalizacaoError) console.warn("Não foi possível padronizar as posições como números.", normalizacaoError);
    }
    assetImportLocked = S.length > 0 || Boolean(config?.excel_importada_em);
    if ($("#bImp")) $("#bImp").disabled = assetImportLocked;
    render();
  } catch (error) {
    S = [];
    assetImportLocked = true;
    if ($("#bImp")) $("#bImp").disabled = true;
    dlg("Não consegui carregar os ativos do Supabase. Confira a configuração Firebase/Supabase: " + error.message);
  }
});
