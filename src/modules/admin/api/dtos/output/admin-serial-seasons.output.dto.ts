export type AdminSerialSeasonPlanItemOutputDto = {
  seasonNumber: number;
  torrentsCount: number;
  expectedEpisodesCount: number | null;
  downloadedEpisodesCount: number;
  missingEpisodesCount: number | null;
  isComplete: boolean | null;
  isDownloaded: boolean;
  canDownload: boolean;
};

export type AdminSerialSeasonsPlanOutputDto = {
  kpId: string;
  title: string;
  totalCandidates: number;
  totalSeasons: number;
  hasUnknownSeasonCandidates: boolean;
  downloadedSeasons: number[];
  seasons: AdminSerialSeasonPlanItemOutputDto[];
  // Admin DB serial matched by kpId, or null when it is not in the library yet. Per-season
  // download needs this id; when null the serial must be downloaded first.
  serialId?: number | null;
};
