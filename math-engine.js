/*
 * NIGSIO motkikiX — Web Emulator
 * Bộ máy toán học: parser, số phức, thống kê, phương trình, ma trận, vectơ,
 * phân phối xác suất và hệ cơ số.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CalcEngine = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* ============================================================
   * Lỗi & tiện ích chung
   * ============================================================ */
  class CalcError extends Error {
    constructor(code, detail) {
      super(code);
      this.name = "CalcError";
      this.code = code || "Syntax ERROR";
      this.detail = detail || "";
    }
  }

  const EPS = 1e-12;
  const MAX_ITER = 240;

  function fail(code, detail) {
    throw new CalcError(code, detail);
  }

  function isFiniteNumber(n) {
    return typeof n === "number" && Number.isFinite(n);
  }

  function clean(x) {
    if (!Number.isFinite(x)) return x;
    if (Math.abs(x) < 1e-13) return 0;
    const r = Math.round(x);
    if (Math.abs(x - r) < 1e-12 * Math.max(1, Math.abs(x))) return r;
    return x;
  }

  const gcd = (a, b) => {
    a = Math.abs(Math.trunc(a));
    b = Math.abs(Math.trunc(b));
    while (b) [a, b] = [b, a % b];
    return a;
  };

  const lcm = (a, b) => {
    a = Math.abs(Math.trunc(a));
    b = Math.abs(Math.trunc(b));
    if (!a || !b) return 0;
    return (a * b) / gcd(a, b);
  };

  function factorial(n) {
    if (!Number.isInteger(n) || n < 0) fail("Math ERROR");
    if (n > 170) fail("Range ERROR");
    let out = 1;
    for (let i = 2; i <= n; i++) out *= i;
    return out;
  }

  function nPr(n, r) {
    if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) fail("Math ERROR");
    let out = 1;
    for (let i = 0; i < r; i++) out *= n - i;
    return out;
  }

  function nCr(n, r) {
    if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) fail("Math ERROR");
    r = Math.min(r, n - r);
    let out = 1;
    for (let i = 1; i <= r; i++) out = (out * (n - r + i)) / i;
    return Math.round(out);
  }

  function toRad(value, unit) {
    if (unit === "rad") return value;
    if (unit === "gra") return (value * Math.PI) / 200;
    return (value * Math.PI) / 180;
  }

  function fromRad(value, unit) {
    if (unit === "rad") return value;
    if (unit === "gra") return (value * 200) / Math.PI;
    return (value * 180) / Math.PI;
  }

  function approxZero(x) {
    return Math.abs(x) < 1e-12;
  }

  /* ============================================================
   * Số phức
   * ============================================================ */
  const Z = (re = 0, im = 0) => ({ re: clean(re), im: clean(im) });
  const toC = (v) => {
    if (typeof v === "number") return Z(v, 0);
    if (v && typeof v.re === "number" && typeof v.im === "number") return v;
    fail("Syntax ERROR");
  };
  const isReal = (v) => approxZero(v.im);
  const real = (v) => {
    if (!isReal(v)) fail("Math ERROR", "Kết quả không phải số thực");
    return v.re;
  };
  const cAdd = (a, b) => Z(a.re + b.re, a.im + b.im);
  const cSub = (a, b) => Z(a.re - b.re, a.im - b.im);
  const cMul = (a, b) => Z(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const cDiv = (a, b) => {
    const d = b.re * b.re + b.im * b.im;
    if (d === 0) fail("Math ERROR", "Chia cho 0");
    return Z((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
  };
  const cAbs = (a) => Math.hypot(a.re, a.im);
  const cConj = (a) => Z(a.re, -a.im);
  const cArg = (a) => Math.atan2(a.im, a.re);
  const cExp = (a) => {
    const e = Math.exp(a.re);
    return Z(e * Math.cos(a.im), e * Math.sin(a.im));
  };
  const cLn = (a) => {
    if (a.re === 0 && a.im === 0) fail("Math ERROR");
    return Z(Math.log(cAbs(a)), cArg(a));
  };
  const cSqrt = (a) => {
    if (approxZero(a.im)) {
      if (a.re >= 0) return Z(Math.sqrt(a.re), 0);
      return Z(0, Math.sqrt(-a.re));
    }
    const r = cAbs(a);
    const re = Math.sqrt(Math.max(0, (r + a.re) / 2));
    const im = Math.sign(a.im || 1) * Math.sqrt(Math.max(0, (r - a.re) / 2));
    return Z(re, im);
  };
  const cPow = (a, b) => {
    if (approxZero(b.im) && Math.abs(b.re) <= 1000 && Number.isInteger(b.re)) {
      let n = Math.abs(b.re);
      let out = Z(1, 0);
      let base = a;
      while (n > 0) {
        if (n & 1) out = cMul(out, base);
        base = cMul(base, base);
        n >>= 1;
      }
      return b.re < 0 ? cDiv(Z(1, 0), out) : out;
    }
    if (a.re === 0 && a.im === 0) {
      if (b.re > 0) return Z(0, 0);
      fail("Math ERROR");
    }
    if (approxZero(a.im) && a.re > 0 && approxZero(b.im)) return Z(Math.pow(a.re, b.re), 0);
    return cExp(cMul(b, cLn(a)));
  };
  const cSin = (a) => {
    if (approxZero(a.im)) return Z(Math.sin(a.re), 0);
    return Z(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im));
  };
  const cCos = (a) => {
    if (approxZero(a.im)) return Z(Math.cos(a.re), 0);
    return Z(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im));
  };
  const cTan = (a) => cDiv(cSin(a), cCos(a));

  /* ============================================================
   * Tokenizer
   * ============================================================ */
  const FUNCTION_NAMES = [
    "integral", "logbase", "randint", "arcsinh", "arccosh", "arctanh",
    "arcsin", "arccos", "arctan", "asinh", "acosh", "atanh", "floor",
    "round", "deriv", "solve", "nroot", "sqrt", "cbrt", "sinh", "cosh",
    "tanh", "asin", "acos", "atan", "sin", "cos", "tan", "log", "ln",
    "abs", "exp", "ceil", "ipart", "fpart", "intg", "sign", "gcd", "lcm",
    "mod", "rand", "max", "min", "arg", "conj", "real", "imag", "re",
    "im", "rect", "sum", "prod", "npr", "ncr", "pol", "dms", "__dms",
    "fact", "mixed", "frac", "mean", "variance", "count", "not", "and", "or", "xor",
    "shl", "shr"
  ].sort((a, b) => b.length - a.length);
  const FUNCTION_SET = new Set(FUNCTION_NAMES);
  const CONSTANTS = new Set(["pi", "e", "i"]);
  const VARIABLES = new Set(["A", "B", "C", "D", "E", "F", "M", "X", "Y", "Z", "Ans"]);
  const OP_CHARS = new Set(["+", "-", "*", "/", "^", "∠"]);

  function normalizeInput(input) {
    let s = String(input == null ? "" : input);
    s = s
      .replace(/−/g, "-")
      .replace(/–/g, "-")
      .replace(/—/g, "-")
      .replace(/×/g, "*")
      .replace(/·/g, "*")
      .replace(/÷/g, "/")
      .replace(/⁄/g, "/")
      .replace(/π/g, "pi")
      .replace(/√/g, "sqrt")
      .replace(/∛/g, "cbrt")
      .replace(/∞/g, "Infinity");

    // Hệ lục thập phân: 12°34′56″ -> __dms(12,34,56)
    s = s.replace(
      /(\d+(?:\.\d+)?)\s*[°º]\s*(?:(\d+(?:\.\d+)?)\s*[′'′]\s*)?(?:(\d+(?:\.\d+)?)\s*[″"″]\s*)?/g,
      (_, d, m, sec) => `__dms(${d},${m || 0},${sec || 0})`
    );
    s = s.replace(/[°º′'″"]/g, "");
    return s.trim();
  }

  function autoCloseParens(s) {
    let open = 0;
    let inString = false;
    for (const ch of s) {
      if (ch === '"') inString = !inString;
      if (inString) continue;
      if (ch === "(") open++;
      if (ch === ")") {
        open--;
        if (open < 0) fail("Syntax ERROR", "Dấu ngoặc không hợp lệ");
      }
    }
    return s + ")".repeat(open);
  }

  function tokenize(input) {
    const s = autoCloseParens(normalizeInput(input));
    const tokens = [];
    let i = 0;
    const isDigit = (c) => c >= "0" && c <= "9";
    const isLetter = (c) => /[A-Za-z_]/.test(c);

    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }

      if (isDigit(ch) || (ch === "." && isDigit(s[i + 1]))) {
        const start = i;
        while (i < s.length && isDigit(s[i])) i++;
        if (s[i] === ".") {
          i++;
          while (i < s.length && isDigit(s[i])) i++;
        }
        if ((s[i] === "e" || s[i] === "E") && /[+\-0-9]/.test(s[i + 1] || "")) {
          const save = i;
          i++;
          if (s[i] === "+" || s[i] === "-") i++;
          if (isDigit(s[i])) {
            while (i < s.length && isDigit(s[i])) i++;
          } else i = save;
        }
        const raw = s.slice(start, i);
        tokens.push({ type: "num", value: Number(raw), pos: start });
        continue;
      }

      if (isLetter(ch)) {
        const lower = s.slice(i).toLowerCase();
        let matched = null;
        for (const name of FUNCTION_NAMES) {
          if (lower.startsWith(name)) {
            // Không nhận "e" hay tên hàm nằm trong một biến đơn.
            matched = name;
            break;
          }
        }
        if (matched) {
          tokens.push({ type: "fn", value: matched, pos: i });
          i += matched.length;
          continue;
        }
        // Ans (không phân biệt hoa thường)
        if (lower.startsWith("ans")) {
          tokens.push({ type: "var", value: "Ans", pos: i });
          i += 3;
          continue;
        }
        if (lower.startsWith("pi")) {
          tokens.push({ type: "const", value: "pi", pos: i });
          i += 2;
          continue;
        }
        const lowerConst = ch.toLowerCase();
        if (CONSTANTS.has(lowerConst) && ch === lowerConst) {
          tokens.push({ type: "const", value: lowerConst, pos: i });
          i++;
          continue;
        }
        if (VARIABLES.has(ch)) {
          tokens.push({ type: "var", value: ch, pos: i });
          i++;
          continue;
        }
        if (ch === "i") {
          tokens.push({ type: "const", value: "i", pos: i });
          i++;
          continue;
        }
        // Cho phép các chữ cái thường như biến x, y.
        if ("xy".includes(lowerConst)) {
          tokens.push({ type: "var", value: lowerConst.toUpperCase(), pos: i });
          i++;
          continue;
        }
        fail("Syntax ERROR", `Ký tự không hợp lệ: ${ch}`);
      }

      if (OP_CHARS.has(ch)) {
        tokens.push({ type: "op", value: ch, pos: i });
        i++;
        continue;
      }
      if (ch === "(") { tokens.push({ type: "lparen", pos: i }); i++; continue; }
      if (ch === ")") { tokens.push({ type: "rparen", pos: i }); i++; continue; }
      if (ch === ",") { tokens.push({ type: "comma", pos: i }); i++; continue; }
      if (ch === "!" || ch === "%") { tokens.push({ type: "postfix", value: ch, pos: i }); i++; continue; }
      fail("Syntax ERROR", `Ký tự không hợp lệ: ${ch}`);
    }

    // Chèn phép nhân ẩn: 2π, 2(3+4), (1+2)(3+4), 3sin(30), 2x...
    const canEnd = new Set(["num", "var", "const", "rparen", "postfix"]);
    const canStart = new Set(["num", "var", "const", "fn", "lparen"]);
    const out = [];
    for (let k = 0; k < tokens.length; k++) {
      const prev = tokens[k - 1];
      const cur = tokens[k];
      if (prev && canEnd.has(prev.type) && canStart.has(cur.type)) {
        // Không chèn giữa hai chữ số liền nhau; trình phân tích sẽ báo lỗi.
        if (!(prev.type === "num" && cur.type === "num")) {
          out.push({ type: "op", value: "*", implicit: true, pos: cur.pos });
        }
      }
      out.push(cur);
    }
    return out;
  }

  /* ============================================================
   * Parser (AST)
   * ============================================================ */
  const INFIX = {
    "∠": { prec: 4, right: false },
    "+": { prec: 10, right: false },
    "-": { prec: 10, right: false },
    "*": { prec: 20, right: false },
    "/": { prec: 20, right: false },
    "^": { prec: 40, right: true }
  };

  function parse(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];
    const syntax = (msg) => fail("Syntax ERROR", msg || "Biểu thức chưa hoàn chỉnh");

    function parseExpression(minPrec = 0) {
      let left = parsePrefix();
      while (true) {
        const t = peek();
        if (!t) break;
        if (t.type === "postfix") {
          if (50 < minPrec) break;
          next();
          left = { type: "post", op: t.value, arg: left };
          continue;
        }
        if (t.type !== "op" || !INFIX[t.value]) break;
        const info = INFIX[t.value];
        if (info.prec < minPrec) break;
        next();
        const right = parseExpression(info.right ? info.prec : info.prec + 1);
        left = { type: "bin", op: t.value, left, right };
      }
      return left;
    }

    function parseArgs() {
      const args = [];
      if (peek() && peek().type === "rparen") {
        next();
        return args;
      }
      while (true) {
        args.push(parseExpression(0));
        const t = peek();
        if (!t) syntax("Thiếu dấu ngoặc");
        if (t.type === "comma") { next(); continue; }
        if (t.type === "rparen") { next(); break; }
        syntax();
      }
      return args;
    }

    function parsePrefix() {
      const t = next();
      if (!t) syntax();
      if (t.type === "num") return { type: "num", value: t.value };
      if (t.type === "const") return { type: "const", value: t.value };
      if (t.type === "var") return { type: "var", value: t.value };
      if (t.type === "fn") {
        if (!peek() || peek().type !== "lparen") {
          syntax(`Hàm ${t.value} cần dấu "("`);
        }
        next();
        return { type: "call", name: t.value, args: parseArgs() };
      }
      if (t.type === "lparen") {
        const node = parseExpression(0);
        if (!peek() || peek().type !== "rparen") syntax("Thiếu dấu )");
        next();
        return node;
      }
      if (t.type === "op" && (t.value === "+" || t.value === "-")) {
        return { type: "un", op: t.value, arg: parseExpression(35) };
      }
      syntax("Biểu thức không hợp lệ");
    }

    if (!tokens.length) syntax("Chưa nhập biểu thức");
    const ast = parseExpression(0);
    if (pos < tokens.length) syntax("Biểu thức không hợp lệ");
    return ast;
  }

  /* ============================================================
   * Đánh giá biểu thức
   * ============================================================ */
  function normalizeContext(options) {
    const o = options || {};
    const vars = {};
    const src = o.vars || {};
    Object.keys(src).forEach((k) => {
      const v = src[k];
      if (typeof v === "number") vars[k] = Z(v, 0);
      else if (v && typeof v.re === "number") vars[k] = v;
    });
    return {
      angleUnit: o.angleUnit === "rad" || o.angleUnit === "gra" ? o.angleUnit : "deg",
      vars,
      ans: typeof o.ans === "number" ? Z(o.ans, 0) : (o.ans && typeof o.ans.re === "number" ? o.ans : Z(0, 0)),
      complex: !!o.complex,
      radix: o.radix || 10
    };
  }

  function getVar(ctx, name) {
    if (name === "Ans") return ctx.ans || Z(0, 0);
    return ctx.vars[name] || Z(0, 0);
  }

  function realArg(v) {
    return real(v);
  }

  function integerArg(v) {
    const x = real(v);
    if (!Number.isInteger(x)) fail("Math ERROR", "Cần số nguyên");
    return x;
  }

  function evalAt(node, ctx, xValue) {
    const saved = {};
    const names = ["X", "x"];
    names.forEach((n) => {
      saved[n] = ctx.vars[n];
      ctx.vars[n] = typeof xValue === "number" ? Z(xValue, 0) : xValue;
    });
    try {
      return evalAst(node, ctx);
    } finally {
      names.forEach((n) => {
        if (saved[n] === undefined) delete ctx.vars[n];
        else ctx.vars[n] = saved[n];
      });
    }
  }

  function fReal(node, ctx, x) {
    const v = evalAt(node, ctx, x);
    return real(v);
  }

  function adaptiveSimpson(f, a, b, eps = 1e-10, depth = 14) {
    if (a === b) return 0;
    let sign = 1;
    if (a > b) { [a, b] = [b, a]; sign = -1; }
    const h = b - a;
    const fa = f(a);
    const fb = f(b);
    const fm = f((a + b) / 2);
    const simpson = (x0, x2, f0, f1, f2) => ((x2 - x0) / 6) * (f0 + 4 * f1 + f2);
    const whole = simpson(a, b, fa, fm, fb);
    function recurse(a0, b0, f0, fm0, f1, whole0, level, tolerance) {
      const m = (a0 + b0) / 2;
      const lm = (a0 + m) / 2;
      const rm = (m + b0) / 2;
      const flm = f(lm);
      const frm = f(rm);
      const left = simpson(a0, m, f0, flm, fm0);
      const right = simpson(m, b0, fm0, frm, f1);
      const delta = left + right - whole0;
      if (level <= 0 || Math.abs(delta) <= 15 * tolerance) {
        return left + right + delta / 15;
      }
      return recurse(a0, m, f0, flm, fm0, left, level - 1, tolerance / 2) +
        recurse(m, b0, fm0, frm, f1, right, level - 1, tolerance / 2);
    }
    return sign * recurse(a, b, fa, fm, fb, whole, depth, eps * Math.max(1, Math.abs(whole)));
  }

  function derivativeAt(node, ctx, x) {
    const scale = Math.max(1, Math.abs(x));
    const h = scale * 1e-4;
    let f1, f2, f3, f4;
    try {
      f1 = fReal(node, ctx, x + h);
      f2 = fReal(node, ctx, x + 2 * h);
      f3 = fReal(node, ctx, x - h);
      f4 = fReal(node, ctx, x - 2 * h);
      return (-f2 + 8 * f1 - 8 * f3 + f4) / (12 * h);
    } catch (e) {
      const delta = scale * 1e-6;
      return (fReal(node, ctx, x + delta) - fReal(node, ctx, x - delta)) / (2 * delta);
    }
  }

  function solveNode(node, ctx, guess) {
    let x = Number.isFinite(guess) ? guess : 1;
    const fv = (t) => fReal(node, ctx, t);
    let fx = fv(x);
    for (let i = 0; i < 100; i++) {
      if (Math.abs(fx) < 1e-12) return clean(x);
      const d = derivativeAt(node, ctx, x);
      if (!Number.isFinite(d) || Math.abs(d) < 1e-14) break;
      let step = fx / d;
      if (!Number.isFinite(step) || Math.abs(step) > 1e6) step = Math.sign(step || 1) * 1e6;
      const next = x - step;
      if (!Number.isFinite(next)) break;
      if (Math.abs(next - x) < 1e-12 * Math.max(1, Math.abs(next))) {
        if (Math.abs(fv(next)) < 1e-7) return clean(next);
      }
      x = next;
      fx = fv(x);
    }
    // Quét lân cận nếu Newton thất bại
    const base = Number.isFinite(guess) ? guess : 0;
    for (let span = 1; span <= 128; span *= 2) {
      let prevX = base - span;
      let prevF = fv(prevX);
      for (let k = 1; k <= 80; k++) {
        const curX = base - span + (2 * span * k) / 80;
        const curF = fv(curX);
        if (Number.isFinite(prevF) && Number.isFinite(curF) && prevF * curF <= 0) {
          let lo = prevX, hi = curX, flo = prevF;
          for (let j = 0; j < 100; j++) {
            const mid = (lo + hi) / 2;
            const fm = fv(mid);
            if (Math.abs(fm) < 1e-12) return clean(mid);
            if (flo * fm <= 0) hi = mid;
            else { lo = mid; flo = fm; }
          }
          return clean((lo + hi) / 2);
        }
        prevX = curX;
        prevF = curF;
      }
    }
    fail("Math ERROR", "Không tìm thấy nghiệm gần giá trị ban đầu");
  }

  const ALIASES = {
    arcsin: "asin", arccos: "acos", arctan: "atan",
    arcsinh: "asinh", arccosh: "acosh", arctanh: "atanh",
    fact: "factorial"
  };

  function evalCall(node, ctx) {
    const name = ALIASES[node.name] || node.name;

    if (name === "sum" || name === "prod") {
      if (node.args.length < 3) fail("Argument ERROR", "Cần biểu thức, bắt đầu và kết thúc");
      const start = Math.trunc(real(evalAst(node.args[1], ctx)));
      const end = Math.trunc(real(evalAst(node.args[2], ctx)));
      const step = node.args[3] ? Math.trunc(real(evalAst(node.args[3], ctx))) : 1;
      if (step === 0) fail("Math ERROR");
      if (Math.abs(end - start) / Math.abs(step) > 100000) fail("Range ERROR", "Quá nhiều số hạng");
      let acc = name === "sum" ? Z(0, 0) : Z(1, 0);
      const dir = step > 0 ? 1 : -1;
      for (let x = start; dir > 0 ? x <= end : x >= end; x += step) {
        const v = evalAt(node.args[0], ctx, x);
        acc = name === "sum" ? cAdd(acc, v) : cMul(acc, v);
      }
      return acc;
    }

    if (name === "integral") {
      if (node.args.length < 3) fail("Argument ERROR", "Cần biểu thức và hai cận");
      let a = real(evalAst(node.args[1], ctx));
      let b = real(evalAst(node.args[2], ctx));
      if (!Number.isFinite(a) || !Number.isFinite(b)) fail("Range ERROR");
      const f = (x) => {
        const v = evalAt(node.args[0], ctx, x);
        return real(v);
      };
      try {
        return Z(adaptiveSimpson(f, a, b), 0);
      } catch (e) {
        fail("Math ERROR", "Không tính được tích phân");
      }
    }

    if (name === "deriv") {
      if (node.args.length < 2) fail("Argument ERROR", "Cần biểu thức và điểm tính");
      const at = real(evalAst(node.args[1], ctx));
      return Z(clean(derivativeAt(node.args[0], ctx, at)), 0);
    }

    if (name === "solve") {
      if (node.args.length < 1) fail("Argument ERROR");
      const guess = node.args[1] ? real(evalAst(node.args[1], ctx)) : 0;
      return Z(solveNode(node.args[0], ctx, guess), 0);
    }

    if (name === "__dms" || name === "dms") {
      const d = node.args[0] ? real(evalAst(node.args[0], ctx)) : 0;
      const m = node.args[1] ? real(evalAst(node.args[1], ctx)) : 0;
      const s = node.args[2] ? real(evalAst(node.args[2], ctx)) : 0;
      const deg = d + m / 60 + s / 3600;
      return Z(fromRad(toRad(deg, "deg"), ctx.angleUnit), 0);
    }

    const args = node.args.map((a) => evalAst(a, ctx));
    return callFunction(name, args, ctx);
  }

  function evalAst(node, ctx) {
    switch (node.type) {
      case "num":
        return Z(node.value, 0);
      case "const":
        if (node.value === "pi") return Z(Math.PI, 0);
        if (node.value === "e") return Z(Math.E, 0);
        if (node.value === "i") return Z(0, 1);
        fail("Syntax ERROR");
        break;
      case "var":
        return getVar(ctx, node.value);
      case "un": {
        const v = evalAst(node.arg, ctx);
        return node.op === "-" ? Z(-v.re, -v.im) : v;
      }
      case "post": {
        const v = evalAst(node.arg, ctx);
        if (node.op === "%") return Z(v.re / 100, v.im / 100);
        if (node.op === "!") {
          return Z(factorial(integerArg(v)), 0);
        }
        fail("Syntax ERROR");
        break;
      }
      case "bin": {
        const op = node.op;
        if (op === "∠") {
          const mag = real(evalAst(node.left, ctx));
          const ang = real(evalAst(node.right, ctx));
          const rad = toRad(ang, ctx.angleUnit);
          return Z(mag * Math.cos(rad), mag * Math.sin(rad));
        }
        if ((op === "+" || op === "-") && node.right.type === "post" && node.right.op === "%") {
          const left = evalAst(node.left, ctx);
          const pct = evalAst(node.right.arg, ctx);
          const delta = Z(
            (left.re * pct.re - left.im * pct.im) / 100,
            (left.re * pct.im + left.im * pct.re) / 100
          );
          return op === "+" ? cAdd(left, delta) : cSub(left, delta);
        }
        const a = evalAst(node.left, ctx);
        let b = evalAst(node.right, ctx);
        switch (op) {
          case "+": return cAdd(a, b);
          case "-": return cSub(a, b);
          case "*": return cMul(a, b);
          case "/": return cDiv(a, b);
          case "^": return cPow(a, b);
          default: fail("Syntax ERROR");
        }
        break;
      }
      case "call":
        return evalCall(node, ctx);
      default:
        fail("Syntax ERROR");
    }
  }

  /* ============================================================
   * Thư viện hàm
   * ============================================================ */
  function argCheck(name, args, min, max) {
    if (args.length < min || args.length > (max == null ? min : max)) {
      fail("Argument ERROR", `${name} cần ${min}${max && max !== min ? `–${max}` : ""} đối số`);
    }
  }

  function callFunction(inputName, args, ctx) {
    const name = ALIASES[inputName] || inputName;
    const a = args[0] || Z(0, 0);
    const x = () => real(a);
    switch (name) {
      case "sin":
      case "cos":
      case "tan": {
        argCheck(name, args, 1);
        if (!isReal(a)) {
          const z = cMul(Z(toRad(1, ctx.angleUnit), 0), a);
          return name === "sin" ? cSin(z) : name === "cos" ? cCos(z) : cTan(z);
        }
        const r = toRad(a.re, ctx.angleUnit);
        if (name === "tan" && Math.abs(Math.cos(r)) < 1e-12) fail("Math ERROR");
        return Z(name === "sin" ? Math.sin(r) : name === "cos" ? Math.cos(r) : Math.tan(r), 0);
      }
      case "asin":
      case "acos":
      case "atan": {
        argCheck(name, args, 1);
        if (!isReal(a)) fail("Math ERROR", "Hàm ngược không hỗ trợ số phức");
        if (name === "asin") {
          if (a.re < -1 || a.re > 1) return cMul(Z(0, -1), cLn(cAdd(cMul(a, Z(0, 1)), cSqrt(cSub(Z(1, 0), cMul(a, a))))));
          return Z(fromRad(Math.asin(a.re), ctx.angleUnit), 0);
        }
        if (name === "acos") {
          if (a.re < -1 || a.re > 1) fail("Math ERROR");
          return Z(fromRad(Math.acos(a.re), ctx.angleUnit), 0);
        }
        return Z(fromRad(Math.atan(a.re), ctx.angleUnit), 0);
      }
      case "sinh": argCheck(name, args, 1); return Z(Math.sinh(real(a)), 0);
      case "cosh": argCheck(name, args, 1); return Z(Math.cosh(real(a)), 0);
      case "tanh": argCheck(name, args, 1); return Z(Math.tanh(real(a)), 0);
      case "asinh": argCheck(name, args, 1); return Z(Math.asinh(real(a)), 0);
      case "acosh": argCheck(name, args, 1); return Z(Math.acosh(real(a)), 0);
      case "atanh": argCheck(name, args, 1); return Z(Math.atanh(real(a)), 0);
      case "ln": argCheck(name, args, 1); return cLn(a);
      case "log":
        argCheck(name, args, 1);
        return cDiv(cLn(a), Z(Math.LN10, 0));
      case "logbase":
        argCheck(name, args, 2);
        return cDiv(cLn(args[1]), cLn(args[0]));
      case "exp": argCheck(name, args, 1); return cExp(a);
      case "sqrt": argCheck(name, args, 1); return cSqrt(a);
      case "cbrt": {
        argCheck(name, args, 1);
        if (!isReal(a)) fail("Math ERROR");
        return Z(Math.cbrt(a.re), 0);
      }
      case "nroot": {
        argCheck(name, args, 2);
        const n = integerArg(args[0]);
        if (n === 0) fail("Math ERROR");
        if (!isReal(args[1])) fail("Math ERROR");
        const v = args[1].re;
        if (v < 0 && n % 2 === 0) fail("Math ERROR");
        return Z(v < 0 ? -Math.pow(-v, 1 / n) : Math.pow(v, 1 / n), 0);
      }
      case "abs": argCheck(name, args, 1); return Z(cAbs(a), 0);
      case "arg": argCheck(name, args, 1); return Z(fromRad(cArg(a), ctx.angleUnit), 0);
      case "conj": argCheck(name, args, 1); return cConj(a);
      case "re":
      case "real": argCheck(name, args, 1); return Z(a.re, 0);
      case "im":
      case "imag": argCheck(name, args, 1); return Z(a.im, 0);
      case "rect": {
        argCheck(name, args, 2);
        const r = real(args[0]);
        const rad = toRad(real(args[1]), ctx.angleUnit);
        return Z(r * Math.cos(rad), r * Math.sin(rad));
      }
      case "pol": {
        argCheck(name, args, 2);
        return Z(Math.hypot(real(args[0]), real(args[1])), 0);
      }
      case "floor":
      case "intg": argCheck(name, args, 1); return Z(Math.floor(real(a)), 0);
      case "ceil": argCheck(name, args, 1); return Z(Math.ceil(real(a)), 0);
      case "round": {
        argCheck(name, args, 1, 2);
        const digits = args[1] ? integerArg(args[1]) : 0;
        const p = Math.pow(10, digits);
        return Z(Math.round(real(a) * p) / p, 0);
      }
      case "ipart": argCheck(name, args, 1); return Z(Math.trunc(real(a)), 0);
      case "fpart": argCheck(name, args, 1); return Z(real(a) - Math.trunc(real(a)), 0);
      case "sign": argCheck(name, args, 1); return Z(Math.sign(real(a)), 0);
      case "factorial": argCheck(name, args, 1); return Z(factorial(integerArg(a)), 0);
      case "mixed": {
        argCheck(name, args, 3);
        const whole = real(args[0]);
        const num = real(args[1]);
        const den = real(args[2]);
        if (den === 0) fail("Math ERROR");
        return Z(whole + (whole < 0 ? -1 : 1) * (num / den), 0);
      }
      case "frac": {
        argCheck(name, args, 2);
        const den = real(args[1]);
        if (den === 0) fail("Math ERROR");
        return Z(real(args[0]) / den, 0);
      }
      case "gcd": argCheck(name, args, 2); return Z(gcd(integerArg(args[0]), integerArg(args[1])), 0);
      case "lcm": argCheck(name, args, 2); return Z(lcm(integerArg(args[0]), integerArg(args[1])), 0);
      case "mod": {
        argCheck(name, args, 2);
        const bv = real(args[1]);
        if (bv === 0) fail("Math ERROR");
        return Z(real(args[0]) - bv * Math.trunc(real(args[0]) / bv), 0);
      }
      case "npr": argCheck(name, args, 2); return Z(nPr(integerArg(args[0]), integerArg(args[1])), 0);
      case "ncr": argCheck(name, args, 2); return Z(nCr(integerArg(args[0]), integerArg(args[1])), 0);
      case "max": argCheck(name, args, 1, 20); return Z(Math.max.apply(null, args.map(real)), 0);
      case "min": argCheck(name, args, 1, 20); return Z(Math.min.apply(null, args.map(real)), 0);
      case "rand": argCheck(name, args, 0); return Z(Math.random(), 0);
      case "randint": {
        argCheck(name, args, 2);
        const lo = integerArg(args[0]);
        const hi = integerArg(args[1]);
        if (lo > hi) fail("Math ERROR");
        return Z(Math.floor(Math.random() * (hi - lo + 1)) + lo, 0);
      }
      case "mean": {
        argCheck(name, args, 1, 20);
        return Z(args.reduce((s, v) => s + real(v), 0) / args.length, 0);
      }
      case "not": argCheck(name, args, 1); return Z(~integerArg(a), 0);
      case "and": argCheck(name, args, 2); return Z(integerArg(args[0]) & integerArg(args[1]), 0);
      case "or": argCheck(name, args, 2); return Z(integerArg(args[0]) | integerArg(args[1]), 0);
      case "xor": argCheck(name, args, 2); return Z(integerArg(args[0]) ^ integerArg(args[1]), 0);
      case "shl": argCheck(name, args, 2); return Z(integerArg(args[0]) * Math.pow(2, integerArg(args[1])), 0);
      case "shr": argCheck(name, args, 2); return Z(Math.floor(integerArg(args[0]) / Math.pow(2, integerArg(args[1]))), 0);
      default:
        fail("Syntax ERROR", `Không hỗ trợ hàm ${name}`);
    }
  }

  function evaluate(expression, options) {
    const ctx = normalizeContext(options);
    const ast = parse(tokenize(expression));
    const value = evalAst(ast, ctx);
    if (!Number.isFinite(value.re) || !Number.isFinite(value.im)) fail("Math ERROR");
    return { re: clean(value.re), im: clean(value.im), isComplex: !approxZero(clean(value.im)) };
  }

  /* ============================================================
   * Phân số & định dạng số
   * ============================================================ */
  function toFraction(value, options) {
    const opts = options || {};
    const maxDen = opts.maxDen || 100000;
    const tol = opts.tolerance == null ? 1e-10 : opts.tolerance;
    if (!Number.isFinite(value)) return null;
    if (Math.abs(value) > 1e15) return null;
    const sign = value < 0 ? -1 : 1;
    const x = Math.abs(value);
    let h0 = 0, h1 = 1, k0 = 1, k1 = 0, b = x;
    for (let i = 0; i < 80; i++) {
      const a = Math.floor(b + 1e-14);
      const h2 = a * h1 + h0;
      const k2 = a * k1 + k0;
      if (k2 > maxDen) break;
      if (Math.abs(x - h2 / k2) <= tol * Math.max(1, x)) {
        return { n: sign * h2, d: k2 };
      }
      h0 = h1; h1 = h2;
      k0 = k1; k1 = k2;
      const frac = b - a;
      if (frac < 1e-13) break;
      b = 1 / frac;
    }
    return null;
  }

  function roundSignificant(value, digits) {
    if (!Number.isFinite(value) || value === 0) return value;
    const d = Math.max(1, Math.min(15, digits == null ? 10 : digits));
    return Number(value.toPrecision(d));
  }

  /* ============================================================
   * Thống kê & hồi quy
   * ============================================================ */
  function cleanStatsRows(rows, twoVar) {
    const out = [];
    for (const row of rows || []) {
      if (!row) continue;
      const xv = typeof row.x === "number" ? row.x : Number(row.x);
      if (!Number.isFinite(xv)) continue;
      const fRaw = row.f == null || row.f === "" ? 1 : Number(row.f);
      if (!Number.isFinite(fRaw)) continue;
      const f = Math.round(fRaw);
      if (f <= 0) continue;
      if (twoVar) {
        const yv = typeof row.y === "number" ? row.y : Number(row.y);
        if (!Number.isFinite(yv)) continue;
        out.push({ x: xv, y: yv, f });
      } else {
        out.push({ x: xv, f });
      }
    }
    return out;
  }

  function weightedQuantile(sorted, weights, total, p) {
    if (!sorted.length) return NaN;
    const pos = p * (total - 1);
    let cum = 0;
    for (let i = 0; i < sorted.length; i++) {
      const next = cum + weights[i];
      if (pos <= next - 1) return sorted[i];
      if (pos < next) {
        const ratio = (pos - (next - 1)) / weights[i];
        const nextVal = sorted[i + 1] != null ? sorted[i + 1] : sorted[i];
        return sorted[i] + ratio * (nextVal - sorted[i]);
      }
      cum = next;
    }
    return sorted[sorted.length - 1];
  }

  function stats1(rows, options) {
    const opts = options || {};
    const cleanRows = cleanStatsRows(rows, false);
    if (!cleanRows.length) fail("Argument ERROR", "Chưa có dữ liệu thống kê");
    const expanded = [];
    cleanRows.forEach((r) => {
      for (let i = 0; i < Math.min(r.f, 10000); i++) expanded.push(r.x);
    });
    const sorted = expanded.slice().sort((a, b) => a - b);
    const total = cleanRows.reduce((s, r) => s + r.f, 0);
    const sum = cleanRows.reduce((s, r) => s + r.x * r.f, 0);
    const sumSq = cleanRows.reduce((s, r) => s + r.x * r.x * r.f, 0);
    const mean = sum / total;
    const varPop = sumSq / total - mean * mean;
    const varSample = total > 1 ? (sumSq - total * mean * mean) / (total - 1) : 0;
    const sortedUnique = Array.from(new Set(expanded)).sort((a, b) => a - b);
    const weights = sortedUnique.map((v) => expanded.filter((x) => x === v).length);
    const q1 = weightedQuantile(sortedUnique, weights, total, 0.25);
    const med = weightedQuantile(sortedUnique, weights, total, 0.5);
    const q3 = weightedQuantile(sortedUnique, weights, total, 0.75);
    let maxFreq = 0;
    const modes = [];
    cleanRows.forEach((r) => {
      if (r.f > maxFreq) { maxFreq = r.f; modes.length = 0; modes.push(r.x); }
      else if (r.f === maxFreq) modes.push(r.x);
    });
    return {
      n: total,
      sum,
      sumSq,
      mean: clean(mean),
      varPop: Math.max(0, varPop),
      varSample: Math.max(0, varSample),
      sdPop: Math.sqrt(Math.max(0, varPop)),
      sdSample: Math.sqrt(Math.max(0, varSample)),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      q1: clean(q1),
      median: clean(med),
      q3: clean(q3),
      mode: modes,
      freqEnabled: opts.freq !== false,
      rows: cleanRows
    };
  }

  function solveSmallSystem(A, b) {
    const n = A.length;
    if (!n || b.length !== n) return null;
    const M = A.map((row, i) => row.slice(0, n).concat([b[i]]));
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
      }
      if (Math.abs(M[pivot][col]) < 1e-12) return null;
      if (pivot !== col) [M[pivot], M[col]] = [M[col], M[pivot]];
      const p = M[col][col];
      for (let j = col; j <= n; j++) M[col][j] /= p;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const factor = M[r][col];
        if (Math.abs(factor) < 1e-15) continue;
        for (let j = col; j <= n; j++) M[r][j] -= factor * M[col][j];
      }
    }
    return M.map((row) => clean(row[n]));
  }

  function fitLinear(xs, ys, ws) {
    const n = xs.length;
    let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      const w = ws[i];
      sw += w;
      sx += w * xs[i];
      sy += w * ys[i];
      sxx += w * xs[i] * xs[i];
      sxy += w * xs[i] * ys[i];
      syy += w * ys[i] * ys[i];
    }
    const denom = sw * sxx - sx * sx;
    if (Math.abs(denom) < 1e-14) fail("Math ERROR", "Không thể hồi quy");
    const b = (sw * sxy - sx * sy) / denom;
    const a = (sy - b * sx) / sw;
    const rDen = Math.sqrt((sw * sxx - sx * sx) * (sw * syy - sy * sy));
    const r = rDen === 0 ? 1 : (sw * sxy - sx * sy) / rDen;
    return { a, b, r };
  }

  function correlationOf(xs, ys, ws) {
    try { return fitLinear(xs, ys, ws).r; } catch (e) { return NaN; }
  }

  function stats2(rows, type) {
    const cleanRows = cleanStatsRows(rows, true);
    if (cleanRows.length < 2) fail("Argument ERROR", "Cần ít nhất 2 cặp dữ liệu");
    const model = type || "linear";
    const total = cleanRows.reduce((s, r) => s + r.f, 0);
    const sumX = cleanRows.reduce((s, r) => s + r.x * r.f, 0);
    const sumY = cleanRows.reduce((s, r) => s + r.y * r.f, 0);
    const sumXX = cleanRows.reduce((s, r) => s + r.x * r.x * r.f, 0);
    const sumYY = cleanRows.reduce((s, r) => s + r.y * r.y * r.f, 0);
    const sumXY = cleanRows.reduce((s, r) => s + r.x * r.y * r.f, 0);
    const meanX = sumX / total;
    const meanY = sumY / total;
    const varX = total > 1 ? (sumXX - total * meanX * meanX) / (total - 1) : 0;
    const varY = total > 1 ? (sumYY - total * meanY * meanY) / (total - 1) : 0;
    const cov = total > 1 ? (sumXY - total * meanX * meanY) / (total - 1) : 0;
    const rLinear = varX > 0 && varY > 0 ? cov / Math.sqrt(varX * varY) : NaN;

    let coefficients = {};
    let equation = "";
    let fitR = rLinear;
    let r2 = rLinear * rLinear;
    let transformed = false;

    if (model === "linear") {
      const fit = fitLinear(cleanRows.map((r) => r.x), cleanRows.map((r) => r.y), cleanRows.map((r) => r.f));
      coefficients = { a: fit.a, b: fit.b };
      equation = `y = ${fit.a} + ${fit.b}x`;
      fitR = fit.r;
      r2 = fit.r * fit.r;
    } else if (model === "quadratic") {
      const X1 = cleanRows.map((r) => r.x);
      const X2 = X1.map((x) => x * x);
      const W = cleanRows.map((r) => r.f);
      const Y = cleanRows.map((r) => r.y);
      let sw = W.reduce((s, w) => s + w, 0);
      const sums = [0, 0, 0, 0, 0];
      for (let i = 0; i < cleanRows.length; i++) {
        const xw = X1[i] * W[i];
        sums[0] += xw;
        sums[1] += xw * X1[i];
        sums[2] += xw * X2[i];
        sums[3] += xw * X2[i] * X1[i];
        sums[4] += xw * X2[i] * X2[i];
      }
      const A = [
        [sw, sums[0], sums[1]],
        [sums[0], sums[1], sums[2]],
        [sums[1], sums[2], sums[3]]
      ];
      let sy = 0, sxy = 0, sx2y = 0;
      for (let i = 0; i < cleanRows.length; i++) {
        const w = W[i];
        sy += w * Y[i];
        sxy += w * X1[i] * Y[i];
        sx2y += w * X2[i] * Y[i];
      }
      const sol = solveSmallSystem(A, [sy, sxy, sx2y]);
      if (!sol) fail("Math ERROR", "Không thể hồi quy bậc hai");
      coefficients = { a: sol[0], b: sol[1], c: sol[2] };
      equation = `y = ${sol[0]} + ${sol[1]}x + ${sol[2]}x²`;
      const fitted = cleanRows.map((r) => sol[0] + sol[1] * r.x + sol[2] * r.x * r.x);
      const yMean = meanY;
      let sst = 0, sse = 0;
      cleanRows.forEach((r, i) => {
        sst += r.f * Math.pow(r.y - yMean, 2);
        sse += r.f * Math.pow(r.y - fitted[i], 2);
      });
      r2 = sst > 0 ? 1 - sse / sst : 1;
      fitR = Math.sqrt(Math.max(0, r2));
      transformed = true;
    } else {
      const xs = cleanRows.map((r) => r.x);
      const ys = cleanRows.map((r) => r.y);
      const ws = cleanRows.map((r) => r.f);
      if (model === "ln") {
        if (xs.some((x) => x <= 0)) fail("Math ERROR", "ln(x) chỉ xác định với x > 0");
        const fit = fitLinear(xs.map(Math.log), ys, ws);
        coefficients = { a: fit.a, b: fit.b };
        equation = `y = ${fit.a} + ${fit.b}·ln(x)`;
        fitR = correlationOf(xs.map(Math.log), ys, ws);
      } else if (model === "exp") {
        if (ys.some((y) => y <= 0)) fail("Math ERROR", "y phải dương với hồi quy mũ");
        const fit = fitLinear(xs, ys.map(Math.log), ws);
        coefficients = { a: Math.exp(fit.a), b: fit.b };
        equation = `y = ${coefficients.a}·e^(${fit.b}x)`;
        fitR = correlationOf(xs, ys.map(Math.log), ws);
      } else if (model === "power") {
        if (xs.some((x) => x <= 0) || ys.some((y) => y <= 0)) fail("Math ERROR", "x, y phải dương với hồi quy lũy thừa");
        const fit = fitLinear(xs.map(Math.log), ys.map(Math.log), ws);
        coefficients = { a: Math.exp(fit.a), b: fit.b };
        equation = `y = ${coefficients.a}·x^${fit.b}`;
        fitR = correlationOf(xs.map(Math.log), ys.map(Math.log), ws);
      } else if (model === "inv") {
        if (xs.some((x) => x === 0)) fail("Math ERROR", "x phải khác 0");
        const fit = fitLinear(xs.map((x) => 1 / x), ys, ws);
        coefficients = { a: fit.a, b: fit.b };
        equation = `y = ${fit.a} + ${fit.b}/x`;
        fitR = correlationOf(xs.map((x) => 1 / x), ys, ws);
      } else if (model === "ab") {
        if (ys.some((y) => y <= 0)) fail("Math ERROR", "y phải dương với hồi quy mũ cơ số b");
        const fit = fitLinear(xs, ys.map(Math.log), ws);
        coefficients = { a: Math.exp(fit.a), b: Math.exp(fit.b) };
        equation = `y = ${coefficients.a}·${coefficients.b}^x`;
        fitR = correlationOf(xs, ys.map(Math.log), ws);
      } else if (model === "logistic") {
        if (ys.some((y) => y <= 0)) fail("Math ERROR");
        // Xấp xỉ logistic 3 tham số bằng Gauss–Newton đơn giản.
        const ymin = Math.min.apply(null, ys);
        const ymax = Math.max.apply(null, ys);
        const c = ymin - (ymax - ymin) * 0.1 || 0.1;
        let a = (ymax - c) / 2 || 1;
        let b = 0.1;
        for (let iter = 0; iter < 80; iter++) {
          let s11 = 0, s12 = 0, s22 = 0, g1 = 0, g2 = 0;
          cleanRows.forEach((row) => {
            const u = Math.exp(-b * row.x);
            const den = 1 + u;
            const pred = c + a / den;
            const e = row.y - pred;
            const dA = 1 / den;
            const dB = a * row.x * u / (den * den);
            s11 += row.f * dA * dA;
            s12 += row.f * dA * dB;
            s22 += row.f * dB * dB;
            g1 += row.f * dA * e;
            g2 += row.f * dB * e;
          });
          const det = s11 * s22 - s12 * s12;
          if (Math.abs(det) < 1e-16) break;
          const da = (g1 * s22 - g2 * s12) / det;
          const db = (g2 * s11 - g1 * s12) / det;
          a += da; b += db;
          if (Math.abs(da) + Math.abs(db) < 1e-12) break;
        }
        coefficients = { a, b, c };
        equation = `y = ${c} + ${a}/(1 + e^(${-b}x))`;
        fitR = rLinear;
      } else {
        fail("Argument ERROR", "Mô hình hồi quy không hợp lệ");
      }
      if (!Number.isFinite(fitR)) fitR = rLinear;
      r2 = fitR * fitR;
      if (model !== "linear") transformed = true;
    }

    return {
      n: total,
      sumX, sumY, sumXX, sumYY, sumXY,
      meanX, meanY,
      sdX: Math.sqrt(Math.max(0, varX)),
      sdY: Math.sqrt(Math.max(0, varY)),
      cov,
      r: fitR,
      r2,
      model,
      coefficients,
      equation,
      transformed,
      rows: cleanRows
    };
  }

  function predictRegression(result, x) {
    if (!result) return NaN;
    const c = result.coefficients;
    switch (result.model) {
      case "linear": return c.a + c.b * x;
      case "quadratic": return c.a + c.b * x + c.c * x * x;
      case "ln": return c.a + c.b * Math.log(x);
      case "exp": return c.a * Math.exp(c.b * x);
      case "ab": return c.a * Math.pow(c.b, x);
      case "power": return c.a * Math.pow(x, c.b);
      case "inv": return c.a + c.b / x;
      case "logistic": return c.c + c.a / (1 + Math.exp(-c.b * x));
      default: return NaN;
    }
  }

  /* ============================================================
   * Phân phối xác suất
   * ============================================================ */
  function gammaP(a, x) {
    if (!(a > 0) || x < 0) return NaN;
    if (x === 0) return 0;
    const gln = logGamma(a);
    if (x < a + 1) {
      let ap = a;
      let sum = 1 / a;
      let del = sum;
      for (let n = 0; n < 1000; n++) {
        ap += 1;
        del *= x / ap;
        sum += del;
        if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
      }
      return sum * Math.exp(-x + a * Math.log(x) - gln);
    }
    // Continued fraction cho Q(a,x)
    const fpmin = 1e-300;
    let b = x + 1 - a;
    let c = 1 / fpmin;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i <= 1000; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < fpmin) d = fpmin;
      c = b + an / c;
      if (Math.abs(c) < fpmin) c = fpmin;
      d = 1 / d;
      const deltaFactor = d * c;
      h *= deltaFactor;
      if (Math.abs(deltaFactor - 1) < 1e-15) break;
    }
    const q = Math.exp(-x + a * Math.log(x) - gln) * h;
    return 1 - q;
  }

  function erf(x) {
    if (x === 0) return 0;
    const z = Math.abs(x);
    const p = gammaP(0.5, z * z);
    return x < 0 ? -p : p;
  }

  function normalPdf(x, mu = 0, sigma = 1) {
    if (!(sigma > 0)) fail("Math ERROR", "σ phải lớn hơn 0");
    return Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI));
  }

  function normalCdf(x, mu = 0, sigma = 1) {
    if (!(sigma > 0)) fail("Math ERROR", "σ phải lớn hơn 0");
    const z = (x - mu) / (sigma * Math.SQRT2);
    if (z === 0) return 0.5;
    return 0.5 * (1 + erf(z));
  }

  function invNormal(area, mu = 0, sigma = 1) {
    if (!(sigma > 0)) fail("Math ERROR", "σ phải lớn hơn 0");
    if (!(area > 0 && area < 1)) fail("Math ERROR", "Diện tích phải nằm trong (0, 1)");
    // Acklam's inverse normal CDF
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const plow = 0.02425;
    const phigh = 1 - plow;
    let q, r, z;
    if (area < plow) {
      q = Math.sqrt(-2 * Math.log(area));
      z = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (area <= phigh) {
      q = area - 0.5;
      r = q * q;
      z = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - area));
      z = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    // Một bước hiệu chỉnh bằng CDF
    const e = normalCdf(z) - area;
    const u = e * Math.sqrt(2 * Math.PI) * Math.exp(z * z / 2);
    z = z - u / (1 + z * u / 2);
    return mu + sigma * z;
  }

  function logGamma(z) {
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    const g = 7;
    const C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    z -= 1;
    let x = C[0];
    for (let i = 1; i < g + 2; i++) x += C[i] / (z + i);
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function betaContinuedFraction(a, b, x) {
    const maxIter = 220;
    const eps = 3e-14;
    const fpMin = 1e-300;
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let c = 1;
    let d = 1 - (qab * x) / qap;
    if (Math.abs(d) < fpMin) d = fpMin;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= maxIter; m++) {
      const m2 = 2 * m;
      let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < fpMin) d = fpMin;
      c = 1 + aa / c;
      if (Math.abs(c) < fpMin) c = fpMin;
      d = 1 / d;
      h *= d * c;
      aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < fpMin) d = fpMin;
      c = 1 + aa / c;
      if (Math.abs(c) < fpMin) c = fpMin;
      d = 1 / d;
      const delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < eps) break;
    }
    return h;
  }

  function regularizedBeta(a, b, x) {
    if (!(a > 0) || !(b > 0)) fail("Math ERROR", "Tham số phân phối không hợp lệ");
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return (bt * betaContinuedFraction(a, b, x)) / a;
    return 1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b;
  }

  function studentTCdf(t, df) {
    if (!(df > 0)) fail("Math ERROR", "Bậc tự do phải lớn hơn 0");
    const x = df / (df + t * t);
    const tail = 0.5 * regularizedBeta(df / 2, 0.5, x);
    return t >= 0 ? 1 - tail : tail;
  }

  function studentTInv(area, df) {
    if (!(df > 0)) fail("Math ERROR", "Bậc tự do phải lớn hơn 0");
    if (!(area > 0 && area < 1)) fail("Math ERROR", "Xác suất phải nằm trong (0, 1)");
    if (Math.abs(area - 0.5) < 1e-15) return 0;
    let lo = -1e7;
    let hi = 1e7;
    for (let i = 0; i < 220; i++) {
      const mid = (lo + hi) / 2;
      if (studentTCdf(mid, df) < area) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function binomialPmf(x, n, p) {
    if (!Number.isInteger(n) || n < 0) fail("Math ERROR", "n phải là số nguyên không âm");
    if (!Number.isInteger(x) || x < 0 || x > n) return 0;
    if (p < 0 || p > 1) fail("Math ERROR", "p phải nằm trong [0, 1]");
    if (p === 0) return x === 0 ? 1 : 0;
    if (p === 1) return x === n ? 1 : 0;
    return Math.exp(logGamma(n + 1) - logGamma(x + 1) - logGamma(n - x + 1) + x * Math.log(p) + (n - x) * Math.log(1 - p));
  }

  function binomialCdf(x, n, p) {
    if (!Number.isFinite(x)) return x < 0 ? 0 : 1;
    const limit = Math.floor(x);
    if (limit < 0) return 0;
    if (limit >= n) return 1;
    let sum = 0;
    for (let k = 0; k <= limit; k++) sum += binomialPmf(k, n, p);
    return Math.min(1, sum);
  }

  function poissonPmf(x, lambda) {
    if (!(lambda > 0)) fail("Math ERROR", "λ phải lớn hơn 0");
    if (!Number.isInteger(x) || x < 0) return 0;
    return Math.exp(-lambda + x * Math.log(lambda) - logGamma(x + 1));
  }

  function poissonCdf(x, lambda) {
    if (!Number.isFinite(x)) return x < 0 ? 0 : 1;
    const limit = Math.floor(x);
    if (limit < 0) return 0;
    let sum = 0;
    for (let k = 0; k <= limit; k++) sum += poissonPmf(k, lambda);
    return Math.min(1, sum);
  }

  /* ============================================================
   * Đa thức & phương trình
   * ============================================================ */
  function polyEval(coeffs, x) {
    let out = 0;
    for (const c of coeffs) out = out * x + c;
    return out;
  }

  function cRootAbs(v) {
    return Math.hypot(v.re || 0, v.im || 0);
  }

  function polyRoots(input) {
    let coeffs = input.slice();
    while (coeffs.length > 1 && Math.abs(coeffs[0]) < 1e-14) coeffs.shift();
    const degree = coeffs.length - 1;
    if (degree < 1) fail("Math ERROR", "Bậc đa thức không hợp lệ");
    if (degree === 1) {
      return [{ re: clean(-coeffs[1] / coeffs[0]), im: 0 }];
    }
    if (degree === 2) {
      const a = coeffs[0], b = coeffs[1], c = coeffs[2];
      const delta = b * b - 4 * a * c;
      if (delta >= 0) {
        const sq = Math.sqrt(delta);
        return [
          { re: clean((-b - sq) / (2 * a)), im: 0 },
          { re: clean((-b + sq) / (2 * a)), im: 0 }
        ].sort((u, v) => u.re - v.re);
      }
      const re = -b / (2 * a);
      const im = Math.sqrt(-delta) / (2 * a);
      return [
        { re: clean(re), im: clean(-Math.abs(im)) },
        { re: clean(re), im: clean(Math.abs(im)) }
      ];
    }

    const monic = coeffs.map((c) => c / coeffs[0]);
    const bound = 1 + Math.max.apply(null, monic.slice(1).map((c) => Math.abs(c)));
    let roots = [];
    for (let i = 0; i < degree; i++) {
      const angle = (2 * Math.PI * i) / degree + 0.35;
      const radius = Math.min(bound, 1 + 0.55 * i);
      roots.push({ re: radius * Math.cos(angle), im: radius * Math.sin(angle) });
    }
    const evalComplexPoly = (z) => {
      let out = { re: 1, im: 0 };
      for (let i = 1; i < monic.length; i++) {
        out = {
          re: out.re * z.re - out.im * z.im + monic[i],
          im: out.re * z.im + out.im * z.re
        };
      }
      return out;
    };
    for (let iter = 0; iter < 500; iter++) {
      let maxDelta = 0;
      const nextRoots = roots.map((zi, i) => {
        let denom = { re: 1, im: 0 };
        for (let j = 0; j < roots.length; j++) {
          if (i === j) continue;
          const diff = { re: zi.re - roots[j].re, im: zi.im - roots[j].im };
          denom = {
            re: denom.re * diff.re - denom.im * diff.im,
            im: denom.re * diff.im + denom.im * diff.re
          };
        }
        const num = evalComplexPoly(zi);
        const d2 = denom.re * denom.re + denom.im * denom.im;
        if (d2 < 1e-30) return zi;
        const delta = {
          re: (num.re * denom.re + num.im * denom.im) / d2,
          im: (num.im * denom.re - num.re * denom.im) / d2
        };
        maxDelta = Math.max(maxDelta, Math.hypot(delta.re, delta.im));
        return { re: zi.re - delta.re, im: zi.im - delta.im };
      });
      roots = nextRoots;
      if (maxDelta < 1e-13) break;
    }
    // Làm sạch nghiệm
    roots = roots.map((z) => {
      const re = Math.abs(z.re) < 1e-9 ? 0 : z.re;
      const im = Math.abs(z.im) < 1e-8 ? 0 : z.im;
      return { re: clean(re), im: clean(im) };
    });
    roots.sort((u, v) => (Math.abs(u.im) > 1e-9 ? 1 : 0) - (Math.abs(v.im) > 1e-9 ? 1 : 0) || u.re - v.re || u.im - v.im);
    return roots;
  }

  function solveLinearSystem(A, b) {
    const n = A.length;
    if (!n || b.length !== n) fail("Dimension ERROR");
    const aug = A.map((row, i) => {
      if (row.length !== n) fail("Dimension ERROR");
      return row.map((v, j) => Number(v)).concat([Number(b[i])]);
    });
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(aug[r][col]) > Math.abs(aug[pivot][col])) pivot = r;
      }
      if (Math.abs(aug[pivot][col]) < 1e-12) {
        let inconsistent = false;
        for (let r = 0; r < n; r++) {
          const allZero = aug[r].slice(0, n).every((v) => Math.abs(v) < 1e-12);
          if (allZero && Math.abs(aug[r][n]) > 1e-12) inconsistent = true;
        }
        return { type: inconsistent ? "none" : "infinite" };
      }
      if (pivot !== col) [aug[pivot], aug[col]] = [aug[col], aug[pivot]];
      const p = aug[col][col];
      for (let j = col; j <= n; j++) aug[col][j] /= p;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const factor = aug[r][col];
        if (Math.abs(factor) < 1e-15) continue;
        for (let j = col; j <= n; j++) aug[r][j] -= factor * aug[col][j];
      }
    }
    return { type: "unique", solution: aug.map((row) => clean(row[n])) };
  }

  function solvePolynomialInequality(coeffs, relation) {
    const rel = relation || ">";
    const equality = rel === ">=" || rel === "<=";
    const greater = rel === ">" || rel === ">=";
    const roots = polyRoots(coeffs).filter((r) => Math.abs(r.im) < 1e-8).map((r) => clean(r.re)).sort((a, b) => a - b);
    const uniqueRoots = [];
    roots.forEach((r) => {
      if (!uniqueRoots.length || Math.abs(r - uniqueRoots[uniqueRoots.length - 1]) > 1e-8) uniqueRoots.push(r);
    });
    const testSign = (x) => polyEval(coeffs, x);
    const hits = (value) => {
      if (Math.abs(value) < 1e-10) return equality;
      return greater ? value > 0 : value < 0;
    };
    const candidates = [];
    if (!uniqueRoots.length) {
      const ok = greater ? coeffs[0] > 0 : coeffs[0] < 0;
      // Với mọi x, dấu không đổi vì không có nghiệm thực.
      if (ok) candidates.push({ lo: -Infinity, hi: Infinity, loInc: false, hiInc: false });
    } else {
      const firstMid = uniqueRoots[0] - Math.max(1, Math.abs(uniqueRoots[0]));
      for (let i = -1; i < uniqueRoots.length; i++) {
        const lo = i < 0 ? -Infinity : uniqueRoots[i];
        const hi = i + 1 >= uniqueRoots.length ? Infinity : uniqueRoots[i + 1];
        const mid = lo === -Infinity
          ? (hi === Infinity ? 0 : hi - Math.max(1, Math.abs(hi)))
          : hi === Infinity
            ? lo + Math.max(1, Math.abs(lo))
            : (lo + hi) / 2;
        if (hits(testSign(mid))) {
          candidates.push({ lo, hi, loInc: false, hiInc: false });
        }
        if (i >= 0 && equality) {
          candidates.push({ lo: uniqueRoots[i], hi: uniqueRoots[i], loInc: true, hiInc: true });
        }
      }
      if (equality) {
        // thêm khoảng ngoài cùng đã được xét trong vòng lặp phía trên
      }
    }
    // Hợp các khoảng chạm nhau
    candidates.sort((a, b) => (a.lo - b.lo) || (a.hi - b.hi));
    const merged = [];
    for (const cur of candidates) {
      if (!merged.length) { merged.push({ ...cur }); continue; }
      const last = merged[merged.length - 1];
      const touching = last.hi === cur.lo;
      if (last.hi === Infinity || cur.lo < last.hi || (touching && (last.hiInc || cur.loInc))) {
        if (cur.lo === last.lo) last.loInc = last.loInc || cur.loInc;
        if (cur.hi > last.hi) {
          last.hi = cur.hi;
          last.hiInc = cur.hiInc;
        } else if (cur.hi === last.hi) {
          last.hiInc = last.hiInc || cur.hiInc;
        }
      } else {
        merged.push({ ...cur });
      }
    }
    return { roots: uniqueRoots, intervals: merged, coeffs, relation: rel };
  }

  function findRoot(expression, guess, options) {
    const ctx = normalizeContext(options);
    const ast = parse(tokenize(expression));
    return Z(solveNode(ast, ctx, guess == null ? 1 : guess), 0);
  }

  /* ============================================================
   * Ma trận
   * ============================================================ */
  function validateMatrix(m) {
    if (!Array.isArray(m) || !m.length || !Array.isArray(m[0]) || !m[0].length) fail("Dimension ERROR");
    const cols = m[0].length;
    if (m.some((row) => row.length !== cols)) fail("Dimension ERROR");
    return { rows: m.length, cols };
  }

  const matrix = {
    dim(m) { return validateMatrix(m); },
    clone(m) { return m.map((r) => r.slice()); },
    add(a, b) {
      const da = validateMatrix(a), db = validateMatrix(b);
      if (da.rows !== db.rows || da.cols !== db.cols) fail("Dimension ERROR", "Hai ma trận phải cùng kích thước");
      return a.map((row, i) => row.map((v, j) => clean(v + b[i][j])));
    },
    sub(a, b) {
      const da = validateMatrix(a), db = validateMatrix(b);
      if (da.rows !== db.rows || da.cols !== db.cols) fail("Dimension ERROR", "Hai ma trận phải cùng kích thước");
      return a.map((row, i) => row.map((v, j) => clean(v - b[i][j])));
    },
    scale(a, k) {
      validateMatrix(a);
      return a.map((row) => row.map((v) => clean(v * k)));
    },
    mul(a, b) {
      const da = validateMatrix(a), db = validateMatrix(b);
      if (da.cols !== db.rows) fail("Dimension ERROR", "Số cột A phải bằng số dòng B");
      const out = [];
      for (let i = 0; i < da.rows; i++) {
        const row = [];
        for (let j = 0; j < db.cols; j++) {
          let sum = 0;
          for (let k = 0; k < da.cols; k++) sum += a[i][k] * b[k][j];
          row.push(clean(sum));
        }
        out.push(row);
      }
      return out;
    },
    transpose(a) {
      const d = validateMatrix(a);
      return Array.from({ length: d.cols }, (_, j) => Array.from({ length: d.rows }, (_, i) => a[i][j]));
    },
    identity(n) { return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))); },
    det(a) {
      const d = validateMatrix(a);
      if (d.rows !== d.cols) fail("Dimension ERROR", "Cần ma trận vuông");
      const n = d.rows;
      const m = this.clone(a);
      let det = 1;
      for (let col = 0; col < n; col++) {
        let pivot = col;
        for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
        if (Math.abs(m[pivot][col]) < 1e-12) return 0;
        if (pivot !== col) { [m[pivot], m[col]] = [m[col], m[pivot]]; det *= -1; }
        const p = m[col][col];
        det *= p;
        for (let r = col + 1; r < n; r++) {
          const factor = m[r][col] / p;
          if (factor === 0) continue;
          for (let j = col; j < n; j++) m[r][j] -= factor * m[col][j];
        }
      }
      return clean(det);
    },
    inverse(a) {
      const d = validateMatrix(a);
      if (d.rows !== d.cols) fail("Dimension ERROR", "Cần ma trận vuông");
      const n = d.rows;
      const m = a.map((row, i) => row.map((v, j) => [v, i === j ? 1 : 0]));
      for (let col = 0; col < n; col++) {
        let pivot = col;
        for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col][0]) > Math.abs(m[pivot][col][0])) pivot = r;
        if (Math.abs(m[pivot][col][0]) < 1e-12) fail("Math ERROR", "Ma trận không khả nghịch");
        if (pivot !== col) [m[pivot], m[col]] = [m[col], m[pivot]];
        const p = m[col][col][0];
        for (let j = 0; j < n; j++) { m[col][j][0] /= p; m[col][j][1] /= p; }
        for (let r = 0; r < n; r++) {
          if (r === col) continue;
          const factor = m[r][col][0];
          if (Math.abs(factor) < 1e-15) continue;
          for (let j = 0; j < n; j++) {
            m[r][j][0] -= factor * m[col][j][0];
            m[r][j][1] -= factor * m[col][j][1];
          }
        }
      }
      return m.map((row) => row.map((pair) => clean(pair[1])));
    },
    trace(a) {
      const d = validateMatrix(a);
      if (d.rows !== d.cols) fail("Dimension ERROR");
      let s = 0;
      for (let i = 0; i < d.rows; i++) s += a[i][i];
      return clean(s);
    }
  };

  /* ============================================================
   * Vectơ
   * ============================================================ */
  const vector = {
    add(a, b) {
      if (a.length !== b.length) fail("Dimension ERROR");
      return a.map((v, i) => clean(v + b[i]));
    },
    sub(a, b) {
      if (a.length !== b.length) fail("Dimension ERROR");
      return a.map((v, i) => clean(v - b[i]));
    },
    scale(a, k) { return a.map((v) => clean(v * k)); },
    dot(a, b) {
      if (a.length !== b.length) fail("Dimension ERROR");
      return clean(a.reduce((s, v, i) => s + v * b[i], 0));
    },
    cross(a, b) {
      if (a.length !== 3 || b.length !== 3) fail("Dimension ERROR", "Tích có hướng cần vectơ 3 chiều");
      return [
        clean(a[1] * b[2] - a[2] * b[1]),
        clean(a[2] * b[0] - a[0] * b[2]),
        clean(a[0] * b[1] - a[1] * b[0])
      ];
    },
    norm(a) { return Math.hypot.apply(null, a); },
    unit(a) {
      const n = this.norm(a);
      if (n === 0) fail("Math ERROR");
      return a.map((v) => clean(v / n));
    },
    angle(a, b, unit) {
      const na = this.norm(a), nb = this.norm(b);
      if (na === 0 || nb === 0) fail("Math ERROR");
      const cos = Math.max(-1, Math.min(1, this.dot(a, b) / (na * nb)));
      const rad = Math.acos(cos);
      if (unit === "rad") return rad;
      if (unit === "gra") return (rad * 200) / Math.PI;
      return (rad * 180) / Math.PI;
    }
  };

  /* ============================================================
   * Hệ cơ số N (BigInt)
   * ============================================================ */
  function toBaseString(value, base) {
    const n = typeof value === "bigint" ? value : BigInt(value);
    if (base < 2 || base > 16) fail("Argument ERROR");
    if (n === 0n) return "0";
    const digits = "0123456789ABCDEF";
    const neg = n < 0n;
    let x = neg ? -n : n;
    let out = "";
    while (x > 0n) {
      out = digits[Number(x % BigInt(base))] + out;
      x /= BigInt(base);
    }
    return (neg ? "-" : "") + out;
  }

  const BASE_KEYWORDS = ["xnor", "nand", "nor", "and", "or", "xor", "not", "shl", "shr", "mod"];
  const BASE_INFIX = {
    or: { prec: 2, op: "or" },
    nor: { prec: 2, op: "nor" },
    xor: { prec: 3, op: "xor" },
    xnor: { prec: 3, op: "xnor" },
    and: { prec: 4, op: "and" },
    nand: { prec: 4, op: "nand" },
    shl: { prec: 5, op: "shl" },
    shr: { prec: 5, op: "shr" },
    "+": { prec: 6, op: "+" },
    "-": { prec: 6, op: "-" },
    "*": { prec: 7, op: "*" },
    "/": { prec: 7, op: "/" },
    mod: { prec: 7, op: "mod" }
  };

  function tokenizeBase(input, base, ansValue) {
    let s = String(input || "")
      .replace(/−/g, "-")
      .replace(/×/g, "*")
      .replace(/÷/g, "/");
    s = autoCloseParens(s);
    const tokens = [];
    let i = 0;
    const digitValue = (c) => {
      if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
      if (c >= "A" && c <= "F") return c.charCodeAt(0) - 55;
      if (c >= "a" && c <= "f") return c.charCodeAt(0) - 87;
      return -1;
    };
    const validDigit = (c) => {
      const d = digitValue(c);
      return d >= 0 && d < base;
    };
    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      const lower = s.slice(i).toLowerCase();
      if (lower.startsWith("ans")) {
        tokens.push({ type: "num", value: ansValue || 0n });
        i += 3;
        continue;
      }
      let kw = null;
      for (const k of BASE_KEYWORDS) {
        if (lower.startsWith(k)) { kw = k; break; }
      }
      if (kw) {
        tokens.push({ type: "op", value: kw });
        i += kw.length;
        continue;
      }
      if (validDigit(ch)) {
        let raw = "";
        while (i < s.length && validDigit(s[i])) { raw += s[i]; i++; }
        let value = 0n;
        for (const d of raw) value = value * BigInt(base) + BigInt(digitValue(d));
        tokens.push({ type: "num", value });
        continue;
      }
      if ("+-*/()!".includes(ch)) {
        if (ch === "!") fail("Syntax ERROR", "Base-N không hỗ trợ giai thừa");
        tokens.push({ type: ch === "(" || ch === ")" ? ch : "op", value: ch });
        i++;
        continue;
      }
      fail("Syntax ERROR", `Chữ số/ký tự không hợp lệ trong hệ ${base}: ${ch}`);
    }
    const canEnd = new Set(["num", ")"]);
    const canStart = new Set(["num", "("]);
    const out = [];
    for (let k = 0; k < tokens.length; k++) {
      const prev = tokens[k - 1], cur = tokens[k];
      if (prev && canEnd.has(prev.type) && canStart.has(cur.type)) {
        if (!(prev.type === "num" && cur.type === "num")) out.push({ type: "op", value: "*" });
      }
      out.push(cur);
    }
    return out;
  }

  function evaluateBaseN(input, base, options) {
    const radix = Number(base) || 10;
    if (![2, 8, 10, 16].includes(radix)) fail("Argument ERROR");
    const opts = options || {};
    const tokens = tokenizeBase(input, radix, opts.ans == null ? 0n : BigInt(opts.ans));
    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];
    const syntax = () => fail("Syntax ERROR");

    function parseExpr(minPrec) {
      let left = parsePrefix();
      while (true) {
        const t = peek();
        if (!t || t.type !== "op" || !BASE_INFIX[t.value]) break;
        const info = BASE_INFIX[t.value];
        if (info.prec < minPrec) break;
        next();
        const right = parseExpr(info.prec + 1);
        const op = info.op;
        let value;
        switch (op) {
          case "+": value = left + right; break;
          case "-": value = left - right; break;
          case "*": value = left * right; break;
          case "/":
            if (right === 0n) fail("Math ERROR", "Chia cho 0");
            value = left / right;
            break;
          case "mod":
            if (right === 0n) fail("Math ERROR", "Chia cho 0");
            value = ((left % right) + right) % right;
            break;
          case "and": value = left & right; break;
          case "or": value = left | right; break;
          case "xor": value = left ^ right; break;
          case "xnor": value = ~(left ^ right); break;
          case "nand": value = ~(left & right); break;
          case "nor": value = ~(left | right); break;
          case "shl": value = left << right; break;
          case "shr": value = left >> right; break;
          default: syntax();
        }
        left = value;
      }
      return left;
    }

    function parsePrefix() {
      const t = next();
      if (!t) syntax();
      if (t.type === "num") return t.value;
      if (t.type === "(") {
        const v = parseExpr(0);
        if (!peek() || peek().type !== ")") syntax();
        next();
        return v;
      }
      if (t.type === "op" && t.value === "-") return -parsePrefix();
      if (t.type === "op" && t.value === "+") return parsePrefix();
      if (t.type === "op" && t.value === "not") return ~parsePrefix();
      syntax();
    }

    if (!tokens.length) syntax();
    const value = parseExpr(0);
    if (pos < tokens.length) syntax();
    return value;
  }

  const baseN = {
    evaluate: evaluateBaseN,
    toString: toBaseString,
    parse(input, base) {
      const value = evaluateBaseN(input, base);
      return Number(value);
    }
  };

  return {
    CalcError,
    evaluate,
    parseExpression(expr) { return parse(tokenize(expr)); },
    toFraction,
    roundSignificant,
    toRad,
    fromRad,
    stats1,
    stats2,
    predictRegression,
    normalPdf,
    normalCdf,
    invNormal,
    studentTCdf,
    studentTInv,
    binomialPmf,
    binomialCdf,
    poissonPmf,
    poissonCdf,
    polyRoots,
    polyEval,
    solveLinearSystem,
    solveSmallSystem,
    solvePolynomialInequality,
    findRoot,
    matrix,
    vector,
    baseN,
    toBaseString,
    evaluateBaseN,
    gcd,
    lcm,
    factorial,
    nPr,
    nCr
  };
});


