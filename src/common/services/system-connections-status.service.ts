import { Injectable } from '@nestjs/common';

@Injectable()
export class SystemConnectionsStatusService {
  private telegramConnected = false;
  private telegramLastError: string | null = null;

  markTelegramConnected(): void {
    this.telegramConnected = true;
    this.telegramLastError = null;
  }

  markTelegramDisconnected(error?: unknown): void {
    this.telegramConnected = false;
    this.telegramLastError = this.normalizeError(error);
  }

  getTelegramState(): { connected: boolean; lastError: string | null } {
    return {
      connected: this.telegramConnected,
      lastError: this.telegramLastError,
    };
  }

  private normalizeError(error?: unknown): string | null {
    if (!error) return null;
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;

    const message = (error as { message?: unknown })?.message;
    if (typeof message === 'string') return message;

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unserializable error object';
    }
  }
}
