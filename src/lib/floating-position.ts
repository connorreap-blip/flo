export interface FloatingPositionInput {
  top: number;
  left: number;
  width: number;
  height: number;
  padding?: number;
  viewportWidth?: number;
  viewportHeight?: number;
}

export function clampFloatingPosition({
  top,
  left,
  width,
  height,
  padding = 12,
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
}: FloatingPositionInput): { top: number; left: number } {
  const maxLeft = Math.max(padding, viewportWidth - width - padding);
  const maxTop = Math.max(padding, viewportHeight - height - padding);

  return {
    left: Math.min(Math.max(left, padding), maxLeft),
    top: Math.min(Math.max(top, padding), maxTop),
  };
}
