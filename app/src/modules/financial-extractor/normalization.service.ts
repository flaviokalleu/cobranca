import { Injectable } from '@nestjs/common';

@Injectable()
export class NormalizationService {
  text(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  lower(value: string): string {
    return this.text(value).toLowerCase();
  }

  moneyToCents(value: string): number | null {
    const normalized = value
      .replace(/[^\d,.-]/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed * 100);
  }

  centsToDecimal(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  date(value: string): string | null {
    const numeric = value.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
    if (numeric) {
      const day = numeric[1].padStart(2, '0');
      const month = numeric[2].padStart(2, '0');
      const year = numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3];
      return `${year}-${month}-${day}`;
    }

    const months: Record<string, string> = {
      jan: '01',
      janeiro: '01',
      fev: '02',
      fevereiro: '02',
      mar: '03',
      marco: '03',
      abr: '04',
      abril: '04',
      mai: '05',
      maio: '05',
      jun: '06',
      junho: '06',
      jul: '07',
      julho: '07',
      ago: '08',
      agosto: '08',
      set: '09',
      setembro: '09',
      out: '10',
      outubro: '10',
      nov: '11',
      novembro: '11',
      dez: '12',
      dezembro: '12',
    };
    const cleaned = this.lower(value);
    // Fix OCR digit misreads in "DD MMM YYYY" context: "OS JUN 2026" → "03 JUN 2026"
    const ocrFixed = cleaned.replace(
      /\b([0-9oOiIlsS]{1,2})\s+([a-z]{3,9})\s+(\d{4})\b/g,
      (_, d: string, m: string, y: string) => {
        const fixedDay = d
          .replace(/o/gi, '0')
          .replace(/i/gi, '1')
          .replace(/l/g, '1')
          .replace(/s/gi, '3');
        return `${fixedDay} ${m} ${y}`;
      },
    );
    const named = (ocrFixed !== cleaned ? ocrFixed : cleaned).match(/\b(\d{1,2})\s+([a-z]+)\s+(\d{2,4})\b/);
    if (!named) return null;
    const month = months[named[2]];
    if (!month) return null;
    const year = named[3].length === 2 ? `20${named[3]}` : named[3];
    return `${year}-${month}-${named[1].padStart(2, '0')}`;
  }

  time(value: string): string | null {
    const match = value.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
    if (!match) return null;
    return `${match[1].padStart(2, '0')}:${match[2]}:${match[3] ?? '00'}`;
  }

  identified(value: string): boolean {
    return value.trim() !== '' && value !== 'nao identificado';
  }
}
