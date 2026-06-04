// Teste de fumaca ponta a ponta: auth + RBAC + cobranca + ledger + PIX + agendador.
// Uso: node scripts/smoke.mjs   (com o servidor rodando)
const base = 'http://localhost:3000';

function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

async function api(method, path, { token, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* sem corpo */
  }
  return { status: res.status, json };
}

async function waitHealth(tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) return await r.json();
    } catch {
      /* subindo */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Servidor nao respondeu em /health');
}

let pass = 0;
let fail = 0;
function check(label, ok, extra = '') {
  console.log(`${ok ? 'OK  ' : 'FALHA'} | ${label}${extra ? '  ' + extra : ''}`);
  ok ? pass++ : fail++;
}

(async () => {
  await waitHealth();
  const tenantId = `smoke-${Date.now()}`;
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // --- Auth ---
  const reg = await api('POST', '/auth/register', {
    body: { tenantId, email: 'admin@smoke.com', password: 'senha123' },
  });
  check('register admin -> 201/200 + token', reg.status < 300 && !!reg.json.accessToken);
  const admin = reg.json.accessToken;

  const mkAgent = await api('POST', '/users', {
    token: admin,
    body: { email: 'agente@smoke.com', password: 'senha123', role: 'AGENT' },
  });
  check('admin cria usuario AGENT -> 201', mkAgent.status < 300);

  const loginAgent = await api('POST', '/auth/login', {
    body: { tenantId, email: 'agente@smoke.com', password: 'senha123' },
  });
  const agent = loginAgent.json.accessToken;
  check('login do agente -> token', !!agent);

  // --- Autenticacao obrigatoria ---
  const noToken = await api('GET', '/charges');
  check('GET /charges sem token -> 401', noToken.status === 401, `(got ${noToken.status})`);

  // --- Fluxo (admin) ---
  const cust = await api('POST', '/customers', {
    token: admin,
    body: { name: 'Maria Souza', phone: '+5511999998888' },
  });
  check('admin cria cliente -> 201', cust.status < 300);
  const customerId = cust.json.id;

  const charge = await api('POST', '/charges', {
    token: admin,
    body: { customerId, amountCents: 4990, description: 'Mensalidade', dueDate: yesterday },
  });
  check('admin cria cobranca (vencida) -> 201', charge.status < 300);
  const chargeId = charge.json.id;

  // --- RBAC: agente NAO pode pagar nem ver saldos ---
  const agentPay = await api('POST', `/charges/${chargeId}/pay`, { token: agent });
  check('agente paga cobranca -> 403 (proibido)', agentPay.status === 403, `(got ${agentPay.status})`);

  const agentLedger = await api('GET', '/ledger/balances', { token: agent });
  check('agente ve saldos -> 403 (proibido)', agentLedger.status === 403, `(got ${agentLedger.status})`);

  // --- RBAC: agente PODE criar cobranca ---
  const agentCharge = await api('POST', '/charges', {
    token: agent,
    body: { customerId, amountCents: 1000, description: 'Taxa', dueDate: yesterday },
  });
  check('agente cria cobranca -> 201 (permitido)', agentCharge.status < 300, `(got ${agentCharge.status})`);

  // --- Ledger (admin) ---
  const bal1 = await api('GET', '/ledger/balances', { token: admin });
  check('saldos apos criar -> AR>0 e REVENUE<0',
    bal1.json.ACCOUNTS_RECEIVABLE > 0 && bal1.json.REVENUE < 0,
    JSON.stringify(bal1.json));

  const pay = await api('POST', `/charges/${chargeId}/pay`, { token: admin });
  check('admin paga cobranca -> 200 + PAID', pay.status < 300 && pay.json.status === 'PAID');

  const bal2 = await api('GET', '/ledger/balances', { token: admin });
  check('saldos apos pagar -> CASH>0', bal2.json.CASH > 0, JSON.stringify(bal2.json));

  // --- PIX real ---
  const pix = await api('GET', `/charges/${chargeId}/pix`, { token: admin });
  const code = pix.json.pixCopyPaste ?? '';
  const crcOk = code.length > 8 && crc16(code.slice(0, -4)) === code.slice(-4);
  check('PIX copia-e-cola valido (começa 000201 + CRC ok)',
    code.startsWith('000201') && crcOk);
  console.log('     PIX =', code);

  // --- Agendador de lembretes ---
  const run = await api('POST', '/admin/reminders/run', { token: admin });
  check('agendador enfileira lembretes -> enqueued>=1', (run.json.enqueued ?? 0) >= 1, `(enqueued=${run.json?.enqueued})`);

  // --- DTO invalido ---
  const bad = await api('POST', '/charges', {
    token: admin,
    body: { customerId, amountCents: -5, description: 'x', dueDate: 'nao-e-data' },
  });
  check('DTO invalido -> 400', bad.status === 400, `(got ${bad.status})`);

  console.log(`\nRESULTADO: ${pass} OK, ${fail} falha(s)`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
