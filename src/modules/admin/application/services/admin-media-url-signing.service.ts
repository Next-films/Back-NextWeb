import { Injectable } from '@nestjs/common';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AdminCinemaMoviesOutputDto } from '@/admin/api/dtos/output/admin-cinema-movies.output.dto';

@Injectable()
export class AdminMediaUrlSigningService {
  // Keep signed media URLs valid longer for admin preview/open-in-new-tab flows.
  private readonly signedUrlTtlSec = 86400;

  constructor(
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AdminMediaUrlSigningService.name);
  }

  async signMovie<T extends AdminCinemaMoviesOutputDto>(movie: T): Promise<T> {
    const signedContent = await this.signContent(movie.content);

    return {
      ...movie,
      content: signedContent,
    };
  }

  async signMovies<T extends AdminCinemaMoviesOutputDto>(movies: T[]): Promise<T[]> {
    return Promise.all(movies.map(m => this.signMovie(m)));
  }

  private async signContent(content: AdminCinemaMoviesOutputDto['content']) {
    const [movieUrl, previewUrl, backgroundUrl, titleUrl] = await Promise.all([
      this.signUrl(content.movieUrl),
      this.signUrl(content.previewUrl),
      this.signUrl(content.backgroundUrl),
      this.signUrl(content.titleUrl),
    ]);

    return {
      ...content,
      movieUrl,
      previewUrl,
      backgroundUrl,
      titleUrl,
    };
  }

  private async signUrl(url: string | null): Promise<string | null> {
    if (this.isHlsUrl(url)) {
      return url;
    }

    try {
      return await this.downloaderServiceAdapter.signMediaUrl(url, this.signedUrlTtlSec);
    } catch (error) {
      this.logger.error(error, this.signUrl.name);

      return url;
    }
  }

  private isHlsUrl(url: string | null): boolean {
    if (!url) return false;

    return /\.m3u8(?:[?#].*)?$/i.test(url);
  }
}
