import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { AppMailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: () => {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT ?? 587);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const secure = process.env.SMTP_SECURE === 'true' || port === 465;

        return {
          transport: host
            ? {
                host,
                port,
                secure,
                auth: user && pass ? { user, pass } : undefined,
              }
            : { jsonTransport: true },
          defaults: {
            from: process.env.MAIL_FROM ?? 'no-reply@example.com',
          },
        };
      },
    }),
  ],
  providers: [AppMailService],
  exports: [AppMailService],
})
export class MailModule {}
