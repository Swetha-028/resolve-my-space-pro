// Rule-based AI priority suggestion for complaints.
// Lightweight keyword classifier — runs entirely in the browser.

export type PrioritySuggestion = {
  priority: "low" | "medium" | "high" | "critical";
  confidence: number; // 0..1
  reason: string;
  matched: string[];
};

type Rule = { kw: string; weight: number };

const RULES: Record<"critical" | "high" | "medium" | "low", Rule[]> = {
  critical: [
    { kw: "fire", weight: 1 },
    { kw: "smoke", weight: 0.9 },
    { kw: "spark", weight: 1 },
    { kw: "short circuit", weight: 1 },
    { kw: "electrocut", weight: 1 },
    { kw: "shock", weight: 0.8 },
    { kw: "gas leak", weight: 1 },
    { kw: "explosion", weight: 1 },
    { kw: "flood", weight: 0.9 },
    { kw: "burning smell", weight: 1 },
    { kw: "collapse", weight: 1 },
    { kw: "injury", weight: 0.9 },
    { kw: "emergency", weight: 0.9 },
    { kw: "danger", weight: 0.8 },
    { kw: "urgent", weight: 0.6 },
  ],
  high: [
    { kw: "water leak", weight: 0.9 },
    { kw: "leakage", weight: 0.8 },
    { kw: "leaking", weight: 0.8 },
    { kw: "no power", weight: 0.9 },
    { kw: "power outage", weight: 0.9 },
    { kw: "blackout", weight: 0.9 },
    { kw: "internet outage", weight: 0.8 },
    { kw: "internet down", weight: 0.8 },
    { kw: "wifi down", weight: 0.8 },
    { kw: "no internet", weight: 0.7 },
    { kw: "projector failure", weight: 0.8 },
    { kw: "projector not working", weight: 0.8 },
    { kw: "ac not working", weight: 0.6 },
    { kw: "ceiling", weight: 0.5 },
    { kw: "blocked", weight: 0.6 },
    { kw: "overflow", weight: 0.8 },
    { kw: "broken pipe", weight: 0.8 },
    { kw: "exam", weight: 0.7 },
    { kw: "lecture", weight: 0.5 },
  ],
  medium: [
    { kw: "furniture", weight: 0.6 },
    { kw: "chair broken", weight: 0.7 },
    { kw: "desk broken", weight: 0.7 },
    { kw: "table broken", weight: 0.7 },
    { kw: "damaged", weight: 0.5 },
    { kw: "not clean", weight: 0.6 },
    { kw: "dirty", weight: 0.6 },
    { kw: "cleanliness", weight: 0.7 },
    { kw: "washroom", weight: 0.6 },
    { kw: "toilet", weight: 0.5 },
    { kw: "fan", weight: 0.5 },
    { kw: "slow internet", weight: 0.5 },
    { kw: "flickering", weight: 0.5 },
  ],
  low: [
    { kw: "paint", weight: 0.6 },
    { kw: "scratch", weight: 0.7 },
    { kw: "cosmetic", weight: 0.8 },
    { kw: "minor", weight: 0.7 },
    { kw: "dust", weight: 0.5 },
    { kw: "decoration", weight: 0.6 },
    { kw: "color", weight: 0.4 },
    { kw: "label", weight: 0.4 },
  ],
};

const RANK: Record<PrioritySuggestion["priority"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function suggestPriority(title: string, description: string): PrioritySuggestion {
  const text = `${title} ${description}`.toLowerCase();
  const scores: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const matched: Record<string, string[]> = { critical: [], high: [], medium: [], low: [] };

  (Object.keys(RULES) as Array<keyof typeof RULES>).forEach((level) => {
    for (const rule of RULES[level]) {
      if (text.includes(rule.kw)) {
        scores[level] += rule.weight;
        matched[level].push(rule.kw);
      }
    }
  });

  // Pick highest-ranked level with a non-zero score; tie-break by severity.
  let best: PrioritySuggestion["priority"] = "medium";
  let bestScore = 0;
  (["critical", "high", "medium", "low"] as const).forEach((lvl) => {
    if (
      scores[lvl] > bestScore ||
      (scores[lvl] === bestScore && scores[lvl] > 0 && RANK[lvl] > RANK[best])
    ) {
      best = lvl;
      bestScore = scores[lvl];
    }
  });

  const totalLen = Math.max(20, text.length);
  // Confidence: bounded function of matched weight, with a floor for "medium" default.
  let confidence: number;
  let reason: string;
  if (bestScore === 0) {
    best = "medium";
    confidence = 0.3;
    reason = "No strong indicators found — defaulting to Medium priority.";
  } else {
    confidence = Math.min(0.95, 0.5 + bestScore * 0.2 + Math.min(0.15, totalLen / 4000));
    const kws = matched[best].slice(0, 4);
    reason = `Matched keywords: ${kws.map((k) => `"${k}"`).join(", ")}`;
  }

  return { priority: best, confidence, reason, matched: matched[best] };
}
