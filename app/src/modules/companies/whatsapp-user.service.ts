import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class WhatsappUserService {
  constructor(private readonly prisma: PrismaService) {}

  normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  findByPhone(phone: string) {
    return this.prisma.whatsappUser.findUnique({
      where: { phone: this.normalizePhone(phone) },
    });
  }

  async touch(phone: string): Promise<void> {
    const normalized = this.normalizePhone(phone);
    await this.prisma.whatsappUser.update({
      where: { phone: normalized },
      data: { lastSeenAt: new Date() },
    });
  }

  hasPermission(user: { permissions: string | null; role: string }, permission: string): boolean {
    if (user.role === 'OWNER' || user.role === 'ADMIN') return true;
    if (!user.permissions) return false;
    try {
      const permissions = JSON.parse(user.permissions) as unknown;
      return Array.isArray(permissions) && permissions.includes(permission);
    } catch {
      return false;
    }
  }
}
