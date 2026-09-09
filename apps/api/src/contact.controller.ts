import { Body, Controller, Inject, Post } from '@nestjs/common';
import { contactSchema } from '@motive-fashion/validation';
import { MailService } from './common/mail.service';

@Controller('contact')
export class ContactController {
  constructor(@Inject(MailService) private readonly mail: MailService) {}

  @Post()
  async send(@Body() body: unknown) {
    const dto = contactSchema.parse(body);
    if (dto.company?.trim()) {
      return { ok: true };
    }
    await this.mail.sendContactEnquiry({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      message: dto.message,
    });
    return { ok: true };
  }
}
