import { Controller, Get } from '@nestjs/common';
import { openapiSpec } from './openapi';

@Controller()
export class OpenApiController {
  @Get('openapi.json')
  spec() {
    return openapiSpec;
  }
}
