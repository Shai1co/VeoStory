import { VideoSegment } from '../types';

interface PreviousSegmentLookup {
  frameDataUrl: string | null;
  segmentId: number | null;
}

const EMPTY_LOOKUP: PreviousSegmentLookup = {
  frameDataUrl: null,
  segmentId: null,
};

/**
 * Returns the last frame data URL for the video that precedes the target segment.
 * Ensures regenerations stay aligned with the previously selected choice.
 */
export const getReferenceFrameFromPreviousChoice = (
  segments: VideoSegment[],
  targetSegmentId: number
): PreviousSegmentLookup => {
  if (!segments.length) {
    return EMPTY_LOOKUP;
  }

  const targetSegment = segments.find(segment => segment.id === targetSegmentId);
  if (!targetSegment) {
    return EMPTY_LOOKUP;
  }

  let previousSegment: VideoSegment | null = null;

  for (const segment of segments) {
    const isCandidate = segment.id < targetSegment.id;
    const isCloser = !previousSegment || segment.id > previousSegment.id;

    if (isCandidate && isCloser) {
      previousSegment = segment;
    }
  }

  return previousSegment
    ? { frameDataUrl: previousSegment.lastFrameDataUrl ?? null, segmentId: previousSegment.id }
    : EMPTY_LOOKUP;
};

