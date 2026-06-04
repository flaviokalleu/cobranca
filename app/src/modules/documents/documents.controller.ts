import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { DocumentsService } from './documents.service';
import { CreateDocumentRequirementDto } from './dto/create-document-requirement.dto';
import { CreateCustomerDocumentDto } from './dto/create-customer-document.dto';
import { UpdateCustomerDocumentStatusDto } from './dto/update-customer-document-status.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Roles('ADMIN', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @Get('requirements')
  listRequirements(@Tenant() tenantId: string) {
    return this.documents.listRequirements(tenantId);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @Post('requirements')
  createRequirement(
    @Tenant() tenantId: string,
    @Body() dto: CreateDocumentRequirementDto,
  ) {
    return this.documents.createRequirement(tenantId, dto);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @Get('customers/:customerId')
  listCustomerDocuments(
    @Tenant() tenantId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.documents.listCustomerDocuments(tenantId, customerId);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @Post('customers/:customerId')
  createCustomerDocument(
    @Tenant() tenantId: string,
    @Param('customerId') customerId: string,
    @Body() dto: CreateCustomerDocumentDto,
  ) {
    return this.documents.createCustomerDocument(tenantId, customerId, dto);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @Patch('customer-documents/:id/status')
  updateStatus(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDocumentStatusDto,
  ) {
    return this.documents.updateCustomerDocumentStatus(tenantId, id, dto);
  }
}
