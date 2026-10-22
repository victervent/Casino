/*
 * NIGSIO motkikiX — Web Emulator
 * Giao diện, bàn phím, chế độ và các không gian làm việc.
 */
(function () {
  "use strict";

  const E = window.CalcEngine;
  const D = window.CASIO_DATA;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const MODES = D.modes;
  const STORAGE_KEY = "casio-fx580vnx-web-v2";
  const EXTRA_TOOLS = [
    { id: "graph", name: "Đồ thị & điểm", desc: "Vẽ hàm số, điểm dữ liệu, đường tham số và đường cong cực; thu phóng, xuất ảnh.", icon: "graph" },
    { id: "calculus", name: "Giải tích", desc: "Đạo hàm, tích phân, giới hạn và cực trị của hàm một biến.", icon: "calculus" },
    { id: "geometry", name: "Hình học giải tích", desc: "Khoảng cách, đường thẳng, đường tròn và mặt phẳng trong 2D/3D.", icon: "geometry" },
    { id: "triangle", name: "Giải tam giác", desc: "Giải tam giác bằng 3 cạnh, 2 cạnh – góc xen giữa hoặc 1 cạnh – 2 góc.", icon: "geometry" },
    { id: "probability", name: "Xác suất", desc: "Hoán vị, tổ hợp, biến cố, công thức Bayes và phân phối nhị thức.", icon: "probability" },
    { id: "inference", name: "Thống kê suy diễn", desc: "Khoảng tin cậy và kiểm định giả thuyết cho trung bình và tỉ lệ.", icon: "inference" },
    { id: "quickstats", name: "Thống kê nhanh", desc: "Dán một dãy số để nhận trung bình, trung vị, mốt, phương sai, độ lệch chuẩn và tứ phân vị.", icon: "table2" },
    { id: "number", name: "Số học", desc: "Phân tích thừa số, ước số, totient, GCD/LCM, modulo và nghịch đảo.", icon: "number" },
    { id: "units", name: "Đổi đơn vị", desc: "Quy đổi độ dài, khối lượng, diện tích, thể tích, tốc độ, năng lượng, áp suất, thời gian, dữ liệu và nhiệt độ.", icon: "convert" },
    { id: "finance", name: "Tài chính", desc: "Lãi kép, tiết kiệm hằng tháng, khoản vay và tổng lãi phải trả.", icon: "finance" },
    { id: "physics", name: "Vật lý", desc: "Công thức cơ học, điện học, sóng và nhiệt học với đơn vị SI.", icon: "physics" },
    { id: "series", name: "Tổng & tích", desc: "Tính tổng Sigma Σ và tích Pi ∏ của biểu thức theo biến x.", icon: "series" }
  ];
  const CARET = "\u0001";

  /* ============================================================
   * Tiện ích chung
   * ============================================================ */
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  }

  function showToast(message, type) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = "toast show" + (type ? " " + type : "");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.className = "toast" + (type ? " " + type : "");
    }, 2400);
  }

  function vibrate() {
    if (!state.settings.haptics) return;
    if (navigator.vibrate) {
      try { navigator.vibrate(8); } catch (e) { /* bỏ qua */ }
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Đã sao chép: " + text);
      return;
    } catch (e) { /* thử phương án cũ */ }
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      showToast("Đã sao chép: " + text);
    } catch (e) {
      showToast("Không thể sao chép", "is-error");
    }
  }

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  /* ============================================================
   * Trạng thái
   * ============================================================ */
  const DEFAULT_SETTINGS = {
    angleUnit: "deg",
    numberFormat: "norm1",
    fixDigits: 3,
    sciDigits: 5,
    inputOutput: "math",
    fracResult: "dc",
    complexResult: "rect",
    engineer: false,
    separator: false,
    statFreq: true,
    haptics: false
  };

  const state = {
    powered: true,
    booting: false,
    mode: "calculate",
    input: "",
    cursor: 0,
    result: null,
    error: null,
    justEvaluated: false,
    ans: { re: 0, im: 0 },
    vars: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0, M: 0 },
    history: [],
    historyCursor: -1,
    menuOpen: false,
    menuIndex: 0,
    shift: false,
    alpha: false,
    basenBase: 10,
    settings: Object.assign({}, DEFAULT_SETTINGS),
    lastTip: 0,
    statData: {
      type: "1var",
      model: "linear",
      rows1: [{ x: "1", f: "1" }, { x: "2", f: "1" }, { x: "3", f: "1" }],
      rows2: [{ x: "1", y: "2", f: "1" }, { x: "2", y: "4", f: "1" }, { x: "3", y: "6", f: "1" }]
    },
    matrices: {
      A: { rows: 2, cols: 2, data: [["1", "0"], ["0", "1"]] },
      B: { rows: 2, cols: 2, data: [["1", "0"], ["0", "1"]] },
      C: { rows: 2, cols: 2, data: [["0", "0"], ["0", "0"]] },
      D: { rows: 2, cols: 2, data: [["0", "0"], ["0", "0"]] }
    },
    vectors: {
      A: { dim: 3, data: ["1", "0", "0"] },
      B: { dim: 3, data: ["0", "1", "0"] },
      C: { dim: 3, data: ["0", "0", "1"] },
      D: { dim: 3, data: ["1", "1", "0"] },
      E: { dim: 3, data: ["0", "1", "1"] }
    },
    graph: {
      tab: "function",
      expressions: [
        { expr: "x^2 - 3", color: "#f2a544", visible: true },
        { expr: "sin(x)", color: "#64c6b4", visible: true },
        { expr: "", color: "#7fa6ff", visible: true }
      ],
      points: "1; 2\n2; 4\n3; 6\n4; 9",
      parametric: { x: "cos(t)", y: "sin(t)", tmin: "0", tmax: "6.283185", step: "0.03" },
      polar: { expr: "2*cos(3*t)", tmin: "0", tmax: "6.283185", step: "0.015" },
      view: { xmin: -10, xmax: 10, ymin: -6, ymax: 6 },
      grid: true,
      connect: true,
      trend: "linear"
    }
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.settings && typeof saved.settings === "object") {
        for (const key of Object.keys(DEFAULT_SETTINGS)) {
          if (saved.settings[key] !== undefined) state.settings[key] = saved.settings[key];
        }
      }
      const validAngles = ["deg", "rad", "gra"];
      if (!validAngles.includes(state.settings.angleUnit)) state.settings.angleUnit = "deg";
      if (!["norm1", "norm2", "fix", "sci"].includes(state.settings.numberFormat)) state.settings.numberFormat = "norm1";
      if (!["math", "linear"].includes(state.settings.inputOutput)) state.settings.inputOutput = "math";
      if (!["dc", "mixed"].includes(state.settings.fracResult)) state.settings.fracResult = "dc";
      if (!["rect", "polar"].includes(state.settings.complexResult)) state.settings.complexResult = "rect";
      state.settings.fixDigits = clampNumber(state.settings.fixDigits, 0, 9, 3);
      state.settings.sciDigits = clampNumber(state.settings.sciDigits, 1, 10, 5);
      if (saved.vars && typeof saved.vars === "object") {
        Object.keys(state.vars).forEach((key) => {
          if (Number.isFinite(Number(saved.vars[key]))) state.vars[key] = Number(saved.vars[key]);
        });
      }
      if (Array.isArray(saved.history)) {
        state.history = saved.history.filter((item) => item && typeof item.expr === "string").slice(0, 60);
      }
      if (saved.ans && typeof saved.ans === "object") {
        state.ans = { re: Number(saved.ans.re) || 0, im: Number(saved.ans.im) || 0 };
      }
      if (saved.statData && typeof saved.statData === "object") {
        const type = saved.statData.type === "2var" ? "2var" : "1var";
        const model = ["linear", "quadratic", "ln", "exp", "ab", "power", "inv"].includes(saved.statData.model) ? saved.statData.model : "linear";
        const cleanRows = (rows, twoVar) => Array.isArray(rows) ? rows.filter((row) => row && typeof row === "object").slice(0, 100).map((row) => ({
          x: row.x == null ? "" : String(row.x),
          y: twoVar ? (row.y == null ? "" : String(row.y)) : undefined,
          f: row.f == null ? "1" : String(row.f)
        })) : [];
        state.statData = {
          type,
          model,
          rows1: cleanRows(saved.statData.rows1, false).length ? cleanRows(saved.statData.rows1, false) : state.statData.rows1,
          rows2: cleanRows(saved.statData.rows2, true).length ? cleanRows(saved.statData.rows2, true) : state.statData.rows2
        };
      }
      if (saved.matrices && typeof saved.matrices === "object") {
        ["A", "B", "C", "D"].forEach((name) => {
          const entry = saved.matrices[name];
          if (!entry || !Array.isArray(entry.data)) return;
          const rows = Math.max(2, Math.min(5, Number(entry.rows) || 2));
          const cols = Math.max(2, Math.min(5, Number(entry.cols) || 2));
          const data = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
            const value = entry.data[r] && entry.data[r][c];
            return value == null ? "0" : String(value);
          }));
          state.matrices[name] = { rows, cols, data };
        });
      }
      if (saved.vectors && typeof saved.vectors === "object") {
        ["A", "B", "C", "D", "E"].forEach((name) => {
          const entry = saved.vectors[name];
          if (!entry) return;
          const dim = Number(entry.dim) === 2 ? 2 : 3;
          state.vectors[name] = {
            dim,
            data: Array.from({ length: dim }, (_, i) => entry.data && entry.data[i] != null ? String(entry.data[i]) : "0")
          };
        });
      }
      if (saved.graph && typeof saved.graph === "object") {
        const graph = saved.graph;
        if (["function", "points", "parametric", "polar"].includes(graph.tab)) state.graph.tab = graph.tab;
        if (Array.isArray(graph.expressions)) {
          const expressions = graph.expressions.slice(0, 4).map((row, index) => ({
            expr: row && row.expr != null ? String(row.expr).slice(0, 240) : "",
            color: row && /^#[0-9a-f]{6}$/i.test(String(row.color || "")) ? row.color : ["#f2a544", "#64c6b4", "#7fa6ff", "#e57b9a"][index],
            visible: !row || row.visible !== false
          }));
          if (expressions.length) state.graph.expressions = expressions;
        }
        if (typeof graph.points === "string") state.graph.points = graph.points.slice(0, 4000);
        if (graph.parametric && typeof graph.parametric === "object") {
          ["x", "y", "tmin", "tmax", "step"].forEach((key) => {
            if (graph.parametric[key] != null) state.graph.parametric[key] = String(graph.parametric[key]).slice(0, 160);
          });
        }
        if (graph.polar && typeof graph.polar === "object") {
          ["expr", "tmin", "tmax", "step"].forEach((key) => {
            if (graph.polar[key] != null) state.graph.polar[key] = String(graph.polar[key]).slice(0, 160);
          });
        }
        if (graph.view && typeof graph.view === "object") {
          const view = {
            xmin: Number(graph.view.xmin), xmax: Number(graph.view.xmax),
            ymin: Number(graph.view.ymin), ymax: Number(graph.view.ymax)
          };
          if (Object.values(view).every(Number.isFinite) && view.xmin < view.xmax && view.ymin < view.ymax) state.graph.view = view;
        }
        state.graph.grid = graph.grid !== false;
        state.graph.connect = graph.connect !== false;
        state.graph.trend = ["none", "linear", "quadratic"].includes(graph.trend) ? graph.trend : "linear";
      }
    } catch (e) {
      /* localStorage có thể bị chặn — bỏ qua */
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        settings: state.settings,
        vars: state.vars,
        history: state.history.slice(0, 60),
        ans: state.ans,
        statData: state.statData,
        matrices: state.matrices,
        vectors: state.vectors,
        graph: state.graph
      }));
    } catch (e) { /* bỏ qua */ }
  }

  /* ============================================================
   * Định dạng số
   * ============================================================ */
  function trimZeros(text) {
    if (!text || text.indexOf(".") === -1) return text;
    return text.replace(/0+$/, "").replace(/\.$/, "");
  }

  function groupInteger(text) {
    const sign = text.startsWith("-") ? "-" : "";
    let body = sign ? text.slice(1) : text;
    const dot = body.indexOf(".");
    const intPart = dot === -1 ? body : body.slice(0, dot);
    const rest = dot === -1 ? "" : body.slice(dot);
    return sign + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + rest;
  }

  function sciParts(mantissa, exponent, settings) {
    let m = Number(mantissa.toPrecision(10));
    let e = exponent;
    if (Math.abs(m) >= 10) { m /= 10; e += 1; }
    if (Math.abs(m) < 1 && m !== 0) { m *= 10; e -= 1; }
    const textMant = trimZeros(String(m));
    const html = `${escapeHtml(textMant)}<span class="times">×</span>10<sup>${e}</sup>`;
    return { html, text: `${textMant}×10^${e}` };
  }

  function formatNumeric(value, options) {
    const settings = Object.assign({}, state.settings, options || {});
    const x = Number(value);
    if (!Number.isFinite(x)) return { html: "Math ERROR", text: "Math ERROR" };
    if (x === 0) return { html: "0", text: "0" };

    const abs = Math.abs(x);
    const fmt = settings.numberFormat;

    if (fmt === "fix") {
      if (abs >= 1e12) {
        const exp = Math.floor(Math.log10(abs));
        const mant = x / Math.pow(10, exp);
        return sciParts(mant, exp, settings);
      }
      let text = x.toFixed(settings.fixDigits);
      if (settings.fixDigits > 0) text = trimZeros(text);
      if (text === "-0") text = "0";
      return { html: escapeHtml(settings.separator ? groupInteger(text) : text), text };
    }

    if (fmt === "sci") {
      const exp = Math.floor(Math.log10(abs));
      const mant = x / Math.pow(10, exp);
      const digits = Math.max(1, Math.min(10, settings.sciDigits));
      const mantRounded = Number(mant.toPrecision(digits));
      return sciParts(mantRounded, exp, settings);
    }

    if (settings.engineer && abs >= 1e-9 && abs < 1e15) {
      const exp = Math.floor(Math.log10(abs));
      const engExp = Math.floor(exp / 3) * 3;
      if (engExp !== 0) {
        const mant = x / Math.pow(10, engExp);
        return sciParts(mant, engExp, settings);
      }
    }

    const lower = settings.numberFormat === "norm2" ? 1e-9 : 1e-2;
    if (abs < lower || abs >= 1e10) {
      const exp = Math.floor(Math.log10(abs));
      const mant = x / Math.pow(10, exp);
      return sciParts(mant, exp, settings);
    }

    let text = trimZeros(Number(x.toPrecision(10)).toString());
    if (text.includes("e") || text.includes("E")) {
      const exp = Math.floor(Math.log10(abs));
      return sciParts(x / Math.pow(10, exp), exp, settings);
    }
    if (text === "-0") text = "0";
    return { html: escapeHtml(settings.separator ? groupInteger(text) : text), text };
  }

  function formatNumericText(value, options) {
    return formatNumeric(value, options).text;
  }

  function insertableNumericText(value, options) {
    return formatNumeric(value, options).text.replace(/×/g, "*");
  }

  function fractionHtml(n, d, mixed) {
    if (d === 0) return { html: "Math ERROR", text: "Math ERROR" };
    if (d === 1) return { html: escapeHtml(String(n)), text: String(n) };
    if (n === 0) return { html: "0", text: "0" };
    const sign = n < 0 ? "-" : "";
    const an = Math.abs(n);
    const useMixed = !!mixed && an > d;
    if (useMixed) {
      const whole = Math.floor(an / d);
      const rem = an % d;
      const html = `<span class="lcd-mixed">${sign}${whole}<span class="lcd-fraction"><span class="frac-num">${rem}</span><span class="frac-den">${d}</span></span></span>`;
      const text = `${sign}${whole} ${rem}/${d}`;
      return { html, text };
    }
    return {
      html: `<span class="lcd-fraction"><span class="frac-num">${sign}${an}</span><span class="frac-den">${d}</span></span>`,
      text: `${sign}${an}/${d}`
    };
  }

  function simplifySqrtSquare(n) {
    let outside = 1;
    let inside = Math.trunc(n);
    if (inside <= 0) return { outside: 0, inside: 0 };
    for (let i = 2; i * i <= inside; i++) {
      while (inside % (i * i) === 0) {
        inside /= i * i;
        outside *= i;
      }
    }
    return { outside, inside };
  }

  function piFormHtml(n, d) {
    const sign = n < 0 ? "-" : "";
    const an = Math.abs(n);
    if (d === 1) {
      const coefficient = an === 1 ? "" : String(an);
      return { html: `${sign}${coefficient}<span class="lcd-pi">π</span>`, text: `${sign}${coefficient}π` };
    }
    return {
      html: `<span class="lcd-fraction"><span class="frac-num">${sign}${an === 1 ? "" : an}π</span><span class="frac-den">${d}</span></span>`,
      text: `${sign}${an === 1 ? "" : an}π/${d}`
    };
  }

  function findExactView(value, expression) {
    if (!Number.isFinite(value)) return null;
    const expr = String(expression || "").replace(/\s+/g, "");
    if (Math.abs(value) < 1e-13) return { html: "0", text: "0", kind: "exact" };

    // Dạng π đơn giản: π/2, 2π, 3π/4...
    if (expr.includes("π")) {
      const ratio = value / Math.PI;
      const frac = E.toFraction(ratio, { maxDen: 12, tolerance: 1e-9 });
      if (frac && Math.abs(ratio - frac.n / frac.d) < 1e-9) {
        return Object.assign(piFormHtml(frac.n, frac.d), { kind: "exact" });
      }
    }

    // Dạng căn đơn giản: sqrt(2), sqrt(8), -sqrt(3)...
    const sqrtMatch = expr.match(/^(-?)sqrt\((\d+(?:\.\d+)?)\)$/);
    if (sqrtMatch) {
      const n = Number(sqrtMatch[2]);
      if (Number.isInteger(n) && n > 0) {
        const sign = sqrtMatch[1] ? -1 : 1;
        const simp = simplifySqrtSquare(n);
        if (simp.inside === 1) {
          const integerValue = sign * simp.outside;
          if (Math.abs(value - integerValue) < 1e-9) return { html: escapeHtml(String(integerValue)), text: String(integerValue), kind: "exact" };
        } else {
          const coefficient = simp.outside === 1 ? "" : String(simp.outside);
          const html = `<span class="lcd-surd"><span class="surd-sign">${sign < 0 ? "−" : ""}${coefficient}</span><span class="surd-sign">√</span><span class="surd-body">${simp.inside}</span></span>`;
          return { html, text: `${sign < 0 ? "-" : ""}${coefficient}√${simp.inside}`, kind: "exact" };
        }
      }
    }

    // Phân số hữu tỷ. Ưu tiên khi biểu thức có phép chia/phân số.
    const fractionCue = /[\/]|frac\(|mixed\(/.test(expr);
    const plainDecimal = /^-?\d+(?:\.\d+)?$/.test(expr);
    if (plainDecimal) return null;
    const maxDen = fractionCue ? 100000 : 12;
    const frac = E.toFraction(value, { maxDen, tolerance: 1e-9 });
    if (frac && frac.d !== 1 && Math.abs(value - frac.n / frac.d) < 1e-9) {
      if (Math.abs(frac.n) < 1e13) {
        return Object.assign(fractionHtml(frac.n, frac.d, state.settings.fracResult === "mixed"), { kind: "exact" });
      }
    }
    return null;
  }

  function complexRectView(value) {
    const re = value.re;
    const im = value.im;
    const r = formatNumeric(re);
    const i = formatNumeric(Math.abs(im));
    if (Math.abs(im) < 1e-12) return { html: r.html, text: r.text, kind: "rect" };
    const imagCoeff = Math.abs(Math.abs(im) - 1) < 1e-12 ? "" : i.html;
    if (Math.abs(re) < 1e-12) {
      return { html: `${im < 0 ? "−" : ""}${imagCoeff}<span class="complex-form">i</span>`, text: `${im < 0 ? "-" : ""}${Math.abs(Math.abs(im) - 1) < 1e-12 ? "" : i.text}i`, kind: "rect" };
    }
    const sign = im < 0 ? "−" : "+";
    return {
      html: `${r.html}<span class="op">${sign}</span>${imagCoeff}<span class="complex-form">i</span>`,
      text: `${r.text}${im < 0 ? "-" : "+"}${Math.abs(Math.abs(im) - 1) < 1e-12 ? "" : i.text}i`,
      kind: "rect"
    };
  }

  function complexPolarView(value) {
    const r = Math.hypot(value.re, value.im);
    const angle = E.fromRad(Math.atan2(value.im, value.re), state.settings.angleUnit);
    const rr = formatNumeric(r);
    const aa = formatNumeric(angle);
    const unit = state.settings.angleUnit === "deg" ? "°" : state.settings.angleUnit === "gra" ? "g" : "rad";
    return {
      html: `${rr.html}<span class="complex-form">∠</span>${aa.html}<span class="result-note">${unit}</span>`,
      text: `${rr.text}∠${aa.text}${unit}`,
      kind: "polar"
    };
  }

  function buildResultDisplay(value, expression, mode) {
    const display = {
      value: { re: value.re, im: value.im },
      expr: expression,
      mode,
      views: [],
      viewIndex: 0,
      plainText: "",
      html: "",
      kind: "decimal"
    };
    if (value.isComplex || Math.abs(value.im) > 1e-12) {
      const rect = complexRectView(value);
      const polar = complexPolarView(value);
      display.views = state.settings.complexResult === "polar" ? [polar, rect] : [rect, polar];
      display.viewIndex = 0;
    } else {
      const decimal = Object.assign(formatNumeric(value.re), { kind: "decimal" });
      const exact = findExactView(value.re, expression);
      if (exact && exact.text !== decimal.text) {
        display.views = state.settings.inputOutput === "math" ? [exact, decimal] : [decimal, exact];
      } else {
        display.views = [decimal];
      }
      display.viewIndex = 0;
    }
    refreshResultDisplay(display);
    return display;
  }

  function refreshResultDisplay(display) {
    const view = display.views[display.viewIndex] || display.views[0];
    display.kind = view.kind;
    display.html = view.html;
    display.plainText = view.text;
  }

  function toggleResultDisplay() {
    const result = state.result;
    if (!result) {
      showToast("Chưa có kết quả. Nhấn = để tính.", "is-error");
      return false;
    }
    if (result.views.length < 2) {
      showToast("Kết quả này chỉ có một dạng hiển thị.");
      return false;
    }
    result.viewIndex = (result.viewIndex + 1) % result.views.length;
    refreshResultDisplay(result);
    const item = state.history.find((h) => h.id === result.historyId);
    if (item) {
      item.resultHtml = result.html;
      item.resultText = result.plainText;
      persist();
      renderMiniHistory();
    }
    renderScreen(true);
    vibrate();
    return true;
  }

  function resultFontClass(result) {
    if (!result) return "";
    const len = result.plainText.length;
    if (len > 18) return "is-tiny";
    if (len > 12) return "is-small";
    return "";
  }

  /* ============================================================
   * Biểu tượng chế độ
   * ============================================================ */
  function modeIconSVG(name) {
    const open = '<svg viewBox="0 0 24 24" aria-hidden="true">';
    const close = "</svg>";
    const paths = {
      calc: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h2M12 12h2M16 12h.01M8 16h2M12 16h2M16 16h.01"/>',
      complex: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M14 8v8M10 12h8"/>',
      basen: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9h.01M7 15h.01M17 9h.01M17 15h.01M12 9h.01M12 15h.01"/>',
      matrix: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
      vector: '<path d="M4 18 19 5M13 5h6v6"/><circle cx="4" cy="18" r="1.5"/>',
      stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
      normal: '<path d="M3 18c3 0 3.5-12 9-12s6 12 9 12"/><path d="M3 18h18"/>',
      table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>',
      equation: '<path d="M5 7h6M8 4v6M14 14h6M14 18h6"/>',
      inequality: '<path d="m4 6 9 6-9 6M16 6h4M16 18h4"/>',
      verify: '<path d="M4 12.5 9 17 20 5"/><path d="M4 20h16"/>',
      ratio: '<circle cx="7" cy="9" r="2"/><circle cx="17" cy="15" r="2"/><path d="M4 20 20 4"/>',
      history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 4.5V9h4.5"/><path d="M12 7.5V12l3 2"/>',
      settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.54 15a1.7 1.7 0 0 0-1.56-1.03H2.9a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.54 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.9 4.54h.01A1.7 1.7 0 0 0 9.94 2.98V2.9a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 8.9v.01a1.7 1.7 0 0 0 1.56 1.03h.09a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"/>',
      help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1 1-1 1.9M12 17h.01"/>',
      catalog: '<path d="M4 7h16M4 12h10M4 17h7"/><circle cx="18" cy="16" r="3.2"/><path d="M20.4 18.4 23 21"/>',
      constant: '<path d="M5 18 12 6l7 12M8 14h8"/><path d="M19 5v4M17 7h4"/>',
      convert: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
      store: '<path d="M12 3v11M7 9l5 5 5-5"/><path d="M4 17v3h16v-3"/>',
      recall: '<path d="M12 21V10M7 15l5-5 5 5"/><path d="M4 4h16"/>',
      reset: '<path d="M4 10a8 8 0 1 1 2 7"/><path d="M4 5v5h5"/>',
      function: '<path d="M14 4h-2a4 4 0 0 0-4 4v12M6 11h7"/><path d="M15 14l5 6M20 14l-5 6"/>',
      table2: '<path d="M4 6h16M4 12h16M4 18h10"/>',
      var: '<path d="m4 5 8 14M20 5l-8 14"/>',
      graph: '<path d="M4 20V4M4 20h16"/><path d="M6 16c2.5 0 2.5-8 5-8s2.4 5 4.5 5S18 6 21 6"/><circle cx="8.5" cy="14.5" r="1.2"/><circle cx="16" cy="8.5" r="1.2"/>',
      calculus: '<path d="M15 4c-3.2 0-3.2 4.2-3.2 8s0 8-3.3 8"/><path d="M8 9h8M8 15h8"/>',
      geometry: '<path d="M4 19 12 4l8 15H4Z"/><circle cx="12" cy="14" r="2.2"/><path d="M12 4v7.8"/>',
      probability: '<path d="M4 18V6M4 18h16"/><path d="M6.5 14.5 10 10l3 2.5L19 6"/><circle cx="10" cy="10" r="1"/><circle cx="13" cy="12.5" r="1"/><circle cx="19" cy="6" r="1"/>',
      inference: '<path d="M4 19V5M4 19h16"/><path d="M6 16c2 0 2.5-7 6-7s4 7 6 7"/><circle cx="12" cy="9" r="1.5"/><path d="M8 19v-2M16 19v-2"/>',
      number: '<path d="M4 9h16M4 15h16M8 4 6 20M18 4l-2 16"/>',
      finance: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/><path d="M4 9 10 5l6 7 6-6"/>',
      physics: '<circle cx="12" cy="12" r="2.2"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>',
      series: '<path d="M5 5h14L8 12l11 7H5"/><path d="M19 4v4M17 6h4"/>',
      extras: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M17 13v6M14 16h6"/>'
    };
    if (name === "complex") {
      return open + paths.complex + '<text x="12" y="16.2" text-anchor="middle" font-size="9" font-family="Georgia, serif" font-style="italic" fill="currentColor" stroke="none">i</text>' + close;
    }
    if (name === "basen") {
      return open + paths.basen + '<text x="12" y="15.2" text-anchor="middle" font-size="6" font-family="Consolas,monospace" fill="currentColor" stroke="none">01</text>' + close;
    }
    if (name === "equation") {
      return open + paths.equation + '<text x="18" y="9" text-anchor="middle" font-size="7" font-family="Georgia, serif" font-style="italic" fill="currentColor" stroke="none">x</text>' + close;
    }
    if (name === "ratio") {
      return open + paths.ratio + '<text x="12" y="8" text-anchor="middle" font-size="6" font-family="Consolas,monospace" fill="currentColor" stroke="none">a:b</text>' + close;
    }
    return open + (paths[name] || paths.function) + close;
  }

  /* ============================================================
   * Hiển thị biểu thức (Math input)
   * ============================================================ */
  const FUNCTION_LABELS = {
    asin: "sin⁻¹", acos: "cos⁻¹", atan: "tan⁻¹",
    asinh: "sinh⁻¹", acosh: "cosh⁻¹", atanh: "tanh⁻¹",
    arcsin: "sin⁻¹", arccos: "cos⁻¹", arctan: "tan⁻¹",
    integral: "∫", deriv: "d/dx", sum: "Σ", prod: "∏",
    logbase: "log", nroot: "ⁿ√", solve: "solve", log: "log", ln: "ln",
    abs: "abs", gcd: "GCD", lcm: "LCM", mod: "mod", ncr: "nCr", npr: "nPr",
    randint: "RanInt", rand: "Ran#", mean: "mean", mixed: "mixed", frac: "frac"
  };

  function findMatchingParen(text, openIndex) {
    let depth = 0;
    for (let i = openIndex; i < text.length; i++) {
      if (text[i] === "(") depth++;
      else if (text[i] === ")") {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  function splitTopLevel(text, delimiter) {
    const parts = [];
    let depth = 0;
    let current = "";
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === delimiter && depth === 0) {
        parts.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    parts.push(current);
    return parts;
  }

  const CARET_HTML = '<span class="lcd-caret" aria-hidden="true"></span>';

  function hasPowerBase(raw, index) {
    let i = index - 1;
    while (i >= 0 && (raw[i] === CARET || /\s/.test(raw[i]))) i--;
    if (i < 0) return false;
    return /[0-9A-Za-z_π)!%°.]/.test(raw[i]);
  }

  function readPowerForRender(raw, index) {
    let exp = "";
    let j = index + 1;
    let parenthesized = false;
    let close = -1;
    if (raw[j] === "(") {
      parenthesized = true;
      close = findMatchingParen(raw, j);
      exp = close === -1 ? raw.slice(j + 1) : raw.slice(j + 1, close);
      j = close === -1 ? raw.length : close + 1;
    } else {
      let sawSign = false;
      let sawDigit = false;
      let sawLetter = false;
      while (j < raw.length) {
        const ch = raw[j];
        if (ch === CARET) {
          const next = raw[j + 1] || "";
          const canContinue =
            (!sawSign && !sawDigit && !sawLetter && (next === "-" || next === "+")) ||
            (!sawLetter && /[0-9.]/.test(next)) ||
            (!sawDigit && !sawLetter && /[A-Za-zπ]/.test(next));
          if (canContinue || (!exp && !next)) { exp += ch; j++; continue; }
          break;
        }
        if (!sawSign && !sawDigit && !sawLetter && (ch === "-" || ch === "+")) {
          exp += ch;
          sawSign = true;
          j++;
          continue;
        }
        if (!sawLetter && /[0-9.]/.test(ch)) {
          exp += ch;
          sawDigit = true;
          j++;
          continue;
        }
        if (!sawDigit && !sawLetter && /[A-Za-zπ]/.test(ch)) {
          exp += ch;
          sawLetter = true;
          j++;
          continue;
        }
        break;
      }
    }
    return { exp, next: j, parenthesized, close };
  }

  function renderPowerExponent(exp, pretty) {
    if (!exp.replace(new RegExp(CARET, "g"), "").trim()) {
      return `<span class="lcd-slot lcd-slot-exp" aria-hidden="true">${exp.includes(CARET) ? CARET_HTML : ""}</span>`;
    }
    return renderExpressionRange(exp, pretty);
  }

  function renderExpressionRange(raw, pretty) {
    let out = "";
    let i = 0;
    let pendingBaseSlot = -1;
    while (i < raw.length) {
      const ch = raw[i];
      if (ch === CARET) {
        if (raw[i + 1] === "^" && !hasPowerBase(raw, i + 1)) {
          pendingBaseSlot = i + 1;
          i++;
          continue;
        }
        out += CARET_HTML;
        i++;
        continue;
      }

      if (pretty && raw.startsWith("frac(", i)) {
        const open = i + 4;
        let close = findMatchingParen(raw, open);
        let inside = close === -1 ? raw.slice(open + 1) : raw.slice(open + 1, close);
        const parts = splitTopLevel(inside, ",");
        const num = renderExpressionRange(parts[0] || "", pretty);
        const den = renderExpressionRange(parts[1] || "", pretty);
        out += `<span class="lcd-fraction"><span class="frac-num">${num}</span><span class="frac-den">${den}</span></span>`;
        i = close === -1 ? raw.length : close + 1;
        continue;
      }

      if (pretty && raw.startsWith("mixed(", i)) {
        const open = i + 5;
        const close = findMatchingParen(raw, open);
        const inside = close === -1 ? raw.slice(open + 1) : raw.slice(open + 1, close);
        const parts = splitTopLevel(inside, ",");
        const whole = renderExpressionRange(parts[0] || "", pretty);
        const num = renderExpressionRange(parts[1] || "", pretty);
        const den = renderExpressionRange(parts[2] || "", pretty);
        out += `<span class="lcd-mixed">${whole}<span class="lcd-fraction"><span class="frac-num">${num}</span><span class="frac-den">${den}</span></span></span>`;
        i = close === -1 ? raw.length : close + 1;
        continue;
      }

      if (pretty && (raw.startsWith("sqrt(", i) || raw.startsWith("cbrt(", i))) {
        const isCube = raw.startsWith("cbrt(", i);
        const open = i + (isCube ? 4 : 4);
        const close = findMatchingParen(raw, open);
        const inside = close === -1 ? raw.slice(open + 1) : raw.slice(open + 1, close);
        const body = renderExpressionRange(inside, pretty);
        out += `<span class="lcd-surd"><span class="surd-sign">${isCube ? "∛" : "√"}</span><span class="surd-body">${body}</span></span>`;
        i = close === -1 ? raw.length : close + 1;
        continue;
      }

      if (pretty && raw.startsWith("nroot(", i)) {
        const open = i + 5;
        const close = findMatchingParen(raw, open);
        const inside = close === -1 ? raw.slice(open + 1) : raw.slice(open + 1, close);
        const parts = splitTopLevel(inside, ",");
        const index = renderExpressionRange(parts[0] || "", pretty);
        const body = renderExpressionRange(parts[1] || "", pretty);
        out += `<span class="lcd-surd"><span class="surd-index">${index}</span><span class="surd-sign">√</span><span class="surd-body">${body}</span></span>`;
        i = close === -1 ? raw.length : close + 1;
        continue;
      }

      if (ch === "^") {
        const power = readPowerForRender(raw, i);
        const exponentHtml = renderPowerExponent(power.exp, pretty);
        if (!hasPowerBase(raw, i)) {
          const slotCaret = pendingBaseSlot === i ? CARET_HTML : "";
          out += `<span class="lcd-slot lcd-slot-base" aria-hidden="true">${slotCaret}</span><sup>${exponentHtml}</sup>`;
        } else {
          out += `<sup>${exponentHtml}</sup>`;
        }
        pendingBaseSlot = -1;
        i = power.next;
        continue;
      }

      if (ch === "π" || raw.startsWith("pi", i)) {
        if (ch === "π") { out += '<span class="lcd-pi">π</span>'; i++; continue; }
        if (raw.startsWith("pi", i)) { out += '<span class="lcd-pi">π</span>'; i += 2; continue; }
      }

      if (/[A-Za-z_]/.test(ch)) {
        let word = "";
        let j = i;
        while (j < raw.length && /[A-Za-z_]/.test(raw[j])) { word += raw[j]; j++; }
        const lower = word.toLowerCase();
        if (lower === "ans") out += "Ans";
        else if (lower === "pi") out += '<span class="lcd-pi">π</span>';
        else if (lower === "e") out += "e";
        else if (lower === "i") out += '<span class="complex-form">i</span>';
        else if (FUNCTION_LABELS[lower]) out += `<span class="fn">${FUNCTION_LABELS[lower]}</span>`;
        else if (word === "X" || word === "x") out += "x";
        else if (word === "Y" || word === "y") out += "y";
        else out += escapeHtml(word);
        i = j;
        continue;
      }

      if (ch === "*") { out += '<span class="op">×</span>'; i++; continue; }
      if (ch === "/") { out += '<span class="op">÷</span>'; i++; continue; }
      if (ch === "-") { out += '<span class="op">−</span>'; i++; continue; }
      if (ch === "∠") { out += '<span class="op">∠</span>'; i++; continue; }
      out += escapeHtml(ch);
      i++;
    }
    return out;
  }

  function formatExpression(input, cursor, pretty) {
    let raw = String(input || "");
    if (state.settings.inputOutput !== "math") pretty = false;
    if (cursor != null) {
      const pos = Math.max(0, Math.min(raw.length, cursor));
      raw = raw.slice(0, pos) + CARET + raw.slice(pos);
    }
    return renderExpressionRange(raw, pretty !== false);
  }

  function autoCloseText(input) {
    let open = 0;
    for (const ch of String(input)) {
      if (ch === "(") open++;
      else if (ch === ")") open = Math.max(0, open - 1);
    }
    return String(input) + ")".repeat(open);
  }

  /* ============================================================
   * Màn hình LCD
   * ============================================================ */
  function modeMeta(id) {
    return MODES.find((m) => m.id === id) || MODES[0];
  }

  function statusMarkup(extraModeName) {
    const settings = state.settings;
    const angle = settings.angleUnit === "deg" ? "D" : settings.angleUnit === "rad" ? "R" : "G";
    const format = settings.numberFormat === "fix" ? `FIX ${settings.fixDigits}` : settings.numberFormat === "sci" ? `SCI ${settings.sciDigits}` : settings.numberFormat === "norm2" ? "Norm 2" : "";
    const modeName = extraModeName || modeMeta(state.mode).name;
    return `<div class="lcd-status">
      <div class="lcd-status-left">
        <span class="lcd-flag ${state.shift ? "on shift-on" : ""}">S</span>
        <span class="lcd-flag ${state.alpha ? "on alpha-on" : ""}">A</span>
        <span class="lcd-flag ${Math.abs(Number(state.vars.M) || 0) > 1e-14 ? "on" : ""}">M</span>
        <span class="lcd-mode-name">${escapeHtml(modeName)}</span>
      </div>
      <div class="lcd-status-right">
        ${settings.inputOutput === "math" ? '<span class="lcd-flag on">MATH</span>' : ""}
        ${format ? `<span class="lcd-flag on">${escapeHtml(format)}</span>` : ""}
        <span class="lcd-annunciator">${angle}</span>
      </div>
    </div>`;
  }

  function hintMarkup() {
    if (!state.powered) return "";
    if (state.error) {
      return `<div class="lcd-hint"><span class="hint-accent">${escapeHtml(state.error.code)}</span><span class="hint-right">AC để xoá</span></div>`;
    }
    if (state.shift) {
      return `<div class="lcd-hint"><span class="hint-accent">SHIFT</span><span>chọn phím có nhãn màu vàng</span><span class="hint-right">nhấn lại để tắt</span></div>`;
    }
    if (state.alpha) {
      return `<div class="lcd-hint"><span class="hint-accent">ALPHA</span><span>chọn biến hoặc ký hiệu màu đỏ</span><span class="hint-right">nhấn lại để tắt</span></div>`;
    }
    if (state.mode === "basen") {
      return `<div class="lcd-hint"><span class="hint-accent">CƠ SỐ ${state.basenBase}</span><span>A–F trên thanh phụ · = để tính</span><span class="hint-right">MENU để đổi chế độ</span></div>`;
    }
    if (state.result) {
      const hasAlt = state.result.views && state.result.views.length > 1;
      return `<div class="lcd-hint"><span class="hint-accent">S⇔D</span><span>${hasAlt ? "đổi dạng kết quả" : "kết quả đã tối giản"}</span><span class="hint-right">▲ lịch sử</span></div>`;
    }
    return `<div class="lcd-hint"><span class="hint-accent">SẴN SÀNG</span><span>SHIFT/ALPHA để mở chức năng</span><span class="hint-right">MENU · 12 chế độ</span></div>`;
  }

  function basePreviewRows() {
    if (state.mode !== "basen") return "";
    let value = null;
    if (state.result && state.result.baseN) value = state.result.value;
    else if (state.input.trim()) {
      try { value = E.evaluateBaseN(state.input, state.basenBase, { ans: BigInt(Math.trunc(state.ans.re || 0)) }); } catch (e) { value = null; }
    }
    const bases = [["DEC", 10], ["HEX", 16], ["OCT", 8], ["BIN", 2]];
    return `<div class="lcd-bases">${bases.map(([label, base]) => `<b>${label}</b><span>${value == null ? "—" : E.toBaseString(value, base)}</span>`).join("")}</div>`;
  }

  function menuMarkup() {
    const tiles = MODES.map((m, index) => `
      <button class="menu-tile ${index === state.menuIndex ? "selected" : ""}" type="button" data-menu-index="${index}" aria-label="${escapeHtml(m.name)}">
        <span class="tile-icon">${modeIconSVG(m.icon)}</span>
        <span class="tile-label">${escapeHtml(m.name)}</span>
        <span class="tile-key">${escapeHtml(m.key)}</span>
      </button>`).join("");
    const extraSelected = state.menuIndex >= MODES.length;
    const selected = extraSelected ? { name: "Công cụ mở rộng" } : (MODES[state.menuIndex] || MODES[0]);
    return `<div class="lcd-menu">
      <div class="lcd-menu-head"><strong>CHỌN CHẾ ĐỘ</strong><span>${MODES.length} chế độ · ${EXTRA_TOOLS.length} công cụ</span></div>
      <div class="lcd-menu-grid">${tiles}</div>
      <button class="menu-extra-tile ${extraSelected ? "selected" : ""}" type="button" data-menu-extra data-menu-index="${MODES.length}" aria-label="Mở ${EXTRA_TOOLS.length} công cụ mở rộng">
        <span class="tile-icon">${modeIconSVG("extras")}</span>
        <span class="tile-label">MỞ RỘNG · ${EXTRA_TOOLS.length} CÔNG CỤ</span>
        <span class="menu-extra-arrow">›</span>
      </button>
      <div class="lcd-menu-foot">
        <span class="selected-name">${escapeHtml(selected.name)}</span>
        <span class="nav-hint">▲▼◀▶ chọn · = mở · AC thoát</span>
      </div>
    </div>`;
  }

  function bootMarkup() {
    return `<div class="lcd-boot"><div class="boot-logo">NIGSIO</div><div class="boot-model">motkikiX · CLASSWIZ</div><div class="boot-line"></div></div>`;
  }

  function baseNResultRow() {
    if (!state.result || !state.result.baseN) {
      return `<div class="lcd-result-row"><div class="lcd-result"></div></div>`;
    }
    const text = state.result.plainText;
    const cls = text.length > 20 ? "is-tiny" : text.length > 12 ? "is-small" : "";
    return `<div class="lcd-result-row"><div class="lcd-result ${cls}">${escapeHtml(text)}</div></div>`;
  }

  function currentResultRow() {
    if (state.error) {
      return `<div class="lcd-result-row"><div class="lcd-result is-error">${escapeHtml(state.error.code)}</div></div>`;
    }
    if (state.mode === "basen") return baseNResultRow();
    if (!state.result) return `<div class="lcd-result-row"><div class="lcd-result"></div></div>`;
    return `<div class="lcd-result-row"><div class="lcd-result ${resultFontClass(state.result)}">${state.result.html}</div></div>`;
  }

  function expressionMarkup() {
    if (!state.input && !state.result && !state.error) {
      return `<div class="lcd-expression"><span class="lcd-zero">0</span><span class="lcd-caret" aria-hidden="true"></span></div>`;
    }
    const html = formatExpression(state.input, state.cursor, true);
    return `<div class="lcd-expression">${html || '<span class="lcd-zero">0</span>'}</div>`;
  }

  function renderScreen(flash) {
    const screen = $("#screen");
    const content = $("#screenContent");
    if (!screen || !content) return;
    screen.classList.remove("is-off", "is-menu", "is-error");
    if (!state.powered) {
      screen.classList.add("is-off");
      content.innerHTML = "";
      return;
    }
    if (state.booting) {
      content.innerHTML = bootMarkup();
      return;
    }
    if (state.menuOpen) {
      screen.classList.add("is-menu");
      content.innerHTML = statusMarkup("MENU") + menuMarkup();
      if (flash) flashScreen(screen);
      return;
    }
    if (state.error) screen.classList.add("is-error");
    if (state.mode === "basen") {
      content.innerHTML = statusMarkup(`CƠ SỐ ${state.basenBase}`) +
        `<div class="lcd-expression-wrap">${expressionMarkup()}${currentResultRow()}${basePreviewRows()}</div>` +
        hintMarkup();
    } else {
      content.innerHTML = statusMarkup() +
        `<div class="lcd-expression-wrap">${expressionMarkup()}${currentResultRow()}</div>` +
        hintMarkup();
    }
    if (flash) flashScreen(screen);
    requestAnimationFrame(scrollExpressionToCaret);
    const reader = $("#screenReader");
    if (reader) {
      reader.textContent = state.result ? `${state.result.plainText}` : state.error ? state.error.code : "";
    }
  }

  function flashScreen(screen) {
    screen.classList.remove("flash");
    void screen.offsetWidth;
    screen.classList.add("flash");
    clearTimeout(flashScreen._timer);
    flashScreen._timer = setTimeout(() => screen.classList.remove("flash"), 340);
  }

  function scrollExpressionToCaret() {
    const expr = $("#screen .lcd-expression");
    const caret = $("#screen .lcd-caret");
    const result = $("#screen .lcd-result");
    if (result && result.scrollWidth > result.clientWidth) result.scrollLeft = result.scrollWidth;
    if (!expr || !caret) return;
    const exprRect = expr.getBoundingClientRect();
    const caretRect = caret.getBoundingClientRect();
    if (caretRect.right > exprRect.right - 8) {
      expr.scrollLeft += caretRect.right - exprRect.right + 18;
    } else if (caretRect.left < exprRect.left + 4) {
      expr.scrollLeft -= exprRect.left - caretRect.left + 12;
    }
  }

  /* ============================================================
   * Bàn phím
   * ============================================================ */
  function K(id, main, options) {
    return Object.assign({ id, main, aria: stripHtml(main) }, options || {});
  }

  const KEY_ROWS = [
    [
      K("optn", "OPTN", { cls: "key--dark key--label", shift: "CATALOG", alpha: "VARS", alphaAction: "recall" }),
      K("calc", "CALC", { cls: "key--dark key--label", shift: "SOLVE", shiftAction: "solve" }),
      K("frac", '<span class="key-fraction"><span>□</span><span>□</span></span>', { cls: "key--dark", aria: "Phân số", shift: "MIXED", mainInsert: "frac(,)", mainCaret: 5, shiftInsert: "mixed(,,)", shiftCaret: 6 }),
      K("xvar", "x", { cls: "key--dark key--letter", aria: "Biến x", shift: "y", mainInsert: "X", mainCaret: 1, shiftInsert: "Y", shiftCaret: 1 }),
      K("integral", "∫", { cls: "key--dark key--operator", aria: "Tích phân", shift: "d/dx", mainInsert: "integral(,0,1)", mainCaret: 9, shiftInsert: "deriv(,0)", shiftCaret: 6 })
    ],
    [
      K("inv", "x⁻¹", { cls: "key--dark", aria: "Nghịch đảo", shift: "x!", alpha: "A", mainPower: "inverse", shiftInsert: "!", shiftCaret: 1, alphaInsert: "A" }),
      K("sqrt", "√", { cls: "key--dark key--operator", aria: "Căn bậc hai", shift: "∛", alpha: "B", mainInsert: "sqrt()", mainCaret: 5, shiftInsert: "cbrt()", shiftCaret: 5, alphaInsert: "B" }),
      K("square", "x²", { cls: "key--dark", aria: "Bình phương", shift: "x³", alpha: "C", mainPower: "square", shiftPower: "cube", alphaInsert: "C" }),
      K("pow", "x^", { cls: "key--dark", aria: "Lũy thừa", shift: "ⁿ√", alpha: "D", mainPower: "power", shiftInsert: "nroot(,)", shiftCaret: 6, alphaInsert: "D" }),
      K("log", "log", { cls: "key--dark", aria: "Logarit", shift: "log_b", alpha: "E", mainInsert: "log()", mainCaret: 4, shiftInsert: "logbase(,)", shiftCaret: 8, alphaInsert: "E" })
    ],
    [
      K("neg", "(−)", { cls: "key--dark key--operator", aria: "Dấu âm", shift: "Abs", alpha: "F", mainInsert: "-", mainCaret: 1, shiftInsert: "abs()", shiftCaret: 4, alphaInsert: "F" }),
      K("dms", "°′″", { cls: "key--dark key--label", aria: "Độ phút giây", shift: "DMS", alpha: "M", mainInsert: "°", mainCaret: 1, shiftAction: "dms", alphaInsert: "M" }),
      K("exp", "×10ˣ", { cls: "key--dark key--tiny", aria: "Nhân mười mũ", shift: "ENG", alpha: "i", mainInsert: "*10^", mainCaret: 4, shiftAction: "engineer", alphaInsert: "i" }),
      K("logbase", "log<sub>b</sub>", { cls: "key--dark key--label", aria: "Logarit cơ số b", shift: "10ˣ", mainInsert: "logbase(,)", mainCaret: 8, shiftInsert: "10^", shiftCaret: 3 }),
      K("ln", "ln", { cls: "key--dark", aria: "Logarit tự nhiên", shift: "eˣ", mainInsert: "ln()", mainCaret: 3, shiftInsert: "exp()", shiftCaret: 4 })
    ],
    [
      K("sin", "sin", { cls: "key--dark", aria: "Sin", shift: "sin⁻¹", mainInsert: "sin()", mainCaret: 4, shiftInsert: "asin()", shiftCaret: 5 }),
      K("cos", "cos", { cls: "key--dark", aria: "Cos", shift: "cos⁻¹", mainInsert: "cos()", mainCaret: 4, shiftInsert: "acos()", shiftCaret: 5 }),
      K("tan", "tan", { cls: "key--dark", aria: "Tan", shift: "tan⁻¹", mainInsert: "tan()", mainCaret: 4, shiftInsert: "atan()", shiftCaret: 5 }),
      K("pi", "π", { cls: "key--dark key--operator", aria: "Số pi", shift: "r∠θ", mainInsert: "π", mainCaret: 1, shiftInsert: "∠", shiftCaret: 1 }),
      K("e", "e", { cls: "key--dark key--operator", aria: "Số e", shift: "eˣ", mainInsert: "e", mainCaret: 1, shiftInsert: "exp()", shiftCaret: 4 })
    ],
    [
      K("lparen", "(", { cls: "key--dark key--operator", aria: "Mở ngoặc", alpha: "X", mainInsert: "(", mainCaret: 1, alphaInsert: "X" }),
      K("rparen", ")", { cls: "key--dark key--operator", aria: "Đóng ngoặc", alpha: "Y", mainInsert: ")", mainCaret: 1, alphaInsert: "Y" }),
      K("comma", ",", { cls: "key--dark key--operator", aria: "Dấu phẩy", mainInsert: ",", mainCaret: 1 }),
      K("mplus", "M+", { cls: "key--dark key--label", aria: "Cộng vào bộ nhớ M", shift: "M−", mainAction: "memAdd", shiftAction: "memSub" }),
      K("sd", "S⇔D", { cls: "key--dark key--label", aria: "Đổi dạng hiển thị", mainAction: "toggleSD" })
    ],
    [
      K("7", "7", { cls: "key--digit", digit: "7", shift: "CONST", shiftAction: "constants" }),
      K("8", "8", { cls: "key--digit", digit: "8", shift: "CONV", shiftAction: "conversions" }),
      K("9", "9", { cls: "key--digit", digit: "9", shift: "RESET", shiftAction: "reset" }),
      K("del", "DEL", { cls: "key--blue", aria: "Xoá lùi", mainAction: "delete" }),
      K("ac", "AC", { cls: "key--blue", aria: "Xoá tất cả", shift: "OFF", mainAction: "clear", shiftAction: "powerOff" })
    ],
    [
      K("4", "4", { cls: "key--digit", digit: "4", shift: "nPr", shiftInsert: "npr(,)", shiftCaret: 4 }),
      K("5", "5", { cls: "key--digit", digit: "5", shift: "nCr", shiftInsert: "ncr(,)", shiftCaret: 4 }),
      K("6", "6", { cls: "key--digit", digit: "6", shift: "GCD", shiftInsert: "gcd(,)", shiftCaret: 4 }),
      K("mul", "×", { cls: "key--operator", aria: "Nhân", mainInsert: "*", mainCaret: 1 }),
      K("div", "÷", { cls: "key--operator", aria: "Chia", mainInsert: "/", mainCaret: 1, alpha: "LCM", alphaInsert: "lcm(,)", alphaCaret: 4 })
    ],
    [
      K("1", "1", { cls: "key--digit", digit: "1", shift: "LCM", shiftInsert: "lcm(,)", shiftCaret: 4 }),
      K("2", "2", { cls: "key--digit", digit: "2", shift: "MOD", shiftInsert: "mod(,)", shiftCaret: 4 }),
      K("3", "3", { cls: "key--digit", digit: "3", shift: "ABS", shiftInsert: "abs()", shiftCaret: 4 }),
      K("add", "+", { cls: "key--operator", aria: "Cộng", mainInsert: "+", mainCaret: 1 }),
      K("sub", "−", { cls: "key--operator", aria: "Trừ", mainInsert: "-", mainCaret: 1 })
    ],
    [
      K("0", "0", { cls: "key--digit", digit: "0" }),
      K("dot", ".", { cls: "key--operator", aria: "Dấu chấm", mainInsert: ".", mainCaret: 1, shift: "Ran#", shiftAction: "random" }),
      K("percent", "%", { cls: "key--operator", aria: "Phần trăm", mainInsert: "%", mainCaret: 1 }),
      K("ans", "Ans", { cls: "key--dark key--label", aria: "Kết quả trước", shift: "STO", alpha: "RCL", mainInsert: "Ans", mainCaret: 3, shiftAction: "store", alphaAction: "recall" }),
      K("equals", "=", { cls: "key--equals", aria: "Tính kết quả", mainAction: "equals" })
    ]
  ];
  const FLAT_KEYS = KEY_ROWS.flat();

  function buildKeypad() {
    const keypad = $("#keypad");
    if (!keypad) return;
    keypad.innerHTML = KEY_ROWS.map((row) => row.map((key) => {
      const shiftTag = key.shift ? `<span class="key-tag shift">${escapeHtml(key.shift)}</span>` : '<span class="key-tag empty">·</span>';
      const alphaTag = key.alpha ? `<span class="key-tag alpha">${escapeHtml(key.alpha)}</span>` : '<span class="key-tag empty">·</span>';
      return `<div class="key-cell">
        <span class="key-tags">${shiftTag}${alphaTag}</span>
        <button class="key ${key.cls || ""}" type="button" data-key-id="${key.id}" aria-label="${escapeHtml(key.aria)}">
          <span class="key-main">${key.main}</span>
        </button>
      </div>`;
    }).join("")).join("");
  }

  function keyById(id) {
    return FLAT_KEYS.find((key) => key.id === id);
  }

  function buildQuickModes() {
    const wrap = $("#quickModes");
    if (!wrap) return;
    wrap.innerHTML = MODES.map((mode) => `
      <button class="quick-mode" type="button" data-mode="${mode.id}" title="${escapeHtml(mode.name)}">
        <span class="mode-glyph">${modeIconSVG(mode.icon)}</span>
        <span>${escapeHtml(mode.name)}</span>
      </button>`).join("");
  }

  function renderModeDock() {
    const dock = $("#modeDock");
    if (!dock) return;
    if (!state.powered || state.menuOpen) {
      dock.hidden = true;
      dock.innerHTML = "";
      return;
    }
    dock.hidden = false;
    dock.classList.remove("extra-dock");
    if (state.mode === "calculate") {
      dock.hidden = true;
      dock.innerHTML = "";
      return;
    }
    if (state.mode === "basen") {
      dock.innerHTML = `
        <span class="dock-label">HỆ CƠ SỐ</span>
        ${[2, 8, 10, 16].map((base) => `<button class="dock-chip ${state.basenBase === base ? "active" : ""}" type="button" data-basen-base="${base}">${base === 2 ? "BIN" : base === 8 ? "OCT" : base === 10 ? "DEC" : "HEX"}</button>`).join("")}
        <span class="dock-sep"></span>
        ${"ABCDEF".split("").map((ch) => `<button class="dock-chip hex-chip" type="button" data-basen-digit="${ch}" ${state.basenBase !== 16 ? "disabled" : ""}>${ch}</button>`).join("")}
        <span class="dock-sep"></span>
        <span class="dock-label">BIT</span>
        <button class="dock-chip" type="button" data-basen-bit="and" title="Phép AND nhị phân">AND</button>
        <button class="dock-chip" type="button" data-basen-bit="or" title="Phép OR nhị phân">OR</button>
        <button class="dock-chip" type="button" data-basen-bit="xor" title="Phép XOR nhị phân">XOR</button>
        <button class="dock-chip" type="button" data-basen-bit="not" title="Phép NOT nhị phân">NOT</button>
        <button class="dock-chip" type="button" data-basen-bit="shl" title="Dịch trái bit">SHL</button>
        <button class="dock-chip" type="button" data-basen-bit="shr" title="Dịch phải bit">SHR</button>
        <span class="dock-caption">A–F dùng ở hệ 16 · AND, OR, XOR, NOT</span>`;
      return;
    }
    if (state.mode === "complex") {
      dock.innerHTML = `
        <span class="dock-label">SỐ PHỨC</span>
        <button class="dock-chip" type="button" data-complex-insert="i">i</button>
        <button class="dock-chip" type="button" data-complex-insert="∠">r∠θ</button>
        <button class="dock-chip" type="button" data-complex-insert="abs()" data-caret="4">|z|</button>
        <button class="dock-chip" type="button" data-complex-insert="arg()" data-caret="4">arg</button>
        <button class="dock-chip" type="button" data-complex-insert="conj()" data-caret="5">z̄</button>
        <span class="dock-caption">Chế độ số phức đang bật</span>`;
      return;
    }
    dock.hidden = true;
  }

  /* ============================================================
   * Nhập liệu & tính toán
   * ============================================================ */
  function clearModifiers() {
    state.shift = false;
    state.alpha = false;
  }

  function syncHardware() {
    const shiftBtn = $('[data-action="shift"]');
    const alphaBtn = $('[data-action="alpha"]');
    if (shiftBtn) {
      shiftBtn.classList.toggle("is-active", state.shift);
      shiftBtn.setAttribute("aria-pressed", String(state.shift));
    }
    if (alphaBtn) {
      alphaBtn.classList.toggle("is-active", state.alpha);
      alphaBtn.setAttribute("aria-pressed", String(state.alpha));
    }
  }

  function insertText(text, caretOffset, options) {
    if (!state.powered || state.menuOpen) return;
    const opts = options || {};
    if (!text) return;
    if (state.mode === "basen" && opts.allowBasen === false) {
      showToast("Phím này không khả dụng ở chế độ Cơ số N.", "is-error");
      return;
    }

    const leadingOperator = /^[+\-*/^∠]/.test(text);
    const postfixOnly = /^[!%°]/.test(text) || text.startsWith("^-") || text.startsWith("^2") || text.startsWith("^3") || text.startsWith("^(");
    if (state.result || state.error) {
      if (state.justEvaluated) {
        if (leadingOperator || postfixOnly) {
          state.input = "Ans";
          state.cursor = 3;
        } else {
          state.input = "";
          state.cursor = 0;
        }
        state.result = null;
        state.error = null;
        state.justEvaluated = false;
        state.historyCursor = -1;
      } else {
        state.result = null;
        state.error = null;
      }
    }
    const pos = Math.max(0, Math.min(state.input.length, state.cursor));
    state.input = state.input.slice(0, pos) + text + state.input.slice(pos);
    const offset = caretOffset == null ? text.length : caretOffset;
    state.cursor = pos + Math.max(0, Math.min(text.length, offset));
    state.error = null;
    state.justEvaluated = false;
    state.historyCursor = -1;
    vibrate();
    renderScreen();
  }

  function hasOperandBefore(input, position) {
    let i = Math.max(0, Math.min(input.length, position)) - 1;
    while (i >= 0 && /\s/.test(input[i])) i--;
    if (i < 0) return false;
    return /[0-9A-Za-z_π)!%°.]/.test(input[i]);
  }

  function insertPower(kind) {
    if (!state.powered || state.menuOpen) return;
    const hasResult = !!(state.result || state.error);
    const hasBase = hasResult || hasOperandBefore(state.input, state.cursor);
    if (kind === "power") {
      insertText("^()", hasBase ? 2 : 0);
      return;
    }
    const text = kind === "inverse" ? "^-1" : kind === "cube" ? "^3" : "^2";
    insertText(text, hasBase ? text.length : 0);
  }

  function deleteChar() {
    if (!state.powered) return;
    if (state.result || state.error) {
      if (state.justEvaluated) {
        state.result = null;
        state.error = null;
        state.justEvaluated = false;
        state.cursor = state.input.length;
      } else {
        state.result = null;
        state.error = null;
      }
    }
    if (state.cursor > 0) {
      state.input = state.input.slice(0, state.cursor - 1) + state.input.slice(state.cursor);
      state.cursor--;
    }
    state.historyCursor = -1;
    vibrate();
    renderScreen();
  }

  function clearAll() {
    if (state.menuOpen) {
      state.menuOpen = false;
      renderScreen();
      renderModeDock();
      return;
    }
    state.input = "";
    state.cursor = 0;
    state.result = null;
    state.error = null;
    state.justEvaluated = false;
    state.historyCursor = -1;
    vibrate();
    renderScreen();
  }

  function clearResultForEdit() {
    if (state.result || state.error) {
      state.result = null;
      state.error = null;
      state.justEvaluated = false;
      state.cursor = state.input.length;
    }
  }

  function enclosingFraction(input, cursor) {
    for (let start = 0; start < input.length; start++) {
      if (input.startsWith("frac(", start) || input.startsWith("mixed(", start)) {
        const isMixed = input.startsWith("mixed(", start);
        const open = start + (isMixed ? 5 : 4);
        const close = findMatchingParen(input, open);
        if (close === -1 || cursor < open + 1 || cursor > close) continue;
        const inside = input.slice(open + 1, close);
        const commas = [];
        let depth = 0;
        for (let i = 0; i < inside.length; i++) {
          if (inside[i] === "(") depth++;
          else if (inside[i] === ")") depth--;
          else if (inside[i] === "," && depth === 0) commas.push(open + 1 + i);
        }
        return { start, open, close, commas, isMixed };
      }
    }
    return null;
  }

  function navigateFraction(direction) {
    const fraction = enclosingFraction(state.input, state.cursor);
    if (!fraction) return false;
    const marks = [fraction.open + 1, ...fraction.commas.map((p) => p + 1), fraction.close];
    if (direction < 0) {
      for (let i = marks.length - 1; i >= 0; i--) {
        if (marks[i] < state.cursor) { state.cursor = marks[i]; renderScreen(); return true; }
      }
    } else {
      for (let i = 0; i < marks.length; i++) {
        if (marks[i] > state.cursor) { state.cursor = marks[i]; renderScreen(); return true; }
      }
    }
    return true;
  }

  function barePowerEnd(input, index) {
    let j = index + 1;
    if (input[j] === "-" || input[j] === "+") j++;
    const digitStart = j;
    while (j < input.length && /[0-9.]/.test(input[j])) j++;
    if (j === digitStart && j < input.length && /[A-Za-zπ]/.test(input[j])) j++;
    return j;
  }

  function powerRegions(input) {
    const regions = [];
    for (let i = 0; i < input.length; i++) {
      if (input[i] !== "^") continue;
      if (input[i + 1] === "(") {
        const close = findMatchingParen(input, i + 1);
        regions.push({
          baseEnd: i,
          expStart: i + 2,
          expEnd: close === -1 ? input.length : close,
          close,
          parenthesized: true
        });
      } else {
        regions.push({
          baseEnd: i,
          expStart: i + 1,
          expEnd: barePowerEnd(input, i),
          close: -1,
          parenthesized: false
        });
      }
    }
    return regions;
  }

  function navigatePower(direction) {
    const regions = powerRegions(state.input);
    if (!regions.length) return false;
    if (direction > 0) {
      for (const region of regions) {
        if (state.cursor === region.baseEnd || state.cursor === region.baseEnd + 1) {
          if (region.expStart !== state.cursor) {
            state.cursor = region.expStart;
            renderScreen();
            return true;
          }
        }
        if (region.parenthesized && region.close !== -1 && state.cursor === region.expEnd) {
          state.cursor = region.close + 1;
          renderScreen();
          return true;
        }
      }
    } else {
      for (const region of regions) {
        if (region.parenthesized && region.close !== -1 && state.cursor === region.close + 1) {
          state.cursor = region.expEnd;
          renderScreen();
          return true;
        }
        if (state.cursor === region.expStart && state.cursor !== region.baseEnd) {
          state.cursor = region.baseEnd;
          renderScreen();
          return true;
        }
        if (state.cursor === region.baseEnd + 1 && region.expStart !== region.baseEnd + 1) {
          state.cursor = region.baseEnd;
          renderScreen();
          return true;
        }
      }
    }
    return false;
  }

  function moveCursor(direction) {
    if (!state.powered || state.menuOpen) return;
    if (state.result || state.error) {
      const wasResult = !!state.result;
      clearResultForEdit();
      if (wasResult && (direction === "up" || direction === "down")) {
        recallHistory(direction === "up" ? 0 : -1);
        return;
      }
    }
    if (direction === "left" && navigatePower(-1)) return;
    if (direction === "right" && navigatePower(1)) return;
    if (direction === "left") state.cursor = Math.max(0, state.cursor - 1);
    else if (direction === "right") state.cursor = Math.min(state.input.length, state.cursor + 1);
    else if (direction === "up" && navigateFraction(-1)) return;
    else if (direction === "down" && navigateFraction(1)) return;
    else if (direction === "up" || direction === "down") {
      if (!state.input) { recallHistory(0); return; }
      return;
    }
    renderScreen();
  }

  function recallHistory(index) {
    if (!state.history.length) {
      showToast("Chưa có lịch sử tính toán.");
      return;
    }
    if (index < 0) {
      state.input = "";
      state.cursor = 0;
      state.historyCursor = -1;
    } else {
      const clamped = Math.min(index, state.history.length - 1);
      state.historyCursor = clamped;
      state.input = state.history[clamped].expr || "";
      state.cursor = state.input.length;
    }
    state.result = null;
    state.error = null;
    state.justEvaluated = false;
    renderScreen();
  }

  function historyStep(delta) {
    if (!state.history.length) {
      showToast("Chưa có lịch sử tính toán.");
      return;
    }
    let next = state.historyCursor;
    if (next < 0) next = delta > 0 ? 0 : -1;
    else next += delta;
    if (next >= state.history.length) next = state.history.length - 1;
    recallHistory(next);
  }

  function evaluateRaw(expression, options) {
    return E.evaluate(expression, Object.assign({
      angleUnit: state.settings.angleUnit,
      vars: state.vars,
      ans: state.ans,
      complex: state.mode === "complex"
    }, options || {}));
  }

  function setCalcError(error) {
    const code = error && error.code ? error.code : "Math ERROR";
    const detail = error && error.detail ? error.detail : "";
    state.error = { code, detail };
    state.result = null;
    state.justEvaluated = true;
    state.historyCursor = -1;
  }

  function addHistory(expr, resultDisplay) {
    const item = {
      id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 7),
      expr,
      exprPretty: formatExpression(expr, null, true),
      resultHtml: resultDisplay.html,
      resultText: resultDisplay.plainText,
      mode: state.mode,
      ts: Date.now()
    };
    resultDisplay.historyId = item.id;
    state.history.unshift(item);
    state.history = state.history.slice(0, 60);
    persist();
    renderMiniHistory();
    return item;
  }

  function calculate() {
    if (!state.powered) return;
    if (state.menuOpen) {
      selectMenuMode(state.menuIndex);
      return;
    }
    if (!state.input.trim()) {
      showToast("Chưa nhập phép tính.");
      return;
    }
    if (state.mode === "basen") {
      calculateBaseN();
      return;
    }
    const expr = autoCloseText(state.input);
    state.input = expr;
    state.cursor = expr.length;
    try {
      const value = evaluateRaw(expr);
      if (state.mode !== "complex" && Math.abs(value.im) > 1e-10) {
        throw new E.CalcError("Math ERROR", "Kết quả là số phức. Hãy chuyển sang chế độ Số phức.");
      }
      const display = buildResultDisplay(value, expr, state.mode);
      state.result = display;
      state.error = null;
      state.justEvaluated = true;
      state.historyCursor = -1;
      state.ans = { re: value.re, im: value.isComplex ? value.im : 0 };
      addHistory(expr, display);
      persist();
      vibrate();
      renderScreen(true);
    } catch (error) {
      setCalcError(error);
      renderScreen(true);
    }
  }

  function calculateBaseN() {
    if (!state.input.trim()) {
      showToast("Chưa nhập phép tính.");
      return;
    }
    const expr = autoCloseText(state.input);
    state.input = expr;
    state.cursor = expr.length;
    try {
      if (!state.basenAns) state.basenAns = 0n;
      const value = E.evaluateBaseN(expr, state.basenBase, { ans: state.basenAns });
      const text = E.toBaseString(value, state.basenBase);
      const display = {
        baseN: true,
        value,
        expr,
        mode: "basen",
        plainText: text,
        html: escapeHtml(text),
        views: [],
        viewIndex: 0
      };
      state.result = display;
      state.error = null;
      state.justEvaluated = true;
      state.historyCursor = -1;
      state.basenAns = value;
      state.ans = { re: Number(value) || 0, im: 0 };
      addHistory(expr, display);
      persist();
      vibrate();
      renderScreen(true);
    } catch (error) {
      setCalcError(error);
      renderScreen(true);
    }
  }

  function memoryValue() {
    if (state.result && !state.result.baseN && Math.abs(state.result.value.im) < 1e-10) {
      return state.result.value.re;
    }
    if (state.input.trim()) {
      try {
        const value = evaluateRaw(state.input);
        if (Math.abs(value.im) > 1e-10) throw new E.CalcError("Math ERROR");
        return value.re;
      } catch (e) { /* bỏ qua */ }
    }
    return state.ans.re || 0;
  }

  function memoryAdd(sign) {
    const value = memoryValue();
    if (!Number.isFinite(value)) {
      showToast("Không có giá trị để lưu vào M.", "is-error");
      return;
    }
    state.vars.M = Number(state.vars.M || 0) + sign * value;
    persist();
    renderScreen();
    renderModeDock();
    showToast(`${sign > 0 ? "M+" : "M−"}: M = ${formatNumericText(state.vars.M)}`);
  }

  function toggleEngineering() {
    state.settings.engineer = !state.settings.engineer;
    persist();
    renderScreen();
    showToast(state.settings.engineer ? "Đã bật ký hiệu kỹ thuật (ENG)." : "Đã tắt ký hiệu kỹ thuật.");
  }

  /* ============================================================
   * Xử lý phím
   * ============================================================ */
  function handleTopAction(action) {
    if (action === "on") {
      if (!state.powered) bootOn();
      else showToast("Máy đang bật.");
      return;
    }
    if (!state.powered) return;
    if (action === "shift") { state.shift = !state.shift; state.alpha = false; syncHardware(); renderScreen(); vibrate(); return; }
    if (action === "alpha") { state.alpha = !state.alpha; state.shift = false; syncHardware(); renderScreen(); vibrate(); return; }
    if (action === "menu") {
      if (state.shift) {
        state.shift = false;
        syncHardware();
        renderScreen();
        openSettingsModal();
        return;
      }
      if (state.menuOpen) {
        state.menuOpen = false;
        renderScreen();
        renderModeDock();
      } else {
        openMenu();
      }
      return;
    }
    if (state.menuOpen) {
      if (["up", "down", "left", "right"].includes(action)) {
        moveMenuSelection(action);
        renderScreen();
      }
      return;
    }
    if (action === "left" || action === "right") moveCursor(action);
    else if (action === "up" || action === "down") {
      if (state.result || state.error || state.historyCursor >= 0) historyStep(action === "up" ? 1 : -1);
      else moveCursor(action);
    }
  }

  function openMenu() {
    closeModal();
    state.menuOpen = true;
    state.menuIndex = Math.max(0, MODES.findIndex((m) => m.id === state.mode));
    if (state.menuIndex < 0) state.menuIndex = 0;
    state.shift = false;
    state.alpha = false;
    syncHardware();
    renderScreen();
    renderModeDock();
    vibrate();
  }

  function moveMenuSelection(direction) {
    const modes = MODES.length;
    if (state.menuIndex >= modes) {
      if (direction === "up") state.menuIndex = Math.max(0, modes - 4);
      else if (direction === "down") state.menuIndex = 0;
      return;
    }
    if (direction === "left") state.menuIndex = (state.menuIndex - 1 + modes) % modes;
    else if (direction === "right") state.menuIndex = (state.menuIndex + 1) % modes;
    else if (direction === "up") state.menuIndex = state.menuIndex >= 4 ? state.menuIndex - 4 : state.menuIndex + (modes - 4);
    else if (direction === "down") state.menuIndex = state.menuIndex < modes - 4 ? state.menuIndex + 4 : modes;
  }

  function selectMenuMode(index) {
    if (index >= MODES.length) {
      state.menuIndex = MODES.length;
      state.menuOpen = false;
      renderScreen();
      renderModeDock();
      openExtensionToolsModal();
      return;
    }
    const mode = MODES[index];
    if (!mode) return;
    state.menuIndex = index;
    openMode(mode.id);
  }

  function openMode(modeId) {
    const mode = MODES.find((m) => m.id === modeId);
    if (!mode) return;
    state.menuOpen = false;
    if (mode.group === "advanced") {
      state.mode = "calculate";
      state.input = "";
      state.cursor = 0;
      state.result = null;
      state.error = null;
      state.justEvaluated = false;
      renderScreen();
      renderModeDock();
      openAdvancedMode(modeId);
      return;
    }
    state.mode = mode.id;
    state.input = "";
    state.cursor = 0;
    state.result = null;
    state.error = null;
    state.justEvaluated = false;
    state.shift = false;
    state.alpha = false;
    if (mode.id === "basen") state.basenAns = state.basenAns || 0n;
    syncHardware();
    renderScreen();
    renderModeDock();
    vibrate();
    showToast(`Đã chuyển sang chế độ ${mode.name}.`);
  }

  function handleMenuKey(key) {
    if (key.id === "ac" || key.id === "menu") {
      state.menuOpen = false;
      renderScreen();
      renderModeDock();
      return;
    }
    if (key.id === "equals") {
      selectMenuMode(state.menuIndex);
      return;
    }
    if (key.id === "left" || key.id === "right" || key.id === "up" || key.id === "down") {
      moveMenuSelection(key.id);
      renderScreen();
      return;
    }
    if (key.digit) {
      const index = Number(key.digit) - 1;
      if (index >= 0 && index < MODES.length) selectMenuMode(index);
    }
  }

  function allowedBaseNKey(key) {
    return ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "add", "sub", "mul", "div", "lparen", "rparen", "neg", "ans", "del", "ac", "equals"].includes(key.id);
  }

  function baseNDigitAllowed(digit) {
    return Number(digit) < state.basenBase;
  }

  function activateKey(key) {
    if (!state.powered) {
      if (key.id === "on") bootOn();
      return;
    }
    if (state.menuOpen) {
      handleMenuKey(key);
      return;
    }
    const layer = state.shift ? "shift" : state.alpha ? "alpha" : "main";
    clearModifiers();
    syncHardware();

    if (state.mode === "basen" && layer === "alpha") {
      showToast("Chế độ Cơ số N không dùng biến nhớ hay hàm số.", "is-error");
      renderScreen();
      return;
    }
    if (state.mode === "basen" && layer === "shift" && !["powerOff", "reset"].includes(key.shiftAction)) {
      showToast("Chế độ Cơ số N chỉ dùng số và phép tính cơ bản.", "is-error");
      renderScreen();
      return;
    }

    if (key.digit && layer === "main") {
      if (state.mode === "basen" && !baseNDigitAllowed(key.digit)) {
        showToast(`Chữ số ${key.digit} không hợp lệ trong hệ ${state.basenBase}.`, "is-error");
        renderScreen();
        return;
      }
      insertText(key.digit, 1);
    } else if (layer === "shift") {
      if (state.mode === "basen" && key.shiftInsert && !["", "-"].includes(key.shiftInsert)) {
        showToast("Phím này không khả dụng ở chế độ Cơ số N.", "is-error");
        renderScreen();
        return;
      }
      if (key.shiftPower) insertPower(key.shiftPower);
      else if (key.shiftInsert != null) insertText(key.shiftInsert, key.shiftCaret);
      else if (key.shiftAction) dispatchAction(key.shiftAction, key);
      else if (key.mainPower) insertPower(key.mainPower);
      else if (key.mainInsert != null) insertText(key.mainInsert, key.mainCaret);
      else if (key.mainAction) dispatchAction(key.mainAction, key);
      else activateMainKey(key);
    } else if (layer === "alpha") {
      if (key.alphaInsert != null) insertText(key.alphaInsert, key.alphaCaret);
      else if (key.alphaAction) dispatchAction(key.alphaAction, key);
      else if (key.mainInsert != null) insertText(key.mainInsert, key.mainCaret);
      else if (key.mainAction) dispatchAction(key.mainAction, key);
      else activateMainKey(key);
    } else {
      activateMainKey(key);
    }
    renderScreen();
    renderModeDock();
  }

  function activateMainKey(key) {
    if (state.mode === "basen" && !allowedBaseNKey(key)) {
      if (key.id === "sd" || key.id === "mplus") {
        showToast("Phím này không khả dụng ở chế độ Cơ số N.", "is-error");
        return;
      }
      if (key.id === "dot" || key.id === "percent" || key.id === "inv" || key.id === "sqrt" || key.id === "square" || key.id === "pow" || key.id === "log" || key.id === "neg" || key.id === "dms" || key.id === "exp" || key.id === "logbase" || key.id === "ln" || ["sin", "cos", "tan", "pi", "e", "comma", "frac", "xvar", "integral", "optn", "calc"].includes(key.id)) {
        showToast("Chế độ Cơ số N chỉ dùng số và phép tính cơ bản.", "is-error");
        return;
      }
    }
    if (key.digit) {
      if (state.mode === "basen" && !baseNDigitAllowed(key.digit)) {
        showToast(`Chữ số ${key.digit} không hợp lệ trong hệ ${state.basenBase}.`, "is-error");
        return;
      }
      insertText(key.digit, 1);
      return;
    }
    if (key.mainPower) {
      insertPower(key.mainPower);
      return;
    }
    if (key.mainInsert != null) {
      insertText(key.mainInsert, key.mainCaret);
      return;
    }
    if (key.mainAction) {
      dispatchAction(key.mainAction, key);
      return;
    }
    switch (key.id) {
      case "optn": openCatalogModal(); break;
      case "calc": openCalcPrompt(); break;
      case "mplus": memoryAdd(1); break;
      case "ans": insertText("Ans", 3); break;
      case "equals": calculate(); break;
      default: break;
    }
  }

  function dispatchAction(action, key) {
    switch (action) {
      case "delete": deleteChar(); break;
      case "clear": clearAll(); break;
      case "equals": calculate(); break;
      case "toggleSD": toggleResultDisplay(); break;
      case "memAdd": memoryAdd(1); break;
      case "memSub": memoryAdd(-1); break;
      case "powerOff": powerOff(); break;
      case "constants": openConstantsModal(); break;
      case "conversions": openConversionsModal(); break;
      case "reset": openResetModal(); break;
      case "random": insertText("rand()", 4); break;
      case "dms": openDmsModal(); break;
      case "engineer": toggleEngineering(); break;
      case "store": openStoreModal(); break;
      case "recall": openRecallModal(); break;
      case "solve": openSolvePrompt(); break;
      default: break;
    }
  }

  function powerOff() {
    closeModal();
    state.powered = false;
    state.booting = false;
    state.menuOpen = false;
    state.shift = false;
    state.alpha = false;
    syncHardware();
    renderScreen();
    renderModeDock();
  }

  let bootTimer = null;
  function bootOn() {
    clearTimeout(bootTimer);
    state.powered = true;
    state.booting = true;
    state.error = null;
    syncHardware();
    renderScreen();
    renderModeDock();
    bootTimer = setTimeout(() => {
      state.booting = false;
      renderScreen();
      renderModeDock();
    }, 720);
  }

  function renderMiniHistory() {
    const wrap = $("#miniHistory");
    if (!wrap) return;
    if (!state.history.length) {
      wrap.innerHTML = '<div class="mini-empty">Chưa có phép tính nào. Kết quả sẽ được lưu tự động tại đây.</div>';
      return;
    }
    wrap.innerHTML = state.history.slice(0, 4).map((item) => `
      <button class="mini-entry" type="button" data-history-id="${escapeHtml(item.id)}" title="Dùng lại phép tính">
        <span class="mini-expr">${item.exprPretty || escapeHtml(item.expr)}</span>
        <span class="mini-result">${item.resultHtml || escapeHtml(item.resultText || "")}</span>
      </button>`).join("");
  }

  function loadHistoryItem(id) {
    const item = state.history.find((entry) => String(entry.id) === String(id));
    if (!item) return;
    state.input = item.expr || "";
    state.cursor = state.input.length;
    state.result = null;
    state.error = null;
    state.justEvaluated = false;
    state.historyCursor = -1;
    state.menuOpen = false;
    renderScreen();
    renderModeDock();
  }

  function nextTip() {
    state.lastTip = (state.lastTip + 1) % D.tips.length;
    const tip = $("#tipText");
    if (tip) tip.textContent = D.tips[state.lastTip];
  }

  /* ============================================================
   * Khung cửa sổ (modal)
   * ============================================================ */
  let modalCloseTimer = null;
  let lastFocusedElement = null;

  function openModal(config) {
    const overlay = $("#overlay");
    const modal = $("#modal");
    const icon = $("#modalIcon");
    const kicker = $("#modalKicker");
    const title = $("#modalTitle");
    const body = $("#modalBody");
    if (!overlay || !modal || !body) return;
    clearTimeout(modalCloseTimer);
    if (overlay.hidden) lastFocusedElement = document.activeElement;
    modal.className = "modal" + (config.wide ? " is-wide" : "") + (config.className ? " " + config.className : "");
    icon.innerHTML = modeIconSVG(config.icon || "function");
    kicker.textContent = config.kicker || "NIGSIO CLASSWIZ";
    title.textContent = config.title || "Công cụ";
    body.innerHTML = config.body || "";
    overlay.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    if (config.onMount) {
      try { config.onMount(body); } catch (error) { console.error(error); }
    }
    setTimeout(() => {
      const focusable = body.querySelector("input:not([type=hidden]), select, textarea, button");
      if (focusable) focusable.focus({ preventScroll: true });
      else $(".modal-close")?.focus({ preventScroll: true });
    }, 120);
  }

  function closeModal() {
    const overlay = $("#overlay");
    if (!overlay || overlay.hidden) return;
    persist();
    if (graphResizeObserver) { graphResizeObserver.disconnect(); graphResizeObserver = null; }
    if (graphRaf) { cancelAnimationFrame(graphRaf); graphRaf = 0; }
    graphDragState = null;
    graphHoverPoint = null;
    overlay.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    clearTimeout(modalCloseTimer);
    modalCloseTimer = setTimeout(() => {
      overlay.hidden = true;
      const modal = $("#modal");
      if (modal) modal.className = "modal";
      if (lastFocusedElement && lastFocusedElement.focus) {
        try { lastFocusedElement.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ }
      }
    }, 190);
  }

  function card(label, html, sub) {
    return `<div class="lcd-card">
      <div class="lcd-card-label"><span>${escapeHtml(label)}</span><span>NIGSIO</span></div>
      <div class="lcd-card-main">${html}</div>
      ${sub ? `<div class="lcd-card-sub">${sub}</div>` : ""}
    </div>`;
  }

  function workspaceLead(html) {
    return `<p class="workspace-lead">${html}</p>`;
  }

  function openModesModal() {
    closeModal();
    const body = workspaceLead(`Chọn một trong <strong>12 chế độ chính</strong> của motkikiX hoặc mở <strong>${EXTRA_TOOLS.length} công cụ mở rộng</strong> cho giải tích, hình học, vật lý, thống kê suy diễn và nhiều phép tính nâng cao khác.`) +
      `<div class="mode-picker-grid">${MODES.map((mode) => `
        <button class="mode-choice ${state.mode === mode.id ? "is-active" : ""}" type="button" data-mode-select="${mode.id}">
          <span class="mode-choice-icon">${modeIconSVG(mode.icon)}</span>
          <span class="mode-choice-text"><strong>${escapeHtml(mode.name)}</strong><small>${escapeHtml(mode.desc)}</small></span>
        </button>`).join("")}</div>
      <div class="section-title"><h3>Công cụ mở rộng</h3><span>Ngoài 12 chế độ chính</span></div>
      <div class="extra-tool-grid">${EXTRA_TOOLS.map((tool) => `
        <button class="extra-tool-card" type="button" data-extra-tool="${tool.id}">
          <span class="mode-choice-icon">${modeIconSVG(tool.icon)}</span>
          <span class="mode-choice-text"><strong>${escapeHtml(tool.name)}</strong><small>${escapeHtml(tool.desc)}</small></span>
        </button>`).join("")}</div>
      <div class="button-row between">
        <span class="tiny-label">Mẹo: nhấn MENU trên máy rồi chọn MỞ RỘNG để vào nhanh công cụ.</span>
        <button class="btn ghost small" type="button" data-close-modal>Đóng</button>
      </div>`;
    openModal({
      title: "Chọn chế độ",
      kicker: `12 CHẾ ĐỘ + ${EXTRA_TOOLS.length} CÔNG CỤ · motkikiX`,
      icon: "calc",
      wide: true,
      body,
      onMount(root) {
        $$("[data-mode-select]", root).forEach((button) => {
          button.addEventListener("click", () => {
            const id = button.dataset.modeSelect;
            closeModal();
            openMode(id);
          });
        });
        $$("[data-extra-tool]", root).forEach((button) => {
          button.addEventListener("click", () => {
            const id = button.dataset.extraTool;
            closeModal();
            openExtraTool(id);
          });
        });
      }
    });
  }

  function openExtensionToolsModal() {
    closeModal();
    const body = workspaceLead(`Bộ công cụ mở rộng gồm <strong>${EXTRA_TOOLS.length} tiện ích</strong> nằm ngoài 12 chế độ chính. Chọn một công cụ để mở ngay; mọi công cụ đều chạy cục bộ trên trình duyệt.`) +
      `<div class="extra-tool-grid extension-modal-grid">${EXTRA_TOOLS.map((tool) => `
        <button class="extra-tool-card" type="button" data-extra-tool="${tool.id}">
          <span class="mode-choice-icon">${modeIconSVG(tool.icon)}</span>
          <span class="mode-choice-text"><strong>${escapeHtml(tool.name)}</strong><small>${escapeHtml(tool.desc)}</small></span>
        </button>`).join("")}</div>
      <div class="button-row between">
        <span class="tiny-label">Mẹo: bấm MENU trên máy → MỞ RỘNG để quay lại đây.</span>
        <button class="btn ghost small" type="button" data-close-modal>Đóng</button>
      </div>`;
    openModal({
      title: "Công cụ mở rộng",
      kicker: `NIGSIO · ${EXTRA_TOOLS.length} TIỆN ÍCH`,
      icon: "graph",
      wide: true,
      body,
      onMount(root) {
        $$("[data-extra-tool]", root).forEach((button) => {
          button.addEventListener("click", () => {
            const id = button.dataset.extraTool;
            closeModal();
            openExtraTool(id);
          });
        });
      }
    });
  }

  /* ============================================================
   * Thư viện hàm
   * ============================================================ */
  let catalogGroup = "all";
  let catalogQuery = "";

  function openCatalogModal() {
    closeModal();
    const tabs = [{ id: "all", name: "Tất cả" }].concat(D.functionGroups.map((g) => ({ id: g.id, name: g.name })));
    const body = workspaceLead("Chèn nhanh hàm, toán tử và biến vào biểu thức đang nhập. Bạn cũng có thể nhập trực tiếp bằng bàn phím.") +
      `<div class="search-field">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>
        <input type="search" id="catalogSearch" placeholder="Tìm hàm… ví dụ: căn, log, ma trận, sin" autocomplete="off">
      </div>
      <div class="tab-strip catalog-tabs">${tabs.map((tab) => `<button class="tab-btn ${catalogGroup === tab.id ? "is-active" : ""}" type="button" data-catalog-group="${tab.id}">${escapeHtml(tab.name)}</button>`).join("")}</div>
      <div id="catalogList"></div>`;
    openModal({
      title: "Thư viện hàm",
      kicker: "FUNCTION CATALOG",
      icon: "catalog",
      wide: true,
      body,
      onMount(root) {
        const list = $("#catalogList", root);
        const search = $("#catalogSearch", root);
        const render = () => {
          const q = catalogQuery.trim().toLowerCase();
          let html = "";
          let count = 0;
          const groups = catalogGroup === "all" ? D.functionGroups : D.functionGroups.filter((g) => g.id === catalogGroup);
          groups.forEach((group) => {
            const items = group.items.filter((item) => {
              const haystack = [item.label, item.desc, item.insert, item.html].join(" ").toLowerCase();
              return !q || haystack.includes(q);
            });
            if (!items.length) return;
            count += items.length;
            html += `<section class="catalog-section"><div class="catalog-section-head">${escapeHtml(group.name)}</div>
              <div class="catalog-grid">${items.map((item, index) => `
                <button class="catalog-fn" type="button" data-fn-group="${group.id}" data-fn-index="${D.functionGroups.indexOf(group)}:${group.items.indexOf(item)}">
                  <span class="fn-symbol">${item.html}</span>
                  <span class="fn-meta"><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.desc || item.insert || "")}</small></span>
                </button>`).join("")}</div></section>`;
          });
          if (!count) html = '<div class="catalog-empty">Không tìm thấy hàm phù hợp.</div>';
          list.innerHTML = html;
          $$("[data-fn-index]", list).forEach((button) => {
            button.addEventListener("click", () => {
              const [gi, ii] = button.dataset.fnIndex.split(":").map(Number);
              const item = D.functionGroups[gi] && D.functionGroups[gi].items[ii];
              if (!item) return;
              closeModal();
              setTimeout(() => {
                if (item.action) {
                  if (item.action === "store") openStoreModal();
                  else if (item.action === "recall") openRecallModal();
                } else {
                  insertText(item.insert, item.caret);
                }
              }, 80);
            });
          });
        };
        render();
        search.addEventListener("input", () => { catalogQuery = search.value; render(); });
        $$("[data-catalog-group]", root).forEach((button) => {
          button.addEventListener("click", () => {
            catalogGroup = button.dataset.catalogGroup;
            $$("[data-catalog-group]", root).forEach((b) => b.classList.toggle("is-active", b === button));
            render();
          });
        });
      }
    });
  }

  /* ============================================================
   * Lịch sử
   * ============================================================ */
  function openHistoryModal() {
    closeModal();
    const items = state.history;
    const body = items.length ? `
      <div class="history-toolbar">
        <p>${items.length} phép tính được lưu trên thiết bị này.</p>
        <div class="button-row" style="margin:0">
          <button class="btn ghost small" type="button" data-history-copy-all>Sao chép tất cả</button>
          <button class="btn danger small" type="button" data-history-clear>Xoá lịch sử</button>
        </div>
      </div>
      <div class="history-list">${items.map((item) => `
        <div class="history-row">
          <div>
            <div class="history-expression">${item.exprPretty || escapeHtml(item.expr)}</div>
            <div class="history-answer">${item.resultHtml || escapeHtml(item.resultText || "")}</div>
            <div class="history-meta">${new Date(item.ts || 0).toLocaleString("vi-VN")} · ${escapeHtml(modeMeta(item.mode).name)}</div>
          </div>
          <div class="history-actions">
            <button class="icon-action" type="button" title="Dùng lại" data-history-load="${escapeHtml(item.id)}">↺</button>
            <button class="icon-action" type="button" title="Sao chép" data-history-copy="${escapeHtml(item.id)}">⧉</button>
            <button class="icon-action" type="button" title="Xoá" data-history-delete="${escapeHtml(item.id)}">×</button>
          </div>
        </div>`).join("")}</div>` : `
      <div class="empty-history"><div class="empty-icon">⌁</div><p>Chưa có phép tính nào</p><small>Mọi kết quả bạn tính sẽ xuất hiện tại đây.</small></div>`;
    openModal({
      title: "Lịch sử tính toán",
      kicker: "MEMORY · HISTORY",
      icon: "history",
      wide: true,
      body,
      onMount(root) {
        $$("[data-history-load]", root).forEach((button) => button.addEventListener("click", () => {
          loadHistoryItem(button.dataset.historyLoad);
          closeModal();
        }));
        $$("[data-history-copy]", root).forEach((button) => button.addEventListener("click", () => {
          const item = state.history.find((h) => String(h.id) === button.dataset.historyCopy);
          if (item) copyText(`${item.expr} = ${item.resultText}`);
        }));
        $$("[data-history-delete]", root).forEach((button) => button.addEventListener("click", () => {
          state.history = state.history.filter((h) => String(h.id) !== button.dataset.historyDelete);
          persist();
          renderMiniHistory();
          openHistoryModal();
        }));
        const copyAll = $("[data-history-copy-all]", root);
        if (copyAll) copyAll.addEventListener("click", () => copyText(state.history.map((h) => `${h.expr} = ${h.resultText}`).join("\n")));
        const clear = $("[data-history-clear]", root);
        if (clear) {
          let armed = false;
          clear.addEventListener("click", () => {
            if (!armed) {
              armed = true;
              clear.textContent = "Nhấn lần nữa để xoá hết";
              clear.classList.add("primary");
              return;
            }
            state.history = [];
            persist();
            renderMiniHistory();
            openHistoryModal();
            showToast("Đã xoá lịch sử.");
          });
        }
      }
    });
  }

  /* ============================================================
   * Cài đặt
   * ============================================================ */
  function settingSelect(key, options) {
    return `<select data-setting="${key}">${options.map(([value, label]) => `<option value="${value}" ${String(state.settings[key]) === String(value) ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select>`;
  }

  function settingSwitch(key) {
    return `<label class="switch"><input type="checkbox" data-setting="${key}" ${state.settings[key] ? "checked" : ""}><span class="switch-track"></span></label>`;
  }

  function openSettingsModal() {
    closeModal();
    const body = `
      <div class="settings-section">
        <h3>Tính toán</h3>
        <div class="setting-row"><div class="setting-label"><strong>Đơn vị góc</strong><small>Áp dụng cho sin, cos, tan và số phức.</small></div><div class="setting-control">${settingSelect("angleUnit", [["deg", "Độ (Degree)"], ["rad", "Radian"], ["gra", "Gradian"]])}</div></div>
        <div class="setting-row"><div class="setting-label"><strong>Kiểu nhập / xuất</strong><small>Math: phân số và căn thức tự nhiên. Linear: một dòng.</small></div><div class="setting-control">${settingSelect("inputOutput", [["math", "MathI / MathO"], ["linear", "LineI / LineO"]])}</div></div>
        <div class="setting-row"><div class="setting-label"><strong>Dạng phân số</strong><small>Cách hiển thị hỗn số hoặc phân số thường.</small></div><div class="setting-control">${settingSelect("fracResult", [["dc", "a/b"], ["mixed", "Hỗn số" ]])}</div></div>
        <div class="setting-row"><div class="setting-label"><strong>Dạng số phức</strong><small>Kết quả mặc định ở chế độ Số phức.</small></div><div class="setting-control">${settingSelect("complexResult", [["rect", "Đại số (a+bi)"], ["polar", "Cực (r∠θ)"]])}</div></div>
      </div>
      <div class="settings-section">
        <h3>Định dạng số</h3>
        <div class="setting-row"><div class="setting-label"><strong>Chế độ hiển thị</strong><small>Norm, FIX hoặc SCI.</small></div><div class="setting-control">${settingSelect("numberFormat", [["norm1", "Norm 1"], ["norm2", "Norm 2"], ["fix", "FIX"], ["sci", "SCI"]])}</div></div>
        <div class="setting-row"><div class="setting-label"><strong>Số chữ số FIX</strong><small>Từ 0 đến 9 chữ số thập phân.</small></div><div class="setting-control"><select data-setting="fixDigits">${Array.from({ length: 10 }, (_, i) => `<option value="${i}" ${Number(state.settings.fixDigits) === i ? "selected" : ""}>${i}</option>`).join("")}</select></div></div>
        <div class="setting-row"><div class="setting-label"><strong>Số chữ số SCI</strong><small>Số chữ số có nghĩa, từ 1 đến 10.</small></div><div class="setting-control"><select data-setting="sciDigits">${Array.from({ length: 10 }, (_, i) => i + 1).map((i) => `<option value="${i}" ${Number(state.settings.sciDigits) === i ? "selected" : ""}>${i}</option>`).join("")}</select></div></div>
        <div class="setting-row"><div class="setting-label"><strong>Dấu phân cách hàng nghìn</strong><small>Hiển thị 1,234,567 thay vì 1234567.</small></div><div class="setting-control">${settingSwitch("separator")}</div></div>
        <div class="setting-row"><div class="setting-label"><strong>Ký hiệu kỹ thuật ENG</strong><small>Hiển thị số mũ bội số của 3.</small></div><div class="setting-control">${settingSwitch("engineer")}</div></div>
      </div>
      <div class="settings-section">
        <h3>Trải nghiệm</h3>
        <div class="setting-row"><div class="setting-label"><strong>Rung phản hồi</strong><small>Rung nhẹ khi bấm phím trên điện thoại (nếu được hỗ trợ).</small></div><div class="setting-control">${settingSwitch("haptics")}</div></div>
        <div class="setting-row"><div class="setting-label"><strong>Tần số thống kê</strong><small>Bật cột tần số trong không gian Thống kê.</small></div><div class="setting-control">${settingSwitch("statFreq")}</div></div>
      </div>
      <div class="settings-note">Cài đặt, biến nhớ và lịch sử được lưu tự động trong trình duyệt. Không có dữ liệu nào được gửi lên máy chủ.</div>
      <div class="button-row end">
        <button class="btn ghost small" type="button" id="resetSettings">Khôi phục mặc định</button>
        <button class="btn primary small" type="button" data-close-modal>Xong</button>
      </div>`;
    openModal({
      title: "Cài đặt máy",
      kicker: "SETUP · CLASSWIZ",
      icon: "settings",
      body,
      onMount(root) {
        $$("[data-setting]", root).forEach((input) => {
          input.addEventListener("change", () => {
            const key = input.dataset.setting;
            let value = input.type === "checkbox" ? input.checked : input.value;
            if (key === "fixDigits" || key === "sciDigits") value = Number(value);
            state.settings[key] = value;
            persist();
            renderScreen();
            syncHardware();
            if (key === "separator" || key === "engineer" || key === "numberFormat" || key === "fixDigits" || key === "sciDigits" || key === "inputOutput" || key === "fracResult" || key === "complexResult") {
              if (state.result) {
                // Định dạng lại kết quả hiện tại theo cài đặt mới.
                const old = state.result;
                const rebuilt = buildResultDisplay(old.value, old.expr, old.mode);
                rebuilt.historyId = old.historyId;
                rebuilt.viewIndex = Math.min(old.viewIndex || 0, rebuilt.views.length - 1);
                refreshResultDisplay(rebuilt);
                state.result = rebuilt;
                renderScreen();
              }
            }
            showToast("Đã lưu cài đặt.");
          });
        });
        $("#resetSettings", root).addEventListener("click", () => {
          state.settings = Object.assign({}, DEFAULT_SETTINGS);
          persist();
          renderScreen();
          openSettingsModal();
          showToast("Đã khôi phục cài đặt mặc định.");
        });
      }
    });
  }

  /* ============================================================
   * Hằng số & đổi đơn vị
   * ============================================================ */
  function constantInsertValue(item) {
    if (item.symbol === "π") return "π";
    if (item.symbol === "e" && Math.abs(item.value - Math.E) < 1e-12) return "e";
    const text = String(item.value);
    if (text.includes("e") || text.includes("E")) {
      const [m, e] = text.toLowerCase().split("e");
      return `${m}*10^${Number(e)}`;
    }
    return text;
  }

  function openConstantsModal() {
    closeModal();
    let groups = [];
    D.constants.forEach((item) => {
      if (!groups.includes(item.group)) groups.push(item.group);
    });
    const body = workspaceLead("Chạm vào một hằng số để chèn giá trị vào biểu thức. Đơn vị được ghi chú bên dưới.") +
      `<div class="constant-list">${groups.map((group) => `
        <div class="constant-group-title">${escapeHtml(group)}</div>
        ${D.constants.filter((item) => item.group === group).map((item) => {
          const index = D.constants.indexOf(item);
          return `<div class="constant-row">
            <span class="constant-symbol">${escapeHtml(item.symbol)}</span>
            <span class="constant-name"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.unit || "không đơn vị")}</small></span>
            <span class="constant-value">${formatNumericText(item.value, { numberFormat: "sci", sciDigits: 8 })}</span>
            <button class="btn tiny" type="button" data-constant-insert="${index}">Chèn</button>
          </div>`;
        }).join("")}`).join("")}</div>
      <div class="settings-note">Hằng số được lấy theo giá trị SI khuyến nghị (CODATA 2018).</div>`;
    openModal({
      title: "Hằng số khoa học",
      kicker: "CONSTANTS · 7",
      icon: "constant",
      wide: true,
      body,
      onMount(root) {
        $$("[data-constant-insert]", root).forEach((button) => {
          button.addEventListener("click", () => {
            const item = D.constants[Number(button.dataset.constantInsert)];
            if (!item) return;
            closeModal();
            setTimeout(() => insertText(constantInsertValue(item), constantInsertValue(item).length), 80);
            showToast(`Đã chèn ${item.symbol}.`);
          });
        });
      }
    });
  }

  const conversionState = { category: "length", from: "m", to: "km", value: "1" };

  function conversionUnits(categoryId) {
    const category = D.conversions.find((entry) => entry.id === categoryId) || D.conversions[0];
    return category.units;
  }

  function currentConversion() {
    const units = conversionUnits(conversionState.category);
    const from = units.find((u) => u.id === conversionState.from) || units[0];
    const to = units.find((u) => u.id === conversionState.to) || units[1] || units[0];
    const input = Number(conversionState.value);
    const baseValue = input * from.factor + (from.offset || 0);
    const output = Number.isFinite(input) ? (baseValue - (to.offset || 0)) / to.factor : NaN;
    return { from, to, input, output };
  }

  function openConversionsModal() {
    closeModal();
    let units = conversionUnits(conversionState.category);
    if (!units.some((u) => u.id === conversionState.from)) conversionState.from = units[0].id;
    if (!units.some((u) => u.id === conversionState.to)) conversionState.to = units[1] ? units[1].id : units[0].id;
    const conv = currentConversion();
    const body = workspaceLead("Đổi giá trị giữa các đơn vị. Kết quả cập nhật ngay khi bạn nhập, và có thể chèn vào máy tính.") +
      `<div class="unit-category-chips">${D.conversions.map((cat) => `<button class="unit-chip ${cat.id === conversionState.category ? "is-active" : ""}" type="button" data-conv-category="${cat.id}">${escapeHtml(cat.name)}</button>`).join("")}</div>
      <div class="conversion-grid">
        <div class="field"><label>Giá trị</label><input id="convValue" inputmode="decimal" value="${escapeHtml(conversionState.value)}"></div>
        <button class="conversion-swap" type="button" id="convSwap" title="Đổi chiều">⇄</button>
        <div class="conversion-result" style="margin:0">
          <div class="conversion-line">
            <div><div class="conv-input" id="convFromValue">${formatNumericText(conv.input, { numberFormat: "norm1" })} ${escapeHtml(conv.from.symbol)}</div><div class="conv-eq">=</div></div>
            <div class="conv-output" id="convToValue">${Number.isFinite(conv.output) ? formatNumericText(conv.output, { numberFormat: "norm1" }) : "—"} ${escapeHtml(conv.to.symbol)}</div>
          </div>
        </div>
      </div>
      <div class="form-grid" style="margin-top:11px">
        <div class="field"><label>Đơn vị nguồn</label><select id="convFrom">${units.map((u) => `<option value="${u.id}" ${u.id === conv.from.id ? "selected" : ""}>${escapeHtml(u.name)} (${escapeHtml(u.symbol)})</option>`).join("")}</select></div>
        <div class="field"><label>Đơn vị đích</label><select id="convTo">${units.map((u) => `<option value="${u.id}" ${u.id === conv.to.id ? "selected" : ""}>${escapeHtml(u.name)} (${escapeHtml(u.symbol)})</option>`).join("")}</select></div>
      </div>
      <div class="button-row between">
        <span class="field-hint" id="convExact"></span>
        <div class="button-row" style="margin:0">
          <button class="btn ghost small" type="button" data-close-modal>Đóng</button>
          <button class="btn primary small" type="button" id="convInsert">Chèn kết quả</button>
        </div>
      </div>`;
    openModal({
      title: "Đổi đơn vị",
      kicker: "UNIT CONVERSION",
      icon: "convert",
      body,
      onMount(root) {
        const valueInput = $("#convValue", root);
        const update = () => {
          conversionState.value = valueInput.value;
          const result = currentConversion();
          $("#convFromValue", root).textContent = `${formatNumericText(result.input, { numberFormat: "norm1" })} ${result.from.symbol}`;
          $("#convToValue", root).textContent = `${Number.isFinite(result.output) ? formatNumericText(result.output, { numberFormat: "norm1" }) : "—"} ${result.to.symbol}`;
          $("#convExact", root).textContent = Number.isFinite(result.output) ? `${formatNumericText(result.output, { numberFormat: "sci", sciDigits: 10 })} ${result.to.symbol}` : "Nhập một số hợp lệ.";
        };
        valueInput.addEventListener("input", () => {
          conversionState.value = valueInput.value;
          const result = currentConversion();
          $("#convFromValue", root).textContent = `${formatNumericText(result.input, { numberFormat: "norm1" })} ${result.from.symbol}`;
          $("#convToValue", root).textContent = `${Number.isFinite(result.output) ? formatNumericText(result.output, { numberFormat: "norm1" }) : "—"} ${result.to.symbol}`;
          $("#convExact", root).textContent = Number.isFinite(result.output) ? `${formatNumericText(result.output, { numberFormat: "sci", sciDigits: 10 })} ${result.to.symbol}` : "Nhập một số hợp lệ.";
        });
        $$("[data-conv-category]", root).forEach((button) => button.addEventListener("click", () => {
          conversionState.category = button.dataset.convCategory;
          const nextUnits = conversionUnits(conversionState.category);
          conversionState.from = nextUnits[0].id;
          conversionState.to = nextUnits[1] ? nextUnits[1].id : nextUnits[0].id;
          openConversionsModal();
        }));
        $("#convFrom", root).addEventListener("change", (event) => { conversionState.from = event.target.value; openConversionsModal(); });
        $("#convTo", root).addEventListener("change", (event) => { conversionState.to = event.target.value; openConversionsModal(); });
        $("#convSwap", root).addEventListener("click", () => {
          const temp = conversionState.from;
          conversionState.from = conversionState.to;
          conversionState.to = temp;
          openConversionsModal();
        });
        $("#convInsert", root).addEventListener("click", () => {
          const result = currentConversion();
          if (!Number.isFinite(result.output)) { showToast("Kết quả không hợp lệ.", "is-error"); return; }
          const insertValue = insertableNumericText(result.output, { numberFormat: "norm1" });
          closeModal();
          setTimeout(() => insertText(insertValue, insertValue.length), 80);
          showToast(`Đã chèn ${formatNumericText(result.output, { numberFormat: "norm1" })} ${result.to.symbol}.`);
        });
        update();
      }
    });
  }

  /* ============================================================
   * Công cụ nhỏ: reset, STO/RCL, CALC, DMS
   * ============================================================ */
  function openResetModal() {
    closeModal();
    const body = workspaceLead("Chọn dữ liệu cần xoá. Thao tác này không thể hoàn tác.") +
      `<div class="form-grid">
        <label class="field" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="resetHistory" checked><span>Lịch sử tính toán</span></label>
        <label class="field" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="resetVars" checked><span>Biến nhớ A–F, X, Y, M</span></label>
        <label class="field" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="resetAdvanced" checked><span>Ma trận, vectơ &amp; dữ liệu thống kê</span></label>
        <label class="field" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="resetSettings"><span>Cài đặt máy</span></label>
      </div>
      <div class="notice" style="margin-top:14px"><span class="notice-icon">!</span><span>Ans cũng sẽ được đưa về 0 sau khi đặt lại.</span></div>
      <div class="button-row end"><button class="btn ghost small" type="button" data-close-modal>Huỷ</button><button class="btn danger small" type="button" id="confirmReset">Đặt lại dữ liệu</button></div>`;
    openModal({
      title: "Đặt lại",
      kicker: "RESET",
      icon: "reset",
      body,
      onMount(root) {
        $("#confirmReset", root).addEventListener("click", () => {
          if ($("#resetHistory", root).checked) state.history = [];
          if ($("#resetVars", root).checked) {
            Object.keys(state.vars).forEach((key) => { state.vars[key] = 0; });
            state.ans = { re: 0, im: 0 };
            state.basenAns = 0n;
          }
          if ($("#resetAdvanced", root).checked) {
            state.statData = {
              type: "1var",
              model: "linear",
              rows1: [{ x: "1", f: "1" }, { x: "2", f: "1" }, { x: "3", f: "1" }],
              rows2: [{ x: "1", y: "2", f: "1" }, { x: "2", y: "4", f: "1" }, { x: "3", y: "6", f: "1" }]
            };
            state.matrices = {
              A: { rows: 2, cols: 2, data: [["1", "0"], ["0", "1"]] },
              B: { rows: 2, cols: 2, data: [["1", "0"], ["0", "1"]] },
              C: { rows: 2, cols: 2, data: [["0", "0"], ["0", "0"]] },
              D: { rows: 2, cols: 2, data: [["0", "0"], ["0", "0"]] }
            };
            state.vectors = {
              A: { dim: 3, data: ["1", "0", "0"] },
              B: { dim: 3, data: ["0", "1", "0"] },
              C: { dim: 3, data: ["0", "0", "1"] },
              D: { dim: 3, data: ["0", "0", "0"] }
            };
            statsResult = null;
            advancedResult = null;
          }
          if ($("#resetSettings", root).checked) state.settings = Object.assign({}, DEFAULT_SETTINGS);
          persist();
          renderMiniHistory();
          renderScreen();
          syncHardware();
          closeModal();
          showToast("Đã đặt lại dữ liệu đã chọn.");
        });
      }
    });
  }

  function currentStorableValue() {
    if (state.result && !state.result.baseN) {
      return { value: state.result.value.re, complex: Math.abs(state.result.value.im) > 1e-10 };
    }
    if (state.input.trim()) {
      try {
        const v = evaluateRaw(state.input);
        return { value: v.re, complex: Math.abs(v.im) > 1e-10 };
      } catch (e) { /* bỏ qua */ }
    }
    return { value: state.ans.re || 0, complex: Math.abs(state.ans.im || 0) > 1e-10 };
  }

  function openStoreModal() {
    closeModal();
    const current = currentStorableValue();
    const body = workspaceLead("Lưu giá trị hiện tại vào một biến nhớ. Trong chế độ Số phức, chỉ phần thực được lưu vào biến số thực.") +
      card("GIÁ TRỊ CẦN LƯU", escapeHtml(formatNumericText(current.value)), current.complex ? "Giá trị phức — sẽ lưu phần thực." : "Sẵn sàng lưu.") +
      `<div class="section-title"><h3>Chọn biến</h3><span>SHIFT + Ans</span></div>
      <div class="matrix-tabs">${["A", "B", "C", "D", "E", "F", "X", "Y", "M"].map((name) => `<button class="matrix-tab" type="button" data-store-var="${name}">${name}</button>`).join("")}</div>
      <div class="field"><label>Hoặc nhập giá trị khác</label><input id="storeValue" value="${escapeHtml(formatNumericText(current.value))}" inputmode="decimal"></div>
      <div class="button-row between"><span class="field-hint">Biến M có thể cộng/trừ bằng M+ và M−.</span><button class="btn ghost small" type="button" data-close-modal>Đóng</button></div>`;
    openModal({
      title: "Gán biến STO",
      kicker: "STORE · VARIABLE",
      icon: "store",
      body,
      onMount(root) {
        $$("[data-store-var]", root).forEach((button) => {
          button.addEventListener("click", () => {
            const entered = Number($("#storeValue", root).value);
            const value = Number.isFinite(entered) ? entered : current.value;
            const name = button.dataset.storeVar;
            state.vars[name] = value;
            persist();
            closeModal();
            renderScreen();
            showToast(`Đã lưu ${name} = ${formatNumericText(value)}.`);
          });
        });
      }
    });
  }

  function openRecallModal() {
    closeModal();
    const body = workspaceLead("Chọn một biến để chèn vào biểu thức hiện tại. Giá trị được hiển thị bên cạnh.") +
      `<div class="constant-list">${["A", "B", "C", "D", "E", "F", "X", "Y", "M"].map((name) => `
        <div class="constant-row"><span class="constant-symbol">${name}</span><span class="constant-name"><strong>Biến ${name}</strong><small>${formatNumericText(state.vars[name], { numberFormat: "norm1" })}</small></span><button class="btn tiny" type="button" data-recall-var="${name}">Chèn</button></div>`).join("")}
        <div class="constant-row"><span class="constant-symbol">Ans</span><span class="constant-name"><strong>Kết quả trước</strong><small>${formatNumericText(state.ans.re, { numberFormat: "norm1" })}${Math.abs(state.ans.im) > 1e-10 ? " " + (state.ans.im < 0 ? "−" : "+") + " " + formatNumericText(Math.abs(state.ans.im)) + "i" : ""}</small></span><button class="btn tiny" type="button" data-recall-var="Ans">Chèn</button></div></div>`;
    openModal({
      title: "Truy xuất biến RCL",
      kicker: "RECALL · VARIABLE",
      icon: "recall",
      body,
      onMount(root) {
        $$("[data-recall-var]", root).forEach((button) => button.addEventListener("click", () => {
          closeModal();
          const name = button.dataset.recallVar;
          setTimeout(() => insertText(name, name.length), 80);
        }));
      }
    });
  }

  function variablesInExpression(expression) {
    const found = [];
    const cleaned = String(expression || "").replace(/Ans/g, "");
    const regex = /(^|[^A-Za-z])([A-FXYM])(?![A-Za-z])/g;
    let match;
    while ((match = regex.exec(cleaned))) {
      if (!found.includes(match[2])) found.push(match[2]);
    }
    return found;
  }

  function openCalcPrompt() {
    closeModal();
    const expression = state.input || "";
    const vars = variablesInExpression(expression);
    const body = workspaceLead("Nhập giá trị cho các biến trong biểu thức, sau đó bấm <strong>Tính</strong>. Kết quả sẽ dùng các giá trị này.") +
      `<div class="field field-wide"><label>Biểu thức</label><input id="calcExpression" value="${escapeHtml(expression)}" placeholder="Ví dụ: X^2 + 2X + 1"></div>` +
      (vars.length ? `<div class="form-grid" style="margin-top:11px">${vars.map((name) => `<div class="field"><label>Biến ${name}</label><input class="calc-var" data-calc-var="${name}" value="${escapeHtml(formatNumericText(state.vars[name]))}" inputmode="decimal"></div>`).join("")}</div>` : `<div class="notice" style="margin-top:12px"><span class="notice-icon">i</span><span>Biểu thức chưa có biến. Bạn có thể dùng ALPHA để chèn A–F, X, Y hoặc M.</span></div>`) +
      `<div class="button-row end"><button class="btn ghost small" type="button" data-close-modal>Huỷ</button><button class="btn primary small" type="button" id="calcRun">Tính</button></div>`;
    openModal({
      title: "Tính với biến CALC",
      kicker: "CALC · VARIABLE PROMPT",
      icon: "var",
      body,
      onMount(root) {
        $("#calcRun", root).addEventListener("click", () => {
          const expr = $("#calcExpression", root).value.trim();
          const values = $$("[data-calc-var]", root);
          let valid = true;
          values.forEach((input) => {
            const value = Number(input.value);
            if (!Number.isFinite(value)) { input.style.borderColor = "rgba(226,94,81,0.6)"; valid = false; }
            else state.vars[input.dataset.calcVar] = value;
          });
          if (!valid) { showToast("Giá trị biến không hợp lệ.", "is-error"); return; }
          state.input = expr;
          state.cursor = expr.length;
          state.result = null;
          state.error = null;
          state.justEvaluated = false;
          closeModal();
          persist();
          setTimeout(() => calculate(), 90);
        });
      }
    });
  }

  function openSolvePrompt() {
    let expression = state.input.trim();
    if (!expression) expression = equationState.solverExpr || "x^2-2";
    if (expression.includes("=")) {
      const parts = expression.split("=");
      expression = `(${parts.shift() || "0"})-(${parts.join("=") || "0"})`;
    }
    equationState.tab = "solver";
    equationState.solverExpr = expression;
    equationState.solverGuess = "1";
    openEquationWorkspace("solver");
  }

  function dmsSecondsText(seconds) {
    let text = formatNumericText(seconds, { numberFormat: "fix", fixDigits: 3 });
    if (text.includes(".")) text = text.replace(/0+$/, "").replace(/\.$/, "");
    return text || "0";
  }

  function openDmsModal() {
    closeModal();
    const body = workspaceLead("Chuyển đổi giữa độ–phút–giây và số thập phân. Có thể chèn kết quả vào máy tính.") +
      `<div class="two-col">
        <div><div class="section-title"><h3>Độ → thập phân</h3><span>DMS</span></div>
          <div class="form-grid three">
            <div class="field"><label>Độ</label><input id="dmsDeg" inputmode="numeric" value="12"></div>
            <div class="field"><label>Phút</label><input id="dmsMin" inputmode="numeric" value="34"></div>
            <div class="field"><label>Giây</label><input id="dmsSec" inputmode="decimal" value="56"></div>
          </div>
          <div class="conversion-result"><div class="conversion-line"><span class="conv-input" id="dmsDecimal">12,5822°</span><span class="conv-eq">=</span><span class="conv-output" id="dmsDecimalOut">12,5822°</span></div></div>
          <div class="button-row"><button class="btn small" type="button" id="dmsInsertDms">Chèn số thập phân</button></div>
        </div>
        <div><div class="section-title"><h3>Thập phân → độ</h3><span>DD</span></div>
          <div class="field"><label>Độ thập phân</label><input id="dmsValue" inputmode="decimal" value="12.582222"></div>
          <div class="conversion-result"><div class="conversion-line"><span class="conv-input" id="dmsDms">12°34′56″</span><span class="conv-eq">=</span><span class="conv-output" id="dmsDmsOut">12°34′56″</span></div></div>
          <div class="button-row"><button class="btn small" type="button" id="dmsInsertDmsString">Chèn độ-phút-giây</button></div>
        </div>
      </div>`;
    openModal({
      title: "Độ phút giây",
      kicker: "DMS · ANGLE",
      icon: "convert",
      wide: true,
      body,
      onMount(root) {
        const deg = $("#dmsDeg", root), min = $("#dmsMin", root), sec = $("#dmsSec", root);
        let currentDecimal = 0;
        let currentDmsText = "";
        const updateFromDms = () => {
          const d = Number(deg.value) || 0, m = Number(min.value) || 0, s = Number(sec.value) || 0;
          currentDecimal = d + Math.sign(d || 1) * (m / 60 + s / 3600);
          const sign = currentDecimal < 0 ? "-" : "";
          const abs = Math.abs(currentDecimal);
          const dd = Math.floor(abs);
          const mmFull = (abs - dd) * 60;
          const mm = Math.floor(mmFull);
          const ss = (mmFull - mm) * 60;
          currentDmsText = `${sign}${dd}°${String(mm).padStart(2, "0")}′${dmsSecondsText(ss)}″`;
          $("#dmsDecimal", root).textContent = currentDmsText;
          $("#dmsDecimalOut", root).textContent = formatNumericText(currentDecimal, { numberFormat: "norm1" }) + "°";
          $("#dmsValue", root).value = currentDecimal;
        };
        const updateFromDecimal = () => {
          let value = Number($("#dmsValue", root).value);
          if (!Number.isFinite(value)) return;
          const sign = value < 0 ? "-" : "";
          const abs = Math.abs(value);
          const dd = Math.floor(abs);
          const mmFull = (abs - dd) * 60;
          const mm = Math.floor(mmFull);
          const ss = (mmFull - mm) * 60;
          currentDmsText = `${sign}${dd}°${String(mm).padStart(2, "0")}′${dmsSecondsText(ss)}″`;
          currentDecimal = value;
          $("#dmsDms", root).textContent = currentDmsText;
          $("#dmsDmsOut", root).textContent = currentDmsText;
        };
        [deg, min, sec].forEach((input) => input.addEventListener("input", updateFromDms));
        $("#dmsValue", root).addEventListener("input", updateFromDecimal);
        $("#dmsInsertDms", root).addEventListener("click", () => {
          closeModal();
          setTimeout(() => insertText(String(currentDecimal), String(currentDecimal).length), 80);
        });
        $("#dmsInsertDmsString", root).addEventListener("click", () => {
          closeModal();
          setTimeout(() => insertText(currentDmsText, currentDmsText.length), 80);
        });
        updateFromDms();
        updateFromDecimal();
      }
    });
  }

  /* ============================================================
   * Trợ giúp
   * ============================================================ */
  function openHelpModal() {
    closeModal();
    const body = `
      <p class="workspace-lead">Máy tính mô phỏng motkikiX với <strong>12 chế độ chính</strong> và <strong>${EXTRA_TOOLS.length} công cụ mở rộng</strong>, engine toán học riêng và khả năng lưu kết quả. Dưới đây là các điểm cần biết để dùng như máy thật.</p>
      <div class="help-grid">
        <div class="help-col"><h4>Phép tính cơ bản</h4><ul>
          <li>Nhập biểu thức rồi nhấn <code>=</code>. Nhấn <code>S⇔D</code> để đổi phân số, căn thức, số thập phân hoặc dạng cực.</li>
          <li>Dùng <code>SHIFT</code> + phím để chọn chức năng vàng; <code>ALPHA</code> + phím để chèn biến màu đỏ.</li>
          <li><code>SHIFT</code> + <code>Ans</code> để gán vào A–F, X, Y, M; <code>ALPHA</code> + <code>Ans</code> để truy xuất.</li>
          <li>Phân số: <code>frac(a,b)</code>; hỗn số: <code>mixed(2,1,3)</code>; độ phút giây: <code>12°34′56″</code>.</li>
        </ul></div>
        <div class="help-col"><h4>Giải tích</h4><ul>
          <li><code>integral(x^2,0,3)</code> → tích phân xác định.</li>
          <li><code>deriv(x^2,3)</code> → đạo hàm tại điểm.</li>
          <li><code>sum(x^2,1,10)</code> hoặc <code>prod(k,1,5)</code>.</li>
          <li><code>solve(x^2-2,1)</code> → nghiệm gần đúng bằng Newton.</li>
        </ul></div>
        <div class="help-col"><h4>Thống kê & phân phối</h4><ul>
          <li>Chế độ Thống kê hỗ trợ 1 biến, 2 biến và 7 mô hình hồi quy.</li>
          <li>Phân phối chuẩn, nhị thức, Poisson: tính mật độ, xác suất tích lũy và phân vị.</li>
          <li>Ma trận 2×2 đến 5×5; vectơ A–E trong 2D/3D với tích vô hướng và tích có hướng.</li>
          <li>Phương trình đa thức bậc 2–8, hệ tuyến tính 2–5 ẩn, bất phương trình bậc 2–5 và Solver Newton.</li>
        </ul></div>
        <div class="help-col"><h4>Bàn phím & tiện ích</h4><ul>
          <li>Bàn phím máy tính: số, <code>+ − * / ^ ( )</code>, <code>Enter</code>, <code>Backspace</code>, phím mũi tên, <code>Esc</code>. Gõ <code>X, Y, A–F, M</code> để chèn biến.</li>
          <li><code>F1</code> = SHIFT, <code>F2</code> = ALPHA. <code>SHIFT</code> + <code>MENU</code> mở cài đặt; <code>SHIFT</code> + <code>CALC</code> mở Solver; <code>ALPHA</code> + <code>OPTN</code> mở biến.</li>
          <li>Cơ số N: chuyển hệ trực tiếp, nhập A–F, dùng AND, OR, XOR, NOT, SHL, SHR.</li>
          <li>Lịch sử, biến, cài đặt, ma trận, vectơ và dữ liệu thống kê được lưu tự động trên trình duyệt.</li>
        </ul></div>
      </div>
      <div class="section-title"><h3>Công cụ mở rộng</h3><span>Bấm ô MỞ RỘNG ở cuối MENU hoặc mở bảng Chế độ</span></div>
      <div class="help-grid">
        <div class="help-col"><h4>Đồ thị & điểm</h4><ul>
          <li>Vẽ tối đa 4 hàm số, dựng biểu đồ điểm, đường tham số x(t), y(t) và đường cong cực r(t).</li>
          <li>Kéo nền để di chuyển, lăn chuột hoặc dùng nút để thu phóng; bấm <b>Vừa khung</b> để tự chọn trục y.</li>
          <li>Hồi quy tuyến tính/bậc 2 cho dữ liệu điểm, xem bảng giá trị nhanh và xuất ảnh PNG.</li>
        </ul></div>
        <div class="help-col"><h4>Giải tích nâng cao</h4><ul>
          <li>Đạo hàm bậc 1/2, phương trình tiếp tuyến và đạo hàm tại điểm.</li>
          <li>Tích phân xác định bằng Simpson thích nghi; diện tích hình học.</li>
          <li>Giới hạn một phía/hai phía, cực trị và max/min trên đoạn.</li>
        </ul></div>
        <div class="help-col"><h4>Hình học giải tích</h4><ul>
          <li>Khoảng cách, trung điểm, hệ số góc và phương trình đường thẳng 2D.</li>
          <li>Đường tròn qua ba điểm: tâm, bán kính, chu vi và diện tích.</li>
          <li>Mặt phẳng qua ba điểm 3D, vectơ pháp tuyến và khoảng cách điểm–mặt phẳng.</li>
        </ul></div>
        <div class="help-col"><h4>Giải tam giác</h4><ul>
          <li>Ba cách giải: 3 cạnh (SSS), 2 cạnh – góc xen giữa (SAS), 1 cạnh – 2 góc (ASA).</li>
          <li>Tính cạnh còn lại, cả ba góc, chu vi, diện tích Heron và phân loại tam giác.</li>
          <li>Kiểm tra điều kiện tam giác và chèn nhanh diện tích vào màn hình.</li>
        </ul></div>
        <div class="help-col"><h4>Xác suất</h4><ul>
          <li>Tổ hợp, chỉnh hợp, hoán vị và hệ số khai triển nhị thức.</li>
          <li>Xác suất hợp, giao, phần bù, xác suất có điều kiện và kiểm tra độc lập.</li>
          <li>Công thức Bayes và phân phối nhị thức với xác suất tích luỹ.</li>
        </ul></div>
        <div class="help-col"><h4>Thống kê suy diễn</h4><ul>
          <li>Khoảng tin cậy cho trung bình (phân phối t) và tỉ lệ (Wilson).</li>
          <li>Kiểm định t một mẫu và kiểm định z một tỉ lệ.</li>
          <li>Hiển thị thống kê, p-value và kết luận theo mức ý nghĩa α.</li>
        </ul></div>
        <div class="help-col"><h4>Thống kê nhanh</h4><ul>
          <li>Dán dãy số để nhận n, tổng, trung bình, trung vị, mốt và khoảng biến thiên.</li>
          <li>Phương sai, độ lệch chuẩn mẫu/tổng thể và tứ phân vị Q1, Q3.</li>
        </ul></div>
        <div class="help-col"><h4>Số học</h4><ul>
          <li>Phân tích thừa số nguyên tố, ước số, tổng ước, số hoàn hảo và φ(n).</li>
          <li>GCD, LCM, luỹ thừa modulo và nghịch đảo modulo cho số nguyên lớn.</li>
        </ul></div>
        <div class="help-col"><h4>Đổi đơn vị</h4><ul>
          <li>Độ dài, khối lượng, diện tích, thể tích, tốc độ, năng lượng, áp suất, thời gian và dữ liệu số.</li>
          <li>Quy đổi nhiệt độ Celsius – Fahrenheit – Kelvin, có kiểm tra giới hạn 0 K.</li>
        </ul></div>
        <div class="help-col"><h4>Tài chính</h4><ul>
          <li>Lãi kép, giá trị tương lai và lãi suất thực.</li>
          <li>Tiết kiệm hằng tháng và khoản trả định kỳ của khoản vay.</li>
        </ul></div>
        <div class="help-col"><h4>Vật lý</h4><ul>
          <li>Cơ học: chuyển động biến đổi đều, rơi tự do, lực, năng lượng và ném xiên.</li>
          <li>Điện học, sóng – quang và nhiệt học với công thức thường gặp, đơn vị SI.</li>
          <li>Nhập số liệu, bấm Tính để xem kết quả chính và các đại lượng phụ; có thể chèn kết quả vào máy.</li>
        </ul></div>
        <div class="help-col"><h4>Tổng & tích</h4><ul>
          <li>Tính Σ hoặc ∏ của biểu thức theo biến x với khoảng chạy và bước tùy chọn.</li>
          <li>Xem trước biểu thức, dùng ví dụ mẫu hoặc chèn nguyên công thức vào màn hình tính toán.</li>
        </ul></div>
      </div>
      <div class="about-box"><b>Lưu ý:</b> Đây là mô phỏng học tập độc lập. Nigsio là thương hiệu hư cấu của bản web và không liên kết với Casio Computer Co., Ltd. Kết quả số thực dùng dấu chấm thập phân theo chuẩn quốc tế. Một số chức năng nâng cao dùng thuật toán xấp xỉ nhưng được kiểm chứng trong phạm vi máy tính khoa học thông thường.</div>
      <div class="button-row end"><button class="btn primary" type="button" data-close-modal>Đã hiểu</button></div>`;
    openModal({
      title: "Hướng dẫn sử dụng",
      kicker: "HELP · NIGSIO CLASSWIZ",
      icon: "help",
      wide: true,
      body
    });
  }

  /* ============================================================
   * KHÔNG GIAN LÀM VIỆC NÂNG CAO
   * ============================================================ */
  let advancedResult = null;

  function parseNumeric(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new E.CalcError("Syntax ERROR", label ? `${label} không hợp lệ` : "Giá trị không hợp lệ");
    return number;
  }

  function metric(label, value, accent) {
    return `<div class="metric ${accent ? "accent" : ""}"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${value}</div></div>`;
  }

  function errorBox(error) {
    return `<div class="notice error"><span class="notice-icon">!</span><span><b>${escapeHtml(error.code || "Math ERROR")}</b>${error.detail ? " — " + escapeHtml(error.detail) : ""}</span></div>`;
  }

  function resultMatrixMarkup(matrix, label) {
    const rows = matrix.map((row) => `<div class="matrix-result-row">${row.map((value) => `<span>${formatNumericText(value)}</span>`).join("")}</div>`).join("");
    return `<div class="text-block" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><span class="mini-label">${escapeHtml(label || "KẾT QUẢ")}</span><div class="matrix-result-grid">${rows}</div><button class="btn tiny ghost" type="button" data-copy-result>Chép</button></div>`;
  }

  /* ---------- Thống kê ---------- */
  let statsResult = null;

  function statsRows() {
    return state.statData.type === "1var" ? state.statData.rows1 : state.statData.rows2;
  }

  function statsTableMarkup() {
    const twoVar = state.statData.type === "2var";
    const rows = statsRows();
    const useFreq = state.settings.statFreq;
    return `<div class="table-pack">
      <div class="table-toolbar"><span class="toolbar-note">${twoVar ? "Nhập từng cặp (x, y)." : "Nhập giá trị x và tần số."}</span><span class="badge ${twoVar ? "amber" : ""}">${rows.length} dòng</span></div>
      <div class="data-scroll"><table class="data-table">
        <thead><tr><th class="row-num">#</th><th>x</th>${twoVar ? "<th>y</th>" : ""}${useFreq ? "<th>f</th>" : ""}<th></th></tr></thead>
        <tbody>${rows.map((row, index) => `<tr>
          <td class="row-num">${index + 1}</td>
          <td><input class="cell-input" data-stat-field="x" data-stat-index="${index}" value="${escapeHtml(row.x)}" inputmode="decimal" aria-label="x dòng ${index + 1}"></td>
          ${twoVar ? `<td><input class="cell-input" data-stat-field="y" data-stat-index="${index}" value="${escapeHtml(row.y)}" inputmode="decimal" aria-label="y dòng ${index + 1}"></td>` : ""}
          ${useFreq ? `<td><input class="cell-input" data-stat-field="f" data-stat-index="${index}" value="${escapeHtml(row.f)}" inputmode="numeric" aria-label="tần số dòng ${index + 1}"></td>` : ""}
          <td><button class="row-remove" type="button" data-stat-remove="${index}" aria-label="Xoá dòng">×</button></td>
        </tr>`).join("")}</tbody>
      </table></div>
      <div class="table-foot"><span class="table-count">Tần số mặc định là 1.</span><button class="btn tiny" type="button" data-stat-add>+ Thêm dòng</button></div>
    </div>`;
  }

  function regressionEquationMarkup(r) {
    const c = r.coefficients || {};
    const f = (value) => formatNumericText(value);
    const term = (value, suffix) => ` ${value < 0 ? "−" : "+"} ${f(Math.abs(value))}${suffix}`;
    try {
      switch (r.model) {
        case "linear": return `y = ${f(c.a)}${term(c.b, "x")}`;
        case "quadratic": return `y = ${f(c.a)}${term(c.b, "x")}${term(c.c, "x²")}`;
        case "ln": return `y = ${f(c.a)}${term(c.b, "·ln x")}`;
        case "exp": return `y = ${f(c.a)}·e^(${f(c.b)}x)`;
        case "ab": return `y = ${f(c.a)}·${f(c.b)}^x`;
        case "power": return `y = ${f(c.a)}·x^${f(c.b)}`;
        case "inv": return `y = ${f(c.a)}${term(c.b, "/x")}`;
        case "logistic": {
          const exponent = `${-c.b < 0 ? "−" : ""}${f(Math.abs(c.b))}x`;
          return `y = ${f(c.c)} ${c.a < 0 ? "−" : "+"} ${f(Math.abs(c.a))}/(1 + e^(${exponent}))`;
        }
        default: return r.equation || "";
      }
    } catch (error) {
      return r.equation || "";
    }
  }

  function statsResultsMarkup() {
    if (!statsResult) return `<div class="result-empty">Nhập dữ liệu rồi bấm <b>Tính thống kê</b> để xem kết quả.</div>`;
    if (statsResult.error) return errorBox(statsResult.error);
    const r = statsResult.data;
    if (state.statData.type === "1var") {
      return `${card("THỐNG KÊ 1 BIẾN", `n = ${r.n}`, `Tổng = ${formatNumericText(r.sum)}`)}
        <div class="metric-grid">
          ${metric("Trung bình x̄", formatNumericText(r.mean), true)}
          ${metric("Tổng Σx", formatNumericText(r.sum))}
          ${metric("Tổng Σx²", formatNumericText(r.sumSq))}
          ${metric("Độ lệch chuẩn σx", formatNumericText(r.sdPop))}
          ${metric("Độ lệch mẫu sx", formatNumericText(r.sdSample))}
          ${metric("Phương sai σ²x", formatNumericText(r.varPop))}
          ${metric("Phương sai mẫu", formatNumericText(r.varSample))}
          ${metric("Nhỏ nhất", formatNumericText(r.min))}
          ${metric("Q1", formatNumericText(r.q1))}
          ${metric("Trung vị", formatNumericText(r.median))}
          ${metric("Q3", formatNumericText(r.q3))}
          ${metric("Lớn nhất", formatNumericText(r.max))}
        </div>
        <div class="result-table-line"><span>Mode (mốt)</span><b>${r.mode.map((v) => formatNumericText(v)).join(", ") || "—"}</b></div>`;
    }
    return `${card("HỒI QUY " + state.statData.model.toUpperCase(), escapeHtml(regressionEquationMarkup(r) || "—"), `r = ${formatNumericText(r.r)} · r² = ${formatNumericText(r.r2)}`)}
      <div class="metric-grid">
        ${metric("n", r.n, true)}
        ${metric("x̄", formatNumericText(r.meanX))}
        ${metric("ȳ", formatNumericText(r.meanY))}
        ${metric("σx", formatNumericText(r.sdX))}
        ${metric("σy", formatNumericText(r.sdY))}
        ${metric("Σx", formatNumericText(r.sumX))}
        ${metric("Σy", formatNumericText(r.sumY))}
        ${metric("Σxy", formatNumericText(r.sumXY))}
        ${metric("Hiệp phương sai", formatNumericText(r.cov))}
        ${metric("Tương quan r", formatNumericText(r.r), true)}
        ${metric("R²", formatNumericText(r.r2))}
        ${metric("Mô hình", escapeHtml(r.model))}
      </div>
      <div class="section-title"><h3>Dự đoán giá trị</h3><span>ŷ theo x</span></div>
      <div class="form-grid"><div class="field"><label>Nhập x</label><div class="input-with-action"><input id="statsPredictInput" value="1" inputmode="decimal"><button class="inline-btn" type="button" id="statsPredictBtn">→</button></div></div><div class="field"><label>Giá trị dự đoán ŷ</label><input id="statsPredictOut" readonly value="—"></div></div>`;
  }

  function openStatisticsWorkspace() {
    closeModal();
    const type = state.statData.type;
    const models = [["linear", "Tuyến tính y = a + bx"], ["quadratic", "Bậc hai y = a + bx + cx²"], ["ln", "Logarit y = a + b ln x"], ["exp", "Mũ y = a·e^(bx)"], ["ab", "Mũ cơ số b y = a·b^x"], ["power", "Lũy thừa y = a·x^b"], ["inv", "Nghịch đảo y = a + b/x"]];
    const body = workspaceLead("Thống kê <strong>một biến</strong> hoặc <strong>hai biến</strong>, tính các đặc trưng mẫu và xây dựng mô hình hồi quy. Dữ liệu được lưu trong phiên làm việc.") +
      `<div class="segmented" style="margin-bottom:14px">
        <button class="seg-btn ${type === "1var" ? "is-active" : ""}" type="button" data-stats-type="1var">1 biến</button>
        <button class="seg-btn ${type === "2var" ? "is-active" : ""}" type="button" data-stats-type="2var">2 biến</button>
      </div>` +
      (type === "2var" ? `<div class="field" style="margin-bottom:10px"><label>Mô hình hồi quy</label><select id="statsModel">${models.map(([id, label]) => `<option value="${id}" ${state.statData.model === id ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></div>` : "") +
      statsTableMarkup() +
      `<div class="button-row between"><button class="btn primary" type="button" id="statsCompute">Tính thống kê</button><div class="button-row" style="margin:0"><button class="btn ghost small" type="button" id="statsSample">Dữ liệu mẫu</button><button class="btn ghost small" type="button" id="statsClear">Xoá dữ liệu</button></div></div>
      <div id="statsResults" style="margin-top:16px">${statsResultsMarkup()}</div>`;

    openModal({
      title: "Thống kê",
      kicker: "STATISTICS · 1VAR / 2VAR",
      icon: "stats",
      wide: true,
      body,
      onMount(root) {
        $$("[data-stats-type]", root).forEach((button) => button.addEventListener("click", () => {
          state.statData.type = button.dataset.statsType;
          statsResult = null;
          openStatisticsWorkspace();
        }));
        const model = $("#statsModel", root);
        if (model) model.addEventListener("change", () => {
          state.statData.model = model.value;
          statsResult = null;
          $("#statsResults", root).innerHTML = statsResultsMarkup();
        });
        $$("[data-stat-field]", root).forEach((input) => input.addEventListener("input", () => {
          const index = Number(input.dataset.statIndex);
          const field = input.dataset.statField;
          const row = statsRows()[index];
          if (row) row[field] = input.value;
          persist();
        }));
        $$("[data-stat-remove]", root).forEach((button) => button.addEventListener("click", () => {
          const index = Number(button.dataset.statRemove);
          statsRows().splice(index, 1);
          if (!statsRows().length) statsRows().push({ x: "", y: "", f: "1" });
          statsResult = null;
          openStatisticsWorkspace();
        }));
        $("[data-stat-add]", root).addEventListener("click", () => {
          statsRows().push({ x: "", y: "", f: "1" });
          statsResult = null;
          openStatisticsWorkspace();
        });
        $("#statsClear", root).addEventListener("click", () => {
          state.statData.rows1 = [{ x: "", f: "1" }];
          state.statData.rows2 = [{ x: "", y: "", f: "1" }];
          statsResult = null;
          openStatisticsWorkspace();
        });
        $("#statsSample", root).addEventListener("click", () => {
          if (state.statData.type === "1var") {
            state.statData.rows1 = [{ x: "1", f: "1" }, { x: "2", f: "2" }, { x: "3", f: "3" }, { x: "4", f: "4" }, { x: "5", f: "5" }, { x: "6", f: "2" }];
          } else {
            state.statData.model = "linear";
            state.statData.rows2 = [{ x: "1", y: "2.1", f: "1" }, { x: "2", y: "4.2", f: "1" }, { x: "3", y: "5.9", f: "1" }, { x: "4", y: "8.1", f: "1" }, { x: "5", y: "10.2", f: "1" }, { x: "6", y: "12.1", f: "1" }];
          }
          statsResult = null;
          openStatisticsWorkspace();
        });
        $("#statsCompute", root).addEventListener("click", () => {
          try {
            const rows = statsRows().map((row) => ({ x: row.x, y: row.y, f: state.settings.statFreq ? row.f : "1" }));
            if (state.statData.type === "1var") {
              statsResult = { data: E.stats1(rows.filter((r) => String(r.x).trim() !== ""), { freq: state.settings.statFreq }) };
            } else {
              statsResult = { data: E.stats2(rows.filter((r) => String(r.x).trim() !== "" && String(r.y).trim() !== ""), state.statData.model) };
            }
          } catch (error) {
            statsResult = { error };
          }
          $("#statsResults", root).innerHTML = statsResultsMarkup();
          if (statsResult.error) showToast(statsResult.error.detail || statsResult.error.code, "is-error");
          bindStatsPrediction(root);
        });
        bindStatsPrediction(root);
      }
    });
  }

  function bindStatsPrediction(root) {
    const predictBtn = $("#statsPredictBtn", root);
    if (!predictBtn || !statsResult || !statsResult.data) return;
    predictBtn.addEventListener("click", () => {
      try {
        const x = Number($("#statsPredictInput", root).value);
        $("#statsPredictOut", root).value = formatNumericText(E.predictRegression(statsResult.data, x));
      } catch (error) { showToast("Không thể dự đoán.", "is-error"); }
    });
  }

  /* ---------- Bảng giá trị ---------- */
  const tableState = { two: false, expr1: "x^2", expr2: "x+1", start: "-3", end: "3", step: "1" };
  let tableRows = [];

  function tableEval(expression, x) {
    const value = E.evaluate(expression, { angleUnit: state.settings.angleUnit, vars: Object.assign({}, state.vars, { X: x }), ans: state.ans });
    if (Math.abs(value.im) > 1e-10) return null;
    return value.re;
  }

  function tableMarkup() {
    return `<div class="form-grid three">
        <div class="field"><label>f(x)</label><input id="tableExpr1" value="${escapeHtml(tableState.expr1)}" placeholder="x^2"></div>
        <div class="field"><label>g(x) <span class="sub">tuỳ chọn</span></label><input id="tableExpr2" value="${escapeHtml(tableState.expr2)}" placeholder="x+1" ${tableState.two ? "" : "disabled"}></div>
        <div class="field"><label>Bắt đầu</label><input id="tableStart" value="${escapeHtml(tableState.start)}" inputmode="decimal"></div>
        <div class="field"><label>Kết thúc</label><input id="tableEnd" value="${escapeHtml(tableState.end)}" inputmode="decimal"></div>
        <div class="field"><label>Bước</label><input id="tableStep" value="${escapeHtml(tableState.step)}" inputmode="decimal"></div>
        <div class="field"><label>Hàm thứ hai</label><label class="switch" style="margin-top:5px"><input type="checkbox" id="tableTwo" ${tableState.two ? "checked" : ""}><span class="switch-track"></span></label></div>
      </div>
      <div class="button-row between"><button class="btn primary" type="button" id="tableGenerate">Lập bảng</button><span class="field-hint">Tối đa 100 dòng. Biến độc lập là X.</span></div>
      <div id="tableResult">${tableRowsMarkup()}</div>`;
  }

  function tableRowsMarkup() {
    if (!tableRows.length) return `<div class="result-empty" style="margin-top:14px">Chưa có bảng giá trị. Nhập hàm và bấm <b>Lập bảng</b>.</div>`;
    const two = tableState.two;
    return `<div class="table-pack" style="margin-top:14px"><div class="data-scroll"><table class="data-table"><thead><tr><th class="row-num">#</th><th>X</th><th>f(X)</th>${two ? "<th>g(X)</th>" : ""}</tr></thead><tbody>
      ${tableRows.map((row, index) => `<tr><td class="row-num">${index + 1}</td><td>${escapeHtml(row.x)}</td><td>${row.f == null ? "—" : escapeHtml(row.f)}</td>${two ? `<td>${row.g == null ? "—" : escapeHtml(row.g)}</td>` : ""}</tr>`).join("")}
    </tbody></table></div></div>`;
  }

  function generateTable(root) {
    tableState.expr1 = $("#tableExpr1", root).value;
    tableState.expr2 = $("#tableExpr2", root).value;
    tableState.start = $("#tableStart", root).value;
    tableState.end = $("#tableEnd", root).value;
    tableState.step = $("#tableStep", root).value;
    tableState.two = $("#tableTwo", root).checked;
    try {
      const start = Number(tableState.start);
      const end = Number(tableState.end);
      const step = Number(tableState.step);
      if (![start, end, step].every(Number.isFinite)) throw new E.CalcError("Syntax ERROR", "Khoảng giá trị không hợp lệ");
      if (step === 0) throw new E.CalcError("Math ERROR", "Bước không được bằng 0");
      const count = Math.floor(Math.abs((end - start) / step)) + 1;
      if (count > 100) throw new E.CalcError("Range ERROR", "Bảng tối đa 100 dòng");
      if (count < 1) throw new E.CalcError("Range ERROR", "Khoảng giá trị không hợp lệ");
      tableRows = [];
      for (let i = 0; i < count; i++) {
        const x = Number((start + i * step).toPrecision(12));
        const f = tableEval(tableState.expr1, x);
        const g = tableState.two ? tableEval(tableState.expr2, x) : null;
        tableRows.push({ x: formatNumericText(x), f: f == null ? "—" : formatNumericText(f), g: g == null ? "—" : formatNumericText(g) });
      }
      $("#tableResult", root).innerHTML = tableRowsMarkup();
    } catch (error) {
      $("#tableResult", root).innerHTML = errorBox(error);
    }
  }

  function openTableWorkspace() {
    closeModal();
    tableRows = [];
    openModal({
      title: "Bảng giá trị",
      kicker: "TABLE · f(x) / g(x)",
      icon: "table",
      wide: true,
      body: workspaceLead("Tạo bảng giá trị cho một hoặc hai hàm số theo bước nhập. Biến độc lập dùng chung là <strong>X</strong>.") + tableMarkup(),
      onMount(root) {
        $("#tableTwo", root).addEventListener("change", () => { tableState.two = $("#tableTwo", root).checked; openTableWorkspace(); });
        $("#tableGenerate", root).addEventListener("click", () => generateTable(root));
        $("#tableExpr1", root).addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); generateTable(root); } });
      }
    });
  }

  /* ---------- Phương trình ---------- */
  const equationState = {
    tab: "poly",
    degree: 2,
    coeffs: ["1", "0", "-2", "0", "0", "0", "0", "0", "0"],
    size: 2,
    system: [
      ["1", "0", "0", "0", "0", "1"],
      ["0", "1", "0", "0", "0", "2"],
      ["0", "0", "1", "0", "0", "0"],
      ["0", "0", "0", "1", "0", "0"],
      ["0", "0", "0", "0", "1", "0"]
    ],
    solverExpr: "x^2-2",
    solverGuess: "1"
  };

  function ensurePolynomialCoeffs() {
    while (equationState.coeffs.length < 9) equationState.coeffs.push("0");
    return equationState.coeffs;
  }

  function equationCoeffLabel(index, degree) {
    const power = degree - index;
    if (power === 0) return "Hằng số";
    if (power === 1) return "Hệ số x";
    return `Hệ số x^${power}`;
  }

  function polyFieldsMarkup() {
    const degree = equationState.degree;
    const coeffs = ensurePolynomialCoeffs();
    return `<div class="form-grid ${degree >= 3 ? "four" : "three"}">
      <div class="field field-wide"><label>Bậc phương trình</label><select id="polyDegree">${[2, 3, 4, 5, 6, 7, 8].map((d) => `<option value="${d}" ${d === degree ? "selected" : ""}>Bậc ${d}</option>`).join("")}</select></div>
      ${Array.from({ length: degree + 1 }, (_, index) => `<div class="field"><label>${equationCoeffLabel(index, degree)}</label><input data-poly-coeff="${index}" value="${escapeHtml(coeffs[index] == null ? "0" : coeffs[index])}" inputmode="decimal"></div>`).join("")}
    </div>`;
  }

  function polynomialTermsText(coeffs, degree) {
    const superscript = { 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", 10: "¹⁰" };
    const terms = [];
    for (let i = 0; i <= degree; i++) {
      const raw = String(coeffs[i] == null ? "0" : coeffs[i]).trim();
      if (raw === "") continue;
      const normalized = raw.replace(/−/g, "-");
      const value = Number(normalized);
      if (Number.isFinite(value) && Math.abs(value) < 1e-14) continue;
      const negative = (Number.isFinite(value) && value < 0) || normalized.startsWith("-");
      let absText = Number.isFinite(value) ? formatNumericText(Math.abs(value)) : normalized.replace(/^-/, "");
      const power = degree - i;
      let core;
      if (power === 0) {
        core = absText;
      } else {
        const factor = Number.isFinite(value) && Math.abs(Math.abs(value) - 1) < 1e-14 ? "" : absText;
        if (power === 1) core = `${factor}x`;
        else core = `${factor}x${superscript[power] || "^" + power}`;
      }
      if (!terms.length) terms.push((negative ? "−" : "") + core);
      else terms.push(`${negative ? "−" : "+"} ${core}`);
    }
    return terms.length ? terms.join(" ") : "0";
  }

  function equationPreview() {
    return `${polynomialTermsText(equationState.coeffs, equationState.degree)} = 0`;
  }

  function equationPreviewMarkup() {
    return `<div class="equation-preview" id="polyPreview" aria-live="polite">${escapeHtml(equationPreview())}</div>`;
  }

  function refreshEquationPreview(root) {
    const preview = $("#polyPreview", root || document);
    if (preview) preview.textContent = equationPreview();
  }

  function refreshSolverPreview(root) {
    const preview = $("#solverPreview", root || document);
    if (preview) preview.textContent = `f(x) = ${equationState.solverExpr || "0"} = 0`;
  }

  function systemPreviewNumber(raw) {
    const text = String(raw == null ? "" : raw).trim().replace(/−/g, "-");
    if (!text) return { text: "0", value: 0, numeric: true };
    const value = Number(text);
    if (Number.isFinite(value)) return { text: formatNumericText(value), value, numeric: true };
    return { text: text.replace(/^-/, ""), value: NaN, numeric: false, negative: text.startsWith("-") };
  }

  function systemPreviewEquation(row, size) {
    const names = ["x", "y", "z", "t", "u"];
    const terms = [];
    for (let c = 0; c < size; c++) {
      const item = systemPreviewNumber(row[c]);
      if (item.numeric && Math.abs(item.value) < 1e-14) continue;
      const negative = item.numeric ? item.value < 0 : item.negative;
      const absValue = item.numeric ? Math.abs(item.value) : null;
      const coefficient = item.numeric
        ? (Math.abs(absValue - 1) < 1e-14 ? "" : formatNumericText(absValue))
        : item.text;
      const term = `${coefficient}${names[c]}`;
      if (!terms.length) terms.push(`${negative ? "−" : ""}${term}`);
      else terms.push(`${negative ? "−" : "+"} ${term}`);
    }
    const right = systemPreviewNumber(row[size]);
    const rightText = right.numeric
      ? formatNumericText(right.value).replace(/-/g, "−")
      : `${right.negative ? "−" : ""}${right.text}`;
    return `${terms.length ? terms.join(" ") : "0"} = ${rightText}`;
  }

  function equationSystemPreviewText() {
    const size = equationState.size;
    return Array.from({ length: size }, (_, r) => systemPreviewEquation(equationState.system[r], size)).join("\n");
  }

  function equationSystemPreviewMarkup() {
    return `<div class="equation-preview system-preview" id="systemPreview" aria-live="polite">${escapeHtml(equationSystemPreviewText())}</div>`;
  }

  function refreshSystemPreview(root) {
    const preview = $("#systemPreview", root || document);
    if (preview) preview.textContent = equationSystemPreviewText();
  }

  function equationSystemMarkup() {
    const size = equationState.size;
    const names = ["x", "y", "z", "t", "u"];
    let html = `<div class="data-scroll" style="margin-top:8px"><table class="data-table"><thead><tr><th></th>${names.slice(0, size).map((n) => `<th>${n}</th>`).join("")}<th>=</th></tr></thead><tbody>`;
    for (let r = 0; r < size; r++) {
      html += `<tr><td class="row-num">${r + 1}</td>`;
      for (let c = 0; c < size; c++) {
        html += `<td><input class="cell-input" data-system-a="${r},${c}" value="${escapeHtml(equationState.system[r][c])}" inputmode="decimal"></td>`;
      }
      html += `<td><input class="cell-input is-result-cell" data-system-b="${r}" value="${escapeHtml(equationState.system[r][size])}" inputmode="decimal"></td></tr>`;
    }
    return html + `</tbody></table></div>`;
  }

  function rootCardMarkup(root, index) {
    const view = complexRectView(root);
    const isComplex = Math.abs(root.im) > 1e-9;
    const sub = isComplex ? `≈ ${formatNumericText(root.re)} ${root.im < 0 ? "−" : "+"} ${formatNumericText(Math.abs(root.im))}i` : `≈ ${formatNumericText(root.re)}`;
    return `<div class="root-card"><span class="root-index">${index + 1}</span><div><div class="root-value">${view.html}</div><div class="root-sub">${escapeHtml(sub)}</div></div></div>`;
  }

  function openEquationWorkspace(tab) {
    closeModal();
    if (tab) equationState.tab = tab;
    const active = equationState.tab;
    const tabs = [["poly", "Bậc 2–8"], ["system", "Hệ phương trình"], ["solver", "Solver"]];
    let content = "";
    if (active === "poly") {
      content = workspaceLead("Giải phương trình đa thức bậc 2 đến 8. Nghiệm phức được hiển thị dưới dạng a + bi; nghiệm bội cao có thể hiển thị xấp xỉ.") +
        equationPreviewMarkup() +
        polyFieldsMarkup() +
        `<div class="button-row"><button class="btn primary" type="button" id="eqSolvePoly">Giải phương trình</button><button class="btn ghost small" type="button" id="eqSamplePoly">Ví dụ</button></div>
        <div id="eqResults" style="margin-top:16px"></div>`;
    } else if (active === "system") {
      content = workspaceLead("Giải hệ phương trình tuyến tính 2 đến 5 ẩn bằng khử Gauss. Hệ vô nghiệm hoặc vô số nghiệm sẽ được báo rõ.") +
        equationSystemPreviewMarkup() +
        `<div class="field" style="margin-bottom:7px"><label>Số ẩn</label><select id="systemSize">${[2, 3, 4, 5].map((n) => `<option value="${n}" ${n === equationState.size ? "selected" : ""}>${n} ẩn</option>`).join("")}</select></div>` +
        equationSystemMarkup() +
        `<div class="button-row"><button class="btn primary" type="button" id="eqSolveSystem">Giải hệ</button><button class="btn ghost small" type="button" id="eqSampleSystem">Hệ mẫu</button></div>
        <div id="eqResults" style="margin-top:16px"></div>`;
    } else {
      content = workspaceLead("Tìm nghiệm gần đúng của phương trình f(x) = 0 bằng phương pháp Newton. Hãy nhập biểu thức theo biến <strong>X</strong> và một giá trị dự đoán ban đầu.") +
        `<div class="equation-preview" id="solverPreview" aria-live="polite">${escapeHtml(`f(x) = ${equationState.solverExpr || "0"} = 0`)}</div>
        <div class="form-grid"><div class="field field-wide"><label>Biểu thức f(x)</label><input id="solverExpr" value="${escapeHtml(equationState.solverExpr)}" placeholder="x^2-2"></div>
        <div class="field"><label>Giá trị dự đoán</label><input id="solverGuess" value="${escapeHtml(equationState.solverGuess)}" inputmode="decimal"></div></div>
        <div class="button-row"><button class="btn primary" type="button" id="eqSolveRoot">Tìm nghiệm</button><button class="btn ghost small" type="button" id="eqSampleRoot">Ví dụ</button></div>
        <div id="eqResults" style="margin-top:16px"></div>`;
    }
    openModal({
      title: "Phương trình",
      kicker: "EQUATION · FUNCTION",
      icon: "equation",
      wide: true,
      body: `<div class="segmented">${tabs.map(([id, label]) => `<button class="seg-btn ${id === active ? "is-active" : ""}" type="button" data-eq-tab="${id}">${label}</button>`).join("")}</div>` + content,
      onMount(root) {
        $$("[data-eq-tab]", root).forEach((button) => button.addEventListener("click", () => openEquationWorkspace(button.dataset.eqTab)));
        if (active === "poly") {
          $("#polyDegree", root).addEventListener("change", (event) => {
            const nextDegree = Number(event.target.value);
            ensurePolynomialCoeffs();
            equationState.degree = nextDegree;
            openEquationWorkspace();
          });
          $$("[data-poly-coeff]", root).forEach((input) => input.addEventListener("input", () => {
            equationState.coeffs[Number(input.dataset.polyCoeff)] = input.value;
            refreshEquationPreview(root);
          }));
          $("#eqSolvePoly", root).addEventListener("click", () => {
            const results = $("#eqResults", root);
            try {
              const coeffs = Array.from({ length: equationState.degree + 1 }, (_, i) => parseNumeric(equationState.coeffs[i], `Hệ số thứ ${i + 1}`));
              if (Math.abs(coeffs[0]) < 1e-14) throw new E.CalcError("Math ERROR", "Hệ số bậc cao nhất phải khác 0");
              const roots = E.polyRoots(coeffs);
              results.innerHTML = card("NGHIỆM PHƯƠNG TRÌNH", `${roots.length} nghiệm`, escapeHtml(equationPreview())) +
                `<div class="roots-grid">${roots.map(rootCardMarkup).join("")}</div>
                 <div class="settings-note" style="margin-top:12px">Nghiệm được sắp xếp: nghiệm thực trước, nghiệm phức sau. Với phương trình bậc ≥3, thuật toán Durand–Kerner cho kết quả xấp xỉ.</div>`;
            } catch (error) {
              results.innerHTML = errorBox(error);
            }
          });
          $("#eqSamplePoly", root).addEventListener("click", () => {
            equationState.degree = 5;
            equationState.coeffs = ["1", "0", "-5", "0", "4", "0", "0", "0", "0"];
            openEquationWorkspace();
          });
        }
        if (active === "system") {
          $("#systemSize", root).addEventListener("change", (event) => {
            const nextSize = Number(event.target.value);
            const oldSize = equationState.size;
            const system = Array.from({ length: 5 }, (_, r) => Array.from({ length: 6 }, (_, c) => {
              const oldValue = equationState.system[r] && equationState.system[r][c];
              if (r < nextSize && c < nextSize) {
                if (r < oldSize && c < oldSize && oldValue != null) return oldValue;
                return r === c ? "1" : "0";
              }
              if (r < nextSize && c === nextSize) {
                const oldRight = equationState.system[r] && equationState.system[r][oldSize];
                return oldRight != null ? oldRight : "0";
              }
              return "0";
            }));
            equationState.size = nextSize;
            equationState.system = system;
            openEquationWorkspace();
          });
          $$("[data-system-a]", root).forEach((input) => input.addEventListener("input", () => {
            const [r, c] = input.dataset.systemA.split(",").map(Number);
            equationState.system[r][c] = input.value;
            refreshSystemPreview(root);
          }));
          $$("[data-system-b]", root).forEach((input) => input.addEventListener("input", () => {
            equationState.system[Number(input.dataset.systemB)][equationState.size] = input.value;
            refreshSystemPreview(root);
          }));
          $("#eqSolveSystem", root).addEventListener("click", () => {
            const results = $("#eqResults", root);
            try {
              const size = equationState.size;
              const A = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => parseNumeric(equationState.system[r][c], `Hệ số dòng ${r + 1}`)));
              const b = Array.from({ length: size }, (_, r) => parseNumeric(equationState.system[r][size], `Vế phải dòng ${r + 1}`));
              const solution = E.solveLinearSystem(A, b);
              if (solution.type === "none") {
                results.innerHTML = `<div class="notice error"><span class="notice-icon">!</span><span>Hệ phương trình <b>vô nghiệm</b>.</span></div>`;
              } else if (solution.type === "infinite") {
                results.innerHTML = `<div class="notice"><span class="notice-icon">i</span><span>Hệ có <b>vô số nghiệm</b> (phụ thuộc tham số).</span></div>`;
              } else {
                const names = ["x", "y", "z", "t", "u"];
                results.innerHTML = card("NGHIỆM CỦA HỆ", escapeHtml(solution.solution.map((v, i) => `${names[i]} = ${formatNumericText(v)}`).join(" · ")), "Nghiệm duy nhất") +
                  `<div class="metric-grid">${solution.solution.map((v, i) => metric(names[i], formatNumericText(v), true)).join("")}</div>`;
              }
            } catch (error) { results.innerHTML = errorBox(error); }
          });
          $("#eqSampleSystem", root).addEventListener("click", () => {
            equationState.size = 5;
            equationState.system = [
              ["1", "1", "0", "0", "0", "3"],
              ["0", "1", "1", "0", "0", "5"],
              ["0", "0", "1", "1", "0", "7"],
              ["0", "0", "0", "1", "1", "9"],
              ["0", "0", "0", "0", "1", "5"]
            ];
            openEquationWorkspace();
          });
        }
        if (active === "solver") {
          $("#solverExpr", root).addEventListener("input", () => {
            equationState.solverExpr = $("#solverExpr", root).value;
            refreshSolverPreview(root);
          });
          $("#solverGuess", root).addEventListener("input", () => { equationState.solverGuess = $("#solverGuess", root).value; });
          $("#eqSolveRoot", root).addEventListener("click", () => {
            const results = $("#eqResults", root);
            try {
              equationState.solverExpr = $("#solverExpr", root).value;
              const guess = parseNumeric($("#solverGuess", root).value, "Giá trị dự đoán");
              const value = E.findRoot(equationState.solverExpr, guess, { angleUnit: state.settings.angleUnit, vars: state.vars, ans: state.ans });
              results.innerHTML = card("NGHIỆM GẦN ĐÚNG", `x ≈ ${formatNumericText(value.re)}`, `f(x) = ${escapeHtml(equationState.solverExpr)} · bắt đầu từ ${formatNumericText(guess)}`) +
                `<div class="metric-grid">${metric("x", formatNumericText(value.re), true)}${metric("Sai số ước lượng", formatNumericText(Math.abs(E.evaluate(equationState.solverExpr, { vars: Object.assign({}, state.vars, { X: value.re }), angleUnit: state.settings.angleUnit }).re)))}</div>
                 <div class="settings-note" style="margin-top:12px">Solver dùng Newton–Raphson; một số phương trình có thể có nhiều nghiệm tùy giá trị dự đoán ban đầu.</div>`;
            } catch (error) { results.innerHTML = errorBox(error); }
          });
          $("#eqSampleRoot", root).addEventListener("click", () => {
            equationState.solverExpr = "x^3-x-2";
            equationState.solverGuess = "1.5";
            openEquationWorkspace();
          });
        }
      }
    });
  }

  /* ---------- Bất phương trình ---------- */
  const inequalityState = { degree: 2, relation: ">", coeffs: ["1", "0", "-1", "0", "0", "0"] };

  function ensureInequalityCoeffs() {
    while (inequalityState.coeffs.length < 6) inequalityState.coeffs.push("0");
    return inequalityState.coeffs;
  }

  function intervalText(interval) {
    const lo = interval.lo === -Infinity ? "−∞" : formatNumericText(interval.lo);
    const hi = interval.hi === Infinity ? "+∞" : formatNumericText(interval.hi);
    if (interval.lo === interval.hi) return `x = ${lo}`;
    return `${interval.loInc ? "[" : "("}${lo}; ${hi}${interval.hiInc ? "]" : ")"}`;
  }

  function inequalityPreview() {
    const relation = inequalityState.relation === ">=" ? "≥" : inequalityState.relation === "<=" ? "≤" : inequalityState.relation;
    return `${polynomialTermsText(inequalityState.coeffs, inequalityState.degree)} ${relation} 0`;
  }

  function refreshInequalityPreview(root) {
    const preview = $("#ineqPreview", root || document);
    if (preview) preview.textContent = inequalityPreview();
  }

  function signChartMarkup(roots, coeffs) {
    if (coeffs[0] === 0) return "";
    const boundaries = [-Infinity].concat(roots, [Infinity]);
    const segs = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const lo = boundaries[i];
      const hi = boundaries[i + 1];
      let test;
      if (lo === -Infinity) test = hi === Infinity ? 0 : hi - Math.max(1, Math.abs(hi));
      else if (hi === Infinity) test = lo + Math.max(1, Math.abs(lo));
      else test = (lo + hi) / 2;
      const sign = E.polyEval(coeffs, test);
      segs.push(`<div class="sign-seg ${sign > 0 ? "positive" : "negative"}"><span>${lo === -Infinity ? "−∞" : formatNumericText(lo)} → ${hi === Infinity ? "+∞" : formatNumericText(hi)}</span><b>${sign > 0 ? "+" : "−"}</b></div>`);
    }
    return `<div class="sign-chart">${segs.join("")}</div>`;
  }

  function openInequalityWorkspace() {
    closeModal();
    const degree = inequalityState.degree;
    const body = workspaceLead("Giải bất phương trình đa thức bậc 2 đến 5 và biểu diễn tập nghiệm trên trục số.") +
      `<div class="equation-preview" id="ineqPreview" aria-live="polite">${escapeHtml(inequalityPreview())}</div>
      <div class="form-grid three">
        <div class="field"><label>Bậc</label><select id="ineqDegree">${[2, 3, 4, 5].map((d) => `<option value="${d}" ${d === degree ? "selected" : ""}>Bậc ${d}</option>`).join("")}</select></div>
        <div class="field"><label>Dấu so sánh</label><select id="ineqRelation">${[">", ">=", "<", "<="].map((r) => `<option value="${r}" ${r === inequalityState.relation ? "selected" : ""}>${r === ">=" ? "≥" : r === "<=" ? "≤" : r}</option>`).join("")}</select></div>
        <div class="field"><label>Hệ số đầu</label><input data-ineq-coeff="0" value="${escapeHtml(inequalityState.coeffs[0])}" inputmode="decimal"></div>
        ${Array.from({ length: degree }, (_, i) => `<div class="field"><label>${i === degree - 1 ? "Hệ số x" : `Hệ số x^${degree - i}`}</label><input data-ineq-coeff="${i + 1}" value="${escapeHtml(inequalityState.coeffs[i + 1] == null ? "0" : inequalityState.coeffs[i + 1])}" inputmode="decimal"></div>`).join("")}
      </div>
      <div class="button-row"><button class="btn primary" type="button" id="ineqSolve">Giải bất phương trình</button><button class="btn ghost small" type="button" id="ineqSample">Ví dụ</button></div>
      <div id="ineqResults" style="margin-top:16px"></div>`;
    openModal({
      title: "Bất phương trình",
      kicker: "INEQUALITY · 2–5",
      icon: "inequality",
      wide: true,
      body,
      onMount(root) {
        $("#ineqDegree", root).addEventListener("change", (event) => {
          inequalityState.degree = Number(event.target.value);
          ensureInequalityCoeffs();
          openInequalityWorkspace();
        });
        $("#ineqRelation", root).addEventListener("change", (event) => {
          inequalityState.relation = event.target.value;
          refreshInequalityPreview(root);
        });
        $$("[data-ineq-coeff]", root).forEach((input) => input.addEventListener("input", () => {
          inequalityState.coeffs[Number(input.dataset.ineqCoeff)] = input.value;
          refreshInequalityPreview(root);
        }));
        $("#ineqSolve", root).addEventListener("click", () => {
          const results = $("#ineqResults", root);
          try {
            const coeffs = Array.from({ length: inequalityState.degree + 1 }, (_, i) => parseNumeric(inequalityState.coeffs[i], `Hệ số thứ ${i + 1}`));
            if (Math.abs(coeffs[0]) < 1e-14) throw new E.CalcError("Math ERROR", "Hệ số bậc cao nhất phải khác 0");
            const result = E.solvePolynomialInequality(coeffs, inequalityState.relation);
            const relationSymbol = inequalityState.relation === ">=" ? "≥" : inequalityState.relation === "<=" ? "≤" : inequalityState.relation;
            let text = result.intervals.map(intervalText).join(" ∪ ");
            if (!result.intervals.length) text = "Vô nghiệm";
            else if (result.intervals.length === 1 && result.intervals[0].lo === -Infinity && result.intervals[0].hi === Infinity) text = "∀x ∈ ℝ";
            results.innerHTML = card("TẬP NGHIỆM", escapeHtml(text), `Nghiệm của phương trình: ${result.roots.length ? result.roots.map(formatNumericText).join(", ") : "không có nghiệm thực"}`) +
              `<div class="solution-intervals">${text === "Vô nghiệm" ? "∅" : escapeHtml(text)}</div>
               ${signChartMarkup(result.roots, coeffs)}
               <div class="settings-note" style="margin-top:12px">Ký hiệu: ngoặc tròn ( ) không lấy dấu bằng; ngoặc vuông [ ] lấy dấu bằng. Dấu ∪ là hợp các khoảng.</div>`;
          } catch (error) { results.innerHTML = errorBox(error); }
        });
        $("#ineqSample", root).addEventListener("click", () => {
          inequalityState.degree = 5;
          inequalityState.relation = ">";
          inequalityState.coeffs = ["1", "0", "-5", "0", "4", "0"];
          openInequalityWorkspace();
        });
      }
    });
  }

  /* ---------- Ma trận ---------- */
  let matrixTab = "A";
  let matrixScalar = "2";
  let matrixResult = null;
  let matrixOperandA = "A";
  let matrixOperandB = "B";

  function ensureMatrixShape(matrix) {
    const rows = Math.max(2, Math.min(5, Number(matrix.rows) || 2));
    const cols = Math.max(2, Math.min(5, Number(matrix.cols) || 2));
    matrix.rows = rows;
    matrix.cols = cols;
    matrix.data = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
      const existing = matrix.data && matrix.data[r] && matrix.data[r][c];
      return existing == null ? "0" : String(existing);
    }));
    return matrix;
  }

  function matrixGridMarkup(matrix) {
    ensureMatrixShape(matrix);
    return `<div class="matrix-wrap"><div class="matrix-grid">${matrix.data.map((row, r) => `<div class="matrix-row">${row.map((value, c) => `<input class="matrix-cell" data-matrix-row="${r}" data-matrix-col="${c}" value="${escapeHtml(value)}" inputmode="decimal" aria-label="Hàng ${r + 1} cột ${c + 1}">`).join("")}</div>`).join("")}</div></div>`;
  }

  function matrixResultMarkup(result, title, note) {
    if (matrixResult) {
      if (matrixResult.error) return errorBox(matrixResult.error);
      const content = matrixResult.matrix ? resultMatrixMarkup(matrixResult.matrix, matrixResult.label) : card(title || matrixResult.label, escapeHtml(matrixResult.text), note || "");
      return content + (matrixResult.extra || "");
    }
    return `<div class="result-empty">Chọn phép toán để xem kết quả.</div>`;
  }

  function matrixToArray(matrix) {
    ensureMatrixShape(matrix);
    return matrix.data.map((row, r) => row.map((value, c) => parseNumeric(value, `Ô (${r + 1},${c + 1})`)));
  }

  function matrixOpLabels() {
    const a = matrixOperandA;
    const b = matrixOperandB;
    return {
      add: `${a} + ${b}`,
      sub: `${a} − ${b}`,
      mul: `${a} × ${b}`,
      transpose: `Chuyển vị ${a}`,
      det: `det(${a})`,
      inverse: `${a}⁻¹`,
      scale: `k × ${a}`
    };
  }

  function updateMatrixOpLabels(root) {
    const labels = matrixOpLabels();
    $$("[data-matrix-label]", root || document).forEach((node) => {
      const label = labels[node.dataset.matrixLabel];
      if (label) node.textContent = label;
    });
  }

  function matrixOperandOptions(selected) {
    return ["A", "B", "C", "D"].map((name) => `<option value="${name}" ${name === selected ? "selected" : ""}>Ma trận ${name}</option>`).join("");
  }

  function openMatrixWorkspace() {
    closeModal();
    const matrix = ensureMatrixShape(state.matrices[matrixTab]);
    const labels = matrixOpLabels();
    const body = workspaceLead("Định nghĩa ma trận A–D kích thước tối đa 5×5. Chọn bất kỳ cặp ma trận để cộng, trừ, nhân; dùng ma trận 1 cho chuyển vị, định thức, nghịch đảo và nhân với số.") +
      `<div class="matrix-tabs">${["A", "B", "C", "D"].map((name) => `<button class="matrix-tab ${name === matrixTab ? "is-active" : ""}" type="button" data-matrix-tab="${name}">Ma trận ${name}</button>`).join("")}</div>
      <div class="matrix-tools" style="margin-top:0;margin-bottom:10px">
        <span class="mini-label">KÍCH THƯỚC</span>
        <div class="dimension-picker">
          <select id="matrixRows">${[2, 3, 4, 5].map((n) => `<option value="${n}" ${n === matrix.rows ? "selected" : ""}>${n} hàng</option>`).join("")}</select>
          <span class="muted">×</span>
          <select id="matrixCols">${[2, 3, 4, 5].map((n) => `<option value="${n}" ${n === matrix.cols ? "selected" : ""}>${n} cột</option>`).join("")}</select>
          <button class="btn tiny ghost" type="button" id="matrixIdentity">Ma trận đơn vị</button>
          <button class="btn tiny ghost" type="button" id="matrixZero">Toàn số 0</button>
        </div>
      </div>
      ${matrixGridMarkup(matrix)}
      <div class="section-title"><h3>Hai ma trận</h3><span>Chọn bất kỳ cặp A–D</span></div>
      <div class="matrix-tools" style="margin-top:0">
        <select id="matrixOperandA" class="partner-select" aria-label="Chọn ma trận thứ nhất">${matrixOperandOptions(matrixOperandA)}</select>
        <span class="mini-label">VÀ</span>
        <select id="matrixOperandB" class="partner-select" aria-label="Chọn ma trận thứ hai">${matrixOperandOptions(matrixOperandB)}</select>
      </div>
      <div class="matrix-tools" style="margin-top:8px">
        <button class="btn small" type="button" data-matrix-op="add" data-matrix-label="add">${escapeHtml(labels.add)}</button>
        <button class="btn small" type="button" data-matrix-op="sub" data-matrix-label="sub">${escapeHtml(labels.sub)}</button>
        <button class="btn small" type="button" data-matrix-op="mul" data-matrix-label="mul">${escapeHtml(labels.mul)}</button>
      </div>
      <div class="section-title"><h3>Một ma trận</h3><span>Dùng ma trận 1</span></div>
      <div class="matrix-tools" style="margin-top:0">
        <button class="btn small" type="button" data-matrix-op="transpose" data-matrix-label="transpose">${escapeHtml(labels.transpose)}</button>
        <button class="btn small" type="button" data-matrix-op="det" data-matrix-label="det">${escapeHtml(labels.det)}</button>
        <button class="btn small" type="button" data-matrix-op="inverse" data-matrix-label="inverse">${escapeHtml(labels.inverse)}</button>
        <span class="mini-label">k</span>
        <input class="cell-input" id="matrixScalar" value="${escapeHtml(matrixScalar)}" style="width:50px" inputmode="decimal">
        <button class="btn small" type="button" data-matrix-op="scale" data-matrix-label="scale">${escapeHtml(labels.scale)}</button>
      </div>
      <div id="matrixResults" style="margin-top:16px">${matrixResultMarkup(null, "KẾT QUẢ")}</div>`;
    openModal({
      title: "Ma trận",
      kicker: "MATRIX · 2×2 → 5×5",
      icon: "matrix",
      wide: true,
      body,
      onMount(root) {
        $$("[data-matrix-tab]", root).forEach((button) => button.addEventListener("click", () => {
          matrixTab = button.dataset.matrixTab;
          matrixResult = null;
          openMatrixWorkspace();
        }));
        $$("[data-matrix-row]", root).forEach((input) => input.addEventListener("input", () => {
          matrix.data[Number(input.dataset.matrixRow)][Number(input.dataset.matrixCol)] = input.value;
          persist();
        }));
        const rebuild = () => {
          const oldRows = matrix.rows, oldCols = matrix.cols;
          matrix.rows = Number($("#matrixRows", root).value);
          matrix.cols = Number($("#matrixCols", root).value);
          const next = ensureMatrixShape({ rows: matrix.rows, cols: matrix.cols, data: matrix.data });
          state.matrices[matrixTab] = next;
          matrixResult = null;
          openMatrixWorkspace();
        };
        $("#matrixRows", root).addEventListener("change", rebuild);
        $("#matrixCols", root).addEventListener("change", rebuild);
        $("#matrixIdentity", root).addEventListener("click", () => {
          ensureMatrixShape(matrix);
          matrix.data = Array.from({ length: matrix.rows }, (_, r) => Array.from({ length: matrix.cols }, (_, c) => (r === c ? "1" : "0")));
          matrixResult = null;
          openMatrixWorkspace();
        });
        $("#matrixZero", root).addEventListener("click", () => {
          ensureMatrixShape(matrix);
          matrix.data = Array.from({ length: matrix.rows }, (_, r) => Array.from({ length: matrix.cols }, (_, c) => "0"));
          matrixResult = null;
          openMatrixWorkspace();
        });
        $("#matrixScalar", root).addEventListener("input", () => { matrixScalar = $("#matrixScalar", root).value; });
        const selectA = $("#matrixOperandA", root);
        const selectB = $("#matrixOperandB", root);
        const changeOperands = () => {
          matrixOperandA = selectA.value;
          matrixOperandB = selectB.value;
          matrixResult = null;
          updateMatrixOpLabels(root);
          $("#matrixResults", root).innerHTML = matrixResultMarkup(null, "KẾT QUẢ");
        };
        selectA.addEventListener("change", changeOperands);
        selectB.addEventListener("change", changeOperands);
        $$("[data-matrix-op]", root).forEach((button) => button.addEventListener("click", () => {
          const results = $("#matrixResults", root);
          try {
            const A = matrixToArray(state.matrices[matrixOperandA]);
            const getB = () => matrixToArray(state.matrices[matrixOperandB]);
            const op = button.dataset.matrixOp;
            if (op === "add") matrixResult = { matrix: E.matrix.add(A, getB()), label: matrixOpLabels().add };
            else if (op === "sub") matrixResult = { matrix: E.matrix.sub(A, getB()), label: matrixOpLabels().sub };
            else if (op === "mul") matrixResult = { matrix: E.matrix.mul(A, getB()), label: matrixOpLabels().mul };
            else if (op === "transpose") matrixResult = { matrix: E.matrix.transpose(A), label: `${matrixOperandA}ᵀ` };
            else if (op === "det") { const d = E.matrix.det(A); matrixResult = { text: formatNumericText(d), label: `det(${matrixOperandA})` }; }
            else if (op === "inverse") matrixResult = { matrix: E.matrix.inverse(A), label: `${matrixOperandA}⁻¹` };
            else if (op === "scale") {
              const k = parseNumeric($("#matrixScalar", root).value, "Hệ số k");
              matrixScalar = String(k);
              matrixResult = { matrix: E.matrix.scale(A, k), label: `${formatNumericText(k)} × ${matrixOperandA}` };
            }
            results.innerHTML = matrixResultMarkup(matrixResult, "KẾT QUẢ");
            const copy = $("[data-copy-result]", results);
            if (copy) copy.addEventListener("click", () => {
              const text = matrixResult.matrix ? matrixResult.matrix.map((row) => row.map(formatNumericText).join(" ")).join("\n") : matrixResult.text;
              copyText(text);
            });
          } catch (error) {
            matrixResult = { error };
            results.innerHTML = errorBox(error);
          }
        }));
      }
    });
  }

  /* ---------- Vectơ ---------- */
  let vectorTab = "A";
  let vectorOperandA = "A";
  let vectorOperandB = "B";
  let vectorScalar = "2";
  let vectorResult = null;

  function ensureVectorShape(vector) {
    vector.dim = vector.dim === 2 ? 2 : 3;
    vector.data = Array.from({ length: vector.dim }, (_, i) => vector.data && vector.data[i] != null ? String(vector.data[i]) : "0");
    return vector;
  }

  function vectorFieldsMarkup(vector) {
    ensureVectorShape(vector);
    const labels = ["x", "y", "z"];
    return `<div class="form-grid ${vector.dim === 3 ? "three" : ""}">${vector.data.map((value, i) => `<div class="field"><label>Thành phần ${labels[i]}</label><input class="cell-input" data-vector-index="${i}" value="${escapeHtml(value)}" inputmode="decimal"></div>`).join("")}</div>`;
  }

  function vectorToArray(vector) {
    ensureVectorShape(vector);
    return vector.data.map((value, i) => parseNumeric(value, `Thành phần ${i + 1}`));
  }

  function vectorOpLabels() {
    const a = vectorOperandA;
    const b = vectorOperandB;
    return {
      add: `${a} + ${b}`,
      sub: `${a} − ${b}`,
      dot: `${a} · ${b}`,
      cross: `${a} × ${b}`,
      angle: `góc(${a}, ${b})`,
      norm: `|${a}|`,
      unit: `vectơ đơn vị ${a}`,
      scale: `k × ${a}`
    };
  }

  function updateVectorOpLabels(root) {
    const labels = vectorOpLabels();
    $$("[data-vector-label]", root || document).forEach((node) => {
      const label = labels[node.dataset.vectorLabel];
      if (label) node.textContent = label;
    });
  }

  function vectorOperandOptions(selected) {
    return ["A", "B", "C", "D", "E"].map((name) => `<option value="${name}" ${name === selected ? "selected" : ""}>Vectơ ${name}</option>`).join("");
  }

  function vectorResultMarkup() {
    if (!vectorResult) return `<div class="result-empty">Chọn phép toán vectơ để xem kết quả.</div>`;
    if (vectorResult.error) return errorBox(vectorResult.error);
    if (vectorResult.vector) return resultMatrixMarkup([vectorResult.vector], vectorResult.label);
    return card(vectorResult.label, escapeHtml(vectorResult.text), vectorResult.sub || "");
  }

  function openVectorWorkspace() {
    closeModal();
    const vector = ensureVectorShape(state.vectors[vectorTab]);
    const labels = vectorOpLabels();
    const body = workspaceLead("Định nghĩa vectơ A–E trong không gian 2D hoặc 3D. Chọn bất kỳ hai vectơ để tính tổng, hiệu, tích vô hướng, tích có hướng và góc; dùng vectơ 1 cho độ dài, vectơ đơn vị và nhân với số.") +
      `<div class="matrix-tabs">${["A", "B", "C", "D", "E"].map((name) => `<button class="matrix-tab ${name === vectorTab ? "is-active" : ""}" type="button" data-vector-tab="${name}">Vectơ ${name}</button>`).join("")}</div>
      <div class="matrix-tools" style="margin-top:0;margin-bottom:10px"><span class="mini-label">SỐ CHIỀU</span><div class="dimension-picker"><select id="vectorDim">${[2, 3].map((n) => `<option value="${n}" ${n === vector.dim ? "selected" : ""}>${n} chiều</option>`).join("")}</select><button class="btn tiny ghost" type="button" id="vectorZero">Toàn số 0</button></div></div>
      ${vectorFieldsMarkup(vector)}
      <div class="section-title"><h3>Hai vectơ</h3><span>Chọn bất kỳ cặp A–E</span></div>
      <div class="matrix-tools" style="margin-top:0">
        <select id="vectorOperandA" class="partner-select" aria-label="Chọn vectơ thứ nhất">${vectorOperandOptions(vectorOperandA)}</select>
        <span class="mini-label">VÀ</span>
        <select id="vectorOperandB" class="partner-select" aria-label="Chọn vectơ thứ hai">${vectorOperandOptions(vectorOperandB)}</select>
      </div>
      <div class="matrix-tools" style="margin-top:8px">
        <button class="btn small" type="button" data-vector-op="add" data-vector-label="add">${escapeHtml(labels.add)}</button>
        <button class="btn small" type="button" data-vector-op="sub" data-vector-label="sub">${escapeHtml(labels.sub)}</button>
        <button class="btn small" type="button" data-vector-op="dot" data-vector-label="dot">${escapeHtml(labels.dot)}</button>
        <button class="btn small" type="button" data-vector-op="cross" data-vector-label="cross">${escapeHtml(labels.cross)}</button>
        <button class="btn small" type="button" data-vector-op="angle" data-vector-label="angle">${escapeHtml(labels.angle)}</button>
      </div>
      <div class="section-title"><h3>Một vectơ</h3><span>Dùng vectơ 1</span></div>
      <div class="matrix-tools" style="margin-top:0">
        <button class="btn small" type="button" data-vector-op="norm" data-vector-label="norm">${escapeHtml(labels.norm)}</button>
        <button class="btn small" type="button" data-vector-op="unit" data-vector-label="unit">${escapeHtml(labels.unit)}</button>
        <span class="mini-label">k</span>
        <input class="cell-input" id="vectorScalar" value="${escapeHtml(vectorScalar)}" style="width:50px" inputmode="decimal">
        <button class="btn small" type="button" data-vector-op="scale" data-vector-label="scale">${escapeHtml(labels.scale)}</button>
      </div>
      <div id="vectorResults" style="margin-top:16px">${vectorResultMarkup()}</div>`;
    openModal({
      title: "Vectơ",
      kicker: "VECTOR · A–E · 2D / 3D",
      icon: "vector",
      wide: true,
      body,
      onMount(root) {
        $$("[data-vector-tab]", root).forEach((button) => button.addEventListener("click", () => {
          vectorTab = button.dataset.vectorTab;
          vectorResult = null;
          openVectorWorkspace();
        }));
        $$("[data-vector-index]", root).forEach((input) => input.addEventListener("input", () => {
          vector.data[Number(input.dataset.vectorIndex)] = input.value;
          persist();
        }));
        $("#vectorDim", root).addEventListener("change", (event) => {
          vector.dim = Number(event.target.value);
          ensureVectorShape(vector);
          vectorResult = null;
          openVectorWorkspace();
        });
        $("#vectorZero", root).addEventListener("click", () => {
          ensureVectorShape(vector);
          vector.data = vector.data.map(() => "0");
          vectorResult = null;
          openVectorWorkspace();
        });
        $("#vectorScalar", root).addEventListener("input", () => { vectorScalar = $("#vectorScalar", root).value; });
        const selectA = $("#vectorOperandA", root);
        const selectB = $("#vectorOperandB", root);
        const changeOperands = () => {
          vectorOperandA = selectA.value;
          vectorOperandB = selectB.value;
          vectorResult = null;
          updateVectorOpLabels(root);
          $("#vectorResults", root).innerHTML = vectorResultMarkup();
        };
        selectA.addEventListener("change", changeOperands);
        selectB.addEventListener("change", changeOperands);
        $$("[data-vector-op]", root).forEach((button) => button.addEventListener("click", () => {
          const results = $("#vectorResults", root);
          try {
            const A = vectorToArray(state.vectors[vectorOperandA]);
            const getB = () => vectorToArray(state.vectors[vectorOperandB]);
            const op = button.dataset.vectorOp;
            const angleUnitLabel = state.settings.angleUnit === "deg" ? "°" : state.settings.angleUnit === "rad" ? " rad" : " grad";
            const labelsNow = vectorOpLabels();
            if (op === "add") vectorResult = { vector: E.vector.add(A, getB()), label: labelsNow.add };
            else if (op === "sub") vectorResult = { vector: E.vector.sub(A, getB()), label: labelsNow.sub };
            else if (op === "dot") vectorResult = { text: formatNumericText(E.vector.dot(A, getB())), label: labelsNow.dot, sub: "Tích vô hướng" };
            else if (op === "cross") vectorResult = { vector: E.vector.cross(A, getB()), label: labelsNow.cross, sub: "Tích có hướng (chỉ với vectơ 3D)" };
            else if (op === "norm") vectorResult = { text: formatNumericText(E.vector.norm(A)), label: labelsNow.norm, sub: "Độ dài vectơ" };
            else if (op === "unit") vectorResult = { vector: E.vector.unit(A), label: labelsNow.unit };
            else if (op === "angle") vectorResult = { text: formatNumericText(E.vector.angle(A, getB(), state.settings.angleUnit)) + angleUnitLabel, label: labelsNow.angle, sub: `Góc giữa vectơ ${vectorOperandA} và ${vectorOperandB}` };
            else if (op === "scale") {
              const k = parseNumeric($("#vectorScalar", root).value, "Hệ số k");
              vectorScalar = String(k);
              vectorResult = { vector: E.vector.scale(A, k), label: `${formatNumericText(k)} × ${vectorOperandA}` };
            }
            results.innerHTML = vectorResultMarkup();
            const copy = $("[data-copy-result]", results);
            if (copy) copy.addEventListener("click", () => {
              copyText(vectorResult.vector ? vectorResult.vector.map(formatNumericText).join(" ") : vectorResult.text);
            });
          } catch (error) {
            vectorResult = { error };
            results.innerHTML = errorBox(error);
          }
        }));
      }
    });
  }

  /* ---------- Phân phối xác suất ---------- */
  const distributionState = {
    tab: "normal",
    op: "pd",
    x: "0",
    mu: "0",
    sigma: "1",
    n: "10",
    p: "0.5",
    lambda: "3",
    area: "0.95"
  };

  function chartSvg(type, params, point) {
    const width = 560, height = 132, pad = 10;
    let maxY = 0;
    let bars = null;
    let curve = null;
    if (type === "normal") {
      const mu = params.mu, sigma = params.sigma;
      const lo = mu - 4 * sigma, hi = mu + 4 * sigma;
      curve = [];
      for (let i = 0; i <= 90; i++) {
        const x = lo + (hi - lo) * (i / 90);
        const y = E.normalPdf(x, mu, sigma);
        if (y > maxY) maxY = y;
        curve.push({ x, y });
      }
    } else if (type === "binomial") {
      const n = Math.min(Math.max(0, Math.round(params.n)), 200);
      bars = [];
      for (let i = 0; i <= n; i++) {
        const y = E.binomialPmf(i, n, params.p);
        if (y > maxY) maxY = y;
        bars.push({ i, y });
      }
    } else {
      const limit = Math.min(100, Math.max(12, Math.ceil(params.lambda + 4 * Math.sqrt(params.lambda))));
      bars = [];
      for (let i = 0; i <= limit; i++) {
        const y = E.poissonPmf(i, params.lambda);
        if (y > maxY) maxY = y;
        bars.push({ i, y });
      }
    }
    if (!(maxY > 0)) return "";
    const scaleY = (y) => height - pad - (y / maxY) * (height - pad * 2 - 13);
    let drawing = "";
    if (curve) {
      drawing = `<polyline points="${curve.map((p, i) => `${pad + (i / (curve.length - 1)) * (width - pad * 2)},${scaleY(p.y)}`).join(" ")}" fill="none" stroke="#f2b45b" stroke-width="2" stroke-linejoin="round" opacity="0.9"/>`;
      const px = pad + ((Math.max(curve[0].x, Math.min(curve[curve.length - 1].x, point)) - curve[0].x) / (curve[curve.length - 1].x - curve[0].x)) * (width - pad * 2);
      drawing += `<line x1="${px}" y1="${pad}" x2="${px}" y2="${height - pad - 13}" stroke="rgba(255,255,255,0.32)" stroke-width="1" stroke-dasharray="3 3"/>`;
      drawing += `<circle cx="${px}" cy="${scaleY(E.normalPdf(point, params.mu, params.sigma))}" r="3.5" fill="#ffd391"/>`;
    } else {
      const bw = (width - pad * 2) / bars.length;
      bars.forEach((bar, index) => {
        const x = pad + index * bw + 1;
        const h = height - pad - 13 - scaleY(bar.y);
        drawing += `<rect x="${x}" y="${scaleY(bar.y)}" width="${Math.max(1, bw - 2)}" height="${Math.max(0, h)}" rx="1.2" fill="${bar.i === Math.round(point) ? "#ffd391" : "rgba(242,180,91,0.55)"}"/>`;
      });
    }
    return `<div class="prob-chart"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><line x1="${pad}" y1="${height - pad - 13}" x2="${width - pad}" y2="${height - pad - 13}" stroke="rgba(255,255,255,0.12)"/>${drawing}</svg><div class="chart-axis"><span>${type === "normal" ? "μ − 4σ" : "0"}</span><span>${type === "normal" ? "μ + 4σ" : "x"}</span></div></div>`;
  }

  function distributionResultMarkup() {
    return advancedResult ? advancedResult : `<div class="result-empty">Nhập tham số rồi bấm <b>Tính</b>.</div>`;
  }

  function openDistributionWorkspace() {
    closeModal();
    const tab = distributionState.tab;
    advancedResult = null;
    const tabs = [["normal", "Phân phối chuẩn"], ["binomial", "Nhị thức"], ["poisson", "Poisson"]];
    let fields = "";
    let title = "";
    if (tab === "normal") {
      title = "Chuẩn N(μ, σ²)";
      const operations = [["pd", "Mật độ (PD)"], ["cd", "Tích lũy (CD)"], ["inv", "Phân vị (Inv)"]]; 
      fields = `<div class="field" style="margin-bottom:10px"><label>Phép tính</label><select id="distOp">${operations.map(([id, label]) => `<option value="${id}" ${distributionState.op === id ? "selected" : ""}>${label}</option>`).join("")}</select></div>
        <div class="form-grid ${distributionState.op === "inv" ? "three" : "three"}">
          ${distributionState.op === "inv"
            ? `<div class="field"><label>Diện tích (0 &lt; p &lt; 1)</label><input data-dist="area" value="${escapeHtml(distributionState.area)}" inputmode="decimal"></div>`
            : `<div class="field"><label>x</label><input data-dist="x" value="${escapeHtml(distributionState.x)}" inputmode="decimal"></div>`}
          <div class="field"><label>μ (trung bình)</label><input data-dist="mu" value="${escapeHtml(distributionState.mu)}" inputmode="decimal"></div>
          <div class="field"><label>σ (độ lệch chuẩn)</label><input data-dist="sigma" value="${escapeHtml(distributionState.sigma)}" inputmode="decimal"></div>
        </div>`;
    } else if (tab === "binomial") {
      title = "Nhị thức B(n, p)";
      fields = `<div class="field" style="margin-bottom:10px"><label>Phép tính</label><select id="distOp"><option value="pd" ${distributionState.op === "pd" ? "selected" : ""}>Mật độ (PD)</option><option value="cd" ${distributionState.op === "cd" ? "selected" : ""}>Tích lũy (CD)</option></select></div>
        <div class="form-grid three">
          <div class="field"><label>x (số lần thành công)</label><input data-dist="x" value="${escapeHtml(distributionState.x)}" inputmode="numeric"></div>
          <div class="field"><label>n (số phép thử)</label><input data-dist="n" value="${escapeHtml(distributionState.n)}" inputmode="numeric"></div>
          <div class="field"><label>p (xác suất)</label><input data-dist="p" value="${escapeHtml(distributionState.p)}" inputmode="decimal"></div>
        </div>`;
    } else {
      title = "Poisson P(λ)";
      fields = `<div class="field" style="margin-bottom:10px"><label>Phép tính</label><select id="distOp"><option value="pd" ${distributionState.op === "pd" ? "selected" : ""}>Mật độ (PD)</option><option value="cd" ${distributionState.op === "cd" ? "selected" : ""}>Tích lũy (CD)</option></select></div>
        <div class="form-grid three">
          <div class="field"><label>x (số sự kiện)</label><input data-dist="x" value="${escapeHtml(distributionState.x)}" inputmode="numeric"></div>
          <div class="field"><label>λ (trung bình)</label><input data-dist="lambda" value="${escapeHtml(distributionState.lambda)}" inputmode="decimal"></div>
        </div>`;
    }
    const body = workspaceLead("Tính mật độ, xác suất tích lũy và phân vị cho phân phối chuẩn, nhị thức hoặc Poisson. Đồ thị cập nhật theo tham số.") +
      `<div class="segmented">${tabs.map(([id, label]) => `<button class="seg-btn ${id === tab ? "is-active" : ""}" type="button" data-dist-tab="${id}">${label}</button>`).join("")}</div>
      <div class="equation-preview">${escapeHtml(title)}</div>${fields}
      <div class="button-row"><button class="btn primary" type="button" id="distCompute">Tính</button><button class="btn ghost small" type="button" id="distSample">Ví dụ</button></div>
      <div id="distResults" style="margin-top:16px">${distributionResultMarkup()}</div>`;
    openModal({
      title: "Phân phối xác suất",
      kicker: "DISTRIBUTION · NORMAL / BINOMIAL / POISSON",
      icon: "normal",
      wide: true,
      body,
      onMount(root) {
        $$("[data-dist-tab]", root).forEach((button) => button.addEventListener("click", () => {
          distributionState.tab = button.dataset.distTab;
          distributionState.op = "pd";
          openDistributionWorkspace();
        }));
        $$("[data-dist]", root).forEach((input) => input.addEventListener("input", () => { distributionState[input.dataset.dist] = input.value; }));
        $("#distOp", root).addEventListener("change", (event) => { distributionState.op = event.target.value; openDistributionWorkspace(); });
        $("#distSample", root).addEventListener("click", () => {
          if (distributionState.tab === "normal") { distributionState.x = "1"; distributionState.mu = "0"; distributionState.sigma = "1"; distributionState.area = "0.95"; }
          else if (distributionState.tab === "binomial") { distributionState.x = "4"; distributionState.n = "10"; distributionState.p = "0.5"; }
          else { distributionState.x = "3"; distributionState.lambda = "2.5"; }
          openDistributionWorkspace();
        });
        $("#distCompute", root).addEventListener("click", () => {
          const results = $("#distResults", root);
          try {
            let label = "", value = 0, sub = "", chart = "";
            if (tab === "normal") {
              const mu = parseNumeric(distributionState.mu, "μ");
              const sigma = parseNumeric(distributionState.sigma, "σ");
              if (sigma <= 0) throw new E.CalcError("Math ERROR", "σ phải lớn hơn 0");
              if (distributionState.op === "inv") {
                const area = parseNumeric(distributionState.area, "Diện tích");
                value = E.invNormal(area, mu, sigma);
                label = `Phân vị p = ${formatNumericText(area)}`;
                sub = `P(X ≤ x) = ${formatNumericText(area)}`;
                const z = E.invNormal(area, 0, 1);
                advancedResult = card(label, `x = ${formatNumericText(value)}`, `${sub} · z = ${formatNumericText(z)}`);
              } else {
                const x = parseNumeric(distributionState.x, "x");
                value = distributionState.op === "pd" ? E.normalPdf(x, mu, sigma) : E.normalCdf(x, mu, sigma);
                label = distributionState.op === "pd" ? "Mật độ f(x)" : "Xác suất tích lũy P(X ≤ x)";
                sub = `N(μ = ${formatNumericText(mu)}, σ = ${formatNumericText(sigma)}) tại x = ${formatNumericText(x)}`;
                chart = chartSvg("normal", { mu, sigma }, x);
                advancedResult = card(label, escapeHtml(formatNumericText(value)), sub) + `<div class="metric-grid">${metric("x", formatNumericText(x), true)}${metric("μ", formatNumericText(mu))}${metric("σ", formatNumericText(sigma))}${metric("Giá trị", formatNumericText(value))}</div>`;
              }
            } else if (tab === "binomial") {
              const x = Math.round(parseNumeric(distributionState.x, "x"));
              const n = Math.round(parseNumeric(distributionState.n, "n"));
              const p = parseNumeric(distributionState.p, "p");
              if (n < 0) throw new E.CalcError("Math ERROR", "n phải không âm");
              if (p < 0 || p > 1) throw new E.CalcError("Math ERROR", "p phải trong [0; 1]");
              value = distributionState.op === "pd" ? E.binomialPmf(x, n, p) : E.binomialCdf(x, n, p);
              label = distributionState.op === "pd" ? "P(X = x)" : "P(X ≤ x)";
              advancedResult = card(label, escapeHtml(formatNumericText(value)), `B(n = ${n}, p = ${formatNumericText(p)}) tại x = ${x}`) +
                `<div class="metric-grid">${metric("n", n, true)}${metric("p", formatNumericText(p))}${metric("x", x)}${metric("Kết quả", formatNumericText(value))}</div>`;
              chart = chartSvg("binomial", { n, p }, x);
            } else {
              const x = Math.round(parseNumeric(distributionState.x, "x"));
              const lambda = parseNumeric(distributionState.lambda, "λ");
              if (lambda <= 0) throw new E.CalcError("Math ERROR", "λ phải lớn hơn 0");
              value = distributionState.op === "pd" ? E.poissonPmf(x, lambda) : E.poissonCdf(x, lambda);
              label = distributionState.op === "pd" ? "P(X = x)" : "P(X ≤ x)";
              advancedResult = card(label, escapeHtml(formatNumericText(value)), `Poisson(λ = ${formatNumericText(lambda)}) tại x = ${x}`) +
                `<div class="metric-grid">${metric("λ", formatNumericText(lambda), true)}${metric("x", x)}${metric("Kết quả", formatNumericText(value))}</div>`;
              chart = chartSvg("poisson", { lambda }, x);
            }
            results.innerHTML = advancedResult + (chart || "");
          } catch (error) {
            advancedResult = null;
            results.innerHTML = errorBox(error);
          }
        });
      }
    });
  }

  /* ---------- Kiểm tra đẳng thức / bất đẳng thức ---------- */
  const verifyState = { left: "sin(x)^2 + cos(x)^2", relation: "=", right: "1", x: "30" };

  function openVerifyWorkspace() {
    closeModal();
    advancedResult = null;
    const body = workspaceLead("Kiểm chứng một đẳng thức hoặc bất đẳng thức. Biến <strong>X</strong> có thể được gán giá trị để kiểm tra số học; để trống nếu hai vế là hằng số.") +
      `<div class="two-col">
        <div class="field"><label>Vế trái</label><input id="verifyLeft" value="${escapeHtml(verifyState.left)}" placeholder="sin(x)^2 + cos(x)^2"></div>
        <div class="field"><label>Vế phải</label><input id="verifyRight" value="${escapeHtml(verifyState.right)}" placeholder="1"></div>
      </div>
      <div class="form-grid three" style="margin-top:10px">
        <div class="field"><label>Quan hệ</label><select id="verifyRelation">${["=", "≠", ">", "≥", "<", "≤"].map((r) => `<option value="${r}" ${r === verifyState.relation ? "selected" : ""}>${r}</option>`).join("")}</select></div>
        <div class="field"><label>Giá trị X <span class="sub">tuỳ chọn</span></label><input id="verifyX" value="${escapeHtml(verifyState.x)}" inputmode="decimal"></div>
      </div>
      <div class="button-row"><button class="btn primary" type="button" id="verifyRun">Kiểm chứng</button><button class="btn ghost small" type="button" id="verifySample">Ví dụ</button></div>
      <div id="verifyResults" style="margin-top:16px"><div class="result-empty">Nhập hai vế rồi bấm <b>Kiểm chứng</b>.</div></div>`;
    openModal({
      title: "Kiểm tra",
      kicker: "VERIFY · TRUE / FALSE",
      icon: "verify",
      wide: true,
      body,
      onMount(root) {
        $("#verifySample", root).addEventListener("click", () => {
          verifyState.left = "sin(x)^2 + cos(x)^2";
          verifyState.relation = "=";
          verifyState.right = "1";
          verifyState.x = "30";
          openVerifyWorkspace();
        });
        $("#verifyRun", root).addEventListener("click", () => {
          const results = $("#verifyResults", root);
          try {
            const leftExpr = $("#verifyLeft", root).value;
            const rightExpr = $("#verifyRight", root).value;
            verifyState.left = leftExpr;
            verifyState.right = rightExpr;
            verifyState.relation = $("#verifyRelation", root).value;
            verifyState.x = $("#verifyX", root).value;
            let vars = Object.assign({}, state.vars);
            const xRaw = verifyState.x.trim();
            if (xRaw !== "") vars.X = parseNumeric(xRaw, "Giá trị X");
            const leftValue = E.evaluate(leftExpr, { angleUnit: state.settings.angleUnit, vars, ans: state.ans });
            const rightValue = E.evaluate(rightExpr, { angleUnit: state.settings.angleUnit, vars, ans: state.ans });
            if (Math.abs(leftValue.im) > 1e-9 || Math.abs(rightValue.im) > 1e-9) throw new E.CalcError("Math ERROR", "Không so sánh được số phức");
            const l = leftValue.re, r = rightValue.re;
            const tol = 1e-9;
            let truth = false;
            if (verifyState.relation === "=") truth = Math.abs(l - r) <= tol;
            else if (verifyState.relation === "≠") truth = Math.abs(l - r) > tol;
            else if (verifyState.relation === ">") truth = l > r;
            else if (verifyState.relation === "≥") truth = l >= r - tol;
            else if (verifyState.relation === "<") truth = l < r;
            else if (verifyState.relation === "≤") truth = l <= r + tol;
            advancedResult = `<div class="notice ${truth ? "success" : "error"}"><span class="notice-icon">${truth ? "✓" : "×"}</span><span><b>${truth ? "ĐÚNG" : "SAI"}</b> — ${formatNumericText(l)} ${verifyState.relation} ${formatNumericText(r)}</span></div>
              <div class="metric-grid">
                ${metric("Vế trái", formatNumericText(l), true)}
                ${metric("Vế phải", formatNumericText(r))}
                ${metric("Hiệu", formatNumericText(l - r))}
                ${metric("Sai số cho phép", "10⁻⁹")}
              </div>
              <div class="result-table-line"><span>Biểu thức kiểm tra</span><b>${escapeHtml(leftExpr)} ${escapeHtml(verifyState.relation)} ${escapeHtml(rightExpr)}${xRaw !== "" ? " với X = " + escapeHtml(xRaw) : ""}</b></div>`;
            results.innerHTML = advancedResult;
          } catch (error) { results.innerHTML = errorBox(error); }
        });
      }
    });
  }

  /* ---------- Tỉ lệ ---------- */
  const ratioState = { a: "1", b: "2", c: "3", d: "" };

  function ratioSolve(values) {
    const filled = ["a", "b", "c", "d"].filter((key) => String(values[key]).trim() !== "");
    if (filled.length !== 3) throw new E.CalcError("Syntax ERROR", "Hãy để trống đúng một ô cần tìm");
    const nums = {};
    ["a", "b", "c", "d"].forEach((key) => {
      if (String(values[key]).trim() !== "") nums[key] = parseNumeric(values[key], key.toUpperCase());
    });
    const missing = ["a", "b", "c", "d"].find((key) => nums[key] === undefined);
    if (missing === "a") {
      if (nums.d === 0) throw new E.CalcError("Math ERROR", "Không thể chia cho 0");
      nums.a = (nums.c * nums.b) / nums.d;
    } else if (missing === "b") {
      if (nums.c === 0) throw new E.CalcError("Math ERROR", "Không thể chia cho 0");
      nums.b = (nums.a * nums.d) / nums.c;
    } else if (missing === "c") {
      if (nums.b === 0) throw new E.CalcError("Math ERROR", "Không thể chia cho 0");
      nums.c = (nums.a * nums.d) / nums.b;
    } else {
      if (nums.a === 0) throw new E.CalcError("Math ERROR", "Không thể chia cho 0");
      nums.d = (nums.b * nums.c) / nums.a;
    }
    return { missing, nums };
  }

  function ratioReduced(a, b) {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === 0 || b === 0) return `${formatNumericText(a)} : ${formatNumericText(b)}`;
    const divisor = E.gcd(Math.abs(a), Math.abs(b));
    return `${a / divisor} : ${b / divisor}`;
  }

  function openRatioWorkspace() {
    closeModal();
    advancedResult = null;
    const body = workspaceLead("Giải tỉ lệ thức <strong>a : b = c : d</strong>. Nhập ba giá trị và để trống ô cần tìm; máy sẽ tính theo tích chéo.") +
      `<div class="equation-preview">a : b = c : d</div>
      <div class="ratio-grid">
        <div class="field"><label>a</label><input data-ratio="a" value="${escapeHtml(ratioState.a)}" inputmode="decimal"></div>
        <span class="conv-eq ratio-sep">:</span>
        <div class="field"><label>b</label><input data-ratio="b" value="${escapeHtml(ratioState.b)}" inputmode="decimal"></div>
        <span class="conv-eq ratio-sep">=</span>
        <div class="field"><label>c</label><input data-ratio="c" value="${escapeHtml(ratioState.c)}" inputmode="decimal"></div>
        <span class="conv-eq ratio-sep">:</span>
        <div class="field"><label>d <span class="sub">để trống để tìm</span></label><input data-ratio="d" value="${escapeHtml(ratioState.d)}" inputmode="decimal" placeholder="?"></div>
      </div>
      <div class="button-row"><button class="btn primary" type="button" id="ratioRun">Tìm giá trị còn thiếu</button><button class="btn ghost small" type="button" id="ratioSample">Ví dụ</button></div>
      <div id="ratioResults" style="margin-top:16px"><div class="result-empty">Nhập ba giá trị và để trống một ô.</div></div>`;
    openModal({
      title: "Tỉ lệ thức",
      kicker: "RATIO · a : b = c : d",
      icon: "ratio",
      wide: true,
      body,
      onMount(root) {
        $$("[data-ratio]", root).forEach((input) => input.addEventListener("input", () => { ratioState[input.dataset.ratio] = input.value; }));
        $("#ratioSample", root).addEventListener("click", () => {
          ratioState.a = "2"; ratioState.b = "3"; ratioState.c = "6"; ratioState.d = "";
          openRatioWorkspace();
        });
        $("#ratioRun", root).addEventListener("click", () => {
          const results = $("#ratioResults", root);
          try {
            const result = ratioSolve(ratioState);
            const { missing, nums } = result;
            const left = ratioReduced(nums.a, nums.b);
            const right = ratioReduced(nums.c, nums.d);
            results.innerHTML = card(`TÌM ${missing.toUpperCase()}`, `${missing} = ${formatNumericText(nums[missing])}`, `${formatNumericText(nums.a)} : ${formatNumericText(nums.b)} = ${formatNumericText(nums.c)} : ${formatNumericText(nums.d)}`) +
              `<div class="metric-grid">
                ${metric("a", formatNumericText(nums.a), missing === "a")}
                ${metric("b", formatNumericText(nums.b), missing === "b")}
                ${metric("c", formatNumericText(nums.c), missing === "c")}
                ${metric("d", formatNumericText(nums.d), missing === "d")}
              </div>
              <div class="result-table-line"><span>Rút gọn</span><b>${escapeHtml(left)} = ${escapeHtml(right)}</b></div>
              <div class="result-table-line"><span>Tích chéo</span><b>${formatNumericText(nums.a * nums.d)} = ${formatNumericText(nums.b * nums.c)}</b></div>`;
          } catch (error) { results.innerHTML = errorBox(error); }
        });
      }
    });
  }

  /* ============================================================
   * CÔNG CỤ MỞ RỘNG: ĐỒ THỊ & ĐIỂM
   * ============================================================ */
  const GRAPH_COLORS = ["#f2a544", "#64c6b4", "#7fa6ff", "#e57b9a"];
  let graphRaf = 0;
  let graphResizeObserver = null;
  let graphDragState = null;
  let graphHoverPoint = null;
  let graphLastTrend = null;
  let graphFocusIndex = -1;

  function graphNumber(value) {
    if (!Number.isFinite(value)) return "—";
    const abs = Math.abs(value);
    if (abs !== 0 && (abs < 1e-4 || abs >= 1e6)) return value.toExponential(3).replace("e+", "e");
    return String(Number(value.toPrecision(6)));
  }

  function graphTick(value, step) {
    if (Math.abs(value) < 1e-10) return "0";
    if (Math.abs(value) >= 1e6 || (Math.abs(value) < 1e-4 && Math.abs(value) > 0)) return value.toExponential(1);
    const digits = Math.max(0, Math.min(6, -Math.floor(Math.log10(Math.abs(step))) + 1));
    return Number(value.toFixed(digits)).toString();
  }

  function niceGraphStep(range, target) {
    const rough = Math.abs(range) / Math.max(2, target || 10);
    if (!Number.isFinite(rough) || rough <= 0) return 1;
    const power = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / power;
    const factor = norm <= 1.5 ? 1 : norm <= 3 ? 2 : norm <= 7 ? 5 : 10;
    return factor * power;
  }

  function graphEval(expr, value, useT) {
    let source = String(expr || "").trim();
    if (!source) return null;
    if (useT) source = source.replace(/(^|[^A-Za-z])t(?![A-Za-z])/gi, "$1X");
    try {
      const result = E.evaluate(source, {
        vars: { X: value },
        ans: state.ans,
        angleUnit: state.settings.angleUnit
      });
      if (Math.abs(result.im) > 1e-10 || !Number.isFinite(result.re)) return null;
      return result.re;
    } catch (error) {
      return null;
    }
  }

  function graphEvalPolar(expr, angle) {
    let source = String(expr || "").trim();
    if (!source) return null;
    source = source.replace(/(^|[^A-Za-z])t(?![A-Za-z])/gi, "$1X");
    try {
      const result = E.evaluate(source, {
        vars: { X: angle },
        ans: state.ans,
        angleUnit: "rad"
      });
      if (Math.abs(result.im) > 1e-10 || !Number.isFinite(result.re)) return null;
      return result.re;
    } catch (error) {
      return null;
    }
  }

  function parseGraphPoints() {
    const rows = String(state.graph.points || "").split(/\r?\n/);
    const points = [];
    rows.forEach((line) => {
      const text = line.trim();
      if (!text) return;
      let parts = text.split(/\s*[;\t]\s*|\s+/).filter(Boolean);
      if (parts.length < 2 && text.includes(",")) parts = text.split(",");
      if (parts.length < 2) return;
      const x = Number(String(parts[0]).replace(",", "."));
      const y = Number(String(parts[1]).replace(",", "."));
      if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
    });
    return points.slice(0, 200);
  }

  function solveGraph3(matrix, rhs) {
    const a = matrix.map((row, i) => row.slice().concat([rhs[i]]));
    for (let col = 0; col < 3; col++) {
      let pivot = col;
      for (let row = col + 1; row < 3; row++) {
        if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
      }
      if (Math.abs(a[pivot][col]) < 1e-12) return null;
      [a[col], a[pivot]] = [a[pivot], a[col]];
      const div = a[col][col];
      for (let j = col; j < 4; j++) a[col][j] /= div;
      for (let row = 0; row < 3; row++) {
        if (row === col) continue;
        const factor = a[row][col];
        for (let j = col; j < 4; j++) a[row][j] -= factor * a[col][j];
      }
    }
    return [a[0][3], a[1][3], a[2][3]];
  }

  function graphTrend(points) {
    if (!points.length || state.graph.trend === "none") return null;
    const n = points.length;
    const sx = points.reduce((sum, p) => sum + p.x, 0);
    const sy = points.reduce((sum, p) => sum + p.y, 0);
    const sxx = points.reduce((sum, p) => sum + p.x * p.x, 0);
    const sxy = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const meanY = sy / n;
    const sst = points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
    if (state.graph.trend === "linear") {
      const denominator = n * sxx - sx * sx;
      if (Math.abs(denominator) < 1e-12) return null;
      const b = (n * sxy - sx * sy) / denominator;
      const a = (sy - b * sx) / n;
      const sse = points.reduce((sum, p) => sum + Math.pow(p.y - (a + b * p.x), 2), 0);
      return {
        type: "linear",
        fn: (x) => a + b * x,
        label: `y = ${graphNumber(a)} ${b < 0 ? "−" : "+"} ${graphNumber(Math.abs(b))}x`,
        r2: sst > 0 ? 1 - sse / sst : 1
      };
    }
    if (n < 3) return null;
    const sxxx = points.reduce((sum, p) => sum + Math.pow(p.x, 3), 0);
    const sxxxx = points.reduce((sum, p) => sum + Math.pow(p.x, 4), 0);
    const sx2y = points.reduce((sum, p) => sum + p.x * p.x * p.y, 0);
    const coefficients = solveGraph3(
      [[n, sx, sxx], [sx, sxx, sxxx], [sxx, sxxx, sxxxx]],
      [sy, sxy, sx2y]
    );
    if (!coefficients) return null;
    const [a, b, c] = coefficients;
    const sse = points.reduce((sum, p) => sum + Math.pow(p.y - (a + b * p.x + c * p.x * p.x), 2), 0);
    return {
      type: "quadratic",
      fn: (x) => a + b * x + c * x * x,
      label: `y = ${graphNumber(a)} ${b < 0 ? "−" : "+"} ${graphNumber(Math.abs(b))}x ${c < 0 ? "−" : "+"} ${graphNumber(Math.abs(c))}x²`,
      r2: sst > 0 ? 1 - sse / sst : 1
    };
  }

  function graphFormMarkup() {
    const tab = state.graph.tab;
    if (tab === "points") {
      const trend = state.graph.trend;
      return `<div class="field">
          <label>Danh sách điểm <span class="sub">mỗi dòng: x; y</span></label>
          <textarea id="graphPoints" spellcheck="false" placeholder="1; 2&#10;2; 4&#10;3; 9">${escapeHtml(state.graph.points)}</textarea>
          <div class="field-hint">Dùng dấu <code>;</code> hoặc khoảng trắng giữa x và y. Có thể nhập tối đa 200 điểm.</div>
        </div>
        <div class="form-grid" style="margin-top:12px">
          <div class="field"><label>Đường xu hướng</label><select id="graphTrend">
            <option value="none" ${trend === "none" ? "selected" : ""}>Không</option>
            <option value="linear" ${trend === "linear" ? "selected" : ""}>Hồi quy tuyến tính</option>
            <option value="quadratic" ${trend === "quadratic" ? "selected" : ""}>Hồi quy bậc 2</option>
          </select></div>
          <label class="switch-line"><input type="checkbox" id="graphConnect" ${state.graph.connect ? "checked" : ""}> Nối các điểm theo thứ tự</label>
        </div>
        <div id="graphTrendInfo" class="graph-trend-info"></div>`;
    }
    if (tab === "parametric") {
      const p = state.graph.parametric;
      return `<div class="field"><label>x(t)</label><input data-graph-param="x" value="${escapeHtml(p.x)}" placeholder="cos(t)"></div>
        <div class="field" style="margin-top:9px"><label>y(t)</label><input data-graph-param="y" value="${escapeHtml(p.y)}" placeholder="sin(t)"></div>
        <div class="form-grid three" style="margin-top:12px">
          <div class="field"><label>t bắt đầu</label><input data-graph-param="tmin" value="${escapeHtml(p.tmin)}" inputmode="decimal"></div>
          <div class="field"><label>t kết thúc</label><input data-graph-param="tmax" value="${escapeHtml(p.tmax)}" inputmode="decimal"></div>
          <div class="field"><label>Bước</label><input data-graph-param="step" value="${escapeHtml(p.step)}" inputmode="decimal"></div>
        </div>
        <div class="field-hint">Có thể dùng biến <code>t</code> hoặc <code>x</code>. Ví dụ: x(t)=cos(t), y(t)=sin(t).</div>`;
    }
    if (tab === "polar") {
      const p = state.graph.polar;
      return `<div class="field"><label>r(t) <span class="sub">bán kính cực</span></label><input data-graph-polar="expr" value="${escapeHtml(p.expr)}" placeholder="2*cos(3*t)"></div>
        <div class="form-grid three" style="margin-top:12px">
          <div class="field"><label>t bắt đầu</label><input data-graph-polar="tmin" value="${escapeHtml(p.tmin)}" inputmode="decimal"></div>
          <div class="field"><label>t kết thúc</label><input data-graph-polar="tmax" value="${escapeHtml(p.tmax)}" inputmode="decimal"></div>
          <div class="field"><label>Bước</label><input data-graph-polar="step" value="${escapeHtml(p.step)}" inputmode="decimal"></div>
        </div>
        <div class="field-hint">Góc <code>t</code> luôn tính bằng radian. Ví dụ: <code>2*cos(3t)</code> (hoa hồng 3 cánh), <code>1+cos(t)</code> (cardioid), <code>t</code> (xoắn ốc).</div>`;
    }
    return `<div class="graph-function-list">${state.graph.expressions.map((row, index) => `
        <div class="graph-expr-row" style="--row-color:${row.color}">
          <span class="graph-swatch"></span>
          <span class="graph-expr-prefix">y =</span>
          <input data-graph-expr="${index}" value="${escapeHtml(row.expr)}" spellcheck="false" placeholder="${index === 0 ? "x^2 - 3" : "sin(x)"}">
          <button class="graph-mini-btn ${row.visible ? "is-on" : ""}" type="button" data-graph-visible="${index}" title="${row.visible ? "Ẩn hàm" : "Hiện hàm"}" aria-label="${row.visible ? "Ẩn hàm" : "Hiện hàm"}">${row.visible ? "●" : "○"}</button>
          <button class="graph-mini-btn" type="button" data-graph-remove="${index}" title="Xoá hàm" aria-label="Xoá hàm" ${state.graph.expressions.length <= 1 ? "disabled" : ""}>×</button>
        </div>`).join("")}</div>
      <button class="btn small ghost" type="button" data-graph-add ${state.graph.expressions.length >= 4 ? "disabled" : ""}>+ Thêm hàm</button>
      <div class="field-hint">Có thể vẽ tối đa 4 hàm. Ví dụ: <code>x^3-2x</code>, <code>sqrt(x)</code>, <code>1/x</code>.</div>`;
  }

  function graphLegendMarkup() {
    if (state.graph.tab === "points") {
      const points = parseGraphPoints();
      const trend = graphTrend(points);
      return `<span class="graph-legend-item"><span class="graph-legend-dot points"></span>${points.length} điểm</span>` +
        (state.graph.trend !== "none"
          ? `<span class="graph-legend-item"><span class="graph-legend-dash"></span>${trend ? escapeHtml(trend.label) : "Chưa đủ dữ liệu để hồi quy"}</span>`
          : "");
    }
    if (state.graph.tab === "parametric") {
      const p = state.graph.parametric;
      return `<span class="graph-legend-item"><span class="graph-legend-dot" style="background:${GRAPH_COLORS[2]}"></span>x(t)=${escapeHtml(p.x || "—")}, y(t)=${escapeHtml(p.y || "—")}</span>`;
    }
    if (state.graph.tab === "polar") {
      const p = state.graph.polar;
      return `<span class="graph-legend-item"><span class="graph-legend-dot" style="background:${GRAPH_COLORS[3]}"></span>r(t)=${escapeHtml(p.expr || "—")} · t ∈ [${escapeHtml(p.tmin)}, ${escapeHtml(p.tmax)}]</span>`;
    }
    return state.graph.expressions
      .filter((row) => row.visible && row.expr.trim())
      .map((row) => `<span class="graph-legend-item"><span class="graph-legend-dot" style="background:${row.color}"></span>y = ${escapeHtml(row.expr)}</span>`)
      .join("") || `<span class="graph-legend-empty">Bật ít nhất một hàm để vẽ đồ thị.</span>`;
  }

  function renderGraphLegend() {
    const legend = $("#graphLegend");
    if (legend) legend.innerHTML = graphLegendMarkup();
    const trendInfo = $("#graphTrendInfo");
    if (trendInfo && state.graph.tab === "points") {
      const points = parseGraphPoints();
      const trend = graphTrend(points);
      trendInfo.innerHTML = trend
        ? `<span class="graph-trend-label">HỒI QUY</span> <b>${escapeHtml(trend.label)}</b><span class="graph-r2">R² = ${formatNumericText(trend.r2)}</span>`
        : points.length < 3 && state.graph.trend === "quadratic"
          ? "Cần ít nhất 3 điểm để hồi quy bậc 2."
          : "Chưa đủ dữ liệu để tính đường xu hướng.";
    }
  }

  function syncGraphViewInputs() {
    const view = state.graph.view;
    [["graphXmin", view.xmin], ["graphXmax", view.xmax], ["graphYmin", view.ymin], ["graphYmax", view.ymax]].forEach(([id, value]) => {
      const input = $("#" + id);
      if (input && document.activeElement !== input) input.value = graphNumber(value);
    });
  }

  function scheduleGraphDraw() {
    if (graphRaf) cancelAnimationFrame(graphRaf);
    graphRaf = requestAnimationFrame(() => {
      graphRaf = 0;
      drawGraph();
    });
  }

  function graphCanvasMetrics() {
    const canvas = $("#graphCanvas");
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(220, Math.round(rect.width));
    const height = Math.max(220, Math.round(rect.height));
    return { canvas, width, height };
  }

  function drawGraph() {
    const metrics = graphCanvasMetrics();
    if (!metrics) return;
    const { canvas, width, height } = metrics;
    const view = state.graph.view;
    if (![view.xmin, view.xmax, view.ymin, view.ymax].every(Number.isFinite) || view.xmin >= view.xmax || view.ymin >= view.ymax) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, "#0d161c");
    background.addColorStop(1, "#091015");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const sx = (x) => (x - view.xmin) / (view.xmax - view.xmin) * width;
    const sy = (y) => height - (y - view.ymin) / (view.ymax - view.ymin) * height;
    const xStep = niceGraphStep(view.xmax - view.xmin, Math.max(5, Math.round(width / 80)));
    const yStep = niceGraphStep(view.ymax - view.ymin, Math.max(5, Math.round(height / 58)));

    ctx.lineWidth = 1;
    ctx.font = '11px "Segoe UI", Arial, sans-serif';
    for (let x = Math.ceil(view.xmin / xStep) * xStep, guard = 0; x <= view.xmax + xStep * 0.01 && guard < 80; x += xStep, guard++) {
      const px = sx(x);
      const isAxis = Math.abs(x) < xStep * 1e-8;
      if (state.graph.grid || isAxis) {
        ctx.strokeStyle = isAxis ? "rgba(224,236,228,0.3)" : "rgba(224,236,228,0.075)";
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, height); ctx.stroke();
      }
      if (!isAxis) {
        ctx.fillStyle = "rgba(207,220,212,0.58)";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(graphTick(x, xStep), Math.min(width - 12, Math.max(12, px)), height - 7);
      }
    }
    for (let y = Math.ceil(view.ymin / yStep) * yStep, guard = 0; y <= view.ymax + yStep * 0.01 && guard < 80; y += yStep, guard++) {
      const py = sy(y);
      const isAxis = Math.abs(y) < yStep * 1e-8;
      if (state.graph.grid || isAxis) {
        ctx.strokeStyle = isAxis ? "rgba(224,236,228,0.3)" : "rgba(224,236,228,0.075)";
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(width, py); ctx.stroke();
      }
      if (!isAxis) {
        ctx.fillStyle = "rgba(207,220,212,0.58)";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(graphTick(y, yStep), 8, Math.min(height - 10, Math.max(10, py)));
      }
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();

    if (state.graph.tab === "function") {
      state.graph.expressions.forEach((row) => {
        if (!row.visible || !row.expr.trim()) return;
        ctx.beginPath();
        const samples = Math.min(1400, Math.max(360, Math.round(width * 1.4)));
        let started = false;
        let previousY = null;
        for (let i = 0; i <= samples; i++) {
          const x = view.xmin + (view.xmax - view.xmin) * (i / samples);
          const y = graphEval(row.expr, x, false);
          if (y == null) { started = false; previousY = null; continue; }
          const px = sx(x);
          const py = sy(y);
          if (started && previousY != null && Math.abs(py - previousY) > height * 1.6) started = false;
          if (!started) { ctx.moveTo(px, py); started = true; }
          else ctx.lineTo(px, py);
          previousY = py;
        }
        ctx.strokeStyle = row.color;
        ctx.lineWidth = 2.4;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.shadowColor = row.color;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });
    } else if (state.graph.tab === "points") {
      const points = parseGraphPoints();
      const trend = graphTrend(points);
      graphLastTrend = trend;
      if (state.graph.connect && points.length > 1) {
        ctx.beginPath();
        points.forEach((point, index) => {
          const px = sx(point.x), py = sy(point.y);
          if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = "rgba(242,165,68,0.48)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      if (trend) {
        const minX = Math.min(...points.map((p) => p.x));
        const maxX = Math.max(...points.map((p) => p.x));
        const span = Math.max(1e-9, maxX - minX);
        ctx.beginPath();
        for (let i = 0; i <= 180; i++) {
          const x = minX - span * 0.08 + span * 1.16 * (i / 180);
          const y = trend.fn(x);
          if (!Number.isFinite(y)) continue;
          if (i === 0) ctx.moveTo(sx(x), sy(y)); else ctx.lineTo(sx(x), sy(y));
        }
        ctx.strokeStyle = "#64c6b4";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      points.forEach((point, index) => {
        const px = sx(point.x), py = sy(point.y);
        ctx.beginPath();
        ctx.arc(px, py, 4.6, 0, Math.PI * 2);
        ctx.fillStyle = "#f2a544";
        ctx.shadowColor = "#f2a544";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = "#f8f2e6";
        ctx.stroke();
        ctx.fillStyle = "rgba(235,242,236,0.72)";
        ctx.font = '10px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(`P${index + 1}`, px, py - 8);
      });
    } else if (state.graph.tab === "parametric") {
      const p = state.graph.parametric;
      const tmin = Number(p.tmin), tmax = Number(p.tmax), step = Number(p.step);
      if ([tmin, tmax, step].every(Number.isFinite) && tmax > tmin && step > 0) {
        const total = Math.min(5000, Math.max(20, Math.ceil((tmax - tmin) / step)));
        let started = false;
        ctx.beginPath();
        for (let i = 0; i <= total; i++) {
          const t = tmin + (tmax - tmin) * (i / total);
          const x = graphEval(p.x, t, true);
          const y = graphEval(p.y, t, true);
          if (x == null || y == null) { started = false; continue; }
          const px = sx(x), py = sy(y);
          if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = GRAPH_COLORS[2];
        ctx.lineWidth = 2.5;
        ctx.shadowColor = GRAPH_COLORS[2];
        ctx.shadowBlur = 7;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    } else if (state.graph.tab === "polar") {
      const p = state.graph.polar;
      const tmin = Number(p.tmin), tmax = Number(p.tmax), step = Number(p.step);
      if ([tmin, tmax, step].every(Number.isFinite) && tmax > tmin && step > 0) {
        const total = Math.min(6000, Math.max(60, Math.ceil((tmax - tmin) / step)));
        let started = false;
        let previousPx = null, previousPy = null;
        ctx.beginPath();
        for (let i = 0; i <= total; i++) {
          const t = tmin + (tmax - tmin) * (i / total);
          const radius = graphEvalPolar(p.expr, t);
          if (radius == null) { started = false; previousPx = previousPy = null; continue; }
          const x = radius * Math.cos(t);
          const y = radius * Math.sin(t);
          const px = sx(x), py = sy(y);
          if (started && previousPx != null && Math.hypot(px - previousPx, py - previousPy) > Math.max(width, height) * 1.4) started = false;
          if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
          previousPx = px;
          previousPy = py;
        }
        ctx.strokeStyle = GRAPH_COLORS[3];
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.shadowColor = GRAPH_COLORS[3];
        ctx.shadowBlur = 7;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    if (graphHoverPoint && !graphDragState) {
      const px = graphHoverPoint.x;
      const py = graphHoverPoint.y;
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = "rgba(242,165,68,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, height); ctx.stroke();
      ctx.setLineDash([]);
      if (state.graph.tab === "function") {
        const row = state.graph.expressions.find((entry) => entry.visible && entry.expr.trim());
        if (row) {
          const x = view.xmin + px / width * (view.xmax - view.xmin);
          const y = graphEval(row.expr, x, false);
          if (y != null) {
            const pyValue = sy(y);
            ctx.beginPath(); ctx.arc(px, pyValue, 4, 0, Math.PI * 2);
            ctx.fillStyle = row.color; ctx.fill();
            ctx.strokeStyle = "#f7f2e7"; ctx.stroke();
          }
        }
      } else if (state.graph.tab === "points") {
        const points = parseGraphPoints();
        let best = null;
        points.forEach((point) => {
          const distance = Math.hypot(sx(point.x) - px, sy(point.y) - py);
          if (!best || distance < best.distance) best = { point, distance };
        });
        if (best && best.distance < 24) {
          ctx.beginPath(); ctx.arc(sx(best.point.x), sy(best.point.y), 9, 0, Math.PI * 2);
          ctx.strokeStyle = "#f2a544"; ctx.lineWidth = 2; ctx.stroke();
        }
      }
    }
    ctx.restore();

    if (state.graph.tab === "points") graphLastTrend = graphTrend(parseGraphPoints());
  }

  function graphReadoutFor(px, py) {
    const metrics = graphCanvasMetrics();
    if (!metrics) return "Kéo để di chuyển · Lăn chuột để thu phóng";
    const view = state.graph.view;
    const x = view.xmin + px / metrics.width * (view.xmax - view.xmin);
    if (state.graph.tab === "points") {
      const points = parseGraphPoints();
      let best = null;
      points.forEach((point) => {
        const distance = Math.hypot((point.x - view.xmin) / (view.xmax - view.xmin) * metrics.width - px, (view.ymax - point.y) / (view.ymax - view.ymin) * metrics.height - py);
        if (!best || distance < best.distance) best = { point, distance };
      });
      if (best && best.distance < 28) return `P${points.indexOf(best.point) + 1} · (${graphNumber(best.point.x)}; ${graphNumber(best.point.y)})`;
    }
    if (state.graph.tab === "function") {
      const row = state.graph.expressions.find((entry) => entry.visible && entry.expr.trim());
      if (row) {
        const y = graphEval(row.expr, x, false);
        if (y != null) return `x = ${graphNumber(x)} · y = ${graphNumber(y)}`;
      }
    }
    const y = view.ymax - py / metrics.height * (view.ymax - view.ymin);
    return `x = ${graphNumber(x)} · y = ${graphNumber(y)}`;
  }

  function graphZoom(factor, centerX, centerY) {
    const metrics = graphCanvasMetrics();
    const view = state.graph.view;
    let cx = centerX, cy = centerY;
    if (cx == null) cx = (view.xmin + view.xmax) / 2;
    if (cy == null) cy = (view.ymin + view.ymax) / 2;
    if (metrics && centerX != null && centerY != null) {
      cx = view.xmin + centerX / metrics.width * (view.xmax - view.xmin);
      cy = view.ymax - centerY / metrics.height * (view.ymax - view.ymin);
    }
    const rx = (view.xmax - view.xmin) * factor;
    const ry = (view.ymax - view.ymin) * factor;
    if (!Number.isFinite(rx) || !Number.isFinite(ry) || rx < 1e-8 || ry < 1e-8 || rx > 1e8 || ry > 1e8) return;
    state.graph.view = {
      xmin: cx - rx / 2, xmax: cx + rx / 2,
      ymin: cy - ry / 2, ymax: cy + ry / 2
    };
    syncGraphViewInputs();
    scheduleGraphDraw();
    updateGraphValueTable();
  }

  function graphFitY() {
    const view = state.graph.view;
    const values = [];
    if (state.graph.tab === "function") {
      state.graph.expressions.forEach((row) => {
        if (!row.visible || !row.expr.trim()) return;
        for (let i = 0; i <= 160; i++) {
          const y = graphEval(row.expr, view.xmin + (view.xmax - view.xmin) * (i / 160), false);
          if (y != null) values.push(y);
        }
      });
    } else if (state.graph.tab === "points") {
      parseGraphPoints().forEach((point) => values.push(point.y));
    } else if (state.graph.tab === "parametric") {
      const p = state.graph.parametric;
      const tmin = Number(p.tmin), tmax = Number(p.tmax);
      if (Number.isFinite(tmin) && Number.isFinite(tmax) && tmax > tmin) {
        for (let i = 0; i <= 180; i++) {
          const y = graphEval(p.y, tmin + (tmax - tmin) * (i / 180), true);
          if (y != null) values.push(y);
        }
      }
    } else {
      const p = state.graph.polar;
      const tmin = Number(p.tmin), tmax = Number(p.tmax);
      if (Number.isFinite(tmin) && Number.isFinite(tmax) && tmax > tmin) {
        for (let i = 0; i <= 240; i++) {
          const t = tmin + (tmax - tmin) * (i / 240);
          const radius = graphEvalPolar(p.expr, t);
          if (radius != null) values.push(radius * Math.sin(t));
        }
      }
    }
    if (!values.length) return;
    let min = Math.min(...values), max = Math.max(...values);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return;
    if (max - min < 1e-9) { min -= 1; max += 1; }
    const margin = (max - min) * 0.14;
    state.graph.view.ymin = min - margin;
    state.graph.view.ymax = max + margin;
    syncGraphViewInputs();
    scheduleGraphDraw();
    updateGraphValueTable();
  }

  function updateGraphValueTable() {
    const target = $("#graphValueTable");
    if (!target) return;
    if (state.graph.tab === "polar") {
      const p = state.graph.polar;
      const tmin = Number(p.tmin), tmax = Number(p.tmax);
      if (!p.expr.trim() || !Number.isFinite(tmin) || !Number.isFinite(tmax) || tmax <= tmin) {
        target.innerHTML = `<div class="result-empty">Nhập r(t) và khoảng t hợp lệ để xem bảng giá trị.</div>`;
        return;
      }
      const rows = [];
      for (let i = 0; i <= 8; i++) {
        const t = tmin + (tmax - tmin) * (i / 8);
        const radius = graphEvalPolar(p.expr, t);
        rows.push(`<tr><td>${formatNumericText(t)}</td><td>${radius == null ? "—" : formatNumericText(radius)}</td></tr>`);
      }
      target.innerHTML = `<table class="data-table"><thead><tr><th>t (rad)</th><th>r(t)</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
      return;
    }
    let expr = "";
    if (state.graph.tab === "function") {
      const row = state.graph.expressions.find((entry) => entry.visible && entry.expr.trim());
      expr = row ? row.expr : "";
    }
    if (!expr) {
      target.innerHTML = `<div class="result-empty">Bật một hàm số để xem bảng giá trị nhanh.</div>`;
      return;
    }
    const view = state.graph.view;
    const rows = [];
    for (let i = 0; i <= 8; i++) {
      const x = view.xmin + (view.xmax - view.xmin) * (i / 8);
      const y = graphEval(expr, x, false);
      rows.push(`<tr><td>${formatNumericText(x)}</td><td>${y == null ? "—" : formatNumericText(y)}</td></tr>`);
    }
    target.innerHTML = `<table class="data-table"><thead><tr><th>x</th><th>f(x)</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
  }

  function bindGraphControls(root) {
    $$("[data-graph-tab]", root).forEach((button) => {
      button.addEventListener("click", () => {
        state.graph.tab = button.dataset.graphTab;
        openGraphWorkspace();
      });
    });
    $$("[data-graph-expr]", root).forEach((input) => {
      input.addEventListener("input", () => {
        const index = Number(input.dataset.graphExpr);
        if (state.graph.expressions[index]) state.graph.expressions[index].expr = input.value;
        renderGraphLegend();
        updateGraphValueTable();
        scheduleGraphDraw();
      });
    });
    $$("[data-graph-visible]", root).forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.graphVisible);
        const row = state.graph.expressions[index];
        if (!row) return;
        row.visible = !row.visible;
        button.classList.toggle("is-on", row.visible);
        button.textContent = row.visible ? "●" : "○";
        button.title = row.visible ? "Ẩn hàm" : "Hiện hàm";
        renderGraphLegend();
        updateGraphValueTable();
        scheduleGraphDraw();
      });
    });
    $$("[data-graph-remove]", root).forEach((button) => {
      button.addEventListener("click", () => {
        if (state.graph.expressions.length <= 1) return;
        state.graph.expressions.splice(Number(button.dataset.graphRemove), 1);
        openGraphWorkspace();
      });
    });
    const add = $("[data-graph-add]", root);
    if (add) add.addEventListener("click", () => {
      if (state.graph.expressions.length >= 4) return;
      const used = new Set(state.graph.expressions.map((row) => row.color));
      const color = GRAPH_COLORS.find((entry) => !used.has(entry)) || GRAPH_COLORS[state.graph.expressions.length % GRAPH_COLORS.length];
      state.graph.expressions.push({ expr: "", color, visible: true });
      graphFocusIndex = state.graph.expressions.length - 1;
      openGraphWorkspace();
    });
    const points = $("#graphPoints", root);
    if (points) points.addEventListener("input", () => {
      state.graph.points = points.value;
      renderGraphLegend();
      scheduleGraphDraw();
    });
    const trend = $("#graphTrend", root);
    if (trend) trend.addEventListener("change", () => {
      state.graph.trend = trend.value;
      renderGraphLegend();
      scheduleGraphDraw();
    });
    const connect = $("#graphConnect", root);
    if (connect) connect.addEventListener("change", () => {
      state.graph.connect = connect.checked;
      scheduleGraphDraw();
    });
    $$("[data-graph-param]", root).forEach((input) => {
      input.addEventListener("input", () => {
        state.graph.parametric[input.dataset.graphParam] = input.value;
        renderGraphLegend();
        scheduleGraphDraw();
      });
    });
    $$("[data-graph-polar]", root).forEach((input) => {
      input.addEventListener("input", () => {
        state.graph.polar[input.dataset.graphPolar] = input.value;
        renderGraphLegend();
        updateGraphValueTable();
        scheduleGraphDraw();
      });
    });
    const grid = $("#graphGrid", root);
    if (grid) grid.addEventListener("change", () => {
      state.graph.grid = grid.checked;
      scheduleGraphDraw();
    });
    $$("[data-graph-zoom]", root).forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.graphZoom;
        if (action === "in") graphZoom(0.78);
        else if (action === "out") graphZoom(1.28);
        else if (action === "reset") {
          state.graph.view = { xmin: -10, xmax: 10, ymin: -6, ymax: 6 };
          syncGraphViewInputs();
          scheduleGraphDraw();
          updateGraphValueTable();
        } else if (action === "fit") graphFitY();
      });
    });
    const applyView = $("#graphApplyView", root);
    if (applyView) applyView.addEventListener("click", () => {
      const values = {
        xmin: Number($("#graphXmin", root).value), xmax: Number($("#graphXmax", root).value),
        ymin: Number($("#graphYmin", root).value), ymax: Number($("#graphYmax", root).value)
      };
      if (!Object.values(values).every(Number.isFinite) || values.xmin >= values.xmax || values.ymin >= values.ymax) {
        showToast("Khung nhìn không hợp lệ: cần xmin < xmax và ymin < ymax.", "is-error");
        return;
      }
      if (Math.abs(values.xmax - values.xmin) > 1e8 || Math.abs(values.ymax - values.ymin) > 1e8) {
        showToast("Khung nhìn quá lớn để vẽ chính xác.", "is-error");
        return;
      }
      state.graph.view = values;
      scheduleGraphDraw();
      updateGraphValueTable();
    });
    const exportButton = $("#graphExport", root);
    if (exportButton) exportButton.addEventListener("click", () => {
      const canvas = $("#graphCanvas");
      if (!canvas) return;
      try {
        const link = document.createElement("a");
        link.download = "nigsio-do-thi.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
        showToast("Đã xuất ảnh đồ thị.");
      } catch (error) {
        showToast("Trình duyệt không cho phép xuất ảnh.", "is-error");
      }
    });

    const canvas = $("#graphCanvas", root);
    if (canvas) {
      canvas.addEventListener("pointerdown", (event) => {
        if (event.button != null && event.button !== 0) return;
        const rect = canvas.getBoundingClientRect();
        graphDragState = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          view: Object.assign({}, state.graph.view)
        };
        graphHoverPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        canvas.classList.add("is-dragging");
        try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* bỏ qua */ }
        event.preventDefault();
      });
      canvas.addEventListener("pointermove", (event) => {
        const rect = canvas.getBoundingClientRect();
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        if (graphDragState) {
          const view = graphDragState.view;
          const dx = event.clientX - graphDragState.startX;
          const dy = event.clientY - graphDragState.startY;
          const rx = view.xmax - view.xmin;
          const ry = view.ymax - view.ymin;
          state.graph.view = {
            xmin: view.xmin - dx / rect.width * rx,
            xmax: view.xmax - dx / rect.width * rx,
            ymin: view.ymin + dy / rect.height * ry,
            ymax: view.ymax + dy / rect.height * ry
          };
          syncGraphViewInputs();
          scheduleGraphDraw();
        } else {
          graphHoverPoint = { x: px, y: py };
          const readout = $("#graphReadout");
          if (readout) readout.textContent = graphReadoutFor(px, py);
          scheduleGraphDraw();
        }
      });
      const endDrag = (event) => {
        if (!graphDragState) return;
        graphDragState = null;
        canvas.classList.remove("is-dragging");
        try { canvas.releasePointerCapture(event.pointerId); } catch (error) { /* bỏ qua */ }
        syncGraphViewInputs();
        scheduleGraphDraw();
        updateGraphValueTable();
      };
      canvas.addEventListener("pointerup", endDrag);
      canvas.addEventListener("pointercancel", endDrag);
      canvas.addEventListener("pointerleave", () => {
        if (graphDragState) return;
        graphHoverPoint = null;
        const readout = $("#graphReadout");
        if (readout) readout.textContent = "Kéo để di chuyển · Lăn chuột để thu phóng";
        scheduleGraphDraw();
      });
      canvas.addEventListener("wheel", (event) => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        graphZoom(event.deltaY > 0 ? 1.16 : 0.86, event.clientX - rect.left, event.clientY - rect.top);
      }, { passive: false });
    }
  }

  function openGraphWorkspace() {
    closeModal();
    if (!["function", "points", "parametric", "polar"].includes(state.graph.tab)) state.graph.tab = "function";
    const active = state.graph.tab;
    const tabs = [["function", "Hàm số"], ["points", "Điểm & hồi quy"], ["parametric", "Tham số"], ["polar", "Cực r(t)"]];
    const body = `<p class="workspace-lead">Khám phá đồ thị trực quan: vẽ tối đa bốn hàm số, dựng biểu đồ điểm kèm đường hồi quy, vẽ đường tham số hoặc đường cong cực r(t). Kéo nền để di chuyển, lăn chuột để thu phóng.</p>
      <div class="graph-layout">
        <aside class="graph-side">
          <div class="segmented graph-tabs">${tabs.map(([id, label]) => `<button class="seg-btn ${active === id ? "is-active" : ""}" type="button" data-graph-tab="${id}">${label}</button>`).join("")}</div>
          <div class="graph-form">${graphFormMarkup()}</div>
          <div class="graph-options">
            <label class="switch-line"><input type="checkbox" id="graphGrid" ${state.graph.grid ? "checked" : ""}> Hiện lưới toạ độ</label>
            <button class="btn tiny ghost" type="button" id="graphExport">Xuất PNG</button>
          </div>
        </aside>
        <section class="graph-stage">
          <div class="graph-stage-bar">
            <span id="graphReadout" class="graph-readout">Kéo để di chuyển · Lăn chuột để thu phóng</span>
            <div class="graph-zoom-group">
              <button class="graph-zoom-btn" type="button" data-graph-zoom="out" title="Thu nhỏ">−</button>
              <button class="graph-zoom-btn" type="button" data-graph-zoom="in" title="Phóng to">＋</button>
              <button class="graph-zoom-btn wide" type="button" data-graph-zoom="fit" title="Vừa khung theo trục y">Vừa khung</button>
              <button class="graph-zoom-btn" type="button" data-graph-zoom="reset" title="Về khung mặc định">↺</button>
            </div>
          </div>
          <div class="graph-canvas-wrap"><canvas id="graphCanvas" aria-label="Đồ thị"></canvas></div>
          <div id="graphLegend" class="graph-legend"></div>
          <div class="graph-view-grid">
            <div class="field"><label>Xmin</label><input id="graphXmin" inputmode="decimal"></div>
            <div class="field"><label>Xmax</label><input id="graphXmax" inputmode="decimal"></div>
            <div class="field"><label>Ymin</label><input id="graphYmin" inputmode="decimal"></div>
            <div class="field"><label>Ymax</label><input id="graphYmax" inputmode="decimal"></div>
            <button class="btn small ghost" type="button" id="graphApplyView">Áp dụng</button>
          </div>
          <details class="graph-values">
            <summary>Bảng giá trị nhanh</summary>
            <div id="graphValueTable"></div>
          </details>
          <p class="graph-tip">Mẹo: bấm vào một hàm để sửa; dùng <b>Vừa khung</b> để tự chọn trục y theo dữ liệu đang vẽ.</p>
        </section>
      </div>`;
    openModal({
      title: "Đồ thị & điểm",
      kicker: "GRAPH LAB · HÀM SỐ, ĐIỂM, THAM SỐ, CỰC",
      icon: "graph",
      wide: true,
      className: "graph-modal",
      body,
      onMount(root) {
        if (graphResizeObserver) { graphResizeObserver.disconnect(); graphResizeObserver = null; }
        bindGraphControls(root);
        syncGraphViewInputs();
        const canvas = $("#graphCanvas", root);
        if (canvas && "ResizeObserver" in window) {
          graphResizeObserver = new ResizeObserver(() => scheduleGraphDraw());
          graphResizeObserver.observe(canvas);
        }
        renderGraphLegend();
        updateGraphValueTable();
        drawGraph();
        requestAnimationFrame(() => drawGraph());
        window.setTimeout(() => {
          if (graphFocusIndex < 0) return;
          const input = root.querySelector(`[data-graph-expr="${graphFocusIndex}"]`);
          graphFocusIndex = -1;
          if (input) input.focus({ preventScroll: true });
        }, 130);
      }
    });
  }

  /* ============================================================
   * CÔNG CỤ MỞ RỘNG: XÁC SUẤT
   * ============================================================ */
  const probabilityState = {
    tab: "comb",
    n: "10", r: "3",
    pa: "0.5", pb: "0.4", pab: "0.2",
    prior: "0.01", sens: "0.95", fpr: "0.05",
    bn: "10", bp: "0.5", bk: "3"
  };

  function probPercent(value) {
    if (!Number.isFinite(value)) return "—";
    const pct = value * 100;
    const digits = Math.abs(pct) < 0.01 && pct !== 0 ? 4 : Math.abs(pct) < 1 ? 2 : 2;
    return `${Number(pct.toFixed(digits))}%`;
  }

  function probMetric(label, value, accent) {
    if (!Number.isFinite(value)) return metric(label, "—", accent);
    return metric(label, `${probPercent(value)} <small class="prob-decimal">${graphNumber(value)}</small>`, accent);
  }

  function probabilityBar(label, value, color) {
    const width = Math.max(0, Math.min(100, Number.isFinite(value) ? value * 100 : 0));
    return `<div class="prob-bar-row"><span>${escapeHtml(label)}</span><div class="prob-bar-track"><i style="width:${width}%;background:${color}"></i></div><b>${probPercent(value)}</b></div>`;
  }

  function parseProbability(value, label) {
    const number = Number(String(value).replace(",", "."));
    if (!Number.isFinite(number) || number < 0 || number > 1) {
      throw { code: "Argument ERROR", detail: `${label} phải nằm trong khoảng 0 đến 1.` };
    }
    return number;
  }

  function probabilityFormMarkup() {
    const tab = probabilityState.tab;
    if (tab === "events") {
      return `<div class="form-grid three">
          <div class="field"><label>P(A)</label><input data-prob="pa" value="${escapeHtml(probabilityState.pa)}" inputmode="decimal"></div>
          <div class="field"><label>P(B)</label><input data-prob="pb" value="${escapeHtml(probabilityState.pb)}" inputmode="decimal"></div>
          <div class="field"><label>P(A ∩ B)</label><input data-prob="pab" value="${escapeHtml(probabilityState.pab)}" inputmode="decimal"></div>
        </div>
        <div class="field-hint">Nhập xác suất dưới dạng thập phân, ví dụ <code>0.35</code>. Có thể dùng dấu phẩy thập phân.</div>`;
    }
    if (tab === "bayes") {
      return `<div class="form-grid three">
          <div class="field"><label>P(A) <span class="sub">tiền nghiệm</span></label><input data-prob="prior" value="${escapeHtml(probabilityState.prior)}" inputmode="decimal"></div>
          <div class="field"><label>P(B|A) <span class="sub">độ nhạy</span></label><input data-prob="sens" value="${escapeHtml(probabilityState.sens)}" inputmode="decimal"></div>
          <div class="field"><label>P(B|¬A) <span class="sub">dương tính giả</span></label><input data-prob="fpr" value="${escapeHtml(probabilityState.fpr)}" inputmode="decimal"></div>
        </div>
        <div class="field-hint">Dùng công thức Bayes để cập nhật xác suất sau khi quan sát bằng chứng B.</div>`;
    }
    if (tab === "binom") {
      return `<div class="form-grid three">
          <div class="field"><label>Số phép thử n</label><input data-prob="bn" value="${escapeHtml(probabilityState.bn)}" inputmode="numeric"></div>
          <div class="field"><label>Xác suất thành công p</label><input data-prob="bp" value="${escapeHtml(probabilityState.bp)}" inputmode="decimal"></div>
          <div class="field"><label>Số lần thành công k</label><input data-prob="bk" value="${escapeHtml(probabilityState.bk)}" inputmode="numeric"></div>
        </div>
        <div class="field-hint">X ~ B(n, p). Kết quả gồm P(X = k), P(X ≤ k), P(X &gt; k), kỳ vọng và độ lệch chuẩn.</div>`;
    }
    return `<div class="form-grid">
        <div class="field"><label>Số phần tử n</label><input data-prob="n" value="${escapeHtml(probabilityState.n)}" inputmode="numeric"></div>
        <div class="field"><label>Chọn r phần tử</label><input data-prob="r" value="${escapeHtml(probabilityState.r)}" inputmode="numeric"></div>
      </div>
      <div class="field-hint">Tính hoán vị, chỉnh hợp, tổ hợp và hệ số khai triển nhị thức. Điều kiện: 0 ≤ r ≤ n ≤ 170.</div>`;
  }

  function probabilityResultMarkup() {
    try {
      if (probabilityState.tab === "comb") {
        const n = Math.trunc(Number(probabilityState.n));
        const r = Math.trunc(Number(probabilityState.r));
        if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n || n > 170) {
          throw { code: "Argument ERROR", detail: "Cần 0 ≤ r ≤ n ≤ 170." };
        }
        const nPr = E.nPr(n, r);
        const nCr = E.nCr(n, r);
        const factorial = E.factorial(n);
        const coefficients = n <= 20
          ? Array.from({ length: n + 1 }, (_, k) => E.nCr(n, k))
          : [];
        return card(`TỔ HỢP · C(${n}, ${r})`, formatNumericText(nCr), `${formatNumericText(nPr)} chỉnh hợp · ${formatNumericText(factorial)} hoán vị`) +
          `<div class="metric-grid">
            ${metric("Chỉnh hợp P(n,r)", formatNumericText(nPr), true)}
            ${metric("Tổ hợp C(n,r)", formatNumericText(nCr), true)}
            ${metric("n!", formatNumericText(factorial))}
            ${metric("r!", formatNumericText(E.factorial(r)))}
            ${metric("(n−r)!", formatNumericText(E.factorial(n - r)))}
          </div>
          ${coefficients.length ? `<div class="prob-coefficients"><span>Hệ số (a+b)<sup>${n}</sup></span><div>${coefficients.map((value, index) => `<span title="C(${n}, ${index})">${formatNumericText(value)}</span>`).join("")}</div></div>` : ""}`;
      }
      if (probabilityState.tab === "events") {
        const pa = parseProbability(probabilityState.pa, "P(A)");
        const pb = parseProbability(probabilityState.pb, "P(B)");
        const pab = parseProbability(probabilityState.pab, "P(A ∩ B)");
        if (pab > Math.min(pa, pb) + 1e-10) {
          throw { code: "Argument ERROR", detail: "P(A ∩ B) không thể lớn hơn P(A) hoặc P(B)." };
        }
        const union = Math.max(0, Math.min(1, pa + pb - pab));
        const pAGivenB = pb > 0 ? pab / pb : NaN;
        const pBGivenA = pa > 0 ? pab / pa : NaN;
        const independent = Math.abs(pab - pa * pb) < 1e-9;
        return card("XÁC SUẤT BIẾN CỐ", probPercent(union), `P(A ∪ B) = P(A) + P(B) − P(A ∩ B)`) +
          `<div class="metric-grid">
            ${probMetric("P(A)", pa)}
            ${probMetric("P(B)", pb)}
            ${probMetric("P(A ∩ B)", pab)}
            ${probMetric("P(A ∪ B)", union, true)}
            ${probMetric("P(A | B)", pAGivenB)}
            ${probMetric("P(B | A)", pBGivenA)}
            ${probMetric("P(¬A)", 1 - pa)}
            ${probMetric("P(¬B)", 1 - pb)}
          </div>
          <div class="prob-bars">
            ${probabilityBar("A", pa, "#f2a544")}
            ${probabilityBar("B", pb, "#64c6b4")}
            ${probabilityBar("A ∪ B", union, "#7fa6ff")}
          </div>
          <div class="notice ${independent ? "success" : ""}"><span class="notice-icon">${independent ? "✓" : "i"}</span><span>${independent ? "Hai biến cố độc lập vì P(A ∩ B) = P(A)·P(B)." : "Hai biến cố không độc lập vì P(A ∩ B) ≠ P(A)·P(B)."}</span></div>`;
      }
      if (probabilityState.tab === "bayes") {
        const prior = parseProbability(probabilityState.prior, "P(A)");
        const sensitivity = parseProbability(probabilityState.sens, "P(B|A)");
        const falsePositive = parseProbability(probabilityState.fpr, "P(B|¬A)");
        const evidence = prior * sensitivity + (1 - prior) * falsePositive;
        if (evidence <= 0) throw { code: "Math ERROR", detail: "P(B) = 0 nên không thể tính xác suất hậu nghiệm." };
        const posterior = prior * sensitivity / evidence;
        return card("XÁC SUẤT HẬU NGHIỆM", probPercent(posterior), `P(A|B) cập nhật từ bằng chứng B`) +
          `<div class="metric-grid">
            ${probMetric("P(A)", prior)}
            ${probMetric("P(B|A)", sensitivity)}
            ${probMetric("P(B|¬A)", falsePositive)}
            ${probMetric("P(B)", evidence)}
            ${probMetric("P(A|B)", posterior, true)}
            ${probMetric("P(¬A|B)", 1 - posterior)}
          </div>
          <div class="prob-formula"><span>Công thức Bayes</span><code>P(A|B) = P(A)·P(B|A) / [P(A)·P(B|A) + P(¬A)·P(B|¬A)]</code></div>
          <div class="notice"><span class="notice-icon">i</span><span>Kể cả khi độ nhạy cao, xác suất hậu nghiệm vẫn phụ thuộc mạnh vào tỉ lệ tiền nghiệm P(A).</span></div>`;
      }
      const n = Math.trunc(Number(probabilityState.bn));
      const p = parseProbability(probabilityState.bp, "p");
      const k = Math.trunc(Number(probabilityState.bk));
      if (!Number.isInteger(n) || n < 1 || n > 200 || !Number.isInteger(k) || k < 0 || k > n) {
        throw { code: "Argument ERROR", detail: "Cần 1 ≤ n ≤ 200 và 0 ≤ k ≤ n." };
      }
      const pmf = E.binomialPmf(k, n, p);
      const cdf = E.binomialCdf(k, n, p);
      const greater = Math.max(0, 1 - cdf);
      const atLeast = k > 0 ? Math.max(0, 1 - E.binomialCdf(k - 1, n, p)) : 1;
      const mean = n * p;
      const variance = n * p * (1 - p);
      return card(`NHỊ THỨC · P(X = ${k})`, probPercent(pmf), `X ~ B(${n}; ${graphNumber(p)})`) +
        `<div class="metric-grid">
          ${probMetric(`P(X = ${k})`, pmf, true)}
          ${probMetric(`P(X ≤ ${k})`, cdf)}
          ${probMetric(`P(X ≥ ${k})`, atLeast)}
          ${probMetric(`P(X > ${k})`, greater)}
          ${metric("Kỳ vọng", formatNumericText(mean))}
          ${metric("Phương sai", formatNumericText(variance))}
          ${metric("Độ lệch chuẩn", formatNumericText(Math.sqrt(variance)))}
        </div>
        ${chartSvg("binomial", { n, p }, k)}`;
    } catch (error) {
      return errorBox(error);
    }
  }

  function openProbabilityWorkspace(tab) {
    closeModal();
    if (tab) probabilityState.tab = tab;
    if (!["comb", "events", "bayes", "binom"].includes(probabilityState.tab)) probabilityState.tab = "comb";
    const tabs = [["comb", "Tổ hợp"], ["events", "Biến cố"], ["bayes", "Bayes"], ["binom", "Nhị thức"]];
    const lead = probabilityState.tab === "comb"
      ? "Tính hoán vị, chỉnh hợp, tổ hợp và xem hệ số khai triển nhị thức. Kết quả cập nhật ngay khi nhập."
      : probabilityState.tab === "events"
        ? "Tính xác suất hợp, giao, phần bù và xác suất có điều kiện của hai biến cố A, B."
        : probabilityState.tab === "bayes"
          ? "Cập nhật xác suất tiền nghiệm bằng công thức Bayes khi quan sát bằng chứng B."
          : "Tính xác suất phân phối nhị thức, xác suất tích luỹ, kỳ vọng và độ lệch chuẩn.";
    const body = `<p class="workspace-lead">${lead}</p>
      <div class="segmented prob-tabs">${tabs.map(([id, label]) => `<button class="seg-btn ${probabilityState.tab === id ? "is-active" : ""}" type="button" data-prob-tab="${id}">${label}</button>`).join("")}</div>
      <div class="prob-form">${probabilityFormMarkup()}</div>
      <div id="probabilityResults" class="prob-results">${probabilityResultMarkup()}</div>
      <div class="button-row between">
        <span class="tiny-label">Xác suất nhập theo dạng 0–1; kết quả hiển thị cả phần trăm.</span>
        <button class="btn ghost small" type="button" data-close-modal>Đóng</button>
      </div>`;
    openModal({
      title: "Xác suất & tổ hợp",
      kicker: "PROBABILITY LAB · XÁC SUẤT",
      icon: "probability",
      wide: true,
      body,
      onMount(root) {
        $$("[data-prob-tab]", root).forEach((button) => {
          button.addEventListener("click", () => openProbabilityWorkspace(button.dataset.probTab));
        });
        $$("[data-prob]", root).forEach((input) => {
          input.addEventListener("input", () => {
            probabilityState[input.dataset.prob] = input.value;
            const results = $("#probabilityResults", root);
            if (results) results.innerHTML = probabilityResultMarkup();
          });
        });
        const results = $("#probabilityResults", root);
        if (results && probabilityState.tab === "binom") {
          results.querySelectorAll("[data-copy-result]").forEach((button) => button.addEventListener("click", () => copyText(results.innerText)));
        }
      }
    });
  }

  /* ============================================================
   * CÔNG CỤ MỞ RỘNG: SỐ HỌC
   * ============================================================ */
  const numberState = {
    tab: "factor", n: "360", a: "12", b: "18",
    base: "2", exponent: "10", modulus: "1000"
  };

  function numberFactorize(value) {
    let n = Math.trunc(Number(value));
    if (!Number.isSafeInteger(n) || n < 2 || n > 1e12) {
      throw { code: "Argument ERROR", detail: "Cần số nguyên n trong khoảng 2 đến 10¹²." };
    }
    const factors = [];
    let rest = n;
    for (let p = 2; p * p <= rest; p += p === 2 ? 1 : 2) {
      if (rest % p !== 0) continue;
      let exponent = 0;
      while (rest % p === 0) { rest /= p; exponent++; }
      factors.push({ p, e: exponent });
    }
    if (rest > 1) factors.push({ p: rest, e: 1 });
    return { n, factors };
  }

  function numberDivisors(factors) {
    let divisors = [1];
    factors.forEach(({ p, e }) => {
      const existing = divisors.slice();
      let power = 1;
      for (let k = 1; k <= e; k++) {
        power *= p;
        existing.forEach((value) => divisors.push(value * power));
      }
    });
    return divisors.sort((a, b) => a - b);
  }

  function bigIntParse(value, label) {
    const text = String(value).trim().replace(/\s+/g, "");
    if (!/^-?\d+$/.test(text)) throw { code: "Argument ERROR", detail: `${label} phải là số nguyên.` };
    return BigInt(text);
  }

  function bigIntModPow(base, exponent, modulus) {
    if (modulus <= 0n) throw { code: "Math ERROR", detail: "Modulo phải lớn hơn 0." };
    if (exponent < 0n) throw { code: "Math ERROR", detail: "Số mũ modulo phải không âm." };
    let result = 1n;
    let b = ((base % modulus) + modulus) % modulus;
    let e = exponent;
    while (e > 0n) {
      if (e & 1n) result = (result * b) % modulus;
      b = (b * b) % modulus;
      e >>= 1n;
    }
    return result;
  }

  function bigIntModInverse(value, modulus) {
    if (modulus <= 1n) return null;
    let oldR = ((value % modulus) + modulus) % modulus;
    let r = modulus;
    let oldS = 1n, s = 0n;
    while (r !== 0n) {
      const q = oldR / r;
      [oldR, r] = [r, oldR - q * r];
      [oldS, s] = [s, oldS - q * s];
    }
    if (oldR !== 1n) return null;
    return ((oldS % modulus) + modulus) % modulus;
  }

  function numberResultMarkup() {
    try {
      if (numberState.tab === "arith") {
        const a = Number(numberState.a), b = Number(numberState.b);
        if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a === 0 || b === 0) {
          throw { code: "Argument ERROR", detail: "a và b phải là số nguyên khác 0." };
        }
        const gcd = E.gcd(a, b);
        const lcm = E.lcm(a, b);
        const base = bigIntParse(numberState.base, "Cơ số");
        const exponent = bigIntParse(numberState.exponent, "Số mũ");
        const modulus = bigIntParse(numberState.modulus, "Modulo");
        const power = bigIntModPow(base, exponent, modulus);
        const inverse = bigIntModInverse(base, modulus);
        return card("GCD & LCM", String(gcd), `${a} và ${b}`) +
          `<div class="metric-grid">
            ${metric("GCD(a, b)", String(gcd), true)}
            ${metric("LCM(a, b)", String(lcm), true)}
            ${metric("a / GCD", String(a / gcd))}
            ${metric("b / GCD", String(b / gcd))}
          </div>
          <div class="section-title"><h3>Modulo nâng cao</h3><span>Luỹ thừa & nghịch đảo</span></div>
          ${card("MODULAR POWER", escapeHtml(power.toString()), `${base.toString()}^${exponent.toString()} mod ${modulus.toString()}`)}
          <div class="metric-grid">
            ${metric("Kết quả mod", escapeHtml(power.toString()), true)}
            ${metric("Nghịch đảo mod", inverse == null ? "Không tồn tại" : escapeHtml(inverse.toString()), inverse != null)}
          </div>
          <div class="field-hint">Nghịch đảo modulo chỉ tồn tại khi GCD(cơ số, modulo) = 1. Số mũ và modulo dùng số nguyên lớn (BigInt).</div>`;
      }
      const n = Math.trunc(Number(numberState.n));
      const { factors } = numberFactorize(n);
      const divisors = numberDivisors(factors);
      const divisorSum = divisors.reduce((sum, value) => sum + value, 0);
      let totient = n;
      factors.forEach(({ p }) => { totient = totient / p * (p - 1); });
      const factorHtml = factors.map(({ p, e }) => `${p}${e > 1 ? `<sup>${e}</sup>` : ""}`).join(" × ");
      const isPrime = factors.length === 1 && factors[0].e === 1;
      const shownDivisors = divisors.slice(0, 80);
      return card("PHÂN TÍCH SỐ", factorHtml, isPrime ? `${n} là số nguyên tố` : `${factors.length} thừa số nguyên tố`) +
        `<div class="metric-grid">
          ${metric("Số ước", String(divisors.length), true)}
          ${metric("Tổng các ước", formatNumericText(divisorSum))}
          ${metric("Hàm Euler φ(n)", String(totient), true)}
          ${metric("Số nguyên tố", isPrime ? "Có" : "Không")}
          ${metric("Số hoàn hảo", divisorSum - n === n ? "Có" : "Không")}
        </div>
        <div class="number-divisors"><span>Ước số</span><div>${shownDivisors.map((value) => `<b>${value}</b>`).join("")}${divisors.length > shownDivisors.length ? `<i>+${divisors.length - shownDivisors.length} ước khác</i>` : ""}</div></div>
        <div class="field-hint">Phân tích bằng phép chia thử đến √n; phù hợp cho số nguyên dương đến 10¹².</div>`;
    } catch (error) {
      return errorBox(error);
    }
  }

  function numberFormMarkup() {
    if (numberState.tab === "arith") {
      return `<div class="form-grid">
          <div class="field"><label>a</label><input data-num="a" value="${escapeHtml(numberState.a)}" inputmode="numeric"></div>
          <div class="field"><label>b</label><input data-num="b" value="${escapeHtml(numberState.b)}" inputmode="numeric"></div>
          <div class="field"><label>Cơ số</label><input data-num="base" value="${escapeHtml(numberState.base)}" inputmode="numeric"></div>
          <div class="field"><label>Số mũ</label><input data-num="exponent" value="${escapeHtml(numberState.exponent)}" inputmode="numeric"></div>
          <div class="field"><label>Modulo</label><input data-num="modulus" value="${escapeHtml(numberState.modulus)}" inputmode="numeric"></div>
        </div>
        <div class="field-hint">GCD/LCM dùng a, b. Luỹ thừa modulo dùng cơ số, số mũ và modulo; hỗ trợ số nguyên lớn.</div>`;
    }
    return `<div class="form-grid">
        <div class="field"><label>Số nguyên dương n</label><input data-num="n" value="${escapeHtml(numberState.n)}" inputmode="numeric"></div>
        <div class="field"><label>Gợi ý</label><div class="number-samples"><button type="button" data-number-sample="360">360</button><button type="button" data-number-sample="1024">1024</button><button type="button" data-number-sample="9973">9973</button></div></div>
      </div>
      <div class="field-hint">Tìm phân tích thừa số, ước số, tổng ước, số nguyên tố, số hoàn hảo và hàm Euler φ(n).</div>`;
  }

  function openNumberWorkspace(tab) {
    closeModal();
    if (tab) numberState.tab = tab;
    if (!["factor", "arith"].includes(numberState.tab)) numberState.tab = "factor";
    const tabs = [["factor", "Phân tích số"], ["arith", "GCD & modulo"]];
    const body = `<p class="workspace-lead">${numberState.tab === "factor"
      ? "Phân tích một số nguyên thành thừa số nguyên tố và khám phá các đặc tính số học của nó."
      : "Tính GCD, LCM, luỹ thừa modulo và nghịch đảo modulo — hữu ích cho số học, mật mã và tin học."}</p>
      <div class="segmented">${tabs.map(([id, label]) => `<button class="seg-btn ${numberState.tab === id ? "is-active" : ""}" type="button" data-number-tab="${id}">${label}</button>`).join("")}</div>
      <div class="number-form">${numberFormMarkup()}</div>
      <div id="numberResults" class="number-results">${numberResultMarkup()}</div>
      <div class="button-row between">
        <span class="tiny-label">Các phép tính số học chạy trực tiếp trên trình duyệt.</span>
        <button class="btn ghost small" type="button" data-close-modal>Đóng</button>
      </div>`;
    openModal({
      title: "Số học & modulo",
      kicker: "NUMBER THEORY · SỐ HỌC",
      icon: "number",
      wide: true,
      body,
      onMount(root) {
        $$("[data-number-tab]", root).forEach((button) => {
          button.addEventListener("click", () => openNumberWorkspace(button.dataset.numberTab));
        });
        $$("[data-num]", root).forEach((input) => {
          input.addEventListener("input", () => {
            numberState[input.dataset.num] = input.value;
            const results = $("#numberResults", root);
            if (results) results.innerHTML = numberResultMarkup();
          });
        });
        $$("[data-number-sample]", root).forEach((button) => {
          button.addEventListener("click", () => {
            numberState.n = button.dataset.numberSample;
            openNumberWorkspace();
          });
        });
      }
    });
  }

  /* ============================================================
   * CÔNG CỤ MỞ RỘNG: TÀI CHÍNH
   * ============================================================ */
  const financeState = {
    tab: "compound",
    principal: "100000000", rate: "7", years: "10", periods: "12",
    initial: "50000000", monthly: "5000000", savingsRate: "6", savingsYears: "10",
    loan: "500000000", loanRate: "9", loanYears: "5", loanPeriods: "12"
  };
  let moneyFormatter = null;
  try { moneyFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }); } catch (error) { moneyFormatter = null; }

  function formatMoney(value) {
    if (!Number.isFinite(value)) return "—";
    const rounded = Math.round(value);
    return `${moneyFormatter ? moneyFormatter.format(rounded) : String(rounded)} ₫`;
  }

  function financeNumber(value, label, options) {
    let text = String(value).trim().replace(/\s+/g, "");
    if (text.includes(",")) text = text.replace(/\./g, "").replace(/,/g, ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
    const number = Number(text);
    if (!Number.isFinite(number)) throw { code: "Argument ERROR", detail: `${label} phải là một số.` };
    if (options && options.positive && number <= 0) throw { code: "Argument ERROR", detail: `${label} phải lớn hơn 0.` };
    if (options && options.nonNegative && number < 0) throw { code: "Argument ERROR", detail: `${label} không được âm.` };
    return number;
  }

  function financeResultMarkup() {
    try {
      if (financeState.tab === "loan") {
        const principal = financeNumber(financeState.loan, "Số tiền vay", { positive: true });
        const annual = financeNumber(financeState.loanRate, "Lãi suất năm", { nonNegative: true }) / 100;
        const years = financeNumber(financeState.loanYears, "Số năm", { positive: true });
        const periods = Math.trunc(financeNumber(financeState.loanPeriods, "Số kỳ mỗi năm", { positive: true }));
        if (periods < 1 || periods > 365) throw { code: "Argument ERROR", detail: "Số kỳ mỗi năm phải từ 1 đến 365." };
        const totalPeriods = Math.round(years * periods);
        if (totalPeriods < 1 || totalPeriods > 6000) throw { code: "Argument ERROR", detail: "Tổng số kỳ trả nợ không hợp lệ." };
        const rate = annual / periods;
        const payment = rate === 0 ? principal / totalPeriods : principal * rate * Math.pow(1 + rate, totalPeriods) / (Math.pow(1 + rate, totalPeriods) - 1);
        const total = payment * totalPeriods;
        return card("TRẢ NỢ ĐỊNH KỲ", formatMoney(payment), `${totalPeriods} kỳ · lãi suất ${financeState.loanRate}%/năm`) +
          `<div class="metric-grid">
            ${metric("Mỗi kỳ trả", formatMoney(payment), true)}
            ${metric("Tổng tiền trả", formatMoney(total))}
            ${metric("Tổng lãi", formatMoney(total - principal), true)}
            ${metric("Số kỳ", String(totalPeriods))}
            ${metric("Lãi suất mỗi kỳ", `${Number((rate * 100).toFixed(4))}%`)}
          </div>
          <div class="field-hint">Công thức niên kim: PMT = P·r·(1+r)<sup>N</sup> / [(1+r)<sup>N</sup> − 1]. Kết quả mang tính tham khảo, chưa gồm phí và bảo hiểm.</div>`;
      }
      if (financeState.tab === "savings") {
        const initial = financeNumber(financeState.initial, "Số tiền ban đầu", { nonNegative: true });
        const monthly = financeNumber(financeState.monthly, "Tiền gửi mỗi tháng", { nonNegative: true });
        const annual = financeNumber(financeState.savingsRate, "Lãi suất năm", { nonNegative: true }) / 100;
        const years = financeNumber(financeState.savingsYears, "Số năm", { positive: true });
        const months = Math.round(years * 12);
        if (months < 1 || months > 1200) throw { code: "Argument ERROR", detail: "Số tháng gửi phải từ 1 đến 1200." };
        const rate = annual / 12;
        const growth = Math.pow(1 + rate, months);
        const future = initial * growth + (rate === 0 ? monthly * months : monthly * (growth - 1) / rate);
        const contributed = initial + monthly * months;
        return card("TƯƠNG LAI TIẾT KIỆM", formatMoney(future), `${months} tháng · gửi thêm ${formatMoney(monthly)}/tháng`) +
          `<div class="metric-grid">
            ${metric("Số dư cuối kỳ", formatMoney(future), true)}
            ${metric("Tổng đã góp", formatMoney(contributed))}
            ${metric("Tiền lãi", formatMoney(future - contributed), true)}
            ${metric("Số tháng", String(months))}
            ${metric("Lãi suất tháng", `${Number((rate * 100).toFixed(4))}%`)}
          </div>
          <div class="field-hint">Giả định gửi tiền vào cuối mỗi tháng, lãi được nhập gốc hằng tháng và lãi suất không đổi.</div>`;
      }
      const principal = financeNumber(financeState.principal, "Số tiền ban đầu", { positive: true });
      const annual = financeNumber(financeState.rate, "Lãi suất năm", { nonNegative: true }) / 100;
      const years = financeNumber(financeState.years, "Số năm", { positive: true });
      const periods = Math.trunc(financeNumber(financeState.periods, "Số kỳ mỗi năm", { positive: true }));
      if (periods < 1 || periods > 365) throw { code: "Argument ERROR", detail: "Số kỳ mỗi năm phải từ 1 đến 365." };
      const rate = annual / periods;
      const totalPeriods = years * periods;
      const future = principal * Math.pow(1 + rate, totalPeriods);
      const effective = Math.pow(1 + rate, periods) - 1;
      return card("GIÁ TRỊ TƯƠNG LAI", formatMoney(future), `${Number(years.toFixed(2))} năm · ${periods} kỳ/năm`) +
        `<div class="metric-grid">
          ${metric("Số dư cuối kỳ", formatMoney(future), true)}
          ${metric("Tiền lãi", formatMoney(future - principal), true)}
          ${metric("Tổng vốn", formatMoney(principal))}
          ${metric("Lãi suất thực/năm", `${Number((effective * 100).toFixed(4))}%`)}
          ${metric("Số kỳ", String(Number(totalPeriods.toFixed(2))))}
        </div>
        <div class="field-hint">Công thức: A = P·(1 + r/n)<sup>n·t</sup>. Lãi suất nhập theo %/năm.</div>`;
    } catch (error) {
      return errorBox(error);
    }
  }

  function financeFormMarkup() {
    if (financeState.tab === "loan") {
      return `<div class="form-grid">
          <div class="field"><label>Số tiền vay (₫)</label><input data-fin="loan" value="${escapeHtml(financeState.loan)}" inputmode="numeric"></div>
          <div class="field"><label>Lãi suất năm (%)</label><input data-fin="loanRate" value="${escapeHtml(financeState.loanRate)}" inputmode="decimal"></div>
          <div class="field"><label>Số năm</label><input data-fin="loanYears" value="${escapeHtml(financeState.loanYears)}" inputmode="decimal"></div>
          <div class="field"><label>Số kỳ mỗi năm</label><input data-fin="loanPeriods" value="${escapeHtml(financeState.loanPeriods)}" inputmode="numeric"></div>
        </div>
        <div class="field-hint">Ví dụ vay mua nhà/ô tô: 500.000.000 ₫, 9%/năm, trả 12 lần/năm trong 5 năm.</div>`;
    }
    if (financeState.tab === "savings") {
      return `<div class="form-grid">
          <div class="field"><label>Số tiền ban đầu (₫)</label><input data-fin="initial" value="${escapeHtml(financeState.initial)}" inputmode="numeric"></div>
          <div class="field"><label>Gửi thêm mỗi tháng (₫)</label><input data-fin="monthly" value="${escapeHtml(financeState.monthly)}" inputmode="numeric"></div>
          <div class="field"><label>Lãi suất năm (%)</label><input data-fin="savingsRate" value="${escapeHtml(financeState.savingsRate)}" inputmode="decimal"></div>
          <div class="field"><label>Số năm</label><input data-fin="savingsYears" value="${escapeHtml(financeState.savingsYears)}" inputmode="decimal"></div>
        </div>
        <div class="field-hint">Mô phỏng gửi tiết kiệm đều đặn hằng tháng với lãi kép.</div>`;
    }
    return `<div class="form-grid">
        <div class="field"><label>Số tiền ban đầu (₫)</label><input data-fin="principal" value="${escapeHtml(financeState.principal)}" inputmode="numeric"></div>
        <div class="field"><label>Lãi suất năm (%)</label><input data-fin="rate" value="${escapeHtml(financeState.rate)}" inputmode="decimal"></div>
        <div class="field"><label>Số năm</label><input data-fin="years" value="${escapeHtml(financeState.years)}" inputmode="decimal"></div>
        <div class="field"><label>Số kỳ mỗi năm</label><input data-fin="periods" value="${escapeHtml(financeState.periods)}" inputmode="numeric"></div>
      </div>
      <div class="field-hint">Ví dụ: 100.000.000 ₫, lãi 7%/năm, kỳ hạn tháng (12 kỳ/năm), gửi 10 năm.</div>`;
  }

  function openFinanceWorkspace(tab) {
    closeModal();
    if (tab) financeState.tab = tab;
    if (!["compound", "savings", "loan"].includes(financeState.tab)) financeState.tab = "compound";
    const tabs = [["compound", "Lãi kép"], ["savings", "Tiết kiệm"], ["loan", "Vay vốn"]];
    const lead = financeState.tab === "loan"
      ? "Tính khoản trả định kỳ, tổng tiền phải trả và tổng lãi của một khoản vay."
      : financeState.tab === "savings"
        ? "Ước tính số dư tương lai khi gửi tiết kiệm ban đầu và gửi thêm mỗi tháng."
        : "Tính giá trị tương lai và tiền lãi của khoản đầu tư theo lãi kép.";
    const body = `<p class="workspace-lead">${lead} Các con số chỉ mang tính tham khảo.</p>
      <div class="segmented">${tabs.map(([id, label]) => `<button class="seg-btn ${financeState.tab === id ? "is-active" : ""}" type="button" data-finance-tab="${id}">${label}</button>`).join("")}</div>
      <div class="finance-form">${financeFormMarkup()}</div>
      <div id="financeResults" class="finance-results">${financeResultMarkup()}</div>
      <div class="button-row between">
        <span class="tiny-label">Đơn vị tiền tệ: Việt Nam đồng (₫).</span>
        <button class="btn ghost small" type="button" data-close-modal>Đóng</button>
      </div>`;
    openModal({
      title: "Tài chính",
      kicker: "FINANCE LAB · LÃI KÉP & VAY VỐN",
      icon: "finance",
      wide: true,
      body,
      onMount(root) {
        $$("[data-finance-tab]", root).forEach((button) => {
          button.addEventListener("click", () => openFinanceWorkspace(button.dataset.financeTab));
        });
        $$("[data-fin]", root).forEach((input) => {
          input.addEventListener("input", () => {
            financeState[input.dataset.fin] = input.value;
            const results = $("#financeResults", root);
            if (results) results.innerHTML = financeResultMarkup();
          });
        });
      }
    });
  }

  /* ============================================================
   * CÔNG CỤ MỞ RỘNG: VẬT LÝ
   * ============================================================ */
  const PHYSICS_GROUPS = [
    { id: "mechanics", name: "Cơ học" },
    { id: "electricity", name: "Điện học" },
    { id: "waves", name: "Sóng & quang" },
    { id: "thermal", name: "Nhiệt học" }
  ];
  const PHYSICS_G = 9.80665;
  const PHYSICS_K = 8.9875517923e9;
  const PHYSICS_R = 8.314462618;
  const PHYSICS_FORMULAS = {
    mechanics: [
      {
        id: "motion",
        name: "Chuyển động biến đổi đều",
        formula: "v = v₀ + at · s = v₀t + ½at²",
        fields: [
          { key: "v0", label: "Vận tốc đầu v₀", unit: "m/s", value: "0" },
          { key: "a", label: "Gia tốc a", unit: "m/s²", value: "2" },
          { key: "t", label: "Thời gian t", unit: "s", value: "5" }
        ],
        compute(v) {
          const velocity = v.v0 + v.a * v.t;
          const distance = v.v0 * v.t + 0.5 * v.a * v.t * v.t;
          return {
            main: { label: "Vận tốc cuối", value: velocity, unit: "m/s" },
            extra: [
              { label: "Quãng đường", value: distance, unit: "m" },
              { label: "Gia tốc", value: v.a, unit: "m/s²" }
            ],
            note: "Áp dụng cho chuyển động thẳng với gia tốc không đổi."
          };
        }
      },
      {
        id: "freefall",
        name: "Rơi tự do",
        formula: "t = √(2h/g) · v = √(2gh)",
        fields: [
          { key: "h", label: "Độ cao h", unit: "m", value: "20" },
          { key: "g", label: "Gia tốc trọng trường g", unit: "m/s²", value: String(PHYSICS_G) }
        ],
        compute(v) {
          if (v.h < 0) throw new E.CalcError("Math ERROR", "Độ cao phải không âm");
          if (v.g <= 0) throw new E.CalcError("Math ERROR", "g phải lớn hơn 0");
          const t = Math.sqrt((2 * v.h) / v.g);
          const velocity = Math.sqrt(2 * v.g * v.h);
          return {
            main: { label: "Thời gian rơi", value: t, unit: "s" },
            extra: [
              { label: "Vận tốc chạm đất", value: velocity, unit: "m/s" },
              { label: "Độ cao", value: v.h, unit: "m" }
            ],
            note: "Bỏ qua lực cản không khí; vật bắt đầu rơi từ trạng thái nghỉ."
          };
        }
      },
      {
        id: "force",
        name: "Lực và gia tốc",
        formula: "F = m·a",
        fields: [
          { key: "m", label: "Khối lượng m", unit: "kg", value: "2" },
          { key: "a", label: "Gia tốc a", unit: "m/s²", value: "3" }
        ],
        compute(v) {
          return {
            main: { label: "Lực tác dụng", value: v.m * v.a, unit: "N" },
            extra: [
              { label: "Khối lượng", value: v.m, unit: "kg" },
              { label: "Gia tốc", value: v.a, unit: "m/s²" }
            ],
            note: "Theo định luật II Newton cho một vật có khối lượng không đổi."
          };
        }
      },
      {
        id: "energy",
        name: "Động năng – thế năng",
        formula: "Wđ = ½mv² · Wt = mgh · W = Wđ + Wt",
        fields: [
          { key: "m", label: "Khối lượng m", unit: "kg", value: "2" },
          { key: "v", label: "Vận tốc v", unit: "m/s", value: "3" },
          { key: "h", label: "Độ cao h", unit: "m", value: "5" },
          { key: "g", label: "Gia tốc g", unit: "m/s²", value: String(PHYSICS_G) }
        ],
        compute(v) {
          const kinetic = 0.5 * v.m * v.v * v.v;
          const potential = v.m * v.g * v.h;
          return {
            main: { label: "Cơ năng toàn phần", value: kinetic + potential, unit: "J" },
            extra: [
              { label: "Động năng", value: kinetic, unit: "J" },
              { label: "Thế năng", value: potential, unit: "J" }
            ],
            note: "Chọn mốc thế năng tại độ cao 0."
          };
        }
      },
      {
        id: "projectile",
        name: "Chuyển động ném xiên",
        formula: "R = v₀²·sin2α/g · H = (v₀sinα)²/(2g)",
        fields: [
          { key: "v0", label: "Vận tốc ban đầu v₀", unit: "m/s", value: "20" },
          { key: "angle", label: "Góc ném α", unit: "°", value: "45" },
          { key: "g", label: "Gia tốc g", unit: "m/s²", value: String(PHYSICS_G) }
        ],
        compute(v) {
          if (v.g <= 0) throw new E.CalcError("Math ERROR", "g phải lớn hơn 0");
          const rad = (v.angle * Math.PI) / 180;
          const vy = v.v0 * Math.sin(rad);
          const range = (v.v0 * v.v0 * Math.sin(2 * rad)) / v.g;
          const height = (vy * vy) / (2 * v.g);
          const time = (2 * vy) / v.g;
          return {
            main: { label: "Tầm xa", value: range, unit: "m" },
            extra: [
              { label: "Độ cao lớn nhất", value: height, unit: "m" },
              { label: "Thời gian bay", value: time, unit: "s" }
            ],
            note: "Bỏ qua lực cản không khí; tầm xa đo trên mặt đất bằng phẳng."
          };
        }
      }
    ],
    electricity: [
      {
        id: "ohm",
        name: "Định luật Ohm",
        formula: "I = U/R · P = U·I",
        fields: [
          { key: "u", label: "Hiệu điện thế U", unit: "V", value: "12" },
          { key: "r", label: "Điện trở R", unit: "Ω", value: "4" }
        ],
        compute(v) {
          if (v.r === 0) throw new E.CalcError("Math ERROR", "Điện trở phải khác 0");
          const current = v.u / v.r;
          const power = v.u * current;
          return {
            main: { label: "Cường độ dòng điện", value: current, unit: "A" },
            extra: [
              { label: "Công suất tiêu thụ", value: power, unit: "W" },
              { label: "Điện trở", value: v.r, unit: "Ω" }
            ],
            note: "Mạch một chiều đơn giản với điện trở thuần."
          };
        }
      },
      {
        id: "resistors",
        name: "Điện trở nối tiếp – song song",
        formula: "Rnt = R₁ + R₂ · 1/Rss = 1/R₁ + 1/R₂",
        fields: [
          { key: "r1", label: "Điện trở R₁", unit: "Ω", value: "4" },
          { key: "r2", label: "Điện trở R₂", unit: "Ω", value: "6" }
        ],
        compute(v) {
          if (v.r1 <= 0 || v.r2 <= 0) throw new E.CalcError("Math ERROR", "Các điện trở phải lớn hơn 0");
          const series = v.r1 + v.r2;
          const parallel = (v.r1 * v.r2) / (v.r1 + v.r2);
          return {
            main: { label: "Điện trở song song", value: parallel, unit: "Ω" },
            extra: [
              { label: "Điện trở nối tiếp", value: series, unit: "Ω" },
              { label: "Tỉ số Rnt/Rss", value: series / parallel, unit: "lần" }
            ],
            note: "Công thức cho hai điện trở mắc với nhau."
          };
        }
      },
      {
        id: "coulomb",
        name: "Lực Coulomb",
        formula: "F = k·|q₁q₂|/r²",
        fields: [
          { key: "q1", label: "Điện tích q₁", unit: "µC", value: "1" },
          { key: "q2", label: "Điện tích q₂", unit: "µC", value: "1" },
          { key: "r", label: "Khoảng cách r", unit: "m", value: "0.1" }
        ],
        compute(v) {
          if (v.r <= 0) throw new E.CalcError("Math ERROR", "Khoảng cách phải lớn hơn 0");
          const force = (PHYSICS_K * Math.abs(v.q1 * v.q2) * 1e-12) / (v.r * v.r);
          return {
            main: { label: "Độ lớn lực Coulomb", value: force, unit: "N" },
            extra: [
              { label: "Khoảng cách", value: v.r, unit: "m" },
              { label: "Hằng số k", value: PHYSICS_K, unit: "N·m²/C²" }
            ],
            note: "Điện tích nhập theo microcoulomb (µC). Lực là lực hút nếu hai điện tích trái dấu."
          };
        }
      }
    ],
    waves: [
      {
        id: "wave",
        name: "Bước sóng – tần số",
        formula: "λ = v/f · T = 1/f",
        fields: [
          { key: "v", label: "Tốc độ truyền sóng v", unit: "m/s", value: "340" },
          { key: "f", label: "Tần số f", unit: "Hz", value: "440" }
        ],
        compute(v) {
          if (v.f <= 0) throw new E.CalcError("Math ERROR", "Tần số phải lớn hơn 0");
          const lambda = v.v / v.f;
          return {
            main: { label: "Bước sóng", value: lambda, unit: "m" },
            extra: [
              { label: "Chu kỳ", value: 1 / v.f, unit: "s" },
              { label: "Tần số", value: v.f, unit: "Hz" }
            ],
            note: "Sóng lan truyền trong môi trường với tốc độ không đổi."
          };
        }
      },
      {
        id: "pendulum",
        name: "Con lắc đơn",
        formula: "T = 2π√(L/g) · f = 1/T",
        fields: [
          { key: "l", label: "Chiều dài dây L", unit: "m", value: "1" },
          { key: "g", label: "Gia tốc g", unit: "m/s²", value: String(PHYSICS_G) }
        ],
        compute(v) {
          if (v.l <= 0 || v.g <= 0) throw new E.CalcError("Math ERROR", "L và g phải lớn hơn 0");
          const period = 2 * Math.PI * Math.sqrt(v.l / v.g);
          return {
            main: { label: "Chu kỳ dao động", value: period, unit: "s" },
            extra: [
              { label: "Tần số", value: 1 / period, unit: "Hz" },
              { label: "Chiều dài dây", value: v.l, unit: "m" }
            ],
            note: "Dao động nhỏ, bỏ qua ma sát và khối lượng dây."
          };
        }
      },
      {
        id: "lens",
        name: "Thấu kính mỏng",
        formula: "1/f = 1/d + 1/d′ · k = −d′/d",
        fields: [
          { key: "f", label: "Tiêu cự f", unit: "cm", value: "10" },
          { key: "d", label: "Khoảng cách vật d", unit: "cm", value: "30" }
        ],
        compute(v) {
          if (v.f === 0) throw new E.CalcError("Math ERROR", "Tiêu cự phải khác 0");
          if (v.d === 0) throw new E.CalcError("Math ERROR", "Khoảng cách vật phải khác 0");
          if (Math.abs(v.d - v.f) < 1e-12) throw new E.CalcError("Math ERROR", "Vật nằm tại tiêu điểm, ảnh ở vô cực");
          const imageDistance = (v.f * v.d) / (v.d - v.f);
          const magnification = -imageDistance / v.d;
          return {
            main: { label: "Khoảng cách ảnh d′", value: imageDistance, unit: "cm" },
            extra: [
              { label: "Độ phóng đại k", value: magnification, unit: "lần" },
              { label: "Loại ảnh", value: imageDistance > 0 ? "Ảnh thật" : "Ảnh ảo", unit: "" }
            ],
            note: "Quy ước dấu: f > 0 với thấu kính hội tụ, d′ > 0 là ảnh thật."
          };
        }
      }
    ],
    thermal: [
      {
        id: "heat",
        name: "Nhiệt lượng",
        formula: "Q = m·c·Δt",
        fields: [
          { key: "m", label: "Khối lượng m", unit: "kg", value: "2" },
          { key: "c", label: "Nhiệt dung riêng c", unit: "J/(kg·K)", value: "4200" },
          { key: "dt", label: "Độ biến thiên nhiệt độ Δt", unit: "K", value: "10" }
        ],
        compute(v) {
          const heat = v.m * v.c * v.dt;
          return {
            main: { label: "Nhiệt lượng", value: heat, unit: "J" },
            extra: [
              { label: "Nhiệt lượng", value: heat / 1000, unit: "kJ" },
              { label: "Khối lượng", value: v.m, unit: "kg" }
            ],
            note: "Nhiệt dung riêng của nước xấp xỉ 4200 J/(kg·K)."
          };
        }
      },
      {
        id: "gas",
        name: "Khí lý tưởng",
        formula: "pV = nRT",
        fields: [
          { key: "p", label: "Áp suất p", unit: "kPa", value: "100" },
          { key: "v", label: "Thể tích V", unit: "L", value: "24.79" },
          { key: "n", label: "Số mol n", unit: "mol", value: "1" }
        ],
        compute(v) {
          if (v.n <= 0) throw new E.CalcError("Math ERROR", "Số mol phải lớn hơn 0");
          const temperature = (v.p * v.v) / (v.n * PHYSICS_R);
          return {
            main: { label: "Nhiệt độ tuyệt đối", value: temperature, unit: "K" },
            extra: [
              { label: "Nhiệt độ Celsius", value: temperature - 273.15, unit: "°C" },
              { label: "Hằng số R", value: PHYSICS_R, unit: "J/(mol·K)" }
            ],
            note: "Dùng p tính bằng kPa và V tính bằng lít; 1 kPa·L = 1 J."
          };
        }
      }
    ]
  };
  const physicsState = { group: "mechanics", formula: "motion", values: {} };
  let physicsResult = "";
  let physicsLastInsert = "";

  function physicsCurrentFormula() {
    const group = PHYSICS_FORMULAS[physicsState.group] ? physicsState.group : "mechanics";
    const list = PHYSICS_FORMULAS[group];
    const formula = list.find((item) => item.id === physicsState.formula) || list[0];
    physicsState.group = group;
    physicsState.formula = formula.id;
    return formula;
  }

  function physicsNumber(value, label) {
    const text = String(value == null ? "" : value).trim().replace(",", ".");
    if (!text) throw new E.CalcError("Syntax ERROR", `${label} chưa được nhập`);
    const number = Number(text);
    if (!Number.isFinite(number)) throw new E.CalcError("Syntax ERROR", `${label} không hợp lệ`);
    return number;
  }

  function physicsFieldValues(formula) {
    const values = {};
    formula.fields.forEach((field) => {
      const saved = physicsState.values[formula.id] && physicsState.values[formula.id][field.key];
      values[field.key] = saved !== undefined ? saved : field.value;
    });
    return values;
  }

  function physicsFieldsMarkup(formula, values) {
    return formula.fields.map((field) => `<div class="field"><label>${escapeHtml(field.label)} <span class="sub">(${escapeHtml(field.unit)})</span></label><input data-physics-field="${escapeHtml(field.key)}" value="${escapeHtml(values[field.key])}" inputmode="decimal" autocomplete="off"></div>`).join("");
  }

  function physicsResultMarkup() {
    return physicsResult || `<div class="result-empty">Nhập các đại lượng đã biết rồi bấm <b>Tính</b>. Kết quả dùng đơn vị SI (trừ khi ghi chú khác).</div>`;
  }

  function runPhysics(root) {
    const results = $("#physicsResults", root);
    const formula = physicsCurrentFormula();
    try {
      const values = {};
      $$("[data-physics-field]", root).forEach((input) => {
        const key = input.dataset.physicsField;
        const field = formula.fields.find((item) => item.key === key);
        if (field) values[key] = physicsNumber(input.value, field.label);
      });
      if (!physicsState.values[formula.id]) physicsState.values[formula.id] = {};
      Object.assign(physicsState.values[formula.id], values);
      const result = formula.compute(values);
      physicsLastInsert = insertableNumericText(result.main.value);
      physicsResult = card(
        `KẾT QUẢ · ${formula.name.toUpperCase()}`,
        `${formatNumericText(result.main.value)}${result.main.unit ? `<span class="physics-unit">${escapeHtml(result.main.unit)}</span>` : ""}`,
        `${escapeHtml(result.main.label)}${result.note ? ` · ${escapeHtml(result.note)}` : ""}`
      ) + `<div class="metric-grid">${result.extra.map((item) => metric(item.label, `${typeof item.value === "number" ? formatNumericText(item.value) : escapeHtml(String(item.value))}${item.unit ? `<span class="physics-unit">${escapeHtml(item.unit)}</span>` : ""}`, false)).join("")}</div>`;
      if (results) results.innerHTML = physicsResult;
    } catch (error) {
      physicsLastInsert = "";
      physicsResult = errorBox(error);
      if (results) results.innerHTML = physicsResult;
    }
  }

  function openPhysicsWorkspace(group) {
    closeModal();
    if (group && PHYSICS_FORMULAS[group]) {
      physicsState.group = group;
      physicsState.formula = PHYSICS_FORMULAS[group][0].id;
      physicsResult = "";
      physicsLastInsert = "";
    }
    const formula = physicsCurrentFormula();
    const values = physicsFieldValues(formula);
    const formulas = PHYSICS_FORMULAS[physicsState.group];
    const body = workspaceLead("Tính nhanh các đại lượng vật lý thường gặp. Chọn nhóm, chọn công thức, nhập số liệu theo đơn vị ghi trên nhãn rồi bấm <strong>Tính</strong>.") +
      `<div class="segmented physics-groups">${PHYSICS_GROUPS.map((item) => `<button class="seg-btn ${physicsState.group === item.id ? "is-active" : ""}" type="button" data-physics-group="${item.id}">${escapeHtml(item.name)}</button>`).join("")}</div>
      <div class="form-grid physics-formula-picker"><div class="field field-wide"><label>Công thức</label><select id="physicsFormula">${formulas.map((item) => `<option value="${item.id}" ${item.id === formula.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></div></div>
      <div class="equation-preview" id="physicsFormulaPreview">${escapeHtml(formula.formula)}</div>
      <div class="form-grid physics-fields">${physicsFieldsMarkup(formula, values)}</div>
      <div id="physicsResults" class="physics-results" aria-live="polite">${physicsResultMarkup()}</div>
      <div class="button-row between">
        <span class="tiny-label">Kết quả hiển thị theo đơn vị ghi bên cạnh mỗi đại lượng.</span>
        <div class="button-row compact">
          <button class="btn ghost small" type="button" id="physicsSample">Mẫu</button>
          <button class="btn ghost small" type="button" id="physicsInsert">Dùng kết quả</button>
          <button class="btn primary small" type="button" id="physicsCompute">Tính</button>
        </div>
      </div>`;
    openModal({
      title: "Vật lý",
      kicker: "PHYSICS LAB · CƠ – ĐIỆN – SÓNG – NHIỆT",
      icon: "physics",
      wide: true,
      body,
      onMount(root) {
        $$("[data-physics-group]", root).forEach((button) => {
          button.addEventListener("click", () => openPhysicsWorkspace(button.dataset.physicsGroup));
        });
        const selector = $("#physicsFormula", root);
        if (selector) selector.addEventListener("change", () => {
          physicsState.formula = selector.value;
          physicsResult = "";
          physicsLastInsert = "";
          openPhysicsWorkspace();
        });
        $$("[data-physics-field]", root).forEach((input) => {
          input.addEventListener("input", () => {
            if (!physicsState.values[physicsState.formula]) physicsState.values[physicsState.formula] = {};
            physicsState.values[physicsState.formula][input.dataset.physicsField] = input.value;
          });
        });
        const compute = $("#physicsCompute", root);
        if (compute) compute.addEventListener("click", () => runPhysics(root));
        const sample = $("#physicsSample", root);
        if (sample) sample.addEventListener("click", () => {
          physicsState.values[physicsState.formula] = {};
          physicsResult = "";
          physicsLastInsert = "";
          openPhysicsWorkspace();
        });
        const insert = $("#physicsInsert", root);
        if (insert) insert.addEventListener("click", () => {
          if (!physicsLastInsert) {
            showToast("Hãy tính một kết quả trước.");
            return;
          }
          const value = physicsLastInsert;
          closeModal();
          setTimeout(() => {
            insertText(value, value.length);
            showToast("Đã chèn kết quả vào màn hình.");
          }, 100);
        });
      }
    });
  }

  /* ============================================================
   * CÔNG CỤ MỞ RỘNG: ĐỔI ĐƠN VỊ
   * ============================================================ */
  const UNIT_GROUPS = [
    {
      id: "length", name: "Độ dài",
      units: [
        { id: "m", name: "Mét", symbol: "m", factor: 1 },
        { id: "km", name: "Kilômét", symbol: "km", factor: 1000 },
        { id: "cm", name: "Xentimét", symbol: "cm", factor: 0.01 },
        { id: "mm", name: "Milimét", symbol: "mm", factor: 0.001 },
        { id: "in", name: "Inch", symbol: "in", factor: 0.0254 },
        { id: "ft", name: "Foot", symbol: "ft", factor: 0.3048 },
        { id: "yd", name: "Yard", symbol: "yd", factor: 0.9144 },
        { id: "mi", name: "Dặm", symbol: "mi", factor: 1609.344 }
      ]
    },
    {
      id: "mass", name: "Khối lượng",
      units: [
        { id: "kg", name: "Kilôgam", symbol: "kg", factor: 1 },
        { id: "g", name: "Gam", symbol: "g", factor: 0.001 },
        { id: "mg", name: "Miligam", symbol: "mg", factor: 0.000001 },
        { id: "t", name: "Tấn", symbol: "t", factor: 1000 },
        { id: "lb", name: "Pound", symbol: "lb", factor: 0.45359237 },
        { id: "oz", name: "Ounce", symbol: "oz", factor: 0.028349523125 }
      ]
    },
    {
      id: "area", name: "Diện tích",
      units: [
        { id: "m2", name: "Mét vuông", symbol: "m²", factor: 1 },
        { id: "km2", name: "Kilômét vuông", symbol: "km²", factor: 1000000 },
        { id: "cm2", name: "Xentimét vuông", symbol: "cm²", factor: 0.0001 },
        { id: "ha", name: "Hecta", symbol: "ha", factor: 10000 },
        { id: "acre", name: "Mẫu Anh", symbol: "acre", factor: 4046.8564224 },
        { id: "ft2", name: "Foot vuông", symbol: "ft²", factor: 0.09290304 }
      ]
    },
    {
      id: "volume", name: "Thể tích",
      units: [
        { id: "l", name: "Lít", symbol: "L", factor: 1 },
        { id: "ml", name: "Mililít", symbol: "mL", factor: 0.001 },
        { id: "m3", name: "Mét khối", symbol: "m³", factor: 1000 },
        { id: "cm3", name: "Xentimét khối", symbol: "cm³", factor: 0.001 },
        { id: "gal", name: "Gallon (US)", symbol: "gal", factor: 3.785411784 }
      ]
    },
    {
      id: "speed", name: "Tốc độ",
      units: [
        { id: "ms", name: "Mét/giây", symbol: "m/s", factor: 1 },
        { id: "kmh", name: "Kilômét/giờ", symbol: "km/h", factor: 1 / 3.6 },
        { id: "mph", name: "Dặm/giờ", symbol: "mph", factor: 0.44704 },
        { id: "knot", name: "Hải lý/giờ", symbol: "kn", factor: 0.514444444 }
      ]
    },
    {
      id: "energy", name: "Năng lượng",
      units: [
        { id: "j", name: "Joule", symbol: "J", factor: 1 },
        { id: "kj", name: "Kilojoule", symbol: "kJ", factor: 1000 },
        { id: "cal", name: "Calorie", symbol: "cal", factor: 4.184 },
        { id: "kcal", name: "Kilocalorie", symbol: "kcal", factor: 4184 },
        { id: "wh", name: "Watt-giờ", symbol: "Wh", factor: 3600 },
        { id: "kwh", name: "Kilowatt-giờ", symbol: "kWh", factor: 3600000 }
      ]
    },
    {
      id: "pressure", name: "Áp suất",
      units: [
        { id: "pa", name: "Pascal", symbol: "Pa", factor: 1 },
        { id: "kpa", name: "Kilopascal", symbol: "kPa", factor: 1000 },
        { id: "bar", name: "Bar", symbol: "bar", factor: 100000 },
        { id: "atm", name: "Atmốtphe", symbol: "atm", factor: 101325 },
        { id: "mmhg", name: "Milimét thủy ngân", symbol: "mmHg", factor: 133.322368 }
      ]
    },
    {
      id: "time", name: "Thời gian",
      units: [
        { id: "s", name: "Giây", symbol: "s", factor: 1 },
        { id: "min", name: "Phút", symbol: "min", factor: 60 },
        { id: "h", name: "Giờ", symbol: "h", factor: 3600 },
        { id: "day", name: "Ngày", symbol: "ngày", factor: 86400 },
        { id: "week", name: "Tuần", symbol: "tuần", factor: 604800 }
      ]
    },
    {
      id: "data", name: "Dữ liệu số",
      units: [
        { id: "b", name: "Byte", symbol: "B", factor: 1 },
        { id: "kb", name: "Kilobyte", symbol: "KB", factor: 1024 },
        { id: "mb", name: "Megabyte", symbol: "MB", factor: 1048576 },
        { id: "gb", name: "Gigabyte", symbol: "GB", factor: 1073741824 },
        { id: "tb", name: "Terabyte", symbol: "TB", factor: 1099511627776 },
        { id: "bit", name: "Bit", symbol: "bit", factor: 0.125 }
      ]
    },
    {
      id: "temperature", name: "Nhiệt độ", special: true,
      units: [
        { id: "c", name: "Celsius", symbol: "°C" },
        { id: "f", name: "Fahrenheit", symbol: "°F" },
        { id: "k", name: "Kelvin", symbol: "K" }
      ]
    }
  ];
  const unitState = { group: "length", value: "1", from: "m", to: "km" };
  let unitResult = "";
  let unitLastInsert = "";

  function unitGroupDef() {
    return UNIT_GROUPS.find((group) => group.id === unitState.group) || UNIT_GROUPS[0];
  }

  function unitPairFor(group) {
    const from = group.units.some((unit) => unit.id === unitState.from) ? unitState.from : group.units[0].id;
    const to = group.units.some((unit) => unit.id === unitState.to) ? unitState.to : (group.units[1] || group.units[0]).id;
    unitState.from = from;
    unitState.to = to;
    return {
      from: group.units.find((unit) => unit.id === from),
      to: group.units.find((unit) => unit.id === to)
    };
  }

  function unitNumber(value, label) {
    const text = String(value == null ? "" : value).trim().replace(",", ".");
    if (!text) throw new E.CalcError("Syntax ERROR", `${label} chưa được nhập`);
    const number = Number(text);
    if (!Number.isFinite(number)) throw new E.CalcError("Syntax ERROR", `${label} không hợp lệ`);
    return number;
  }

  function temperatureToCelsius(value, unitId) {
    if (unitId === "f") return (value - 32) * 5 / 9;
    if (unitId === "k") return value - 273.15;
    return value;
  }

  function temperatureFromCelsius(value, unitId) {
    if (unitId === "f") return value * 9 / 5 + 32;
    if (unitId === "k") return value + 273.15;
    return value;
  }

  function unitConvert() {
    const group = unitGroupDef();
    const { from, to } = unitPairFor(group);
    const value = unitNumber(unitState.value, "Giá trị");
    let result;
    let factor = null;
    if (group.special) {
      const celsius = temperatureToCelsius(value, from.id);
      if (celsius < -273.15 - 1e-9) throw new E.CalcError("Math ERROR", "Nhiệt độ thấp hơn 0 K");
      result = temperatureFromCelsius(celsius, to.id);
    } else {
      factor = from.factor / to.factor;
      result = value * factor;
      if (!Number.isFinite(result)) throw new E.CalcError("Math ERROR", "Kết quả vượt phạm vi");
    }
    return { group, from, to, value, result, factor };
  }

  function unitPreviewText() {
    try {
      const info = unitConvert();
      return `${formatNumericText(info.value)} ${info.from.symbol} = ${formatNumericText(info.result)} ${info.to.symbol}`;
    } catch (error) {
      return "Nhập giá trị và chọn đơn vị để xem kết quả.";
    }
  }

  function unitResultMarkup() {
    return unitResult || `<div class="result-empty">Chọn nhóm đơn vị, nhập giá trị rồi bấm <b>Tính</b> để quy đổi.</div>`;
  }

  function runUnit(root) {
    const target = $("#unitResults", root);
    try {
      const info = unitConvert();
      unitLastInsert = insertableNumericText(info.result);
      unitResult = card(
        "KẾT QUẢ QUY ĐỔI",
        `${formatNumericText(info.result)}<span class="physics-unit">${escapeHtml(info.to.symbol)}</span>`,
        `${formatNumericText(info.value)} ${escapeHtml(info.from.symbol)} → ${escapeHtml(info.to.symbol)} · ${escapeHtml(info.group.name)}`
      ) + `<div class="metric-grid">
        ${metric("Giá trị gốc", `${formatNumericText(info.value)} ${escapeHtml(info.from.symbol)}`, true)}
        ${metric("Kết quả", `${formatNumericText(info.result)} ${escapeHtml(info.to.symbol)}`)}
        ${info.factor == null ? metric("Công thức", "Quy đổi nhiệt độ") : metric("Hệ số quy đổi", formatNumericText(info.factor))}
      </div>`;
      if (target) target.innerHTML = unitResult;
    } catch (error) {
      unitLastInsert = "";
      unitResult = errorBox(error);
      if (target) target.innerHTML = unitResult;
    }
  }

  function openUnitWorkspace(group) {
    closeModal();
    if (group && UNIT_GROUPS.some((item) => item.id === group) && group !== unitState.group) {
      unitState.group = group;
      const next = unitGroupDef();
      unitState.from = next.units[0].id;
      unitState.to = (next.units[1] || next.units[0]).id;
      unitResult = "";
      unitLastInsert = "";
    }
    const current = unitGroupDef();
    const pair = unitPairFor(current);
    const body = workspaceLead("Quy đổi nhanh giữa các đơn vị thường gặp. Chọn nhóm, nhập giá trị, chọn đơn vị nguồn và đích rồi bấm <strong>Tính</strong>.") +
      `<div class="form-grid"><div class="field field-wide"><label>Nhóm đơn vị</label><select id="unitGroup">${UNIT_GROUPS.map((item) => `<option value="${item.id}" ${item.id === current.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></div></div>
      <div class="form-grid three" style="margin-top:12px">
        <div class="field"><label>Giá trị</label><input id="unitValue" value="${escapeHtml(unitState.value)}" inputmode="decimal" autocomplete="off"></div>
        <div class="field"><label>Từ</label><select id="unitFrom">${current.units.map((unit) => `<option value="${unit.id}" ${unit.id === pair.from.id ? "selected" : ""}>${escapeHtml(unit.name)} (${escapeHtml(unit.symbol)})</option>`).join("")}</select></div>
        <div class="field"><label>Sang</label><select id="unitTo">${current.units.map((unit) => `<option value="${unit.id}" ${unit.id === pair.to.id ? "selected" : ""}>${escapeHtml(unit.name)} (${escapeHtml(unit.symbol)})</option>`).join("")}</select></div>
      </div>
      <div class="equation-preview" id="unitPreview">${escapeHtml(unitPreviewText())}</div>
      <div id="unitResults" class="physics-results" aria-live="polite">${unitResultMarkup()}</div>
      <div class="button-row between">
        <span class="tiny-label">Hỗ trợ 10 nhóm đơn vị, gồm quy đổi nhiệt độ.</span>
        <div class="button-row compact">
          <button class="btn ghost small" type="button" id="unitSwap">Hoán đổi</button>
          <button class="btn ghost small" type="button" id="unitSample">Mẫu</button>
          <button class="btn ghost small" type="button" id="unitInsert">Dùng kết quả</button>
          <button class="btn primary small" type="button" id="unitCompute">Tính</button>
        </div>
      </div>`;
    openModal({
      title: "Đổi đơn vị",
      kicker: "UNIT CONVERTER · 10 NHÓM ĐƠN VỊ",
      icon: "convert",
      wide: true,
      body,
      onMount(root) {
        $("#unitGroup", root).addEventListener("change", (event) => openUnitWorkspace(event.target.value));
        $("#unitValue", root).addEventListener("input", (event) => {
          unitState.value = event.target.value;
          unitResult = "";
          unitLastInsert = "";
          const preview = $("#unitPreview", root);
          if (preview) preview.textContent = unitPreviewText();
          const results = $("#unitResults", root);
          if (results) results.innerHTML = unitResultMarkup();
        });
        ["#unitFrom", "#unitTo"].forEach((selector) => {
          $(selector, root).addEventListener("change", () => {
            unitState.from = $("#unitFrom", root).value;
            unitState.to = $("#unitTo", root).value;
            unitResult = "";
            unitLastInsert = "";
            const preview = $("#unitPreview", root);
            if (preview) preview.textContent = unitPreviewText();
            const results = $("#unitResults", root);
            if (results) results.innerHTML = unitResultMarkup();
          });
        });
        $("#unitSwap", root).addEventListener("click", () => {
          const from = unitState.from;
          unitState.from = unitState.to;
          unitState.to = from;
          unitResult = "";
          unitLastInsert = "";
          openUnitWorkspace();
        });
        $("#unitSample", root).addEventListener("click", () => {
          unitState.value = "1";
          unitResult = "";
          unitLastInsert = "";
          openUnitWorkspace();
        });
        $("#unitCompute", root).addEventListener("click", () => runUnit(root));
        $("#unitInsert", root).addEventListener("click", () => {
          if (!unitLastInsert) {
            showToast("Hãy tính một kết quả trước.");
            return;
          }
          const value = unitLastInsert;
          closeModal();
          setTimeout(() => {
            insertText(value, value.length);
            showToast("Đã chèn kết quả quy đổi vào màn hình.");
          }, 100);
        });
      }
    });
  }

  /* ============================================================
   * CÔNG CỤ MỞ RỘNG: GIẢI TAM GIÁC
   * ============================================================ */
  const TRIANGLE_METHODS = [
    { id: "sss", name: "3 cạnh", hint: "Biết ba cạnh a, b, c." },
    { id: "sas", name: "2 cạnh + góc", hint: "Biết hai cạnh b, c và góc xen giữa A." },
    { id: "asa", name: "1 cạnh + 2 góc", hint: "Biết cạnh a và hai góc B, C." }
  ];
  const triangleState = {
    method: "sss",
    values: {
      sss: { a: "3", b: "4", c: "5" },
      sas: { b: "5", c: "7", angleA: "60" },
      asa: { a: "8", angleB: "45", angleC: "60" }
    }
  };
  let triangleResult = "";
  let triangleLastInsert = "";

  function triangleMethodDef() {
    return TRIANGLE_METHODS.find((method) => method.id === triangleState.method) || TRIANGLE_METHODS[0];
  }

  function triangleValues() {
    const method = triangleMethodDef();
    if (!triangleState.values[method.id]) triangleState.values[method.id] = {};
    return triangleState.values[method.id];
  }

  function triangleNumber(value, label) {
    const text = String(value == null ? "" : value).trim().replace(",", ".");
    if (!text) throw new E.CalcError("Syntax ERROR", `${label} chưa được nhập`);
    const number = Number(text);
    if (!Number.isFinite(number)) throw new E.CalcError("Syntax ERROR", `${label} không hợp lệ`);
    return number;
  }

  function triangleClassify(a, b, c) {
    const sides = [a, b, c].slice().sort((x, y) => x - y);
    const largest = sides[2] * sides[2];
    const rest = sides[0] * sides[0] + sides[1] * sides[1];
    const equal = Math.abs(a - b) < 1e-9 && Math.abs(b - c) < 1e-9;
    if (equal) return "Tam giác đều";
    if (Math.abs(largest - rest) < 1e-7) return "Tam giác vuông";
    if (largest > rest) return "Tam giác tù";
    return "Tam giác nhọn";
  }

  function triangleFromSides(a, b, c) {
    if (!(a > 0 && b > 0 && c > 0)) throw new E.CalcError("Math ERROR", "Các cạnh phải lớn hơn 0");
    if (a + b <= c || b + c <= a || c + a <= b) throw new E.CalcError("Math ERROR", "Ba cạnh không tạo thành tam giác");
    const perimeter = a + b + c;
    const semi = perimeter / 2;
    const area = Math.sqrt(semi * (semi - a) * (semi - b) * (semi - c));
    const angleA = Math.acos((b * b + c * c - a * a) / (2 * b * c)) * 180 / Math.PI;
    const angleB = Math.acos((a * a + c * c - b * b) / (2 * a * c)) * 180 / Math.PI;
    const angleC = 180 - angleA - angleB;
    return { a, b, c, angleA, angleB, angleC, perimeter, area, type: triangleClassify(a, b, c) };
  }

  function triangleCompute() {
    const method = triangleMethodDef();
    const values = triangleValues();
    if (method.id === "sss") {
      return triangleFromSides(
        triangleNumber(values.a, "Cạnh a"),
        triangleNumber(values.b, "Cạnh b"),
        triangleNumber(values.c, "Cạnh c")
      );
    }
    if (method.id === "sas") {
      const b = triangleNumber(values.b, "Cạnh b");
      const c = triangleNumber(values.c, "Cạnh c");
      const angleA = triangleNumber(values.angleA, "Góc A");
      if (!(b > 0 && c > 0)) throw new E.CalcError("Math ERROR", "Các cạnh phải lớn hơn 0");
      if (!(angleA > 0 && angleA < 180)) throw new E.CalcError("Math ERROR", "Góc A phải nằm trong (0°, 180°)");
      const rad = angleA * Math.PI / 180;
      const a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(rad));
      return triangleFromSides(a, b, c);
    }
    const a = triangleNumber(values.a, "Cạnh a");
    const angleB = triangleNumber(values.angleB, "Góc B");
    const angleC = triangleNumber(values.angleC, "Góc C");
    if (!(a > 0)) throw new E.CalcError("Math ERROR", "Cạnh a phải lớn hơn 0");
    if (!(angleB > 0 && angleC > 0 && angleB + angleC < 180)) throw new E.CalcError("Math ERROR", "Cần B > 0, C > 0 và B + C < 180°");
    const angleA = 180 - angleB - angleC;
    const radA = angleA * Math.PI / 180;
    const b = a * Math.sin(angleB * Math.PI / 180) / Math.sin(radA);
    const c = a * Math.sin(angleC * Math.PI / 180) / Math.sin(radA);
    return triangleFromSides(a, b, c);
  }

  function triangleFieldsMarkup() {
    const method = triangleMethodDef();
    const values = triangleValues();
    const field = (key, label) => `<div class="field"><label>${label}</label><input data-triangle-field="${key}" value="${escapeHtml(values[key] || "")}" inputmode="decimal" autocomplete="off"></div>`;
    if (method.id === "sss") return field("a", "Cạnh a") + field("b", "Cạnh b") + field("c", "Cạnh c");
    if (method.id === "sas") return field("b", "Cạnh b") + field("c", "Cạnh c") + field("angleA", "Góc xen giữa A (°)");
    return field("a", "Cạnh a") + field("angleB", "Góc B (°)") + field("angleC", "Góc C (°)");
  }

  function triangleResultMarkup() {
    return triangleResult || `<div class="result-empty">Chọn cách giải, nhập dữ liệu rồi bấm <b>Tính tam giác</b>.</div>`;
  }

  function runTriangle(root) {
    const target = $("#triangleResults", root);
    try {
      const info = triangleCompute();
      triangleLastInsert = insertableNumericText(info.area);
      const degree = (value) => `${formatNumericText(value)}°`;
      triangleResult = card(
        `DIỆN TÍCH · ${info.type.toUpperCase()}`,
        `${formatNumericText(info.area)}<span class="physics-unit">đvdt</span>`,
        `Chu vi = ${formatNumericText(info.perimeter)} · A = ${degree(info.angleA)} · B = ${degree(info.angleB)} · C = ${degree(info.angleC)}`
      ) + `<div class="metric-grid">
        ${metric("Cạnh a", formatNumericText(info.a), true)}
        ${metric("Cạnh b", formatNumericText(info.b))}
        ${metric("Cạnh c", formatNumericText(info.c))}
        ${metric("Chu vi", formatNumericText(info.perimeter))}
        ${metric("Góc A", degree(info.angleA))}
        ${metric("Góc B", degree(info.angleB))}
        ${metric("Góc C", degree(info.angleC))}
        ${metric("Loại tam giác", escapeHtml(info.type))}
      </div>`;
      if (target) target.innerHTML = triangleResult;
    } catch (error) {
      triangleLastInsert = "";
      triangleResult = errorBox(error);
      if (target) target.innerHTML = triangleResult;
    }
  }

  function openTriangleWorkspace(method) {
    closeModal();
    if (method && TRIANGLE_METHODS.some((item) => item.id === method)) {
      triangleState.method = method;
      triangleResult = "";
      triangleLastInsert = "";
    }
    const current = triangleMethodDef();
    const currentValues = triangleValues();
    const body = workspaceLead("Giải tam giác bằng ba cách: biết ba cạnh (SSS), biết hai cạnh và góc xen giữa (SAS), hoặc biết một cạnh và hai góc (ASA). Kết quả gồm cạnh, góc, chu vi, diện tích và loại tam giác.") +
      `<div class="segmented triangle-tabs">${TRIANGLE_METHODS.map((item) => `<button class="seg-btn ${item.id === current.id ? "is-active" : ""}" type="button" data-triangle-method="${item.id}">${escapeHtml(item.name)}</button>`).join("")}</div>
      <div class="field-hint" style="margin-top:10px">${escapeHtml(current.hint)}</div>
      <div class="form-grid three" style="margin-top:12px">${triangleFieldsMarkup()}</div>
      <div id="triangleResults" class="physics-results" aria-live="polite">${triangleResultMarkup()}</div>
      <div class="button-row between">
        <span class="tiny-label">Góc dùng đơn vị độ; kết quả diện tích là đơn vị diện tích tương ứng.</span>
        <div class="button-row compact">
          <button class="btn ghost small" type="button" id="triangleSample">Mẫu</button>
          <button class="btn ghost small" type="button" id="triangleInsert">Dùng kết quả</button>
          <button class="btn primary small" type="button" id="triangleCompute">Tính tam giác</button>
        </div>
      </div>`;
    openModal({
      title: "Giải tam giác",
      kicker: "TRIANGLE SOLVER · SSS · SAS · ASA",
      icon: "geometry",
      wide: true,
      body,
      onMount(root) {
        $$("[data-triangle-method]", root).forEach((button) => {
          button.addEventListener("click", () => openTriangleWorkspace(button.dataset.triangleMethod));
        });
        $$("[data-triangle-field]", root).forEach((input) => {
          input.addEventListener("input", () => {
            triangleValues()[input.dataset.triangleField] = input.value;
          });
        });
        $("#triangleCompute", root).addEventListener("click", () => runTriangle(root));
        $("#triangleSample", root).addEventListener("click", () => {
          triangleState.values[triangleState.method] = current.id === "sss"
            ? { a: "3", b: "4", c: "5" }
            : current.id === "sas"
              ? { b: "5", c: "7", angleA: "60" }
              : { a: "8", angleB: "45", angleC: "60" };
          triangleResult = "";
          triangleLastInsert = "";
          openTriangleWorkspace();
        });
        $("#triangleInsert", root).addEventListener("click", () => {
          if (!triangleLastInsert) {
            showToast("Hãy tính một kết quả trước.");
            return;
          }
          const value = triangleLastInsert;
          closeModal();
          setTimeout(() => {
            insertText(value, value.length);
            showToast("Đã chèn diện tích tam giác vào màn hình.");
          }, 100);
        });
      }
    });
  }

  /* ============================================================
   * CÔNG CỤ MỞ RỘNG: THỐNG KÊ NHANH
   * ============================================================ */
  const quickStatsState = { data: "2; 3; 5; 7; 11; 13" };
  let quickStatsResult = "";
  let quickStatsLastInsert = "";

  function quickStatsNumbers() {
    const tokens = String(quickStatsState.data || "").split(/[\s,;]+/).filter(Boolean);
    if (!tokens.length) throw new E.CalcError("Syntax ERROR", "Chưa nhập dữ liệu");
    if (tokens.length > 5000) throw new E.CalcError("Math ERROR", "Dãy số quá dài");
    const numbers = tokens.map((token) => {
      const number = Number(token.replace(",", "."));
      if (!Number.isFinite(number)) throw new E.CalcError("Syntax ERROR", `Giá trị "${token}" không hợp lệ`);
      return number;
    });
    return numbers;
  }

  function quickStatsResultMarkup() {
    return quickStatsResult || `<div class="result-empty">Dán dãy số (cách nhau bằng dấu cách, dấu phẩy, dấu chấm phẩy hoặc xuống dòng) rồi bấm <b>Tính thống kê</b>.</div>`;
  }

  function runQuickStats(root) {
    const target = $("#quickStatsResults", root);
    try {
      const numbers = quickStatsNumbers();
      const rows = numbers.map((value) => ({ x: String(value), f: "1" }));
      const stats = E.stats1(rows, {});
      const modeText = stats.mode && stats.mode.length ? stats.mode.map((value) => formatNumericText(value)).join(", ") : "—";
      quickStatsLastInsert = insertableNumericText(stats.mean);
      quickStatsResult = card("THỐNG KÊ NHANH", `x̄ = ${formatNumericText(stats.mean)}`, `${stats.n} giá trị · Tổng = ${formatNumericText(stats.sum)}`) +
        `<div class="metric-grid">
          ${metric("Số giá trị n", String(stats.n), true)}
          ${metric("Trung bình x̄", formatNumericText(stats.mean))}
          ${metric("Trung vị", formatNumericText(stats.median))}
          ${metric("Mốt", escapeHtml(modeText))}
          ${metric("Độ lệch chuẩn mẫu", formatNumericText(stats.sdSample))}
          ${metric("Độ lệch chuẩn tổng thể", formatNumericText(stats.sdPop))}
          ${metric("Phương sai mẫu", formatNumericText(stats.varSample))}
          ${metric("Phương sai tổng thể", formatNumericText(stats.varPop))}
          ${metric("Nhỏ nhất", formatNumericText(stats.min))}
          ${metric("Q1", formatNumericText(stats.q1))}
          ${metric("Q3", formatNumericText(stats.q3))}
          ${metric("Lớn nhất", formatNumericText(stats.max))}
          ${metric("Khoảng biến thiên", formatNumericText(stats.max - stats.min))}
          ${metric("Tổng", formatNumericText(stats.sum))}
        </div>`;
      if (target) target.innerHTML = quickStatsResult;
    } catch (error) {
      quickStatsLastInsert = "";
      quickStatsResult = errorBox(error);
      if (target) target.innerHTML = quickStatsResult;
    }
  }

  function openQuickStatsWorkspace() {
    closeModal();
    const body = workspaceLead("Tính nhanh các đại lượng thống kê mô tả từ một dãy số. Phù hợp để kiểm tra nhanh dữ liệu thí nghiệm, điểm số hoặc khảo sát.") +
      `<div class="field"><label>Dãy số</label><textarea id="quickStatsData" rows="5" placeholder="Ví dụ: 2; 3; 5; 7; 11; 13">${escapeHtml(quickStatsState.data)}</textarea></div>
      <div class="field-hint">Phân tách bằng dấu cách, dấu phẩy, dấu chấm phẩy hoặc xuống dòng.</div>
      <div id="quickStatsResults" class="physics-results" aria-live="polite">${quickStatsResultMarkup()}</div>
      <div class="button-row between">
        <span class="tiny-label">Hỗ trợ tối đa 5.000 giá trị.</span>
        <div class="button-row compact">
          <button class="btn ghost small" type="button" id="quickStatsSample">Mẫu</button>
          <button class="btn ghost small" type="button" id="quickStatsInsert">Dùng trung bình</button>
          <button class="btn primary small" type="button" id="quickStatsCompute">Tính thống kê</button>
        </div>
      </div>`;
    openModal({
      title: "Thống kê nhanh",
      kicker: "QUICK STATS · MÔ TẢ DỮ LIỆU",
      icon: "table2",
      wide: true,
      body,
      onMount(root) {
        $("#quickStatsData", root).addEventListener("input", (event) => {
          quickStatsState.data = event.target.value;
        });
        $("#quickStatsCompute", root).addEventListener("click", () => runQuickStats(root));
        $("#quickStatsSample", root).addEventListener("click", () => {
          quickStatsState.data = "2; 3; 5; 7; 11; 13";
          quickStatsResult = "";
          quickStatsLastInsert = "";
          openQuickStatsWorkspace();
        });
        $("#quickStatsInsert", root).addEventListener("click", () => {
          if (!quickStatsLastInsert) {
            showToast("Hãy tính một kết quả trước.");
            return;
          }
          const value = quickStatsLastInsert;
          closeModal();
          setTimeout(() => {
            insertText(value, value.length);
            showToast("Đã chèn giá trị trung bình vào màn hình.");
          }, 100);
        });
      }
    });
  }

  /* ============================================================
   * CÔNG CỤ MỞ RỘNG: GIẢI TÍCH
   * ============================================================ */
  const calculusState = {
    tab: "derivative",
    expr: "x^3 - 3*x + 1",
    point: "1",
    order: "1",
    intA: "0",
    intB: "3.141592653589793",
    limitPoint: "0",
    direction: "both",
    extA: "-3",
    extB: "3"
  };
  let calculusResult = "";

  function calculusTidy(value) {
    if (!Number.isFinite(value)) return value;
    if (Math.abs(value) < 1e-10) return 0;
    const nearest = Math.round(value);
    if (Math.abs(value - nearest) < 5e-6) return nearest;
    return value;
  }

  function calculusNumber(value, label) {
    const number = Number(String(value).replace(",", "."));
    if (!Number.isFinite(number)) throw new E.CalcError("Syntax ERROR", `${label} không hợp lệ`);
    return number;
  }

  function calculusEval(expr, x) {
    const source = String(expr || "").trim();
    if (!source) throw new E.CalcError("Syntax ERROR", "Chưa nhập biểu thức f(x)");
    let result;
    try {
      result = E.evaluate(source, {
        vars: Object.assign({}, state.vars, { X: x }),
        ans: state.ans,
        angleUnit: state.settings.angleUnit
      });
    } catch (error) {
      throw new E.CalcError(error.code || "Math ERROR", error.detail || `Không tính được f(${formatNumericText(x)})`);
    }
    if (Math.abs(result.im) > 1e-8 || !Number.isFinite(result.re)) {
      throw new E.CalcError("Math ERROR", `f(${formatNumericText(x)}) không phải số thực hữu hạn`);
    }
    return result.re;
  }

  function calculusDerivativeAt(f, x, order) {
    const scale = Math.max(1, Math.abs(x));
    if (order === 2) {
      const h = scale * 1e-3;
      const g1 = f(x + h), g2 = f(x + 2 * h), g3 = f(x - h), g4 = f(x - 2 * h);
      return calculusTidy((-g2 + 16 * g1 - 30 * f(x) + 16 * g3 - g4) / (12 * h * h));
    }
    const h = scale * 1e-4;
    const f1 = f(x + h), f2 = f(x + 2 * h), f3 = f(x - h), f4 = f(x - 2 * h);
    return calculusTidy((-f2 + 8 * f1 - 8 * f3 + f4) / (12 * h));
  }

  function calculusIntegral(f, a, b) {
    if (a === b) return 0;
    let sign = 1;
    if (a > b) {
      const temp = a;
      a = b;
      b = temp;
      sign = -1;
    }
    const simpson = (x0, x2, f0, f1, f2) => ((x2 - x0) / 6) * (f0 + 4 * f1 + f2);
    const fa = f(a), fb = f(b), fm = f((a + b) / 2);
    if (![fa, fb, fm].every(Number.isFinite)) throw new E.CalcError("Math ERROR", "Hàm số không hữu hạn trên khoảng tích phân");
    const whole = simpson(a, b, fa, fm, fb);
    const tolerance = 1e-10 * Math.max(1, Math.abs(whole));
    function recurse(a0, b0, f0, fm0, f1, whole0, level) {
      const m = (a0 + b0) / 2;
      const lm = (a0 + m) / 2;
      const rm = (m + b0) / 2;
      const flm = f(lm), frm = f(rm);
      if (![flm, frm].every(Number.isFinite)) throw new E.CalcError("Math ERROR", "Hàm số không hữu hạn trên khoảng tích phân");
      const left = simpson(a0, m, f0, flm, fm0);
      const right = simpson(m, b0, fm0, frm, f1);
      const delta = left + right - whole0;
      if (level <= 0 || Math.abs(delta) <= 15 * tolerance) return left + right + delta / 15;
      return recurse(a0, m, f0, flm, fm0, left, level - 1) + recurse(m, b0, fm0, frm, f1, right, level - 1);
    }
    return calculusTidy(sign * recurse(a, b, fa, fm, fb, whole, 14));
  }

  function calculusSideLimit(f, x0, side) {
    const steps = [1e-1, 3e-2, 1e-2, 3e-3, 1e-3, 3e-4, 1e-4, 3e-5, 1e-5, 3e-6, 1e-6];
    const samples = [];
    for (const h of steps) {
      const x = x0 + (side === "left" ? -h : h);
      try {
        const y = f(x);
        if (Number.isFinite(y)) samples.push({ h, y });
      } catch (error) { /* thử bước nhỏ hơn */ }
    }
    if (!samples.length) throw new E.CalcError("Math ERROR", "Không tính được giới hạn ở lân cận điểm này");
    const last = samples[samples.length - 1].y;
    const previous = samples.length > 1 ? samples[samples.length - 2].y : last;
    if (Math.abs(last) > 1e8 || (Math.abs(last) > 1e4 && Math.abs(last) > Math.abs(previous) * 8)) {
      return { value: Math.sign(last) * Infinity, diverges: true };
    }
    return { value: calculusTidy(last), diverges: false };
  }

  function calculusLimitText(result) {
    if (!result) return "Không tồn tại";
    if (result.diverges) return result.value > 0 ? "+∞" : "−∞";
    return formatNumericText(calculusTidy(result.value));
  }

  function calculusFindExtrema(f, a, b) {
    if (!(a < b)) throw new E.CalcError("Range ERROR", "Cần khoảng [a; b] với a < b");
    const count = 600;
    const span = b - a;
    const xs = [];
    const ys = [];
    for (let i = 0; i <= count; i++) {
      const x = a + (span * i) / count;
      xs.push(x);
      ys.push(f(x));
    }
    const extrema = [];
    for (let i = 1; i < count; i++) {
      const left = ys[i] - ys[i - 1];
      const right = ys[i + 1] - ys[i];
      if (left === 0 || right === 0 || left * right >= 0) continue;
      const isMax = left > 0 && right < 0;
      let lo = xs[i - 1];
      let hi = xs[i + 1];
      for (let iter = 0; iter < 70; iter++) {
        const m1 = lo + (hi - lo) / 3;
        const m2 = hi - (hi - lo) / 3;
        const f1 = f(m1);
        const f2 = f(m2);
        if (isMax ? f1 < f2 : f1 > f2) lo = m1;
        else hi = m2;
      }
      const x = (lo + hi) / 2;
      if (extrema.some((item) => Math.abs(item.x - x) < 1e-5)) continue;
      extrema.push({ x, y: f(x), kind: isMax ? "max" : "min" });
    }
    extrema.sort((u, v) => u.x - v.x);
    return { extrema, endpoints: [{ x: a, y: f(a) }, { x: b, y: f(b) }] };
  }

  function calculusExtremumMarkup(item) {
    return `<div class="calc-extremum">
      <span class="calc-extremum-badge ${item.kind}">${item.kind === "max" ? "CĐ" : "CT"}</span>
      <div><b>${item.kind === "max" ? "Cực đại" : "Cực tiểu"}</b><small>x = ${formatNumericText(calculusTidy(item.x))}</small></div>
      <strong>f(x) = ${formatNumericText(calculusTidy(item.y))}</strong>
    </div>`;
  }

  function calculusFormMarkup() {
    const tab = calculusState.tab;
    const exprField = `<div class="field field-wide"><label>Biểu thức f(x)</label><input data-calc="expr" value="${escapeHtml(calculusState.expr)}" placeholder="ví dụ: x^3 - 3*x + 1"></div>`;
    if (tab === "derivative") {
      return exprField + `<div class="form-grid three" style="margin-top:10px">
        <div class="field"><label>Điểm x₀</label><input data-calc="point" value="${escapeHtml(calculusState.point)}" inputmode="decimal"></div>
        <div class="field"><label>Đạo hàm</label><select data-calc="order"><option value="1" ${calculusState.order === "1" ? "selected" : ""}>Bậc 1 · f'(x)</option><option value="2" ${calculusState.order === "2" ? "selected" : ""}>Bậc 2 · f''(x)</option></select></div>
      </div>`;
    }
    if (tab === "integral") {
      return exprField + `<div class="form-grid three" style="margin-top:10px">
        <div class="field"><label>Cận dưới a</label><input data-calc="intA" value="${escapeHtml(calculusState.intA)}" inputmode="decimal"></div>
        <div class="field"><label>Cận trên b</label><input data-calc="intB" value="${escapeHtml(calculusState.intB)}" inputmode="decimal"></div>
      </div>`;
    }
    if (tab === "limit") {
      return exprField + `<div class="form-grid three" style="margin-top:10px">
        <div class="field"><label>Điểm tới x₀</label><input data-calc="limitPoint" value="${escapeHtml(calculusState.limitPoint)}" inputmode="decimal"></div>
        <div class="field"><label>Hướng tới</label><select data-calc="direction"><option value="both" ${calculusState.direction === "both" ? "selected" : ""}>Hai phía</option><option value="left" ${calculusState.direction === "left" ? "selected" : ""}>Bên trái</option><option value="right" ${calculusState.direction === "right" ? "selected" : ""}>Bên phải</option></select></div>
      </div>`;
    }
    return exprField + `<div class="form-grid three" style="margin-top:10px">
      <div class="field"><label>Đầu đoạn a</label><input data-calc="extA" value="${escapeHtml(calculusState.extA)}" inputmode="decimal"></div>
      <div class="field"><label>Cuối đoạn b</label><input data-calc="extB" value="${escapeHtml(calculusState.extB)}" inputmode="decimal"></div>
    </div>`;
  }

  function calculusResultMarkup() {
    return calculusResult || `<div class="result-empty">Nhập hàm số rồi bấm <b>Tính</b> để xem kết quả.</div>`;
  }

  function runCalculus(root) {
    const results = $("#calcResults", root);
    try {
      $$("[data-calc]", root).forEach((input) => { calculusState[input.dataset.calc] = input.value; });
      const expr = calculusState.expr.trim();
      const f = (x) => calculusEval(expr, x);
      const tab = calculusState.tab;
      if (tab === "derivative") {
        const x0 = calculusNumber(calculusState.point, "Điểm x₀");
        const order = calculusState.order === "2" ? 2 : 1;
        const y = calculusTidy(f(x0));
        const d1 = calculusDerivativeAt(f, x0, 1);
        const d2 = calculusDerivativeAt(f, x0, 2);
        const value = order === 2 ? d2 : d1;
        const tangentX = `(x ${x0 < 0 ? "+" : "−"} ${formatNumericText(Math.abs(x0))})`;
        const tangentY = y < 0 ? `− ${formatNumericText(Math.abs(y))}` : `+ ${formatNumericText(y)}`;
        const tangent = `y = ${formatNumericText(d1)}·${tangentX} ${tangentY}`;
        calculusResult = card(
          order === 2 ? "ĐẠO HÀM BẬC 2" : "ĐẠO HÀM TẠI ĐIỂM",
          formatNumericText(calculusTidy(value)),
          `f(x) = ${escapeHtml(expr)} · x₀ = ${formatNumericText(x0)}`
        ) +
          `<div class="metric-grid">
            ${metric("f(x₀)", formatNumericText(y), true)}
            ${metric("f'(x₀)", formatNumericText(d1), true)}
            ${metric("f''(x₀)", formatNumericText(d2))}
            ${metric("Độ dốc tiếp tuyến", formatNumericText(d1))}
          </div>
          <div class="prob-formula"><span>TIẾP TUYẾN TẠI x₀</span><code>${escapeHtml(tangent)}</code></div>
          <div class="settings-note" style="margin-top:12px">Đạo hàm được tính bằng sai phân hữu hạn 5 điểm. Kết quả có thể sai khác nhỏ tại điểm không khả vi hoặc gần điểm kỳ dị.</div>`;
      } else if (tab === "integral") {
        const a = calculusNumber(calculusState.intA, "Cận dưới");
        const b = calculusNumber(calculusState.intB, "Cận trên");
        const value = calculusIntegral(f, a, b);
        calculusResult = card("TÍCH PHÂN XÁC ĐỊNH", formatNumericText(value), `∫ f(x) dx từ ${formatNumericText(a)} đến ${formatNumericText(b)}`) +
          `<div class="metric-grid">
            ${metric("I", formatNumericText(value), true)}
            ${metric("Diện tích hình học", formatNumericText(Math.abs(value)))}
            ${metric("Cận dưới", formatNumericText(a))}
            ${metric("Cận trên", formatNumericText(b))}
          </div>
          <div class="prob-formula"><span>BIỂU THỨC</span><code>∫ (${escapeHtml(expr)}) dx trên [${formatNumericText(a)}; ${formatNumericText(b)}]</code></div>
          <div class="settings-note" style="margin-top:12px">Tích phân dùng Simpson thích nghi, phù hợp với hàm liên tục trên đoạn. Nếu hàm có điểm gián đoạn, hãy tách khoảng tích phân.</div>`;
      } else if (tab === "limit") {
        const x0 = calculusNumber(calculusState.limitPoint, "Điểm tới x₀");
        const direction = calculusState.direction;
        let left = null;
        let right = null;
        if (direction !== "right") {
          try { left = calculusSideLimit(f, x0, "left"); } catch (error) { left = null; }
        }
        if (direction !== "left") {
          try { right = calculusSideLimit(f, x0, "right"); } catch (error) { right = null; }
        }
        if (!left && !right) throw new E.CalcError("Math ERROR", "Không tính được giới hạn ở lân cận điểm này");
        let main = null;
        let existence = true;
        if (direction === "both") {
          if (!left || !right) {
            existence = false;
          } else if (left.diverges && right.diverges && Math.sign(left.value) === Math.sign(right.value)) {
            main = left.value > 0 ? { value: Infinity, diverges: true } : { value: -Infinity, diverges: true };
          } else if (!left.diverges && !right.diverges && Math.abs(left.value - right.value) <= 1e-5 * Math.max(1, Math.abs(left.value), Math.abs(right.value))) {
            main = { value: calculusTidy((left.value + right.value) / 2), diverges: false };
          } else {
            existence = false;
          }
        } else {
          main = direction === "left" ? left : right;
          existence = !!main;
        }
        const mainText = existence ? calculusLimitText(main) : "Không tồn tại";
        calculusResult = card("GIỚI HẠN", mainText, `lim f(x) khi x → ${formatNumericText(x0)}${direction === "left" ? "⁻" : direction === "right" ? "⁺" : ""}`) +
          `<div class="metric-grid">
            ${metric("Giới hạn trái", left ? calculusLimitText(left) : "—", true)}
            ${metric("Giới hạn phải", right ? calculusLimitText(right) : "—", true)}
            ${metric("Giá trị f(x₀)", (() => { try { return formatNumericText(calculusTidy(f(x0))); } catch (e) { return "không xác định"; } })())}
            ${metric("Kết luận", existence ? "Tồn tại" : "Không tồn tại")}
          </div>
          ${existence ? "" : `<div class="notice error" style="margin-top:12px"><span class="notice-icon">!</span><span>Giới hạn trái và phải không trùng nhau hoặc không xác định, nên giới hạn hai phía không tồn tại.</span></div>`}
          <div class="settings-note" style="margin-top:12px">Giới hạn được ước lượng bằng cách tiến sát điểm x₀. Với hàm dao động mạnh, kết quả số chỉ mang tính tham khảo.</div>`;
      } else {
        const a = calculusNumber(calculusState.extA, "Đầu đoạn");
        const b = calculusNumber(calculusState.extB, "Cuối đoạn");
        const found = calculusFindExtrema(f, a, b);
        const candidates = found.extrema.concat(found.endpoints.map((item) => ({ x: item.x, y: item.y, kind: "end" })));
        const max = candidates.reduce((best, item) => item.y > best.y ? item : best);
        const min = candidates.reduce((best, item) => item.y < best.y ? item : best);
        calculusResult = card("CỰC TRỊ TRÊN ĐOẠN", `${found.extrema.length} điểm tới hạn`, `[${formatNumericText(a)}; ${formatNumericText(b)}]`) +
          `<div class="metric-grid">
            ${metric("Giá trị lớn nhất", formatNumericText(calculusTidy(max.y)), true)}
            ${metric("Giá trị nhỏ nhất", formatNumericText(calculusTidy(min.y)), true)}
            ${metric("Điểm đạt max", `x = ${formatNumericText(calculusTidy(max.x))}`)}
            ${metric("Điểm đạt min", `x = ${formatNumericText(calculusTidy(min.x))}`)}
          </div>
          ${found.extrema.length ? `<div class="calc-extrema">${found.extrema.map(calculusExtremumMarkup).join("")}</div>` : `<div class="result-empty" style="margin-top:12px">Không tìm thấy cực trị trong khoảng đã chọn.</div>`}
          <div class="settings-note" style="margin-top:12px">Cực trị được dò bằng mẫu 600 điểm rồi tinh chỉnh bằng tìm kiếm tam phân; giá trị max/min có xét cả hai đầu đoạn.</div>`;
      }
      results.innerHTML = calculusResult;
    } catch (error) {
      calculusResult = errorBox(error);
      results.innerHTML = calculusResult;
    }
  }

  function openCalculusWorkspace(tab) {
    closeModal();
    if (tab) calculusState.tab = tab;
    if (!["derivative", "integral", "limit", "extrema"].includes(calculusState.tab)) calculusState.tab = "derivative";
    const tabs = [["derivative", "Đạo hàm"], ["integral", "Tích phân"], ["limit", "Giới hạn"], ["extrema", "Cực trị"]];
    const lead = calculusState.tab === "derivative"
      ? "Tính đạo hàm bậc 1 hoặc bậc 2 tại một điểm, kèm phương trình tiếp tuyến."
      : calculusState.tab === "integral"
        ? "Tính tích phân xác định và diện tích hình học của hàm số trên một đoạn."
        : calculusState.tab === "limit"
          ? "Ước lượng giới hạn một phía hoặc hai phía khi x tiến tới một điểm."
          : "Tìm cực đại, cực tiểu và giá trị lớn nhất/nhỏ nhất trên một đoạn.";
    const body = workspaceLead(lead) +
      `<div class="segmented">${tabs.map(([id, label]) => `<button class="seg-btn ${calculusState.tab === id ? "is-active" : ""}" type="button" data-calc-tab="${id}">${label}</button>`).join("")}</div>
      <div class="calc-form">${calculusFormMarkup()}</div>
      <div class="button-row"><button class="btn primary" type="button" id="calcRun">Tính</button><button class="btn ghost small" type="button" id="calcSample">Ví dụ</button></div>
      <div id="calcResults" style="margin-top:16px">${calculusResultMarkup()}</div>
      <div class="button-row between"><span class="tiny-label">Biến độc lập là X. Đơn vị góc theo cài đặt hiện tại.</span><button class="btn ghost small" type="button" data-close-modal>Đóng</button></div>`;
    openModal({
      title: "Giải tích",
      kicker: "CALCULUS LAB · ĐẠO HÀM / TÍCH PHÂN",
      icon: "calculus",
      wide: true,
      body,
      onMount(root) {
        $$("[data-calc-tab]", root).forEach((button) => button.addEventListener("click", () => {
          calculusResult = "";
          openCalculusWorkspace(button.dataset.calcTab);
        }));
        $$("[data-calc]", root).forEach((input) => {
          const update = () => { calculusState[input.dataset.calc] = input.value; };
          input.addEventListener("input", update);
          input.addEventListener("change", update);
        });
        $("#calcRun", root).addEventListener("click", () => runCalculus(root));
        $("#calcSample", root).addEventListener("click", () => {
          if (calculusState.tab === "derivative") {
            Object.assign(calculusState, { expr: "x^3 - 3*x + 1", point: "1", order: "1" });
          } else if (calculusState.tab === "integral") {
            Object.assign(calculusState, { expr: "x^2", intA: "0", intB: "1" });
          } else if (calculusState.tab === "limit") {
            Object.assign(calculusState, { expr: "(x^2-1)/(x-1)", limitPoint: "1", direction: "both" });
          } else {
            Object.assign(calculusState, { expr: "x^3 - 3*x + 1", extA: "-3", extB: "3" });
          }
          calculusResult = "";
          openCalculusWorkspace();
        });
      }
    });
  }

  /* ============================================================
   * CÔNG CỤ MỞ RỘNG: HÌNH HỌC GIẢI TÍCH
   * ============================================================ */
  const geometryState = {
    tab: "points",
    ax: "0", ay: "0", bx: "3", by: "4",
    px: "1", py: "2", la: "1", lb: "-1", lc: "0",
    c1x: "1", c1y: "0", c2x: "0", c2y: "1", c3x: "-1", c3y: "0",
    p1x: "0", p1y: "0", p1z: "0",
    p2x: "1", p2y: "0", p2z: "0",
    p3x: "0", p3y: "1", p3z: "0",
    qx: "0", qy: "0", qz: "1"
  };
  let geometryResult = "";

  function geoNumber(value, label) {
    const number = Number(String(value).replace(",", "."));
    if (!Number.isFinite(number)) throw new E.CalcError("Syntax ERROR", `${label} không hợp lệ`);
    return number;
  }

  function geoTerms(coeffs, names) {
    let out = "";
    coeffs.forEach((value, index) => {
      if (Math.abs(value) < 1e-12) return;
      const abs = formatNumericText(Math.abs(value));
      const unit = Math.abs(Math.abs(value) - 1) < 1e-12 && names[index];
      const term = `${unit ? "" : abs}${names[index] || ""}`;
      out += out ? ` ${value < 0 ? "−" : "+"} ${term}` : `${value < 0 ? "−" : ""}${term}`;
    });
    return out || "0";
  }

  function geoDistance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function geoAngleDegrees(dx, dy) {
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }

  function geoCircleEquation(h, k, r) {
    const xPart = Math.abs(h) < 1e-12 ? "x²" : `(x ${h < 0 ? "+" : "−"} ${formatNumericText(Math.abs(h))})²`;
    const yPart = Math.abs(k) < 1e-12 ? "y²" : `(y ${k < 0 ? "+" : "−"} ${formatNumericText(Math.abs(k))})²`;
    return `${xPart} + ${yPart} = ${formatNumericText(r * r)}`;
  }

  function geometryFormMarkup() {
    const tab = geometryState.tab;
    if (tab === "points") {
      return `<div class="form-grid four">
        <div class="field"><label>Điểm A · x</label><input data-geo="ax" value="${escapeHtml(geometryState.ax)}" inputmode="decimal"></div>
        <div class="field"><label>Điểm A · y</label><input data-geo="ay" value="${escapeHtml(geometryState.ay)}" inputmode="decimal"></div>
        <div class="field"><label>Điểm B · x</label><input data-geo="bx" value="${escapeHtml(geometryState.bx)}" inputmode="decimal"></div>
        <div class="field"><label>Điểm B · y</label><input data-geo="by" value="${escapeHtml(geometryState.by)}" inputmode="decimal"></div>
      </div>
      <div class="section-title"><h3>Khoảng cách điểm tới đường thẳng</h3><span>ax + by + c = 0</span></div>
      <div class="form-grid four">
        <div class="field"><label>Điểm P · x</label><input data-geo="px" value="${escapeHtml(geometryState.px)}" inputmode="decimal"></div>
        <div class="field"><label>Điểm P · y</label><input data-geo="py" value="${escapeHtml(geometryState.py)}" inputmode="decimal"></div>
        <div class="field"><label>Hệ số a</label><input data-geo="la" value="${escapeHtml(geometryState.la)}" inputmode="decimal"></div>
        <div class="field"><label>Hệ số b</label><input data-geo="lb" value="${escapeHtml(geometryState.lb)}" inputmode="decimal"></div>
        <div class="field"><label>Hệ số c</label><input data-geo="lc" value="${escapeHtml(geometryState.lc)}" inputmode="decimal"></div>
      </div>`;
    }
    if (tab === "circle") {
      return `<div class="form-grid four">
        <div class="field"><label>Điểm A · x</label><input data-geo="c1x" value="${escapeHtml(geometryState.c1x)}" inputmode="decimal"></div>
        <div class="field"><label>Điểm A · y</label><input data-geo="c1y" value="${escapeHtml(geometryState.c1y)}" inputmode="decimal"></div>
        <div class="field"><label>Điểm B · x</label><input data-geo="c2x" value="${escapeHtml(geometryState.c2x)}" inputmode="decimal"></div>
        <div class="field"><label>Điểm B · y</label><input data-geo="c2y" value="${escapeHtml(geometryState.c2y)}" inputmode="decimal"></div>
        <div class="field"><label>Điểm C · x</label><input data-geo="c3x" value="${escapeHtml(geometryState.c3x)}" inputmode="decimal"></div>
        <div class="field"><label>Điểm C · y</label><input data-geo="c3y" value="${escapeHtml(geometryState.c3y)}" inputmode="decimal"></div>
      </div>`;
    }
    return `<div class="form-grid four">
      <div class="field"><label>P₁ · x</label><input data-geo="p1x" value="${escapeHtml(geometryState.p1x)}" inputmode="decimal"></div>
      <div class="field"><label>P₁ · y</label><input data-geo="p1y" value="${escapeHtml(geometryState.p1y)}" inputmode="decimal"></div>
      <div class="field"><label>P₁ · z</label><input data-geo="p1z" value="${escapeHtml(geometryState.p1z)}" inputmode="decimal"></div>
      <div class="field"><label>P₂ · x</label><input data-geo="p2x" value="${escapeHtml(geometryState.p2x)}" inputmode="decimal"></div>
      <div class="field"><label>P₂ · y</label><input data-geo="p2y" value="${escapeHtml(geometryState.p2y)}" inputmode="decimal"></div>
      <div class="field"><label>P₂ · z</label><input data-geo="p2z" value="${escapeHtml(geometryState.p2z)}" inputmode="decimal"></div>
      <div class="field"><label>P₃ · x</label><input data-geo="p3x" value="${escapeHtml(geometryState.p3x)}" inputmode="decimal"></div>
      <div class="field"><label>P₃ · y</label><input data-geo="p3y" value="${escapeHtml(geometryState.p3y)}" inputmode="decimal"></div>
      <div class="field"><label>P₃ · z</label><input data-geo="p3z" value="${escapeHtml(geometryState.p3z)}" inputmode="decimal"></div>
      <div class="field"><label>Điểm Q · x</label><input data-geo="qx" value="${escapeHtml(geometryState.qx)}" inputmode="decimal"></div>
      <div class="field"><label>Điểm Q · y</label><input data-geo="qy" value="${escapeHtml(geometryState.qy)}" inputmode="decimal"></div>
      <div class="field"><label>Điểm Q · z</label><input data-geo="qz" value="${escapeHtml(geometryState.qz)}" inputmode="decimal"></div>
    </div>`;
  }

  function geometryResultMarkup() {
    return geometryResult || `<div class="result-empty">Nhập tọa độ rồi bấm <b>Tính</b> để xem kết quả.</div>`;
  }

  function runGeometry(root) {
    const results = $("#geoResults", root);
    try {
      $$("[data-geo]", root).forEach((input) => { geometryState[input.dataset.geo] = input.value; });
      const tab = geometryState.tab;
      if (tab === "points") {
        const ax = geoNumber(geometryState.ax, "Tọa độ A");
        const ay = geoNumber(geometryState.ay, "Tọa độ A");
        const bx = geoNumber(geometryState.bx, "Tọa độ B");
        const by = geoNumber(geometryState.by, "Tọa độ B");
        const px = geoNumber(geometryState.px, "Tọa độ P");
        const py = geoNumber(geometryState.py, "Tọa độ P");
        const la = geoNumber(geometryState.la, "Hệ số a");
        const lb = geoNumber(geometryState.lb, "Hệ số b");
        const lc = geoNumber(geometryState.lc, "Hệ số c");
        if (Math.hypot(la, lb) < 1e-14) throw new E.CalcError("Math ERROR", "Đường thẳng cần a và b không đồng thời bằng 0");
        const distance = geoDistance(ax, ay, bx, by);
        const dx = bx - ax;
        const dy = by - ay;
        if (distance < 1e-14) throw new E.CalcError("Math ERROR", "A và B phải là hai điểm phân biệt");
        const slope = Math.abs(dx) < 1e-14 ? null : dy / dx;
        const lineCoeffs = [ay - by, bx - ax, ax * by - bx * ay];
        const pointLineDistance = Math.abs(la * px + lb * py + lc) / Math.hypot(la, lb);
        geometryResult = card("KHOẢNG CÁCH HAI ĐIỂM", formatNumericText(distance), `A(${formatNumericText(ax)}; ${formatNumericText(ay)}) → B(${formatNumericText(bx)}; ${formatNumericText(by)})`) +
          `<div class="metric-grid">
            ${metric("Khoảng cách AB", formatNumericText(distance), true)}
            ${metric("Trung điểm · x", formatNumericText((ax + bx) / 2))}
            ${metric("Trung điểm · y", formatNumericText((ay + by) / 2))}
            ${metric("Hệ số góc", slope == null ? "Không xác định" : formatNumericText(slope))}
            ${metric("Góc với trục Ox", `${formatNumericText(geoAngleDegrees(dx, dy))}°`)}
            ${metric("Vectơ AB", `(${formatNumericText(dx)}; ${formatNumericText(dy)})`)}
          </div>
          <div class="prob-formula"><span>PHƯƠNG TRÌNH ĐƯỜNG THẲNG AB</span><code>${escapeHtml(geoTerms(lineCoeffs, ["x", "y", ""]))} = 0</code></div>
          <div class="section-title"><h3>Điểm P tới đường thẳng</h3><span>${escapeHtml(geoTerms([la, lb, lc], ["x", "y", ""]))} = 0</span></div>
          <div class="metric-grid">
            ${metric("Khoảng cách", formatNumericText(pointLineDistance), true)}
            ${metric("Điểm P", `(${formatNumericText(px)}; ${formatNumericText(py)})`)}
            ${metric("Pháp tuyến", `(${formatNumericText(la)}; ${formatNumericText(lb)})`)}
          </div>
          <div class="settings-note" style="margin-top:12px">Góc được tính theo độ, không phụ thuộc cài đặt đơn vị góc của máy.</div>`;
      } else if (tab === "circle") {
        const x1 = geoNumber(geometryState.c1x, "Tọa độ A");
        const y1 = geoNumber(geometryState.c1y, "Tọa độ A");
        const x2 = geoNumber(geometryState.c2x, "Tọa độ B");
        const y2 = geoNumber(geometryState.c2y, "Tọa độ B");
        const x3 = geoNumber(geometryState.c3x, "Tọa độ C");
        const y3 = geoNumber(geometryState.c3y, "Tọa độ C");
        const determinant = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
        if (Math.abs(determinant) < 1e-12) throw new E.CalcError("Math ERROR", "Ba điểm thẳng hàng nên không xác định được đường tròn");
        const q1 = x1 * x1 + y1 * y1;
        const q2 = x2 * x2 + y2 * y2;
        const q3 = x3 * x3 + y3 * y3;
        const h = (q1 * (y2 - y3) + q2 * (y3 - y1) + q3 * (y1 - y2)) / determinant;
        const k = (q1 * (x3 - x2) + q2 * (x1 - x3) + q3 * (x2 - x1)) / determinant;
        const r = Math.hypot(x1 - h, y1 - k);
        geometryResult = card("ĐƯỜNG TRÒN QUA 3 ĐIỂM", `R = ${formatNumericText(r)}`, geoCircleEquation(h, k, r)) +
          `<div class="metric-grid">
            ${metric("Tâm · x", formatNumericText(h), true)}
            ${metric("Tâm · y", formatNumericText(k), true)}
            ${metric("Bán kính", formatNumericText(r), true)}
            ${metric("Đường kính", formatNumericText(2 * r))}
            ${metric("Chu vi", formatNumericText(2 * Math.PI * r))}
            ${metric("Diện tích", formatNumericText(Math.PI * r * r))}
          </div>
          <div class="prob-formula"><span>PHƯƠNG TRÌNH ĐƯỜNG TRÒN</span><code>${escapeHtml(geoCircleEquation(h, k, r))}</code></div>
          <div class="settings-note" style="margin-top:12px">Đường tròn được xác định duy nhất khi ba điểm không thẳng hàng.</div>`;
      } else {
        const x1 = geoNumber(geometryState.p1x, "Tọa độ P₁");
        const y1 = geoNumber(geometryState.p1y, "Tọa độ P₁");
        const z1 = geoNumber(geometryState.p1z, "Tọa độ P₁");
        const x2 = geoNumber(geometryState.p2x, "Tọa độ P₂");
        const y2 = geoNumber(geometryState.p2y, "Tọa độ P₂");
        const z2 = geoNumber(geometryState.p2z, "Tọa độ P₂");
        const x3 = geoNumber(geometryState.p3x, "Tọa độ P₃");
        const y3 = geoNumber(geometryState.p3y, "Tọa độ P₃");
        const z3 = geoNumber(geometryState.p3z, "Tọa độ P₃");
        const qx = geoNumber(geometryState.qx, "Tọa độ Q");
        const qy = geoNumber(geometryState.qy, "Tọa độ Q");
        const qz = geoNumber(geometryState.qz, "Tọa độ Q");
        const ux = x2 - x1, uy = y2 - y1, uz = z2 - z1;
        const vx = x3 - x1, vy = y3 - y1, vz = z3 - z1;
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const normalLength = Math.hypot(nx, ny, nz);
        if (normalLength < 1e-12) throw new E.CalcError("Math ERROR", "Ba điểm thẳng hàng nên không xác định được mặt phẳng");
        const d = -(nx * x1 + ny * y1 + nz * z1);
        const distanceQ = Math.abs(nx * qx + ny * qy + nz * qz + d) / normalLength;
        const triangleArea = normalLength / 2;
        geometryResult = card("MẶT PHẲNG QUA 3 ĐIỂM", geoTerms([nx, ny, nz, d], ["x", "y", "z", ""]) + " = 0", `P₁(${formatNumericText(x1)}; ${formatNumericText(y1)}; ${formatNumericText(z1)})`) +
          `<div class="metric-grid">
            ${metric("Pháp tuyến n", `(${formatNumericText(nx)}; ${formatNumericText(ny)}; ${formatNumericText(nz)})`, true)}
            ${metric("|n|", formatNumericText(normalLength))}
            ${metric("Diện tích tam giác", formatNumericText(triangleArea))}
            ${metric("Khoảng cách Q → mặt phẳng", formatNumericText(distanceQ), true)}
            ${metric("P₁P₂", formatNumericText(Math.hypot(ux, uy, uz)))}
            ${metric("P₁P₃", formatNumericText(Math.hypot(vx, vy, vz)))}
          </div>
          <div class="prob-formula"><span>PHƯƠNG TRÌNH MẶT PHẲNG</span><code>${escapeHtml(geoTerms([nx, ny, nz, d], ["x", "y", "z", ""]))} = 0</code></div>
          <div class="text-block"><b>Vectơ chỉ phương:</b> P₁P₂ = (${formatNumericText(ux)}; ${formatNumericText(uy)}; ${formatNumericText(uz)}) · P₁P₃ = (${formatNumericText(vx)}; ${formatNumericText(vy)}; ${formatNumericText(vz)})</div>
          <div class="settings-note" style="margin-top:12px">Q là điểm dùng để tính khoảng cách tới mặt phẳng; có thể đổi tọa độ Q tùy ý.</div>`;
      }
      results.innerHTML = geometryResult;
    } catch (error) {
      geometryResult = errorBox(error);
      results.innerHTML = geometryResult;
    }
  }

  function openGeometryWorkspace(tab) {
    closeModal();
    if (tab) geometryState.tab = tab;
    if (!["points", "circle", "plane"].includes(geometryState.tab)) geometryState.tab = "points";
    const tabs = [["points", "Điểm & đường"], ["circle", "Đường tròn"], ["plane", "Mặt phẳng 3D"]];
    const lead = geometryState.tab === "points"
      ? "Tính khoảng cách, trung điểm, hệ số góc, phương trình đường thẳng và khoảng cách từ điểm tới đường."
      : geometryState.tab === "circle"
        ? "Xác định tâm, bán kính và phương trình đường tròn đi qua ba điểm không thẳng hàng."
        : "Lập phương trình mặt phẳng qua ba điểm, tính diện tích tam giác và khoảng cách từ điểm tới mặt phẳng.";
    const body = workspaceLead(lead) +
      `<div class="segmented">${tabs.map(([id, label]) => `<button class="seg-btn ${geometryState.tab === id ? "is-active" : ""}" type="button" data-geo-tab="${id}">${label}</button>`).join("")}</div>
      <div class="geo-form">${geometryFormMarkup()}</div>
      <div class="button-row"><button class="btn primary" type="button" id="geoRun">Tính</button><button class="btn ghost small" type="button" id="geoSample">Ví dụ</button></div>
      <div id="geoResults" style="margin-top:16px">${geometryResultMarkup()}</div>
      <div class="button-row between"><span class="tiny-label">Tọa độ phẳng dùng đơn vị độ dài tùy chọn.</span><button class="btn ghost small" type="button" data-close-modal>Đóng</button></div>`;
    openModal({
      title: "Hình học giải tích",
      kicker: "ANALYTIC GEOMETRY · 2D / 3D",
      icon: "geometry",
      wide: true,
      body,
      onMount(root) {
        $$("[data-geo-tab]", root).forEach((button) => button.addEventListener("click", () => {
          geometryResult = "";
          openGeometryWorkspace(button.dataset.geoTab);
        }));
        $$("[data-geo]", root).forEach((input) => input.addEventListener("input", () => { geometryState[input.dataset.geo] = input.value; }));
        $("#geoRun", root).addEventListener("click", () => runGeometry(root));
        $("#geoSample", root).addEventListener("click", () => {
          if (geometryState.tab === "points") {
            Object.assign(geometryState, { ax: "0", ay: "0", bx: "3", by: "4", px: "1", py: "2", la: "1", lb: "-1", lc: "0" });
          } else if (geometryState.tab === "circle") {
            Object.assign(geometryState, { c1x: "1", c1y: "0", c2x: "0", c2y: "1", c3x: "-1", c3y: "0" });
          } else {
            Object.assign(geometryState, { p1x: "0", p1y: "0", p1z: "0", p2x: "1", p2y: "0", p2z: "0", p3x: "0", p3y: "1", p3z: "0", qx: "0", qy: "0", qz: "1" });
          }
          geometryResult = "";
          openGeometryWorkspace();
        });
      }
    });
  }

  /* ============================================================
   * CÔNG CỤ MỞ RỘNG: THỐNG KÊ SUY DIỄN
   * ============================================================ */
  const inferenceState = {
    tab: "meanCI",
    mean: "10", sd: "2", n: "25", conf: "95",
    sx: "18", sn: "40", sconf: "95",
    mu0: "10", tmean: "10.6", tsd: "2", tn: "25", alpha: "5", alt: "two",
    p0: "0.5", px: "22", pn: "40", palpha: "5", palt: "two"
  };
  let inferenceResult = "";

  function infNumber(value, label, options) {
    const number = Number(String(value).replace(",", "."));
    if (!Number.isFinite(number)) throw new E.CalcError("Syntax ERROR", `${label} không hợp lệ`);
    if (options && options.positive && number <= 0) throw new E.CalcError("Math ERROR", `${label} phải lớn hơn 0`);
    if (options && options.nonNegative && number < 0) throw new E.CalcError("Math ERROR", `${label} không được âm`);
    return number;
  }

  function infCount(value, label, min) {
    const number = infNumber(value, label);
    if (!Number.isInteger(number) || number < min) throw new E.CalcError("Math ERROR", `${label} phải là số nguyên ≥ ${min}`);
    return number;
  }

  function infConfidence(value) {
    const percent = infNumber(value, "Độ tin cậy", { positive: true });
    if (percent >= 100) throw new E.CalcError("Math ERROR", "Độ tin cậy phải nhỏ hơn 100%");
    return percent / 100;
  }

  function infAlpha(value) {
    const percent = infNumber(value, "Mức ý nghĩa α", { positive: true });
    if (percent >= 100) throw new E.CalcError("Math ERROR", "Mức ý nghĩa phải nhỏ hơn 100%");
    return percent / 100;
  }

  function infPText(p) {
    if (!Number.isFinite(p)) return "—";
    if (p < 0.0001) return "< 0.0001";
    return formatNumericText(p);
  }

  function infDecision(p, alpha) {
    const reject = p < alpha;
    return {
      reject,
      html: `<div class="notice" style="margin-top:12px"><span class="notice-icon">${reject ? "!" : "i"}</span><span>${reject
        ? "Bác bỏ H₀ ở mức ý nghĩa đã chọn: có bằng chứng thống kê chống lại giả thuyết H₀."
        : "Không đủ cơ sở bác bỏ H₀ ở mức ý nghĩa đã chọn."}</span></div>`
    };
  }

  function inferenceFormMarkup() {
    const tab = inferenceState.tab;
    if (tab === "meanCI") {
      return `<div class="form-grid four">
        <div class="field"><label>Trung bình mẫu x̄</label><input data-inf="mean" value="${escapeHtml(inferenceState.mean)}" inputmode="decimal"></div>
        <div class="field"><label>Độ lệch chuẩn mẫu s</label><input data-inf="sd" value="${escapeHtml(inferenceState.sd)}" inputmode="decimal"></div>
        <div class="field"><label>Cỡ mẫu n</label><input data-inf="n" value="${escapeHtml(inferenceState.n)}" inputmode="numeric"></div>
        <div class="field"><label>Độ tin cậy (%)</label><input data-inf="conf" value="${escapeHtml(inferenceState.conf)}" inputmode="decimal"></div>
      </div>`;
    }
    if (tab === "propCI") {
      return `<div class="form-grid four">
        <div class="field"><label>Số thành công x</label><input data-inf="sx" value="${escapeHtml(inferenceState.sx)}" inputmode="numeric"></div>
        <div class="field"><label>Cỡ mẫu n</label><input data-inf="sn" value="${escapeHtml(inferenceState.sn)}" inputmode="numeric"></div>
        <div class="field"><label>Độ tin cậy (%)</label><input data-inf="sconf" value="${escapeHtml(inferenceState.sconf)}" inputmode="decimal"></div>
      </div>`;
    }
    if (tab === "meanTest") {
      return `<div class="form-grid four">
        <div class="field"><label>Giá trị H₀ · μ₀</label><input data-inf="mu0" value="${escapeHtml(inferenceState.mu0)}" inputmode="decimal"></div>
        <div class="field"><label>Trung bình mẫu x̄</label><input data-inf="tmean" value="${escapeHtml(inferenceState.tmean)}" inputmode="decimal"></div>
        <div class="field"><label>Độ lệch chuẩn s</label><input data-inf="tsd" value="${escapeHtml(inferenceState.tsd)}" inputmode="decimal"></div>
        <div class="field"><label>Cỡ mẫu n</label><input data-inf="tn" value="${escapeHtml(inferenceState.tn)}" inputmode="numeric"></div>
        <div class="field"><label>Mức ý nghĩa α (%)</label><input data-inf="alpha" value="${escapeHtml(inferenceState.alpha)}" inputmode="decimal"></div>
        <div class="field"><label>Đối thuyết H₁</label><select data-inf="alt"><option value="two" ${inferenceState.alt === "two" ? "selected" : ""}>μ ≠ μ₀</option><option value="greater" ${inferenceState.alt === "greater" ? "selected" : ""}>μ &gt; μ₀</option><option value="less" ${inferenceState.alt === "less" ? "selected" : ""}>μ &lt; μ₀</option></select></div>
      </div>`;
    }
    return `<div class="form-grid four">
      <div class="field"><label>Tỉ lệ H₀ · p₀</label><input data-inf="p0" value="${escapeHtml(inferenceState.p0)}" inputmode="decimal"></div>
      <div class="field"><label>Số thành công x</label><input data-inf="px" value="${escapeHtml(inferenceState.px)}" inputmode="numeric"></div>
      <div class="field"><label>Cỡ mẫu n</label><input data-inf="pn" value="${escapeHtml(inferenceState.pn)}" inputmode="numeric"></div>
      <div class="field"><label>Mức ý nghĩa α (%)</label><input data-inf="palpha" value="${escapeHtml(inferenceState.palpha)}" inputmode="decimal"></div>
      <div class="field"><label>Đối thuyết H₁</label><select data-inf="palt"><option value="two" ${inferenceState.palt === "two" ? "selected" : ""}>p ≠ p₀</option><option value="greater" ${inferenceState.palt === "greater" ? "selected" : ""}>p &gt; p₀</option><option value="less" ${inferenceState.palt === "less" ? "selected" : ""}>p &lt; p₀</option></select></div>
    </div>`;
  }

  function inferenceResultMarkup() {
    return inferenceResult || `<div class="result-empty">Nhập số liệu rồi bấm <b>Tính</b> để xem kết quả.</div>`;
  }

  function inferenceAlternativeLabel(alt) {
    return alt === "greater" ? "lớn hơn" : alt === "less" ? "nhỏ hơn" : "khác";
  }

  function runInference(root) {
    const results = $("#infResults", root);
    try {
      $$("[data-inf]", root).forEach((input) => { inferenceState[input.dataset.inf] = input.value; });
      const tab = inferenceState.tab;
      if (tab === "meanCI") {
        const mean = infNumber(inferenceState.mean, "Trung bình mẫu");
        const sd = infNumber(inferenceState.sd, "Độ lệch chuẩn", { positive: true });
        const n = infCount(inferenceState.n, "Cỡ mẫu", 2);
        const confidence = infConfidence(inferenceState.conf);
        const alpha = 1 - confidence;
        const df = n - 1;
        const critical = E.studentTInv(1 - alpha / 2, df);
        const se = sd / Math.sqrt(n);
        const margin = critical * se;
        const lo = mean - margin;
        const hi = mean + margin;
        inferenceResult = card("KHOẢNG TIN CẬY TRUNG BÌNH", `[${formatNumericText(lo)}; ${formatNumericText(hi)}]`, `${formatNumericText(confidence * 100)}% · phân phối t (df = ${df})`) +
          `<div class="metric-grid">
            ${metric("x̄", formatNumericText(mean), true)}
            ${metric("s", formatNumericText(sd))}
            ${metric("n", String(n))}
            ${metric("Sai số chuẩn SE", formatNumericText(se))}
            ${metric("t*", formatNumericText(critical))}
            ${metric("Biên sai số", formatNumericText(margin))}
          </div>
          <div class="prob-formula"><span>CÔNG THỨC</span><code>x̄ ± t* · s/√n</code></div>
          <div class="settings-note" style="margin-top:12px">Khoảng tin cậy t áp dụng khi độ lệch chuẩn quần thể chưa biết; giả định mẫu đến từ phân phối chuẩn hoặc cỡ mẫu đủ lớn.</div>`;
      } else if (tab === "propCI") {
        const x = infCount(inferenceState.sx, "Số thành công", 0);
        const n = infCount(inferenceState.sn, "Cỡ mẫu", 1);
        if (x > n) throw new E.CalcError("Math ERROR", "Số thành công không thể lớn hơn cỡ mẫu");
        const confidence = infConfidence(inferenceState.sconf);
        const alpha = 1 - confidence;
        const phat = x / n;
        const z = E.invNormal(1 - alpha / 2);
        const denom = 1 + z * z / n;
        const center = (phat + z * z / (2 * n)) / denom;
        const half = (z / denom) * Math.sqrt(phat * (1 - phat) / n + z * z / (4 * n * n));
        const lo = Math.max(0, center - half);
        const hi = Math.min(1, center + half);
        const se = Math.sqrt(phat * (1 - phat) / n);
        inferenceResult = card("KHOẢNG TIN CẬY TỈ LỆ", `[${formatNumericText(lo)}; ${formatNumericText(hi)}]`, `${formatNumericText(confidence * 100)}% · khoảng Wilson`) +
          `<div class="metric-grid">
            ${metric("p̂", formatNumericText(phat), true)}
            ${metric("x / n", `${x} / ${n}`)}
            ${metric("z*", formatNumericText(z))}
            ${metric("Sai số chuẩn", formatNumericText(se))}
            ${metric("Cận dưới", formatNumericText(lo))}
            ${metric("Cận trên", formatNumericText(hi))}
          </div>
          <div class="prob-formula"><span>CÔNG THỨC WILSON</span><code>p̂ ± z*·√[p̂(1−p̂)/n + z*²/(4n²)] / (1 + z*²/n)</code></div>
          <div class="settings-note" style="margin-top:12px">Khoảng Wilson phù hợp hơn phép xấp xỉ chuẩn khi p̂ gần 0 hoặc 1, hoặc khi cỡ mẫu nhỏ.</div>`;
      } else if (tab === "meanTest") {
        const mu0 = infNumber(inferenceState.mu0, "Giá trị μ₀");
        const mean = infNumber(inferenceState.tmean, "Trung bình mẫu");
        const sd = infNumber(inferenceState.tsd, "Độ lệch chuẩn", { positive: true });
        const n = infCount(inferenceState.tn, "Cỡ mẫu", 2);
        const alpha = infAlpha(inferenceState.alpha);
        const alt = inferenceState.alt;
        const t = (mean - mu0) / (sd / Math.sqrt(n));
        const df = n - 1;
        let p = alt === "two" ? 2 * (1 - E.studentTCdf(Math.abs(t), df)) : alt === "greater" ? 1 - E.studentTCdf(t, df) : E.studentTCdf(t, df);
        p = Math.max(0, Math.min(1, p));
        const decision = infDecision(p, alpha);
        inferenceResult = card("KIỂM ĐỊNH t MỘT MẪU", `p = ${infPText(p)}`, `H₀: μ = ${formatNumericText(mu0)} · H₁: μ ${alt === "greater" ? ">" : alt === "less" ? "<" : "≠"} ${formatNumericText(mu0)}`) +
          `<div class="metric-grid">
            ${metric("Thống kê t", formatNumericText(t), true)}
            ${metric("p-value", infPText(p), true)}
            ${metric("Bậc tự do", String(df))}
            ${metric("x̄", formatNumericText(mean))}
            ${metric("s", formatNumericText(sd))}
            ${metric("n", String(n))}
            ${metric("α", formatNumericText(alpha))}
            ${metric("Kết luận", decision.reject ? "Bác bỏ H₀" : "Chưa bác bỏ H₀")}
          </div>
          ${decision.html}
          <div class="prob-formula"><span>CÔNG THỨC</span><code>t = (x̄ − μ₀) / (s/√n), df = n − 1</code></div>`;
      } else {
        const p0 = infNumber(inferenceState.p0, "Tỉ lệ p₀");
        if (!(p0 > 0 && p0 < 1)) throw new E.CalcError("Math ERROR", "p₀ phải nằm trong (0; 1)");
        const x = infCount(inferenceState.px, "Số thành công", 0);
        const n = infCount(inferenceState.pn, "Cỡ mẫu", 1);
        if (x > n) throw new E.CalcError("Math ERROR", "Số thành công không thể lớn hơn cỡ mẫu");
        const alpha = infAlpha(inferenceState.palpha);
        const alt = inferenceState.palt;
        const phat = x / n;
        const se = Math.sqrt(p0 * (1 - p0) / n);
        const z = (phat - p0) / se;
        let p = alt === "two" ? 2 * (1 - E.normalCdf(Math.abs(z))) : alt === "greater" ? 1 - E.normalCdf(z) : E.normalCdf(z);
        p = Math.max(0, Math.min(1, p));
        const decision = infDecision(p, alpha);
        inferenceResult = card("KIỂM ĐỊNH z MỘT TỈ LỆ", `p = ${infPText(p)}`, `H₀: p = ${formatNumericText(p0)} · H₁: p ${alt === "greater" ? ">" : alt === "less" ? "<" : "≠"} ${formatNumericText(p0)}`) +
          `<div class="metric-grid">
            ${metric("Thống kê z", formatNumericText(z), true)}
            ${metric("p-value", infPText(p), true)}
            ${metric("p̂", formatNumericText(phat))}
            ${metric("x / n", `${x} / ${n}`)}
            ${metric("Sai số chuẩn", formatNumericText(se))}
            ${metric("α", formatNumericText(alpha))}
            ${metric("Kết luận", decision.reject ? "Bác bỏ H₀" : "Chưa bác bỏ H₀")}
          </div>
          ${decision.html}
          <div class="prob-formula"><span>CÔNG THỨC</span><code>z = (p̂ − p₀) / √[p₀(1−p₀)/n]</code></div>
          <div class="settings-note" style="margin-top:12px">Kiểm định z phù hợp khi np₀ ≥ 5 và n(1−p₀) ≥ 5. Đối thuyết: ${inferenceAlternativeLabel(alt)}.</div>`;
      }
      results.innerHTML = inferenceResult;
    } catch (error) {
      inferenceResult = errorBox(error);
      results.innerHTML = inferenceResult;
    }
  }

  function openInferenceWorkspace(tab) {
    closeModal();
    if (tab) inferenceState.tab = tab;
    if (!["meanCI", "propCI", "meanTest", "propTest"].includes(inferenceState.tab)) inferenceState.tab = "meanCI";
    const tabs = [["meanCI", "Khoảng tin cậy μ"], ["propCI", "Khoảng tin cậy p"], ["meanTest", "Kiểm định μ"], ["propTest", "Kiểm định p"]];
    const lead = inferenceState.tab === "meanCI"
      ? "Tính khoảng tin cậy cho trung bình quần thể khi chưa biết độ lệch chuẩn, dùng phân phối t."
      : inferenceState.tab === "propCI"
        ? "Tính khoảng tin cậy cho tỉ lệ quần thể bằng khoảng Wilson."
        : inferenceState.tab === "meanTest"
          ? "Kiểm định giả thuyết về trung bình quần thể bằng kiểm định t một mẫu."
          : "Kiểm định giả thuyết về tỉ lệ quần thể bằng kiểm định z một tỉ lệ.";
    const body = workspaceLead(lead) +
      `<div class="segmented">${tabs.map(([id, label]) => `<button class="seg-btn ${inferenceState.tab === id ? "is-active" : ""}" type="button" data-inf-tab="${id}">${label}</button>`).join("")}</div>
      <div class="inf-form">${inferenceFormMarkup()}</div>
      <div class="button-row"><button class="btn primary" type="button" id="infRun">Tính</button><button class="btn ghost small" type="button" id="infSample">Ví dụ</button></div>
      <div id="infResults" style="margin-top:16px">${inferenceResultMarkup()}</div>
      <div class="button-row between"><span class="tiny-label">α và độ tin cậy nhập theo phần trăm.</span><button class="btn ghost small" type="button" data-close-modal>Đóng</button></div>`;
    openModal({
      title: "Thống kê suy diễn",
      kicker: "INFERENTIAL STATISTICS · CI & TEST",
      icon: "inference",
      wide: true,
      body,
      onMount(root) {
        $$("[data-inf-tab]", root).forEach((button) => button.addEventListener("click", () => {
          inferenceResult = "";
          openInferenceWorkspace(button.dataset.infTab);
        }));
        $$("[data-inf]", root).forEach((input) => {
          const update = () => { inferenceState[input.dataset.inf] = input.value; };
          input.addEventListener("input", update);
          input.addEventListener("change", update);
        });
        $("#infRun", root).addEventListener("click", () => runInference(root));
        $("#infSample", root).addEventListener("click", () => {
          if (inferenceState.tab === "meanCI") Object.assign(inferenceState, { mean: "10", sd: "2", n: "25", conf: "95" });
          else if (inferenceState.tab === "propCI") Object.assign(inferenceState, { sx: "18", sn: "40", sconf: "95" });
          else if (inferenceState.tab === "meanTest") Object.assign(inferenceState, { mu0: "10", tmean: "10.6", tsd: "2", tn: "25", alpha: "5", alt: "two" });
          else Object.assign(inferenceState, { p0: "0.5", px: "22", pn: "40", palpha: "5", palt: "two" });
          inferenceResult = "";
          openInferenceWorkspace();
        });
      }
    });
  }

  /* ---------- Tổng Sigma & tích Pi ---------- */
  const seriesState = { kind: "sum", expr: "x^2", from: "1", to: "10", step: "1" };
  let seriesResult = null;

  function seriesSymbol() {
    return seriesState.kind === "sum" ? "Σ" : "∏";
  }

  function seriesText() {
    const step = String(seriesState.step || "1").trim();
    const stepPart = !step || step === "1" ? "" : `, ${step}`;
    return `${seriesState.kind}(${seriesState.expr}, ${seriesState.from}, ${seriesState.to}${stepPart})`;
  }

  function seriesResultMarkup() {
    if (!seriesResult) return `<div class="result-empty">Nhập biểu thức rồi bấm Tính để xem ${seriesSymbol()}.</div>`;
    const view = complexRectView(seriesResult.value);
    return card(`KẾT QUẢ ${seriesSymbol()}`, view.html, escapeHtml(seriesResult.text)) +
      `<div class="settings-note" style="margin-top:10px">Biến chạy là <b>x</b>. Có thể dùng sin, cos, log, căn, lũy thừa… giống màn hình tính toán.</div>`;
  }

  function openSeriesWorkspace() {
    closeModal();
    const isSum = seriesState.kind === "sum";
    const body = workspaceLead(`Tính tổng <strong>Σ</strong> hoặc tích <strong>∏</strong> của biểu thức theo biến <strong>x</strong>. Đây là hai chức năng thường dùng trong dãy số và xác suất.`) +
      `<div class="segmented">
        <button class="seg-btn ${isSum ? "is-active" : ""}" type="button" data-series-kind="sum">Tổng Σ</button>
        <button class="seg-btn ${isSum ? "" : "is-active"}" type="button" data-series-kind="prod">Tích ∏</button>
      </div>
      <div class="form-grid three">
        <div class="field field-wide"><label>Biểu thức f(x)</label><input data-series-field="expr" value="${escapeHtml(seriesState.expr)}" placeholder="x^2 hoặc 1/x" autocomplete="off"></div>
        <div class="field"><label>Từ</label><input data-series-field="from" value="${escapeHtml(seriesState.from)}" inputmode="numeric"></div>
        <div class="field"><label>Đến</label><input data-series-field="to" value="${escapeHtml(seriesState.to)}" inputmode="numeric"></div>
        <div class="field"><label>Bước</label><input data-series-field="step" value="${escapeHtml(seriesState.step)}" inputmode="numeric"></div>
      </div>
      <div class="equation-preview system-preview" id="seriesPreview" aria-live="polite">${escapeHtml(seriesText())}</div>
      <div class="button-row">
        <button class="btn primary" type="button" id="seriesRun">Tính ${seriesSymbol()}</button>
        <button class="btn ghost small" type="button" id="seriesInsert">Chèn vào máy</button>
        <button class="btn ghost small" type="button" id="seriesSample">Ví dụ</button>
      </div>
      <div id="seriesResults" style="margin-top:16px">${seriesResultMarkup()}</div>
      <div class="button-row between"><span class="tiny-label">Ví dụ: Σ x² từ 1 đến 10 · ∏ x từ 1 đến 5</span><button class="btn ghost small" type="button" data-close-modal>Đóng</button></div>`;
    openModal({
      title: "Tổng & tích",
      kicker: "SIGMA Σ · PRODUCT ∏",
      icon: "series",
      wide: true,
      body,
      onMount(root) {
        const refreshPreview = () => {
          const preview = $("#seriesPreview", root);
          if (preview) preview.textContent = seriesText();
        };
        $$("[data-series-kind]", root).forEach((button) => button.addEventListener("click", () => {
          seriesState.kind = button.dataset.seriesKind;
          seriesResult = null;
          openSeriesWorkspace();
        }));
        $$("[data-series-field]", root).forEach((input) => input.addEventListener("input", () => {
          seriesState[input.dataset.seriesField] = input.value;
          refreshPreview();
        }));
        $("#seriesRun", root).addEventListener("click", () => {
          const results = $("#seriesResults", root);
          try {
            const expr = String(seriesState.expr || "").trim();
            if (!expr) throw new E.CalcError("Syntax ERROR", "Chưa nhập biểu thức");
            const from = parseNumeric(seriesState.from, "Giá trị bắt đầu");
            const to = parseNumeric(seriesState.to, "Giá trị kết thúc");
            const step = parseNumeric(seriesState.step || "1", "Bước");
            if (step === 0) throw new E.CalcError("Math ERROR", "Bước phải khác 0");
            const command = `${seriesState.kind}(${expr},${from},${to}${step === 1 ? "" : `,${step}`})`;
            const value = E.evaluate(command, { angleUnit: state.settings.angleUnit, vars: state.vars, ans: state.ans, complex: false });
            seriesResult = { value, text: command };
            results.innerHTML = seriesResultMarkup();
          } catch (error) {
            seriesResult = null;
            results.innerHTML = errorBox(error);
          }
        });
        $("#seriesInsert", root).addEventListener("click", () => {
          const text = seriesText();
          closeModal();
          state.mode = "calculate";
          state.menuOpen = false;
          state.input = text;
          state.cursor = text.length;
          state.result = null;
          state.error = null;
          state.justEvaluated = false;
          state.shift = false;
          state.alpha = false;
          syncHardware();
          renderScreen();
          renderModeDock();
          showToast(`Đã đưa ${seriesSymbol()} vào màn hình. Nhấn = để tính.`);
        });
        $("#seriesSample", root).addEventListener("click", () => {
          if (seriesState.kind === "sum") Object.assign(seriesState, { expr: "x^2", from: "1", to: "10", step: "1" });
          else Object.assign(seriesState, { expr: "x", from: "1", to: "5", step: "1" });
          seriesResult = null;
          openSeriesWorkspace();
        });
      }
    });
  }

  function openExtraTool(id) {
    switch (id) {
      case "graph": openGraphWorkspace(); break;
      case "calculus": openCalculusWorkspace(); break;
      case "geometry": openGeometryWorkspace(); break;
      case "triangle": openTriangleWorkspace(); break;
      case "probability": openProbabilityWorkspace(); break;
      case "inference": openInferenceWorkspace(); break;
      case "quickstats": openQuickStatsWorkspace(); break;
      case "number": openNumberWorkspace(); break;
      case "units": openUnitWorkspace(); break;
      case "finance": openFinanceWorkspace(); break;
      case "physics": openPhysicsWorkspace(); break;
      case "series": openSeriesWorkspace(); break;
      default: openExtensionToolsModal(); break;
    }
  }

  function openAdvancedMode(modeId) {
    switch (modeId) {
      case "matrix": openMatrixWorkspace(); break;
      case "vector": openVectorWorkspace(); break;
      case "statistics": openStatisticsWorkspace(); break;
      case "distribution": openDistributionWorkspace(); break;
      case "table": openTableWorkspace(); break;
      case "equation": openEquationWorkspace("poly"); break;
      case "inequality": openInequalityWorkspace(); break;
      case "verify": openVerifyWorkspace(); break;
      case "ratio": openRatioWorkspace(); break;
      default: openModesModal(); break;
    }
  }

  /* ============================================================
   * Khởi tạo & sự kiện
   * ============================================================ */
  function spawnRipple(button, event) {
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.7;
    const x = event && event.detail ? event.clientX - rect.left : rect.width / 2;
    const y = event && event.detail ? event.clientY - rect.top : rect.height / 2;
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x - size / 2}px`;
    ripple.style.top = `${y - size / 2}px`;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 460);
  }

  function keyboardInsert(text) {
    if (!state.powered || state.menuOpen) return;
    if (state.mode === "basen") {
      if (/^[0-9]$/.test(text) && Number(text) >= state.basenBase) {
        showToast(`Chữ số ${text} không hợp lệ trong hệ ${state.basenBase}.`, "is-error");
        return;
      }
      if (!/^[0-9+\-*/()]$/.test(text)) return;
    }
    insertText(text, text.length);
  }

  function handlePhysicalKey(event) {
    const overlay = $("#overlay");
    const overlayOpen = overlay && !overlay.hidden;
    if (overlayOpen) {
      if (event.key === "Escape") { event.preventDefault(); closeModal(); }
      return;
    }
    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!state.powered) {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); bootOn(); }
      return;
    }
    if (event.key === "F1") { event.preventDefault(); handleTopAction("shift"); return; }
    if (event.key === "F2") { event.preventDefault(); handleTopAction("alpha"); return; }
    if (state.menuOpen) {
      if (event.key === "Escape") { event.preventDefault(); state.menuOpen = false; renderScreen(); renderModeDock(); return; }
      if (event.key === "Enter") { event.preventDefault(); selectMenuMode(state.menuIndex); return; }
      if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        handleTopAction(event.key === "ArrowUp" ? "up" : event.key === "ArrowDown" ? "down" : event.key === "ArrowLeft" ? "left" : "right");
        return;
      }
      if (/^[1-9]$/.test(event.key)) { event.preventDefault(); selectMenuMode(Number(event.key) - 1); return; }
      if (/^[a-cA-C]$/.test(event.key)) { event.preventDefault(); selectMenuMode(9 + event.key.toUpperCase().charCodeAt(0) - 65); }
      return;
    }
    if (state.mode === "basen" && state.basenBase === 16 && /^[a-fA-F]$/.test(event.key)) {
      event.preventDefault();
      insertText(event.key.toUpperCase(), 1);
      return;
    }
    if (state.mode !== "basen" && /^[xXyYaAbBcCdDfFmM]$/.test(event.key)) {
      event.preventDefault();
      insertText(event.key.toUpperCase(), 1);
      return;
    }
    if (state.mode !== "basen" && /^[eE]$/.test(event.key)) {
      event.preventDefault();
      insertText("e", 1);
      return;
    }
    if (state.mode === "complex" && /^[iI]$/.test(event.key)) {
      event.preventDefault();
      insertText("i", 1);
      return;
    }
    if (event.key === "Escape") { event.preventDefault(); clearAll(); return; }
    if (event.key === "Enter" || event.key === "=") { event.preventDefault(); calculate(); return; }
    if (event.key === "Backspace") { event.preventDefault(); deleteChar(); return; }
    if (event.key === "Delete") { event.preventDefault(); clearAll(); return; }
    if (event.key === "ArrowLeft") { event.preventDefault(); moveCursor("left"); return; }
    if (event.key === "ArrowRight") { event.preventDefault(); moveCursor("right"); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); handleTopAction("up"); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); handleTopAction("down"); return; }
    if (/^[0-9.]$/.test(event.key) || ["+", "-", "*", "/", "^", "(", ")", "%", "!", ","].includes(event.key)) {
      event.preventDefault();
      keyboardInsert(event.key);
    }
  }

  function bindEvents() {
    const keypad = $("#keypad");
    if (keypad) {
      keypad.addEventListener("click", (event) => {
        const button = event.target.closest(".key");
        if (!button) return;
        const key = keyById(button.dataset.keyId);
        if (!key) return;
        spawnRipple(button, event);
        activateKey(key);
        if (event.detail > 0) button.blur();
      });
    }

    $$("[data-open]").forEach((button) => {
      button.addEventListener("click", () => {
        const name = button.dataset.open;
        if (name === "modes") openModesModal();
        else if (name === "catalog") openCatalogModal();
        else if (name === "history") openHistoryModal();
        else if (name === "settings") openSettingsModal();
        else if (name === "help") openHelpModal();
      });
    });

    $$("[data-action]").forEach((button) => {
      button.addEventListener("click", () => handleTopAction(button.dataset.action));
    });

    const quick = $("#quickModes");
    if (quick) {
      quick.addEventListener("click", (event) => {
        const button = event.target.closest("[data-mode]");
        if (!button) return;
        openMode(button.dataset.mode);
      });
    }

    const dock = $("#modeDock");
    if (dock) {
      dock.addEventListener("click", (event) => {
        const baseButton = event.target.closest("[data-basen-base]");
        if (baseButton) {
          const oldBase = state.basenBase;
          const nextBase = Number(baseButton.dataset.basenBase);
          let currentValue = null;
          if (state.result && state.result.baseN) {
            currentValue = state.result.value;
          } else if (state.input.trim()) {
            try {
              currentValue = E.evaluateBaseN(state.input, oldBase, { ans: state.basenAns || 0n });
            } catch (error) {
              currentValue = null;
            }
          }
          state.basenBase = nextBase;
          state.result = null;
          state.error = null;
          state.justEvaluated = false;
          if (currentValue !== null) {
            state.input = E.toBaseString(currentValue, nextBase);
            state.cursor = state.input.length;
            showToast(`Đã chuyển giá trị sang hệ ${nextBase}.`);
          } else {
            state.input = "";
            state.cursor = 0;
          }
          renderScreen();
          renderModeDock();
          return;
        }
        const hex = event.target.closest("[data-basen-digit]");
        if (hex) {
          if (state.basenBase !== 16) { showToast("A–F chỉ dùng trong hệ 16.", "is-error"); return; }
          insertText(hex.dataset.basenDigit, 1);
          return;
        }
        const bit = event.target.closest("[data-basen-bit]");
        if (bit) {
          const token = bit.dataset.basenBit;
          const hasResult = !!(state.result || state.justEvaluated);
          if (token === "not") {
            if (hasResult) {
              state.input = "not Ans";
              state.cursor = state.input.length;
              state.result = null;
              state.error = null;
              state.justEvaluated = false;
            } else {
              insertText("not ", 4);
            }
          } else {
            if (hasResult) {
              state.input = "Ans";
              state.cursor = 3;
              state.result = null;
              state.error = null;
              state.justEvaluated = false;
            }
            insertText(` ${token} `, token.length + 2);
          }
          renderScreen();
          return;
        }
        const complex = event.target.closest("[data-complex-insert]");
        if (complex) {
          const text = complex.dataset.complexInsert;
          insertText(text, complex.dataset.caret ? Number(complex.dataset.caret) : text.length);
        }
      });
    }

    const mini = $("#miniHistory");
    if (mini) {
      mini.addEventListener("click", (event) => {
        const button = event.target.closest("[data-history-id]");
        if (button) loadHistoryItem(button.dataset.historyId);
      });
    }

    const nextTipButton = $("#nextTip");
    if (nextTipButton) nextTipButton.addEventListener("click", nextTip);

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-modal]")) {
        event.preventDefault();
        closeModal();
      }
    });

    const overlay = $("#overlay");
    if (overlay) {
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeModal();
      });
    }

    const screenContent = $("#screenContent");
    if (screenContent) {
      screenContent.addEventListener("click", (event) => {
        const extraLink = event.target.closest("[data-menu-extra]");
        if (extraLink) {
          state.menuOpen = false;
          renderScreen();
          renderModeDock();
          openExtensionToolsModal();
          return;
        }
        const tile = event.target.closest("[data-menu-index]");
        if (tile) {
          const index = Number(tile.dataset.menuIndex);
          selectMenuMode(index);
          return;
        }
        if (event.target.closest(".lcd-result") && state.result && !state.menuOpen) {
          copyText(state.result.plainText);
        }
      });
    }

    document.addEventListener("keydown", handlePhysicalKey);
  }

  function initialize() {
    loadState();
    buildKeypad();
    buildQuickModes();
    bindEvents();
    renderMiniHistory();
    syncHardware();
    renderModeDock();
    const tip = $("#tipText");
    if (tip && D.tips.length) {
      state.lastTip = Math.floor(Math.random() * D.tips.length);
      tip.textContent = D.tips[state.lastTip];
    }
    renderScreen();
    bootOn();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

})();

