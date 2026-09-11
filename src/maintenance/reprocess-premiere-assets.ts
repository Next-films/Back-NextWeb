import { NestFactory } from '@nestjs/core';
import { CommandBus } from '@nestjs/cqrs';
import { AppModule } from '../app.module';
import {
  AdminPremiereHandleStatusEnum,
  AdminPremiereTypeEnum,
} from '../modules/admin/api/dtos/input/admin-get-premieres.input-query.dto';
import { AdminReprocessPremiereAssetsCommand } from '../modules/admin/application/handlers/admin-reprocess-premiere-assets.handler';

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length);
}

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

  try {
    const result = await app.get(CommandBus).execute(
      new AdminReprocessPremiereAssetsCommand({
        dryRun: argument('dry-run') !== 'false',
        type: (argument('type') as AdminPremiereTypeEnum) || AdminPremiereTypeEnum.ALL,
        handleStatus:
          (argument('handle-status') as AdminPremiereHandleStatusEnum) ||
          AdminPremiereHandleStatusEnum.ALL,
        onlyMissingAssets: argument('only-missing') !== 'false',
        limit: Number(argument('limit') || 100),
      }),
    );

    console.log(`REPROCESS_RESULT=${JSON.stringify(result)}`);
    if (!result.data || result.appResult !== 'Success') process.exitCode = 1;
  } finally {
    await app.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
