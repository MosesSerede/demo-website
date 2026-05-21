const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from /public if it exists, otherwise from the project root
const fs = require('fs');
const publicDir = path.join(__dirname, 'public');
const staticDir = fs.existsSync(publicDir) ? publicDir : __dirname;
app.use(express.static(staticDir));

// ─── BigInt Utilities ────────────────────────────────────────────────────────

function safeBI(val) {
  const s = String(val).trim().replace(/,/g, '').replace(/\s/g, '');
  if (!/^-?\d+$/.test(s)) throw new Error(`Invalid integer: "${val}"`);
  return BigInt(s);
}

function fmt(n) {
  return String(n).replace(/^-/, '-').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

function digitCount(n) {
  const s = String(n < 0n ? -n : n);
  return s.length;
}

// ─── Operations ──────────────────────────────────────────────────────────────

function opPower(a, b) {
  const base = safeBI(a);
  const exp = safeBI(b);
  if (exp < 0n) throw new Error('Exponent must be non-negative for integer power');
  if (exp > 100000n) throw new Error('Exponent too large (max 100,000)');
  const result = base ** exp;
  const digits = digitCount(result);
  return {
    result: String(result),
    digits,
    preview: digits > 50 ? String(result).slice(0, 30) + '…' + String(result).slice(-20) : String(result),
    notation: toScientific(result)
  };
}

function opFactorial(a) {
  const n = safeBI(a);
  if (n < 0n) throw new Error('Factorial undefined for negative numbers');
  if (n > 50000n) throw new Error('n too large (max 50,000)');
  let result = 1n;
  for (let i = 2n; i <= n; i++) result *= i;
  const digits = digitCount(result);
  return {
    result: String(result),
    digits,
    preview: digits > 50 ? String(result).slice(0, 30) + '…' + String(result).slice(-20) : String(result),
    notation: toScientific(result)
  };
}

function opCombination(n, k) {
  const N = safeBI(n), K = safeBI(k);
  if (N < 0n || K < 0n) throw new Error('n and k must be non-negative');
  if (K > N) throw new Error('k cannot exceed n');
  if (N > 10000n) throw new Error('n too large (max 10,000)');
  const result = factorial(N) / (factorial(K) * factorial(N - K));
  const digits = digitCount(result);
  return {
    result: String(result),
    digits,
    preview: digits > 50 ? String(result).slice(0, 30) + '…' + String(result).slice(-20) : String(result),
    notation: toScientific(result)
  };
}

function opPermutation(n, k) {
  const N = safeBI(n), K = safeBI(k);
  if (N < 0n || K < 0n) throw new Error('n and k must be non-negative');
  if (K > N) throw new Error('k cannot exceed n');
  if (N > 10000n) throw new Error('n too large (max 10,000)');
  const result = factorial(N) / factorial(N - K);
  const digits = digitCount(result);
  return {
    result: String(result),
    digits,
    preview: digits > 50 ? String(result).slice(0, 30) + '…' + String(result).slice(-20) : String(result),
    notation: toScientific(result)
  };
}

function opModPow(base, exp, mod) {
  const b = safeBI(base), e = safeBI(exp), m = safeBI(mod);
  if (m === 0n) throw new Error('Modulus cannot be zero');
  if (e < 0n) throw new Error('Exponent must be non-negative');
  const result = modPow(b, e, m);
  return {
    result: String(result),
    digits: digitCount(result),
    preview: String(result),
    notation: toScientific(result)
  };
}

function opGcd(a, b) {
  let x = safeBI(a), y = safeBI(b);
  if (x < 0n) x = -x;
  if (y < 0n) y = -y;
  while (y !== 0n) { [x, y] = [y, x % y]; }
  return {
    result: String(x),
    digits: digitCount(x),
    preview: String(x),
    notation: toScientific(x)
  };
}

function opLcm(a, b) {
  const x = safeBI(a), y = safeBI(b);
  const g = gcd(x < 0n ? -x : x, y < 0n ? -y : y);
  const result = (x < 0n ? -x : x) / g * (y < 0n ? -y : y);
  const digits = digitCount(result);
  return {
    result: String(result),
    digits,
    preview: digits > 50 ? String(result).slice(0, 30) + '…' + String(result).slice(-20) : String(result),
    notation: toScientific(result)
  };
}

function opFibonacci(n) {
  const N = safeBI(n);
  if (N < 0n) throw new Error('n must be non-negative');
  if (N > 100000n) throw new Error('n too large (max 100,000)');
  const result = fibonacci(N);
  const digits = digitCount(result);
  return {
    result: String(result),
    digits,
    preview: digits > 50 ? String(result).slice(0, 30) + '…' + String(result).slice(-20) : String(result),
    notation: toScientific(result)
  };
}

function opLucas(n) {
  const N = safeBI(n);
  if (N < 0n) throw new Error('n must be non-negative');
  if (N > 100000n) throw new Error('n too large (max 100,000)');
  if (N === 0n) return payload(2n);
  if (N === 1n) return payload(1n);
  let a = 2n, b = 1n;
  for (let i = 2n; i <= N; i++) { [a, b] = [b, a + b]; }
  return payload(b);
}

function opCatalan(n) {
  const N = safeBI(n);
  if (N < 0n) throw new Error('n must be non-negative');
  if (N > 5000n) throw new Error('n too large (max 5,000)');
  // C(n) = (2n)! / ((n+1)! * n!)
  const result = factorial(2n * N) / (factorial(N + 1n) * factorial(N));
  return payload(result);
}

function opBell(n) {
  const N = Number(safeBI(n));
  if (N < 0) throw new Error('n must be non-negative');
  if (N > 500) throw new Error('n too large (max 500)');
  // Bell triangle
  const tri = [[1n]];
  for (let i = 1; i <= N; i++) {
    const row = [tri[i - 1][tri[i - 1].length - 1]];
    for (let j = 0; j < tri[i - 1].length; j++) row.push(row[j] + tri[i - 1][j]);
    tri.push(row);
  }
  return payload(tri[N][0]);
}

function opIsqrt(a) {
  const n = safeBI(a);
  if (n < 0n) throw new Error('Cannot compute square root of negative integer');
  if (n === 0n) return payload(0n);
  let x = n, y = (x + 1n) / 2n;
  while (y < x) { x = y; y = (x + n / x) / 2n; }
  return payload(x);
}

function opAdd(a, b) { return payload(safeBI(a) + safeBI(b)); }
function opSubtract(a, b) { return payload(safeBI(a) - safeBI(b)); }
function opMultiply(a, b) { return payload(safeBI(a) * safeBI(b)); }
function opDivide(a, b) {
  const d = safeBI(b);
  if (d === 0n) throw new Error('Division by zero');
  const q = safeBI(a) / d, r = safeBI(a) % d;
  return {
    result: String(q),
    remainder: String(r),
    digits: digitCount(q),
    preview: String(q).length > 50 ? String(q).slice(0, 30) + '…' + String(q).slice(-20) : String(q),
    notation: toScientific(q)
  };
}
function opModulo(a, b) {
  const d = safeBI(b);
  if (d === 0n) throw new Error('Modulus cannot be zero');
  return payload(safeBI(a) % d);
}

function opPrimorial(n) {
  const N = Number(safeBI(n));
  if (N < 0) throw new Error('n must be non-negative');
  if (N > 10000) throw new Error('n too large (max 10,000)');
  const primes = sieve(N);
  let result = 1n;
  for (const p of primes) result *= BigInt(p);
  return payload(result);
}

function opDoubleFactorial(n) {
  const N = safeBI(n);
  if (N < 0n) throw new Error('n must be non-negative');
  if (N > 30000n) throw new Error('n too large (max 30,000)');
  let result = 1n;
  for (let i = N; i > 0n; i -= 2n) result *= i;
  return payload(result);
}

function opSuperFactorial(n) {
  const N = safeBI(n);
  if (N < 0n) throw new Error('n must be non-negative');
  if (N > 500n) throw new Error('n too large (max 500)');
  let result = 1n;
  for (let i = 1n; i <= N; i++) result *= factorial(i);
  return payload(result);
}

function opTetration(a, b) {
  // a^^b = a^(a^(a^...)) b times — only feasible for small towers
  const base = safeBI(a), tower = safeBI(b);
  if (tower < 0n) throw new Error('Tower must be non-negative');
  if (tower > 5n) throw new Error('Tower too large (max 5) — results are astronomically huge');
  if (base > 10n && tower > 4n) throw new Error('base > 10 with tower > 4 produces uncomputable results');
  if (tower === 0n) return payload(1n);
  let result = base;
  for (let i = 1n; i < tower; i++) result = base ** result;
  return payload(result);
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function factorial(n) {
  let r = 1n;
  for (let i = 2n; i <= n; i++) r *= i;
  return r;
}

function gcd(a, b) {
  while (b !== 0n) { [a, b] = [b, a % b]; }
  return a;
}

function modPow(base, exp, mod) {
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = result * base % mod;
    exp = exp / 2n;
    base = base * base % mod;
  }
  return result;
}

function fibonacci(n) {
  if (n === 0n) return 0n;
  if (n === 1n) return 1n;
  let a = 0n, b = 1n;
  for (let i = 2n; i <= n; i++) { [a, b] = [b, a + b]; }
  return b;
}

function sieve(limit) {
  if (limit < 2) return [];
  const isP = new Uint8Array(limit + 1).fill(1);
  isP[0] = isP[1] = 0;
  for (let i = 2; i * i <= limit; i++) {
    if (isP[i]) for (let j = i * i; j <= limit; j += i) isP[j] = 0;
  }
  return [...isP.keys()].filter(i => isP[i]);
}

function toScientific(n) {
  const s = String(n < 0n ? -n : n);
  if (s.length <= 6) return String(n);
  const exp = s.length - 1;
  const mantissa = s[0] + '.' + s.slice(1, 5);
  return `${n < 0n ? '-' : ''}${mantissa} × 10^${exp}`;
}

function payload(result) {
  const digits = digitCount(result);
  const s = String(result);
  return {
    result: s,
    digits,
    preview: digits > 50 ? s.slice(0, 30) + '…' + s.slice(-20) : s,
    notation: toScientific(result)
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const ops = {
  power: (b) => opPower(b.a, b.b),
  factorial: (b) => opFactorial(b.a),
  combination: (b) => opCombination(b.a, b.b),
  permutation: (b) => opPermutation(b.a, b.b),
  modpow: (b) => opModPow(b.a, b.b, b.c),
  gcd: (b) => opGcd(b.a, b.b),
  lcm: (b) => opLcm(b.a, b.b),
  fibonacci: (b) => opFibonacci(b.a),
  lucas: (b) => opLucas(b.a),
  catalan: (b) => opCatalan(b.a),
  bell: (b) => opBell(b.a),
  isqrt: (b) => opIsqrt(b.a),
  add: (b) => opAdd(b.a, b.b),
  subtract: (b) => opSubtract(b.a, b.b),
  multiply: (b) => opMultiply(b.a, b.b),
  divide: (b) => opDivide(b.a, b.b),
  modulo: (b) => opModulo(b.a, b.b),
  primorial: (b) => opPrimorial(b.a),
  double_factorial: (b) => opDoubleFactorial(b.a),
  super_factorial: (b) => opSuperFactorial(b.a),
  tetration: (b) => opTetration(b.a, b.b)
};

app.post('/api/calculate', (req, res) => {
  const { operation, ...body } = req.body;
  if (!operation || !ops[operation]) {
    return res.status(400).json({ error: `Unknown operation: "${operation}"` });
  }
  try {
    const start = Date.now();
    const result = ops[operation](body);
    const ms = Date.now() - start;
    res.json({ success: true, operation, ...result, computeTime: ms });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.get('/api/examples', (req, res) => {
  res.json([
    { label: 'Bitcoin private key space', op: 'power', a: '2', b: '256', desc: 'Total possible Bitcoin private keys' },
    { label: 'SHA-256 hash space', op: 'power', a: '2', b: '256', desc: 'Possible SHA-256 outputs' },
    { label: 'Googolplex', op: 'power', a: '10', b: '100', desc: 'A googol — 10^100' },
    { label: '1000!', op: 'factorial', a: '1000', desc: 'Factorial of 1,000' },
    { label: '10000th Fibonacci', op: 'fibonacci', a: '10000', desc: '10,000th Fibonacci number' },
    { label: 'RSA modexp demo', op: 'modpow', a: '65537', b: '65537', c: '999999999999999989', desc: 'Modular exponentiation (RSA-like)' },
    { label: 'C(1000,500)', op: 'combination', a: '1000', b: '500', desc: 'Combinations: 1000 choose 500' },
    { label: 'Catalan(100)', op: 'catalan', a: '100', desc: '100th Catalan number' },
    { label: 'Primorial(1000)', op: 'primorial', a: '1000', desc: 'Product of all primes up to 1000' },
    { label: '2^^4 (tetration)', op: 'tetration', a: '2', b: '4', desc: '2 tetrated to 4 — 2^2^2^2' }
  ]);
});

app.get('/', (req, res) => res.sendFile(path.join(staticDir, 'index.html')));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n🚀 Large Numbers Server running at http://localhost:${PORT}\n`));