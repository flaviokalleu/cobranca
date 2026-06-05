import { Injectable, Logger } from '@nestjs/common';

interface PdfTextItem {
  str: string;
  transform?: number[];
}

interface PdfPage {
  getTextContent(): Promise<{ items: PdfTextItem[] }>;
}

interface PdfDoc {
  numPages: number;
  getPage(n: number): Promise<PdfPage>;
}

@Injectable()
export class PdfExtractorService {
  private readonly logger = new Logger(PdfExtractorService.name);

  async extractText(pdfBase64: string): Promise<string> {
    if (!pdfBase64) return '';
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs') as {
        getDocument(opts: { data: Uint8Array }): { promise: Promise<PdfDoc> };
      };
      const buffer = Buffer.from(pdfBase64, 'base64');
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        pages.push(this.itemsToText(content.items));
      }
      return pages.join('\n').trim();
    } catch (err) {
      this.logger.warn(`Extracao PDF falhou: ${(err as Error).message}`);
      return '';
    }
  }

  // Groups items by Y coordinate to reconstruct real line breaks.
  // PDFs often duplicate text layers (shadow/outline) — deduplication removes them.
  private itemsToText(items: PdfTextItem[]): string {
    type Row = { y: number; parts: string[] };
    const rows: Row[] = [];

    for (const item of items) {
      const str = item.str ?? '';
      if (!str.trim()) continue;
      const y = item.transform ? Math.round(item.transform[5]) : 0;
      const existing = rows.find((r) => Math.abs(r.y - y) <= 3);
      if (existing) {
        existing.parts.push(str);
      } else {
        rows.push({ y, parts: [str] });
      }
    }

    // Sort descending (PDF y=0 is at bottom; higher y = higher on page)
    rows.sort((a, b) => b.y - a.y);

    return rows
      .map((row) => {
        // Deduplicate repeated tokens on the same line (multi-layer PDFs)
        const seen = new Set<string>();
        const unique = row.parts.filter((p) => {
          const key = p.trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return unique.join('').replace(/\s{2,}/g, ' ').trim();
      })
      .filter(Boolean)
      .join('\n');
  }
}
