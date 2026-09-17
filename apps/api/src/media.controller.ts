import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { uploadDir } from './common/media';

@Controller('media')
export class MediaController {
  @Get(':filename')
  file(@Param('filename') filename: string, @Res() res: Response) {
    if (!/^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/i.test(filename)) {
      throw new NotFoundException();
    }
    const path = join(uploadDir(), filename);
    if (!existsSync(path)) throw new NotFoundException();
    return res.sendFile(path);
  }
}
