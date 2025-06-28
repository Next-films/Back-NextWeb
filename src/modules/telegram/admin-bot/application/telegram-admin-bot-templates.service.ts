import * as fs from 'node:fs';
import * as path from 'node:path';

import { Injectable, OnModuleInit } from '@nestjs/common';
import * as handlebars from 'handlebars';
import { readDirDeepSync } from 'read-dir-deep';
import { LoggerService } from '@/common/utils/logger/logger.service';

@Injectable()
export class TelegramAdminBotTemplatesService implements OnModuleInit {
  private readonly TEMPLATE_PATH: string = 'src/modules/telegram/admin-bot/templates';
  private templatesMap = new Map<string, Handlebars.TemplateDelegate>();

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(TelegramAdminBotTemplatesService.name);
  }

  onModuleInit(): void {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    this.logger.log(`Loading telegram admin bot templates data`, this.loadTemplates.name);
    const templatesDir: string = path.join(process.cwd(), this.TEMPLATE_PATH);

    const filePaths: string[] = [...readDirDeepSync(templatesDir)];

    for (const fullPath of filePaths) {
      try {
        const templateContent = fs.readFileSync(fullPath, 'utf8');

        const relativePath = path
          .relative(this.TEMPLATE_PATH, fullPath)
          .replace(/\.hbs$/, '')
          .replaceAll('\\', '/');

        const compiled = handlebars.compile(templateContent);

        this.templatesMap.set(relativePath, compiled);
      } catch {
        this.logger.error(`Failed to load template: ${fullPath}`, this.loadTemplates.name);
      }
    }

    this.logger.log(
      `Telegram admin bot templates loading finished. Total: ${this.templatesMap.size}`,
      this.loadTemplates.name,
    );
  }

  public getTemplateHTML(templateName: string, data: object = {}): string | null {
    this.logger.log(`Get template HTML, name: ${templateName}`, this.getTemplateHTML.name);

    const template = this.templatesMap.get(templateName);

    if (!template) {
      this.logger.warn(`Template not found: ${templateName}`, this.getTemplateHTML.name);

      return null;
    }

    try {
      return template(data);
    } catch {
      this.logger.error(`Template render failed: ${templateName}`, this.getTemplateHTML.name);

      return null;
    }
  }
}
