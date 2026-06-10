// Lightweight token-Jaccard similarity for duplicate-complaint detection.

const STOP = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "and",
  "or",
  "but",
  "with",
  "without",
  "from",
  "by",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "i",
  "my",
  "we",
  "our",
  "you",
  "your",
  "not",
  "no",
  "yes",
  "do",
  "does",
  "did",
  "has",
  "have",
  "had",
  "will",
  "would",
  "should",
  "could",
  "can",
  "may",
  "again",
  "very",
  "also",
  "just",
  "still",
  "there",
  "here",
  "then",
  "than",
  "so",
  "as",
  "if",
]);

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP.has(t)),
  );
}

export function jaccardSimilarity(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach((t) => {
    if (B.has(t)) inter++;
  });
  return inter / (A.size + B.size - inter);
}

export type DuplicateCandidate = {
  id: string;
  title: string;
  description: string;
  category: string;
  building: string | null;
  room_number: string | null;
  status: string;
  priority: string;
  created_at: string;
  score: number;
};

export function scoreCandidate(
  input: { title: string; description: string; building?: string | null; category: string },
  row: Omit<DuplicateCandidate, "score">,
): number {
  const titleSim = jaccardSimilarity(input.title, row.title);
  const descSim = jaccardSimilarity(input.description, row.description);
  const sameBuilding =
    input.building && row.building && input.building.toLowerCase() === row.building.toLowerCase()
      ? 1
      : 0;
  const sameCategory = input.category === row.category ? 1 : 0;
  // Weighted: title is strongest, then description, then context.
  return titleSim * 0.5 + descSim * 0.25 + sameBuilding * 0.15 + sameCategory * 0.1;
}

export const DUPLICATE_THRESHOLD = 0.4;
