import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CreateDocumentRequirementDto } from './dto/create-document-requirement.dto';
import { CreateCustomerDocumentDto } from './dto/create-customer-document.dto';
import { UpdateCustomerDocumentStatusDto } from './dto/update-customer-document-status.dto';
import { UpdateDocumentRequirementDto } from './dto/update-document-requirement.dto';
import { UpdateCustomerDocumentDto } from './dto/update-customer-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createRequirement(tenantId: string, dto: CreateDocumentRequirementDto) {
    const requirement = await this.prisma.documentRequirement.create({
      data: {
        tenantId,
        name: dto.name,
        category: dto.category ?? 'GENERAL',
        description: dto.description ?? null,
      },
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'DOCUMENT_REQUIREMENT_CREATED',
      entityType: 'DocumentRequirement',
      entityId: requirement.id,
    });

    return requirement;
  }

  listRequirements(tenantId: string) {
    return this.prisma.documentRequirement.findMany({
      where: { tenantId, active: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async updateRequirement(
    tenantId: string,
    id: string,
    dto: UpdateDocumentRequirementDto,
  ) {
    const current = await this.prisma.documentRequirement.findFirst({
      where: { id, tenantId },
    });
    if (!current) {
      throw new NotFoundException('Requisito de documento nao encontrado.');
    }
    const requirement = await this.prisma.documentRequirement.update({
      where: { id: current.id },
      data: {
        name: dto.name,
        category: dto.category,
        description: dto.description === undefined ? undefined : dto.description,
        active: dto.active,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'DOCUMENT_REQUIREMENT_UPDATED',
      entityType: 'DocumentRequirement',
      entityId: requirement.id,
    });
    return requirement;
  }

  async removeRequirement(tenantId: string, id: string) {
    const current = await this.prisma.documentRequirement.findFirst({
      where: { id, tenantId },
    });
    if (!current) {
      throw new NotFoundException('Requisito de documento nao encontrado.');
    }
    await this.prisma.documentRequirement.update({
      where: { id: current.id },
      data: { active: false },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'DOCUMENT_REQUIREMENT_DELETED',
      entityType: 'DocumentRequirement',
      entityId: current.id,
    });
    return { ok: true };
  }

  async listCustomerDocuments(tenantId: string, customerId: string) {
    await this.ensureCustomer(tenantId, customerId);
    await this.ensureChecklist(tenantId, customerId);

    return this.prisma.customerDocument.findMany({
      where: { tenantId, customerId },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  }

  async createCustomerDocument(
    tenantId: string,
    customerId: string,
    dto: CreateCustomerDocumentDto,
  ) {
    await this.ensureCustomer(tenantId, customerId);
    if (dto.requirementId) {
      await this.ensureRequirement(tenantId, dto.requirementId);
    }

    const document = await this.prisma.customerDocument.create({
      data: {
        tenantId,
        customerId,
        requirementId: dto.requirementId ?? null,
        name: dto.name,
        status: dto.status ?? 'NOT_SENT',
        fileName: dto.fileName ?? null,
        fileUrl: dto.fileUrl ?? null,
        notes: dto.notes ?? null,
        uploadedAt: dto.fileUrl ? new Date() : null,
      },
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CUSTOMER_DOCUMENT_CREATED',
      entityType: 'CustomerDocument',
      entityId: document.id,
      metadata: { status: document.status },
    });

    return document;
  }

  async updateCustomerDocumentStatus(
    tenantId: string,
    id: string,
    dto: UpdateCustomerDocumentStatusDto,
  ) {
    const current = await this.prisma.customerDocument.findFirst({
      where: { id, tenantId },
    });
    if (!current) {
      throw new NotFoundException('Documento nao encontrado neste tenant.');
    }

    const document = await this.prisma.customerDocument.update({
      where: { id: current.id },
      data: {
        status: dto.status,
        fileName: dto.fileName ?? current.fileName,
        fileUrl: dto.fileUrl ?? current.fileUrl,
        notes: dto.notes ?? current.notes,
        uploadedAt: dto.fileUrl ? new Date() : current.uploadedAt,
      },
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CUSTOMER_DOCUMENT_STATUS_CHANGED',
      entityType: 'CustomerDocument',
      entityId: document.id,
      metadata: { from: current.status, to: document.status },
    });

    return document;
  }

  async updateCustomerDocument(
    tenantId: string,
    id: string,
    dto: UpdateCustomerDocumentDto,
  ) {
    const current = await this.prisma.customerDocument.findFirst({
      where: { id, tenantId },
    });
    if (!current) {
      throw new NotFoundException('Documento nao encontrado neste tenant.');
    }
    if (dto.requirementId) {
      await this.ensureRequirement(tenantId, dto.requirementId);
    }
    const document = await this.prisma.customerDocument.update({
      where: { id: current.id },
      data: {
        requirementId:
          dto.requirementId === undefined ? undefined : dto.requirementId,
        name: dto.name,
        status: dto.status,
        fileName: dto.fileName === undefined ? undefined : dto.fileName,
        fileUrl: dto.fileUrl === undefined ? undefined : dto.fileUrl,
        notes: dto.notes === undefined ? undefined : dto.notes,
        uploadedAt: dto.fileUrl ? new Date() : undefined,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CUSTOMER_DOCUMENT_UPDATED',
      entityType: 'CustomerDocument',
      entityId: document.id,
    });
    return document;
  }

  async removeCustomerDocument(tenantId: string, id: string) {
    const current = await this.prisma.customerDocument.findFirst({
      where: { id, tenantId },
    });
    if (!current) {
      throw new NotFoundException('Documento nao encontrado neste tenant.');
    }
    await this.prisma.customerDocument.delete({ where: { id: current.id } });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CUSTOMER_DOCUMENT_DELETED',
      entityType: 'CustomerDocument',
      entityId: current.id,
    });
    return { ok: true };
  }

  private async ensureCustomer(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Cliente nao encontrado neste tenant.');
    }
    return customer;
  }

  private async ensureRequirement(tenantId: string, id: string) {
    const requirement = await this.prisma.documentRequirement.findFirst({
      where: { id, tenantId, active: true },
    });
    if (!requirement) {
      throw new NotFoundException('Requisito de documento nao encontrado.');
    }
    return requirement;
  }

  private async ensureChecklist(tenantId: string, customerId: string) {
    const [requirements, existing] = await Promise.all([
      this.prisma.documentRequirement.findMany({
        where: { tenantId, active: true },
      }),
      this.prisma.customerDocument.findMany({
        where: { tenantId, customerId, requirementId: { not: null } },
        select: { requirementId: true },
      }),
    ]);
    const existingIds = new Set(existing.map((doc) => doc.requirementId));
    const missing = requirements.filter((req) => !existingIds.has(req.id));
    if (missing.length === 0) return;

    await this.prisma.$transaction(
      missing.map((req) =>
        this.prisma.customerDocument.create({
          data: {
            tenantId,
            customerId,
            requirementId: req.id,
            name: req.name,
            status: 'NOT_SENT',
          },
        }),
      ),
    );
  }
}
