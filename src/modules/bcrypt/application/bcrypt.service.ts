import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BcryptService {
  async generateHash(password: string, salt_round: number): Promise<string> {
    return await bcrypt.hash(password, salt_round);
  }

  async comparePass(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
}
