import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { SettingsService } from '../../common/settings/settings.service';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AsaasCustomerInput {
  name: string;
  cpfCnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  externalReference?: string;
}

export interface AsaasPaymentInput {
  asaasCustomerId: string;
  amountCents: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
  externalReference: string; // charge.id
}

export interface AsaasPaymentResult {
  id: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  status: string;
}

export interface AsaasPixQrCode {
  encodedImage: string; // base64 PNG
  payload: string;      // copia-e-cola
  expirationDate: string;
}

@Injectable()
export class AsaasGatewayService {
  private readonly logger = new Logger('AsaasGateway');

  constructor(
    private readonly settings: SettingsService,
    private readonly prisma: PrismaService,
  ) {}

  async isEnabled(tenantId: string): Promise<boolean> {
    const cfg = await this.settings.get(tenantId);
    return cfg.paymentProvider === 'ASAAS' && !!cfg.asaasApiKey;
  }

  async createOrFindCustomer(
    tenantId: string,
    input: AsaasCustomerInput,
  ): Promise<string> {
    const cfg = await this.settings.get(tenantId);
    const client = this.buildClient(cfg.asaasApiKey!);

    // Tenta achar por CPF/CNPJ primeiro
    if (input.cpfCnpj) {
      const clean = input.cpfCnpj.replace(/\D/g, '');
      try {
        const res = await client.get<{ data: { id: string }[] }>(
          `/customers?cpfCnpj=${clean}&limit=1`,
        );
        if (res.data.data.length > 0) return res.data.data[0].id;
      } catch {
        // ignora e cria novo
      }
    }

    const res = await client.post<{ id: string }>('/customers', {
      name: input.name.slice(0, 120),
      cpfCnpj: input.cpfCnpj?.replace(/\D/g, '') || undefined,
      mobilePhone: input.phone?.replace(/\D/g, '') || undefined,
      email: input.email || undefined,
      externalReference: input.externalReference,
    });

    return res.data.id;
  }

  async createPayment(
    tenantId: string,
    input: AsaasPaymentInput,
  ): Promise<AsaasPaymentResult> {
    const cfg = await this.settings.get(tenantId);
    const client = this.buildClient(cfg.asaasApiKey!);

    const res = await client.post<AsaasPaymentResult>('/payments', {
      customer: input.asaasCustomerId,
      billingType: 'UNDEFINED',
      value: input.amountCents / 100,
      dueDate: input.dueDate,
      description: input.description.slice(0, 255),
      externalReference: input.externalReference,
    });

    return res.data;
  }

  async getPixQrCode(tenantId: string, paymentId: string): Promise<AsaasPixQrCode> {
    const cfg = await this.settings.get(tenantId);
    const client = this.buildClient(cfg.asaasApiKey!);
    const res = await client.get<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
    return res.data;
  }

  async syncCharge(tenantId: string, chargeId: string): Promise<void> {
    const charge = await this.prisma.charge.findFirst({
      where: { id: chargeId, tenantId },
      include: { customer: true },
    });
    if (!charge) return;
    if (charge.gatewayProvider === 'ASAAS' && charge.gatewayChargeId) return;

    try {
      // Cria ou reutiliza o cliente no Asaas
      let asaasCustomerId = charge.customer.asaasCustomerId;
      if (!asaasCustomerId) {
        asaasCustomerId = await this.createOrFindCustomer(tenantId, {
          name: charge.customer.name,
          cpfCnpj: charge.customer.document,
          phone: charge.customer.phone,
          email: charge.customer.email,
          externalReference: charge.customer.id,
        });
        await this.prisma.customer.update({
          where: { id: charge.customer.id },
          data: { asaasCustomerId },
        });
      }

      const dueDate = charge.dueDate.toISOString().slice(0, 10);
      const payment = await this.createPayment(tenantId, {
        asaasCustomerId,
        amountCents: charge.amountCents,
        dueDate,
        description: charge.description,
        externalReference: charge.id,
      });

      await this.prisma.charge.update({
        where: { id: charge.id },
        data: {
          gatewayProvider: 'ASAAS',
          gatewayChargeId: payment.id,
          paymentLink: payment.invoiceUrl,
          bankSlipUrl: payment.bankSlipUrl ?? null,
        },
      });

      this.logger.log(`Cobrança ${charge.id} sincronizada com Asaas: ${payment.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha ao sincronizar cobrança ${charge.id} com Asaas: ${msg}`);
    }
  }

  private buildClient(apiKey: string): AxiosInstance {
    const isSandbox = apiKey.startsWith('$aact_hmlg') || apiKey.startsWith('$aact_YTU');
    const baseURL = isSandbox
      ? 'https://api-sandbox.asaas.com/v3'
      : 'https://api.asaas.com/v3';

    return axios.create({
      baseURL,
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'webba-erp/1.0',
      },
      timeout: 15000,
    });
  }
}
