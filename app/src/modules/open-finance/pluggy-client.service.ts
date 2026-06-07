import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface PluggyConnector {
  id: number;
  name: string;
  institutionUrl?: string;
  imageUrl?: string;
  primaryColor?: string;
  type: string;
}

interface PluggyItem {
  id: string;
  status: string;
  statusDetail?: string;
  connector: PluggyConnector;
  lastUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface PluggyAccount {
  id: string;
  type: string;
  subtype: string;
  name: string;
  number?: string;
  bankData?: { transferNumber?: string; closingBalance?: number };
  balance: number;
  currencyCode: string;
  itemId: string;
  creditData?: { availableCreditLimit?: number; creditLimit?: number };
}

interface PluggyTransaction {
  id: string;
  description: string;
  descriptionRaw?: string;
  type: string;
  amount: number;
  amountInAccountCurrency?: number;
  date: string;
  balance?: number;
  category?: string;
  accountId: string;
  paymentData?: {
    paymentMethod?: string;
    payer?: { name?: string; document?: { value?: string } };
    receiver?: { name?: string; document?: { value?: string } };
  };
}

@Injectable()
export class PluggyClientService {
  private readonly logger = new Logger(PluggyClientService.name);
  private readonly http: AxiosInstance;
  private apiKey: string | null = null;
  private apiKeyExpiresAt: number = 0;

  constructor(private readonly config: ConfigService) {
    this.http = axios.create({ baseURL: 'https://api.pluggy.ai', timeout: 30000 });
  }

  private async getApiKey(): Promise<string> {
    if (this.apiKey && Date.now() < this.apiKeyExpiresAt - 60_000) return this.apiKey;

    const clientId = this.config.get<string>('PLUGGY_CLIENT_ID');
    const clientSecret = this.config.get<string>('PLUGGY_CLIENT_SECRET');

    if (!clientId || !clientSecret) throw new Error('PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET not configured');

    const { data } = await this.http.post('/auth', { clientId, clientSecret });
    this.apiKey = data.apiKey as string;
    this.apiKeyExpiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2h
    return this.apiKey;
  }

  private async headers() {
    const key = await this.getApiKey();
    return { 'X-API-KEY': key };
  }

  async createConnectToken(itemId?: string): Promise<string> {
    const headers = await this.headers();
    const body = itemId ? { itemId } : {};
    const { data } = await this.http.post('/connect_token', body, { headers });
    return data.accessToken as string;
  }

  async getItem(itemId: string): Promise<PluggyItem> {
    const headers = await this.headers();
    const { data } = await this.http.get(`/items/${itemId}`, { headers });
    return data as PluggyItem;
  }

  async deleteItem(itemId: string): Promise<void> {
    const headers = await this.headers();
    await this.http.delete(`/items/${itemId}`, { headers });
  }

  async getAccounts(itemId: string): Promise<PluggyAccount[]> {
    const headers = await this.headers();
    const { data } = await this.http.get('/accounts', { headers, params: { itemId } });
    return (data.results ?? []) as PluggyAccount[];
  }

  async getTransactions(accountId: string, from?: string, to?: string): Promise<PluggyTransaction[]> {
    const headers = await this.headers();
    const results: PluggyTransaction[] = [];
    let page = 1;
    let total = Infinity;

    while (results.length < total) {
      const params: Record<string, unknown> = { accountId, page, pageSize: 100 };
      if (from) params.from = from;
      if (to) params.to = to;

      const { data } = await this.http.get('/transactions', { headers, params });
      total = data.total ?? 0;
      const items = (data.results ?? []) as PluggyTransaction[];
      results.push(...items);
      if (items.length < 100) break;
      page++;
    }

    return results;
  }

  amountToCents(amount: number): number {
    return Math.round(amount * 100);
  }
}
