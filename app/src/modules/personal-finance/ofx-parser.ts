export interface OFXTransaction {
  type: 'INCOME' | 'EXPENSE';
  amountCents: number;
  description: string;
  occurredAt: Date;
  fitId: string;
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}[^>]*>([^<]*)<\/${name}>`, 'i'));
  return m ? m[1].trim() : null;
}

function allTags(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\/${name}>`, 'gi');
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) results.push(m[1]);
  return results;
}

function parseDate(raw: string): Date {
  // OFX: YYYYMMDD or YYYYMMDDHHMMSS
  const s = raw.replace(/[^\d]/g, '');
  const year = parseInt(s.slice(0, 4), 10);
  const month = parseInt(s.slice(4, 6), 10) - 1;
  const day = parseInt(s.slice(6, 8), 10);
  return new Date(year, month, day);
}

export function parseOFX(content: string): OFXTransaction[] {
  const transactions = allTags(content, 'STMTTRN');
  const result: OFXTransaction[] = [];

  for (const block of transactions) {
    const trnType = tag(block, 'TRNTYPE') ?? 'DEBIT';
    const dtPosted = tag(block, 'DTPOSTED');
    const trnAmt = tag(block, 'TRNAMT');
    const fitId = tag(block, 'FITID') ?? String(Date.now());
    const memo = tag(block, 'MEMO') ?? tag(block, 'NAME') ?? 'Importado OFX';

    if (!trnAmt || !dtPosted) continue;

    const rawAmount = parseFloat(trnAmt.replace(',', '.'));
    if (isNaN(rawAmount)) continue;

    const isCredit = trnType === 'CREDIT' || rawAmount > 0;
    result.push({
      type: isCredit ? 'INCOME' : 'EXPENSE',
      amountCents: Math.abs(Math.round(rawAmount * 100)),
      description: memo.slice(0, 200),
      occurredAt: parseDate(dtPosted),
      fitId,
    });
  }

  return result;
}
