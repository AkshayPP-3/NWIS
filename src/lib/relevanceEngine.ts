// NWIS - Automated Multi-Factor Offset Relevance Engine
// SIH 2026 Core Principle: "Nearby != Relevant"
// Provides transparent mathematical scoring and explainable engineering justifications.

import type { Well, WellEvent, DrillingParameter } from "@/types/well";
import { calculateHaversineDistanceKm, calculateBearingDeg, getCardinalDirection, formatDistance } from "./geo";

export interface TargetProfile {
  targetId?: string;
  name: string;
  latitude: number;
  longitude: number;
  targetFormation: string;
  plannedDepth: number; // in meters MD
  searchRadiusKm: number; // e.g. 50 km
}

export interface RelevanceScoreBreakdown {
  formationScore: number;    // max 35 pts
  depthScore: number;        // max 25 pts
  distanceScore: number;     // max 20 pts
  telemetryScore: number;    // max 10 pts
  incidentScore: number;     // max 10 pts
  totalScore: number;        // max 100 pts
  explanations: {
    formation: string;
    depth: string;
    distance: string;
    telemetry: string;
    incident: string;
  };
}

export interface OffsetWellCandidate {
  well: Well;
  distanceKm: number;
  bearingDeg: number;
  cardinalDirection: string;
  depthDelta: number; // offset TD - target planned depth
  depthOverlapPercent: number;
  scoreBreakdown: RelevanceScoreBreakdown;
  rank: number; // 1, 2, 3...
  isBestFit: boolean;
  engineeringSummary: string;
  eventsCount: number;
  highSeverityEvents: number;
  hasParameters: boolean;
  parameterCount: number;
  mudWeightWindow?: { min: number; max: number };
}

export interface NearbyVsRelevantContrast {
  closestWell: OffsetWellCandidate;
  bestFitWell: OffsetWellCandidate;
  distanceDifferenceKm: number;
  scoreDifference: number;
  isSameWell: boolean;
  keyDifferentiators: string[];
  justification: string;
}

export interface TargetEvaluationResult {
  target: TargetProfile;
  totalWellsEvaluated: number;
  wellsWithinRadius: number;
  topCandidates: OffsetWellCandidate[]; // Top 3
  allRankedCandidates: OffsetWellCandidate[];
  bestFitWell: OffsetWellCandidate | null;
  closestWell: OffsetWellCandidate | null;
  contrast: NearbyVsRelevantContrast | null;
}

/**
 * Calculates the multi-factor relevance score of a single well against a target well profile.
 */
export function calculateWellRelevanceScore(
  well: Well,
  target: TargetProfile,
  distanceKm: number,
  events: WellEvent[] = [],
  parameters: DrillingParameter[] = []
): { breakdown: RelevanceScoreBreakdown; depthDelta: number; depthOverlapPercent: number } {
  // 1. Formation Compatibility (Max 35 pts)
  let formationScore = 0;
  let formationExplanation = "";
  const targetFormClean = (target.targetFormation || "").trim().toLowerCase();
  const wellFormClean = (well.formation || "").trim().toLowerCase();

  if (targetFormClean && wellFormClean && targetFormClean === wellFormClean) {
    formationScore = 35;
    formationExplanation = `Direct stratigraphic match with ${well.formation} (+35 pts)`;
  } else if (
    targetFormClean &&
    wellFormClean &&
    (targetFormClean.includes(wellFormClean) || wellFormClean.includes(targetFormClean))
  ) {
    formationScore = 24;
    formationExplanation = `Partial stratigraphic correlation with ${well.formation} (+24 pts)`;
  } else if (well.formation) {
    formationScore = 4;
    formationExplanation = `Stratigraphic divergence: Penetrates ${well.formation} vs target ${target.targetFormation} (+4 pts)`;
  } else {
    formationScore = 0;
    formationExplanation = `Unknown lithology / formation unrecorded (0 pts)`;
  }

  // 2. Target Depth Overlap & Differential (Max 25 pts)
  let depthScore = 0;
  let depthExplanation = "";
  const wellDepth = well.totalDepth || 0;
  const plannedDepth = target.plannedDepth || 3000;
  const depthDelta = wellDepth - plannedDepth;
  const depthOverlapRatio = plannedDepth > 0 ? Math.min(1.2, wellDepth / plannedDepth) : 0;
  const depthOverlapPercent = Math.round(Math.min(100, (wellDepth / plannedDepth) * 100));

  if (wellDepth >= plannedDepth) {
    // Penetrates full target interval
    const excess = wellDepth - plannedDepth;
    if (excess <= 600) {
      depthScore = 25;
      depthExplanation = `Full depth penetration: TD ${wellDepth.toLocaleString()}m MD covers 100% of target interval (+25 pts)`;
    } else {
      // Over-deep well (slight penalty for vastly different drilling regime)
      depthScore = 22;
      depthExplanation = `Full depth coverage: TD ${wellDepth.toLocaleString()}m MD extends deeper than planned section (+22 pts)`;
    }
  } else if (wellDepth > 0) {
    // Under-deep well
    if (depthOverlapRatio >= 0.85) {
      depthScore = 18;
      depthExplanation = `High depth overlap: Reached ${wellDepth.toLocaleString()}m MD (${depthOverlapPercent}% of target) (+18 pts)`;
    } else if (depthOverlapRatio >= 0.65) {
      depthScore = 12;
      depthExplanation = `Moderate depth overlap: Reached ${wellDepth.toLocaleString()}m MD (${depthOverlapPercent}% of target) (+12 pts)`;
    } else {
      depthScore = Math.max(2, Math.round(depthOverlapRatio * 15));
      depthExplanation = `Insufficient depth penetration: Reached only ${wellDepth.toLocaleString()}m MD (${depthOverlapPercent}% of target) (+${depthScore} pts)`;
    }
  } else {
    depthScore = 0;
    depthExplanation = `Depth unrecorded in well log (0 pts)`;
  }

  // 3. Spatial Proximity (Max 20 pts)
  let distanceScore = 0;
  let distanceExplanation = "";
  const radius = Math.max(10, target.searchRadiusKm || 50);

  if (distanceKm <= 3) {
    distanceScore = 20;
    distanceExplanation = `Immediate offset proximity (${formatDistance(distanceKm)}) (+20 pts)`;
  } else if (distanceKm <= 8) {
    distanceScore = 17;
    distanceExplanation = `Close structural proximity (${formatDistance(distanceKm)}) (+17 pts)`;
  } else if (distanceKm <= 20) {
    distanceScore = 13;
    distanceExplanation = `Sub-regional proximity (${formatDistance(distanceKm)}) (+13 pts)`;
  } else if (distanceKm <= radius) {
    // Smooth decay between 20km and radius
    const decay = (radius - distanceKm) / (radius - 20);
    distanceScore = Math.max(4, Math.round(4 + decay * 8));
    distanceExplanation = `Within search radius (${formatDistance(distanceKm)}) (+${distanceScore} pts)`;
  } else {
    distanceScore = Math.max(1, Math.round(3 * (radius / distanceKm)));
    distanceExplanation = `Beyond nominal search radius (${formatDistance(distanceKm)}) (+${distanceScore} pts)`;
  }

  // 4. Telemetry & Parameter Data Completeness (Max 10 pts)
  let telemetryScore = 0;
  let telemetryExplanation = "";
  const paramCount = parameters.length;

  if (paramCount >= 8) {
    telemetryScore = 10;
    telemetryExplanation = `Comprehensive drilling telemetry (${paramCount} depth points: ROP, WOB, Mud Wt, Pressure) (+10 pts)`;
  } else if (paramCount >= 3) {
    telemetryScore = 7;
    telemetryExplanation = `Moderate telemetry records (${paramCount} depth points available) (+7 pts)`;
  } else if (paramCount > 0) {
    telemetryScore = 4;
    telemetryExplanation = `Sparse telemetry points (${paramCount} points) (+4 pts)`;
  } else {
    telemetryScore = 1;
    telemetryExplanation = `Baseline wellhead telemetry only (+1 pt)`;
  }

  // 5. Historical Incident & Hazard Log (Max 10 pts)
  let incidentScore = 0;
  let incidentExplanation = "";
  const eventCount = events.length;
  const highSev = events.filter((e) => e.severity === "High").length;

  if (highSev > 0) {
    // Documented critical incidents provide highest offset learning value!
    incidentScore = 10;
    incidentExplanation = `Critical hazard intelligence available (${highSev} high-severity events: kicks/losses documented with mitigation) (+10 pts)`;
  } else if (eventCount > 0) {
    incidentScore = 8;
    incidentExplanation = `Documented well events (${eventCount} incidents recorded with operational responses) (+8 pts)`;
  } else {
    incidentScore = 5;
    incidentExplanation = `Clean drilling run recorded without incident logs (+5 pts)`;
  }

  const totalScore = Math.min(
    100,
    formationScore + depthScore + distanceScore + telemetryScore + incidentScore
  );

  return {
    breakdown: {
      formationScore,
      depthScore,
      distanceScore,
      telemetryScore,
      incidentScore,
      totalScore,
      explanations: {
        formation: formationExplanation,
        depth: depthExplanation,
        distance: distanceExplanation,
        telemetry: telemetryExplanation,
        incident: incidentExplanation,
      },
    },
    depthDelta,
    depthOverlapPercent,
  };
}

/**
 * Runs the full automated relevance evaluation over all available wells.
 */
export function evaluateTargetOffsetWells(
  target: TargetProfile,
  allWells: Well[],
  eventsByWellId: Map<number, WellEvent[]> = new Map(),
  paramsByWellId: Map<number, DrillingParameter[]> = new Map()
): TargetEvaluationResult {
  const scoredCandidates: OffsetWellCandidate[] = [];

  allWells.forEach((well) => {
    const distanceKm = calculateHaversineDistanceKm(
      target.latitude,
      target.longitude,
      well.latitude,
      well.longitude
    );
    const bearingDeg = calculateBearingDeg(
      target.latitude,
      target.longitude,
      well.latitude,
      well.longitude
    );
    const cardinalDirection = getCardinalDirection(bearingDeg);

    const wellEvents = eventsByWellId.get(well.id) || [];
    const wellParams = paramsByWellId.get(well.id) || [];

    const { breakdown, depthDelta, depthOverlapPercent } = calculateWellRelevanceScore(
      well,
      target,
      distanceKm,
      wellEvents,
      wellParams
    );

    // Calculate Mud Weight window if telemetry is present
    let mudWeightWindow: { min: number; max: number } | undefined;
    const mudWeights = wellParams
      .map((p) => p.mudWeight)
      .filter((m): m is number => typeof m === "number" && m > 0);
    if (mudWeights.length > 0) {
      mudWeightWindow = {
        min: Math.min(...mudWeights),
        max: Math.max(...mudWeights),
      };
    }

    // Engineering summary
    const highSev = wellEvents.filter((e) => e.severity === "High").length;
    let engineeringSummary = "";
    if (breakdown.totalScore >= 80) {
      engineeringSummary = `Primary offset match: Excellent stratigraphic correlation (${well.formation}), full depth coverage (${depthOverlapPercent}%), and rich telemetry.`;
    } else if (breakdown.totalScore >= 60) {
      engineeringSummary = `Secondary offset: Strong proximity and relevant formation data, useful for cross-sectional correlation.`;
    } else {
      engineeringSummary = `Tertiary reference: Limited stratigraphic overlap or shallow depth penetration.`;
    }

    scoredCandidates.push({
      well,
      distanceKm,
      bearingDeg,
      cardinalDirection,
      depthDelta,
      depthOverlapPercent,
      scoreBreakdown: breakdown,
      rank: 0, // assigned after sort
      isBestFit: false,
      engineeringSummary,
      eventsCount: wellEvents.length,
      highSeverityEvents: highSev,
      hasParameters: wellParams.length > 0,
      parameterCount: wellParams.length,
      mudWeightWindow,
    });
  });

  // Filter within radius (or include all if radius has fewer than 3 wells)
  const withinRadius = scoredCandidates.filter(
    (c) => c.distanceKm <= target.searchRadiusKm
  );
  const poolToRank = withinRadius.length >= 3 ? withinRadius : scoredCandidates;

  // Sort primarily by total relevance score descending, then by distance ascending
  const rankedByScore = [...poolToRank].sort((a, b) => {
    if (b.scoreBreakdown.totalScore !== a.scoreBreakdown.totalScore) {
      return b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore;
    }
    return a.distanceKm - b.distanceKm;
  });

  // Assign ranks
  rankedByScore.forEach((candidate, idx) => {
    candidate.rank = idx + 1;
    if (idx === 0) candidate.isBestFit = true;
  });

  const topCandidates = rankedByScore.slice(0, 3);
  const bestFitWell = topCandidates[0] || null;

  // Find geographically closest candidate
  const sortedByDistance = [...scoredCandidates].sort((a, b) => a.distanceKm - b.distanceKm);
  const closestWell = sortedByDistance[0] || null;

  // Build Nearby != Relevant contrast
  let contrast: NearbyVsRelevantContrast | null = null;
  if (bestFitWell && closestWell) {
    const isSameWell = bestFitWell.well.wellId === closestWell.well.wellId;
    const distanceDifferenceKm = Math.round(
      Math.abs(bestFitWell.distanceKm - closestWell.distanceKm) * 10
    ) / 10;
    const scoreDifference =
      bestFitWell.scoreBreakdown.totalScore - closestWell.scoreBreakdown.totalScore;

    const keyDifferentiators: string[] = [];

    if (bestFitWell.well.formation !== closestWell.well.formation) {
      keyDifferentiators.push(
        `Stratigraphy: ${bestFitWell.well.wellId} penetrated target formation (${bestFitWell.well.formation}), whereas closest well ${closestWell.well.wellId} is in ${closestWell.well.formation || "different lithology"}.`
      );
    }

    if (
      bestFitWell.well.totalDepth &&
      closestWell.well.totalDepth &&
      bestFitWell.well.totalDepth > closestWell.well.totalDepth
    ) {
      keyDifferentiators.push(
        `Depth Coverage: ${bestFitWell.well.wellId} reached ${bestFitWell.well.totalDepth.toLocaleString()}m MD (${bestFitWell.depthOverlapPercent}% of target), while closest well stopped at ${closestWell.well.totalDepth.toLocaleString()}m MD.`
      );
    }

    if (bestFitWell.parameterCount > closestWell.parameterCount) {
      keyDifferentiators.push(
        `Drilling Telemetry: ${bestFitWell.well.wellId} has ${bestFitWell.parameterCount} logged depth points (ROP, mud weight, pressures) vs ${closestWell.parameterCount} in closest well.`
      );
    }

    if (bestFitWell.eventsCount > closestWell.eventsCount) {
      keyDifferentiators.push(
        `Incident History: ${bestFitWell.well.wellId} has ${bestFitWell.eventsCount} documented well control / mud loss events offering critical preventive insights.`
      );
    }

    let justification = "";
    if (isSameWell) {
      justification = `The geographically closest well (${closestWell.well.wellId}) is also the highest-scoring candidate, providing ideal proximity, stratigraphic match (${bestFitWell.well.formation}), and deep penetration.`;
    } else {
      justification = `Although ${closestWell.well.wellId} is physically closer (${formatDistance(closestWell.distanceKm)} vs ${formatDistance(bestFitWell.distanceKm)}), ${bestFitWell.well.wellId} is designated as the Best-Fit Offset Well ⭐ because it drilled the target ${target.targetFormation} with ${bestFitWell.depthOverlapPercent}% depth overlap and complete telemetry. Prioritizing ${bestFitWell.well.wellId} prevents false assumptions from closer, non-analogous wells.`;
    }

    contrast = {
      closestWell,
      bestFitWell,
      distanceDifferenceKm,
      scoreDifference,
      isSameWell,
      keyDifferentiators,
      justification,
    };
  }

  return {
    target,
    totalWellsEvaluated: allWells.length,
    wellsWithinRadius: withinRadius.length,
    topCandidates,
    allRankedCandidates: rankedByScore,
    bestFitWell,
    closestWell,
    contrast,
  };
}

