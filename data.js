/* Dữ liệu tĩnh cho NIGSIO motkikiX Web Emulator */
(function (root) {
  "use strict";

  const modes = [
    { id: "calculate", key: "1", name: "Tính toán", desc: "Tính toán tổng hợp, phân số, lũy thừa, lượng giác, giải tích…", icon: "calc", group: "basic" },
    { id: "complex", key: "2", name: "Số phức", desc: "Tính toán với số phức, môđun, argument, liên hợp.", icon: "complex", group: "basic" },
    { id: "basen", key: "3", name: "Cơ số N", desc: "Tính toán nhị phân, bát phân, thập phân, thập lục phân.", icon: "basen", group: "basic" },
    { id: "matrix", key: "4", name: "Ma trận", desc: "Định nghĩa và tính toán ma trận đến 5×5.", icon: "matrix", group: "advanced" },
    { id: "vector", key: "5", name: "Vectơ", desc: "Vectơ A–E trong 2D, 3D: cộng, tích vô hướng, tích có hướng…", icon: "vector", group: "advanced" },
    { id: "statistics", key: "6", name: "Thống kê", desc: "Thống kê một biến, hai biến và các mô hình hồi quy.", icon: "stats", group: "advanced" },
    { id: "distribution", key: "7", name: "Phân phối", desc: "Chuẩn, nhị thức, Poisson: PD, CD và phân vị.", icon: "normal", group: "advanced" },
    { id: "table", key: "8", name: "Bảng giá trị", desc: "Lập bảng giá trị cho một hoặc hai hàm số.", icon: "table", group: "advanced" },
    { id: "equation", key: "9", name: "Phương trình", desc: "Hệ tuyến tính 2–5 ẩn, phương trình bậc 2–8 và solver.", icon: "equation", group: "advanced" },
    { id: "inequality", key: "A", name: "Bất phương trình", desc: "Giải bất phương trình đa thức bậc 2–5.", icon: "inequality", group: "advanced" },
    { id: "verify", key: "B", name: "Kiểm tra", desc: "Kiểm chứng đẳng thức và bất đẳng thức.", icon: "verify", group: "advanced" },
    { id: "ratio", key: "C", name: "Tỉ lệ", desc: "Giải tỉ lệ thức a : b = c : d.", icon: "ratio", group: "advanced" }
  ];

  const functionGroups = [
    {
      id: "basic", name: "Cơ bản", icon: "radical",
      items: [
        { label: "Phân số", html: "□⁄□", insert: "frac(,)", caret: 5, desc: "Nhập phân số" },
        { label: "Căn bậc hai", html: "√□", insert: "sqrt()", caret: 5, desc: "Căn bậc hai" },
        { label: "Căn bậc ba", html: "∛□", insert: "cbrt()", caret: 5, desc: "Căn bậc ba" },
        { label: "Căn bậc n", html: "ⁿ√□", insert: "nroot(,)", caret: 6, desc: "nroot(n, x)" },
        { label: "Lũy thừa", html: "xʸ", insert: "^", caret: 1, desc: "Mũ" },
        { label: "Bình phương", html: "x²", insert: "^2", caret: 2, desc: "Bình phương" },
        { label: "Trị tuyệt đối", html: "|x|", insert: "abs()", caret: 4, desc: "Giá trị tuyệt đối" },
        { label: "Giai thừa", html: "x!", insert: "!", caret: 1, desc: "Giai thừa" },
        { label: "Phần trăm", html: "%", insert: "%", caret: 1, desc: "Phần trăm" },
        { label: "Logarit", html: "log", insert: "log()", caret: 4, desc: "Logarit cơ số 10" },
        { label: "Logarit tự nhiên", html: "ln", insert: "ln()", caret: 3, desc: "Logarit tự nhiên" },
        { label: "Logarit cơ số b", html: "log_b", insert: "logbase(,)", caret: 8, desc: "logbase(b, x)" },
        { label: "Hàm mũ", html: "eˣ", insert: "exp()", caret: 4, desc: "e mũ x" }
      ]
    },
    {
      id: "arithmetic", name: "Số học", icon: "numbers",
      items: [
        { label: "ƯCLN", html: "GCD", insert: "gcd(,)", caret: 4, desc: "Ước chung lớn nhất" },
        { label: "BCNN", html: "LCM", insert: "lcm(,)", caret: 4, desc: "Bội chung nhỏ nhất" },
        { label: "Chia lấy dư", html: "mod", insert: "mod(,)", caret: 4, desc: "Phần dư" },
        { label: "Tổ hợp", html: "nCr", insert: "ncr(,)", caret: 4, desc: "Số tổ hợp" },
        { label: "Chỉnh hợp", html: "nPr", insert: "npr(,)", caret: 4, desc: "Số chỉnh hợp" },
        { label: "Làm tròn", html: "round", insert: "round()", caret: 6, desc: "Làm tròn" },
        { label: "Sàn", html: "⌊x⌋", insert: "floor()", caret: 6, desc: "Phần nguyên lớn hơn" },
        { label: "Trần", html: "⌈x⌉", insert: "ceil()", caret: 5, desc: "Phần nguyên nhỏ hơn" },
        { label: "Phần nguyên", html: "Int", insert: "ipart()", caret: 6, desc: "Bỏ phần thập phân" },
        { label: "Phần lẻ", html: "Frac", insert: "fpart()", caret: 6, desc: "Phần thập phân" },
        { label: "Dấu", html: "sgn", insert: "sign()", caret: 5, desc: "Dấu của số" },
        { label: "Ngẫu nhiên", html: "Ran#", insert: "rand()", caret: 5, desc: "Số thực ngẫu nhiên [0;1)" },
        { label: "Số nguyên ngẫu nhiên", html: "RanInt", insert: "randint(,)", caret: 8, desc: "Số nguyên ngẫu nhiên" }
      ]
    },
    {
      id: "trig", name: "Lượng giác", icon: "wave",
      items: [
        { label: "Sin", html: "sin", insert: "sin()", caret: 4, desc: "Hàm sin" },
        { label: "Cos", html: "cos", insert: "cos()", caret: 4, desc: "Hàm cos" },
        { label: "Tan", html: "tan", insert: "tan()", caret: 4, desc: "Hàm tan" },
        { label: "Sin ngược", html: "sin⁻¹", insert: "asin()", caret: 5, desc: "Hàm asin" },
        { label: "Cos ngược", html: "cos⁻¹", insert: "acos()", caret: 5, desc: "Hàm acos" },
        { label: "Tan ngược", html: "tan⁻¹", insert: "atan()", caret: 5, desc: "Hàm atan" },
        { label: "Sinh", html: "sinh", insert: "sinh()", caret: 5, desc: "Hàm hyperbolic" },
        { label: "Cosh", html: "cosh", insert: "cosh()", caret: 5, desc: "Hàm hyperbolic" },
        { label: "Tanh", html: "tanh", insert: "tanh()", caret: 5, desc: "Hàm hyperbolic" },
        { label: "Sinh ngược", html: "sinh⁻¹", insert: "asinh()", caret: 6, desc: "Hàm hyperbolic ngược" },
        { label: "Cosh ngược", html: "cosh⁻¹", insert: "acosh()", caret: 6, desc: "Hàm hyperbolic ngược" },
        { label: "Tanh ngược", html: "tanh⁻¹", insert: "atanh()", caret: 6, desc: "Hàm hyperbolic ngược" }
      ]
    },
    {
      id: "calculus", name: "Giải tích", icon: "integral",
      items: [
        { label: "Tích phân xác định", html: "∫", insert: "integral(,0,1)", caret: 9, desc: "integral(f(x), a, b)" },
        { label: "Đạo hàm tại điểm", html: "d/dx", insert: "deriv(,0)", caret: 6, desc: "deriv(f(x), a)" },
        { label: "Tổng Sigma", html: "Σ", insert: "sum(,1,10)", caret: 4, desc: "sum(f(x), a, b)" },
        { label: "Tích Pi", html: "∏", insert: "prod(,1,10)", caret: 5, desc: "prod(f(x), a, b)" },
        { label: "Solver", html: "x=?", insert: "solve(,0)", caret: 6, desc: "Tìm nghiệm gần đúng" },
        { label: "Trung bình", html: "mean", insert: "mean(,)", caret: 5, desc: "Trung bình cộng các giá trị" },
        { label: "Giá trị lớn nhất", html: "max", insert: "max(,)", caret: 4, desc: "max(a, b)" },
        { label: "Giá trị nhỏ nhất", html: "min", insert: "min(,)", caret: 4, desc: "min(a, b)" }
      ]
    },
    {
      id: "complex", name: "Số phức", icon: "complex",
      items: [
        { label: "Đơn vị ảo", html: "i", insert: "i", caret: 1, desc: "Đơn vị ảo i" },
        { label: "Môđun", html: "|z|", insert: "abs()", caret: 4, desc: "Môđun của số phức" },
        { label: "Argument", html: "arg", insert: "arg()", caret: 4, desc: "Góc cực" },
        { label: "Liên hợp", html: "z̄", insert: "conj()", caret: 5, desc: "Số phức liên hợp" },
        { label: "Phần thực", html: "Re", insert: "real()", caret: 5, desc: "Phần thực" },
        { label: "Phần ảo", html: "Im", insert: "imag()", caret: 5, desc: "Phần ảo" },
        { label: "Tọa độ cực", html: "r∠θ", insert: "rect(,)", caret: 5, desc: "rect(r, θ)" }
      ]
    },
    {
      id: "variables", name: "Biến", icon: "variable",
      items: [
        { label: "Biến A", html: "A", insert: "A", caret: 1, alpha: true },
        { label: "Biến B", html: "B", insert: "B", caret: 1, alpha: true },
        { label: "Biến C", html: "C", insert: "C", caret: 1, alpha: true },
        { label: "Biến D", html: "D", insert: "D", caret: 1, alpha: true },
        { label: "Biến E", html: "E", insert: "E", caret: 1, alpha: true },
        { label: "Biến F", html: "F", insert: "F", caret: 1, alpha: true },
        { label: "Biến X", html: "x", insert: "X", caret: 1, alpha: true },
        { label: "Biến Y", html: "y", insert: "Y", caret: 1, alpha: true },
        { label: "Bộ nhớ M", html: "M", insert: "M", caret: 1, alpha: true },
        { label: "Ans", html: "Ans", insert: "Ans", caret: 3, alpha: true },
        { label: "Gán biến", html: "STO", action: "store" },
        { label: "Truy xuất biến", html: "RCL", action: "recall" }
      ]
    }
  ];

  const constants = [
    { group: "Vật lý phổ quát", name: "Tốc độ ánh sáng", symbol: "c", value: 299792458, unit: "m/s" },
    { group: "Vật lý phổ quát", name: "Hằng số hấp dẫn", symbol: "G", value: 6.6743e-11, unit: "N·m²/kg²" },
    { group: "Vật lý phổ quát", name: "Hằng số Planck", symbol: "h", value: 6.62607015e-34, unit: "J·s" },
    { group: "Vật lý phổ quát", name: "Hằng số Planck rút gọn", symbol: "ℏ", value: 1.054571817e-34, unit: "J·s" },
    { group: "Vật lý phổ quát", name: "Gia tốc trọng trường chuẩn", symbol: "g", value: 9.80665, unit: "m/s²" },
    { group: "Vật lý phổ quát", name: "Hằng số khí lý tưởng", symbol: "R", value: 8.314462618, unit: "J/(mol·K)" },
    { group: "Vật lý phổ quát", name: "Hằng số Boltzmann", symbol: "k", value: 1.380649e-23, unit: "J/K" },
    { group: "Vật lý phổ quát", name: "Số Avogadro", symbol: "Nₐ", value: 6.02214076e23, unit: "mol⁻¹" },
    { group: "Vật lý phổ quát", name: "Thể tích mol khí lý tưởng (STP)", symbol: "Vₘ", value: 0.02241396954, unit: "m³/mol" },
    { group: "Vật lý nguyên tử", name: "Điện tích nguyên tố", symbol: "e", value: 1.602176634e-19, unit: "C" },
    { group: "Vật lý nguyên tử", name: "Khối lượng electron", symbol: "mₑ", value: 9.1093837015e-31, unit: "kg" },
    { group: "Vật lý nguyên tử", name: "Khối lượng proton", symbol: "mₚ", value: 1.67262192369e-27, unit: "kg" },
    { group: "Vật lý nguyên tử", name: "Khối lượng neutron", symbol: "mₙ", value: 1.67492749804e-27, unit: "kg" },
    { group: "Vật lý nguyên tử", name: "Đơn vị khối lượng nguyên tử", symbol: "u", value: 1.66053906660e-27, unit: "kg" },
    { group: "Vật lý nguyên tử", name: "Bán kính Bohr", symbol: "a₀", value: 5.29177210903e-11, unit: "m" },
    { group: "Vật lý nguyên tử", name: "Hằng số Rydberg", symbol: "R∞", value: 10973731.56816, unit: "m⁻¹" },
    { group: "Vật lý nguyên tử", name: "Hằng số cấu trúc tinh tế", symbol: "α", value: 7.2973525693e-3, unit: "" },
    { group: "Vật lý nguyên tử", name: "Manhêton Bohr", symbol: "μB", value: 9.2740100783e-24, unit: "J/T" },
    { group: "Vật lý nguyên tử", name: "Manhêton hạt nhân", symbol: "μN", value: 5.0507837461e-27, unit: "J/T" },
    { group: "Vật lý nguyên tử", name: "Tần số siêu tinh tế của Cs-133", symbol: "ΔνCs", value: 9192631770, unit: "Hz" },
    { group: "Vật lý lượng tử", name: "Hằng số Stefan–Boltzmann", symbol: "σ", value: 5.670374419e-8, unit: "W/(m²·K⁴)" },
    { group: "Vật lý lượng tử", name: "Hằng số dịch chuyển Wien", symbol: "b", value: 2.897771955e-3, unit: "m·K" },
    { group: "Vật lý lượng tử", name: "Bước sóng Compton", symbol: "λC", value: 2.42631023867e-12, unit: "m" },
    { group: "Vật lý lượng tử", name: "Bán kính electron cổ điển", symbol: "re", value: 2.8179403262e-15, unit: "m" },
    { group: "Vật lý lượng tử", name: "Lượng tử dẫn điện", symbol: "G₀", value: 7.748091729e-5, unit: "S" },
    { group: "Vật lý lượng tử", name: "Lượng tử từ thông", symbol: "Φ₀", value: 2.067833848e-15, unit: "Wb" },
    { group: "Vật lý lượng tử", name: "Hằng số Josephson", symbol: "KJ", value: 4.835978484e14, unit: "Hz/V" },
    { group: "Vật lý lượng tử", name: "Hằng số von Klitzing", symbol: "RK", value: 25812.80745, unit: "Ω" },
    { group: "Vật lý lượng tử", name: "Trở kháng chân không", symbol: "Z₀", value: 376.730313668, unit: "Ω" },
    { group: "Vật lý hạt", name: "Khối lượng muon", symbol: "mμ", value: 1.883531627e-28, unit: "kg" },
    { group: "Vật lý hạt", name: "Khối lượng deuteron", symbol: "md", value: 3.3435837724e-27, unit: "kg" },
    { group: "Vật lý hạt", name: "Khối lượng hạt alpha", symbol: "mα", value: 6.6446573357e-27, unit: "kg" },
    { group: "Điện từ", name: "Hằng số điện môi chân không", symbol: "ε₀", value: 8.8541878128e-12, unit: "F/m" },
    { group: "Điện từ", name: "Độ từ thẩm chân không", symbol: "μ₀", value: 1.25663706212e-6, unit: "N/A²" },
    { group: "Điện từ", name: "Hằng số Coulomb", symbol: "kₑ", value: 8.9875517923e9, unit: "N·m²/C²" },
    { group: "Điện từ", name: "Hằng số Faraday", symbol: "F", value: 96485.33212, unit: "C/mol" },
    { group: "Điện từ", name: "Điện tích electron (eV)", symbol: "eV", value: 1.602176634e-19, unit: "J" },
    { group: "Áp suất", name: "Áp suất khí quyển chuẩn", symbol: "atm", value: 101325, unit: "Pa" },
    { group: "Thiên văn", name: "Đơn vị thiên văn", symbol: "AU", value: 149597870700, unit: "m" },
    { group: "Thiên văn", name: "Năm ánh sáng", symbol: "ly", value: 9.4607304725808e15, unit: "m" },
    { group: "Thiên văn", name: "Parsec", symbol: "pc", value: 3.0856775814913673e16, unit: "m" },
    { group: "Thiên văn", name: "Khối lượng Mặt Trời", symbol: "M☉", value: 1.98847e30, unit: "kg" },
    { group: "Thiên văn", name: "Khối lượng Trái Đất", symbol: "M⊕", value: 5.9722e24, unit: "kg" },
    { group: "Thiên văn", name: "Bán kính Trái Đất", symbol: "R⊕", value: 6.371e6, unit: "m" },
    { group: "Hằng số khác", name: "Số Euler", symbol: "e", value: Math.E, unit: "" },
    { group: "Hằng số khác", name: "Số Pi", symbol: "π", value: Math.PI, unit: "" },
    { group: "Hằng số khác", name: "Tỷ lệ vàng", symbol: "φ", value: 1.618033988749895, unit: "" }
  ];

  const conversions = [
    {
      id: "length", name: "Chiều dài", icon: "ruler",
      units: [
        { id: "m", name: "mét", symbol: "m", factor: 1 },
        { id: "km", name: "kilômét", symbol: "km", factor: 1000 },
        { id: "cm", name: "xentimét", symbol: "cm", factor: 0.01 },
        { id: "mm", name: "milimét", symbol: "mm", factor: 0.001 },
        { id: "in", name: "inch", symbol: "in", factor: 0.0254 },
        { id: "ft", name: "foot", symbol: "ft", factor: 0.3048 },
        { id: "yd", name: "yard", symbol: "yd", factor: 0.9144 },
        { id: "mi", name: "mile", symbol: "mi", factor: 1609.344 },
        { id: "nmi", name: "hải lý", symbol: "nmi", factor: 1852 },
        { id: "AU", name: "đơn vị thiên văn", symbol: "AU", factor: 149597870700 },
        { id: "ly", name: "năm ánh sáng", symbol: "ly", factor: 9.4607304725808e15 }
      ]
    },
    {
      id: "mass", name: "Khối lượng", icon: "weight",
      units: [
        { id: "kg", name: "kilôgam", symbol: "kg", factor: 1 },
        { id: "g", name: "gam", symbol: "g", factor: 0.001 },
        { id: "mg", name: "miligam", symbol: "mg", factor: 1e-6 },
        { id: "t", name: "tấn", symbol: "t", factor: 1000 },
        { id: "lb", name: "pound", symbol: "lb", factor: 0.45359237 },
        { id: "oz", name: "ounce", symbol: "oz", factor: 0.028349523125 },
        { id: "ct", name: "carat", symbol: "ct", factor: 0.0002 },
        { id: "u", name: "đơn vị khối lượng nguyên tử", symbol: "u", factor: 1.6605390666e-27 }
      ]
    },
    {
      id: "area", name: "Diện tích", icon: "area",
      units: [
        { id: "m2", name: "mét vuông", symbol: "m²", factor: 1 },
        { id: "km2", name: "kilômét vuông", symbol: "km²", factor: 1e6 },
        { id: "cm2", name: "xentimét vuông", symbol: "cm²", factor: 1e-4 },
        { id: "ha", name: "hécta", symbol: "ha", factor: 10000 },
        { id: "acre", name: "mẫu Anh", symbol: "acre", factor: 4046.8564224 },
        { id: "ft2", name: "foot vuông", symbol: "ft²", factor: 0.09290304 },
        { id: "in2", name: "inch vuông", symbol: "in²", factor: 0.00064516 },
        { id: "mi2", name: "mile vuông", symbol: "mi²", factor: 2589988.110336 }
      ]
    },
    {
      id: "volume", name: "Thể tích", icon: "volume",
      units: [
        { id: "L", name: "lít", symbol: "L", factor: 0.001 },
        { id: "mL", name: "mililít", symbol: "mL", factor: 1e-6 },
        { id: "m3", name: "mét khối", symbol: "m³", factor: 1 },
        { id: "cm3", name: "xentimét khối", symbol: "cm³", factor: 1e-6 },
        { id: "galUS", name: "gallon Mỹ", symbol: "gal", factor: 0.003785411784 },
        { id: "qtUS", name: "quart Mỹ", symbol: "qt", factor: 0.000946352946 },
        { id: "ptUS", name: "pint Mỹ", symbol: "pt", factor: 0.000473176473 },
        { id: "cupUS", name: "cup Mỹ", symbol: "cup", factor: 0.0002365882365 },
        { id: "flozUS", name: "fluid ounce Mỹ", symbol: "fl oz", factor: 2.95735295625e-5 },
        { id: "galUK", name: "gallon Anh", symbol: "gal UK", factor: 0.00454609 }
      ]
    },
    {
      id: "speed", name: "Tốc độ", icon: "speed",
      units: [
        { id: "ms", name: "mét/giây", symbol: "m/s", factor: 1 },
        { id: "kmh", name: "kilômét/giờ", symbol: "km/h", factor: 1 / 3.6 },
        { id: "mph", name: "dặm/giờ", symbol: "mph", factor: 0.44704 },
        { id: "knot", name: "hải lý/giờ", symbol: "kn", factor: 1852 / 3600 },
        { id: "fts", name: "foot/giây", symbol: "ft/s", factor: 0.3048 }
      ]
    },
    {
      id: "temperature", name: "Nhiệt độ", icon: "temp",
      units: [
        { id: "C", name: "độ Celsius", symbol: "°C", factor: 1, offset: 273.15 },
        { id: "F", name: "độ Fahrenheit", symbol: "°F", factor: 5 / 9, offset: 255.3722222222222 },
        { id: "K", name: "Kelvin", symbol: "K", factor: 1, offset: 0 }
      ]
    },
    {
      id: "energy", name: "Năng lượng", icon: "energy",
      units: [
        { id: "J", name: "joule", symbol: "J", factor: 1 },
        { id: "kJ", name: "kilojoule", symbol: "kJ", factor: 1000 },
        { id: "cal", name: "calorie", symbol: "cal", factor: 4.184 },
        { id: "kcal", name: "kilocalorie", symbol: "kcal", factor: 4184 },
        { id: "kWh", name: "kilowatt giờ", symbol: "kWh", factor: 3.6e6 },
        { id: "eV", name: "electronvolt", symbol: "eV", factor: 1.602176634e-19 },
        { id: "BTU", name: "BTU", symbol: "BTU", factor: 1055.05585262 }
      ]
    },
    {
      id: "pressure", name: "Áp suất", icon: "pressure",
      units: [
        { id: "Pa", name: "pascal", symbol: "Pa", factor: 1 },
        { id: "kPa", name: "kilopascal", symbol: "kPa", factor: 1000 },
        { id: "bar", name: "bar", symbol: "bar", factor: 100000 },
        { id: "atm", name: "atmosphere", symbol: "atm", factor: 101325 },
        { id: "mmHg", name: "milimét thủy ngân", symbol: "mmHg", factor: 133.322387415 },
        { id: "psi", name: "pound/inch²", symbol: "psi", factor: 6894.757293168 }
      ]
    },
    {
      id: "time", name: "Thời gian", icon: "clock",
      units: [
        { id: "s", name: "giây", symbol: "s", factor: 1 },
        { id: "ms", name: "mili giây", symbol: "ms", factor: 0.001 },
        { id: "min", name: "phút", symbol: "min", factor: 60 },
        { id: "h", name: "giờ", symbol: "h", factor: 3600 },
        { id: "day", name: "ngày", symbol: "ngày", factor: 86400 },
        { id: "week", name: "tuần", symbol: "tuần", factor: 604800 },
        { id: "year", name: "năm (365,25 ngày)", symbol: "năm", factor: 31557600 }
      ]
    }
  ];

  const tips = [
    "Nhấn SHIFT rồi phím tương ứng để dùng chức năng in màu vàng.",
    "Nhấn ALPHA để nhập biến A, B, C, D, E, F, X, Y, M hoặc Ans.",
    "S⇔D chuyển đổi qua lại giữa phân số, căn thức và số thập phân.",
    "Dùng ◀ ▶ để di chuyển con trỏ, ▲ ▼ để gọi lại lịch sử.",
    "Trong chế độ Cơ số N, dùng phím A–F trên dải màu xanh để nhập số hex.",
    "Ấn MENU để mở 12 chế độ; bấm MỞ RỘNG trong menu để vào các công cụ nâng cao.",
    "Ví dụ tích phân: integral(x^2,0,3) cho kết quả 9.",
    "Ví dụ thống kê: nhập dữ liệu, chọn mô hình hồi quy và bấm Tính."
  ];

  root.CASIO_DATA = { modes, functionGroups, constants, conversions, tips };
})(typeof globalThis !== "undefined" ? globalThis : this);
