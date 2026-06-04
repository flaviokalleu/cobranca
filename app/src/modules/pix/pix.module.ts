import { Global, Module } from '@nestjs/common';
import { PixService } from './pix.service';

@Global()
@Module({
  providers: [PixService],
  exports: [PixService],
})
export class PixModule {}
