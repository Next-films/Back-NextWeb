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
};
