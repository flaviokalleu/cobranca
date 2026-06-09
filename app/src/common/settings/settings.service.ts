import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

export interface EffectiveSettings {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  companyName?: string | null;
  companyCnpj?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyAddress?: string | null;
  companyCity?: string | null;
  companyState?: string | null;
  logoUrl?: string | null;
  businessHoursStart?: string | null;
  businessHoursEnd?: string | null;
  reminderDaysBefore: number;
  defaultDueDays: number;
  notifyByEmail: boolean;
  notifyByWhatsapp: boolean;
  timezone: string;
  nfeEnabled: boolean;
  nfeCnpj?: string | null;
  nfeRazaoSocial?: string | null;
  nfeCodServico?: string | null;
  nfeCodMunicipio?: string | null;
  theme: string;
  chargeRobotEnabled: boolean;
  paymentProvider: string;
  asaasApiKey?: string | null;
  mercadoPagoToken?: string | null;
}

/// Configuracoes do recebedor PIX por tenant. Cai para os defaults do .env se nao houver.
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string): Promise<EffectiveSettings> {
    const s = await this.prisma.settings.findUnique({ where: { tenantId } });
    return {
      pixKey: s?.pixKey ?? process.env.PIX_KEY ?? 'demo@cobranca.app',
      merchantName: s?.merchantName ?? process.env.PIX_MERCHANT_NAME ?? 'Cobranca Demo',
      merchantCity: s?.merchantCity ?? process.env.PIX_MERCHANT_CITY ?? 'Sao Paulo',
      companyName: s?.companyName ?? null,
      companyCnpj: s?.companyCnpj ?? null,
      companyPhone: s?.companyPhone ?? null,
      companyEmail: s?.companyEmail ?? null,
      companyAddress: s?.companyAddress ?? null,
      companyCity: s?.companyCity ?? null,
      companyState: s?.companyState ?? null,
      logoUrl: s?.logoUrl ?? null,
      businessHoursStart: s?.businessHoursStart ?? null,
      businessHoursEnd: s?.businessHoursEnd ?? null,
      reminderDaysBefore: s?.reminderDaysBefore ?? 3,
      defaultDueDays: s?.defaultDueDays ?? 30,
      notifyByEmail: s?.notifyByEmail ?? false,
      notifyByWhatsapp: s?.notifyByWhatsapp ?? true,
      timezone: s?.timezone ?? 'America/Sao_Paulo',
      nfeEnabled: s?.nfeEnabled ?? false,
      nfeCnpj: s?.nfeCnpj ?? null,
      nfeRazaoSocial: s?.nfeRazaoSocial ?? null,
      nfeCodServico: s?.nfeCodServico ?? null,
      nfeCodMunicipio: s?.nfeCodMunicipio ?? null,
      theme: s?.theme ?? 'system',
      chargeRobotEnabled: s?.chargeRobotEnabled ?? false,
      paymentProvider: s?.paymentProvider ?? 'NONE',
      asaasApiKey: s?.asaasApiKey ?? null,
      mercadoPagoToken: s?.mercadoPagoToken ?? null,
    };
  }

  async upsert(tenantId: string, data: UpdateSettingsDto): Promise<EffectiveSettings> {
    const defaults = await this.get(tenantId);
    const clean = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as UpdateSettingsDto;
    const s = await this.prisma.settings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        pixKey: clean.pixKey ?? defaults.pixKey,
        merchantName: clean.merchantName ?? defaults.merchantName,
        merchantCity: clean.merchantCity ?? defaults.merchantCity,
        companyName: clean.companyName ?? null,
        companyCnpj: clean.companyCnpj ?? null,
        companyPhone: clean.companyPhone ?? null,
        companyEmail: clean.companyEmail ?? null,
        companyAddress: clean.companyAddress ?? null,
        companyCity: clean.companyCity ?? null,
        companyState: clean.companyState ?? null,
        logoUrl: clean.logoUrl ?? null,
        businessHoursStart: clean.businessHoursStart ?? null,
        businessHoursEnd: clean.businessHoursEnd ?? null,
        reminderDaysBefore: clean.reminderDaysBefore ?? defaults.reminderDaysBefore,
        defaultDueDays: clean.defaultDueDays ?? defaults.defaultDueDays,
        notifyByEmail: clean.notifyByEmail ?? defaults.notifyByEmail,
        notifyByWhatsapp: clean.notifyByWhatsapp ?? defaults.notifyByWhatsapp,
        timezone: clean.timezone ?? defaults.timezone,
        nfeEnabled: clean.nfeEnabled ?? defaults.nfeEnabled,
        nfeCnpj: clean.nfeCnpj ?? null,
        nfeRazaoSocial: clean.nfeRazaoSocial ?? null,
        nfeCodServico: clean.nfeCodServico ?? null,
        nfeCodMunicipio: clean.nfeCodMunicipio ?? null,
        theme: clean.theme ?? defaults.theme,
        chargeRobotEnabled: clean.chargeRobotEnabled ?? defaults.chargeRobotEnabled,
      },
      update: { ...clean },
    });
    return {
      pixKey: s.pixKey,
      merchantName: s.merchantName,
      merchantCity: s.merchantCity,
      companyName: s.companyName,
      companyCnpj: s.companyCnpj,
      companyPhone: s.companyPhone,
      companyEmail: s.companyEmail,
      companyAddress: s.companyAddress,
      companyCity: s.companyCity,
      companyState: s.companyState,
      logoUrl: s.logoUrl,
      businessHoursStart: s.businessHoursStart,
      businessHoursEnd: s.businessHoursEnd,
      reminderDaysBefore: s.reminderDaysBefore,
      defaultDueDays: s.defaultDueDays,
      notifyByEmail: s.notifyByEmail,
      notifyByWhatsapp: s.notifyByWhatsapp,
      timezone: s.timezone,
      nfeEnabled: s.nfeEnabled,
      nfeCnpj: s.nfeCnpj,
      nfeRazaoSocial: s.nfeRazaoSocial,
      nfeCodServico: s.nfeCodServico,
      nfeCodMunicipio: s.nfeCodMunicipio,
      theme: s.theme,
      chargeRobotEnabled: s.chargeRobotEnabled,
      paymentProvider: s.paymentProvider,
      asaasApiKey: s.asaasApiKey,
      mercadoPagoToken: s.mercadoPagoToken,
    };
  }
}
