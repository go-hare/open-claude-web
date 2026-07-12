/**
 * Official qWt spacer math (index-BELzQL5P.pretty.js ~238248–238264).
 * needsTrafficLightPadding = isMacDesktop && !isFullscreen (caller gates Mac)
 * trafficLightSpacerWidth = round(74 / min(zoom, 1)) when padding needed
 */
export function resolveTrafficLightPadding(isFullscreen: boolean, zoomFactor = 1): {
  needsPadding: boolean;
  spacerWidth: number;
} {
  const safeZoom = Number.isFinite(zoomFactor) && zoomFactor > 0 ? zoomFactor : 1;
  const needsPadding = !isFullscreen;
  return {
    needsPadding,
    spacerWidth: needsPadding ? Math.round(74 / Math.min(safeZoom, 1)) : 0,
  };
}
