/**
 * Collocation Repository
 *
 * Data access layer for PMI-based word collocations.
 * Implements Phase 2.4: Collocation Storage.
 */

import type { Collocation, LanguageObject } from '@prisma/client';
import { getPrisma } from '../prisma';

// =============================================================================
// Types
// =============================================================================

export interface CreateCollocationInput {
  word1Id: string;
  word2Id: string;
  pmi: number;
  npmi: number;
  cooccurrence: number;
  significance: number;
}

export interface CollocationWithWords extends Collocation {
  word1: LanguageObject;
  word2: LanguageObject;
}

export interface CollocationPair {
  word: string;
  wordId: string;
  pmi: number;
  npmi: number;
  cooccurrence: number;
  significance: number;
}

export interface CollocationNetwork {
  nodes: Array<{
    id: string;
    content: string;
    type: string;
    priority: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
    pmi: number;
  }>;
}

// =============================================================================
// Repository Functions
// =============================================================================

/**
 * Create a collocation relationship.
 */
export async function createCollocation(
  input: CreateCollocationInput
): Promise<Collocation> {
  const db = getPrisma();

  return db.collocation.create({
    data: {
      word1Id: input.word1Id,
      word2Id: input.word2Id,
      pmi: input.pmi,
      npmi: input.npmi,
      cooccurrence: input.cooccurrence,
      significance: input.significance,
    },
  });
}

/**
 * Get a collocation by word pair.
 */
export async function getCollocation(
  word1Id: string,
  word2Id: string
): Promise<Collocation | null> {
  const db = getPrisma();

  // Check both directions
  const collocation = await db.collocation.findFirst({
    where: {
      OR: [
        { word1Id, word2Id },
        { word1Id: word2Id, word2Id: word1Id },
      ],
    },
  });

  return collocation;
}

/**
 * Get all collocations for a word.
 */
export async function getCollocationsForWord(
  wordId: string,
  minPMI?: number,
  limit?: number
): Promise<CollocationPair[]> {
  const db = getPrisma();

  // Get collocations where word is either word1 or word2
  const collocations = await db.collocation.findMany({
    where: {
      OR: [{ word1Id: wordId }, { word2Id: wordId }],
      ...(minPMI !== undefined ? { pmi: { gte: minPMI } } : {}),
    },
    include: {
      word1: true,
      word2: true,
    },
    orderBy: { pmi: 'desc' },
    take: limit,
  });

  // Map to CollocationPair, selecting the "other" word
  return collocations.map((c) => {
    const isWord1 = c.word1Id === wordId;
    const otherWord = isWord1 ? c.word2 : c.word1;

    return {
      word: otherWord.content,
      wordId: otherWord.id,
      pmi: c.pmi,
      npmi: c.npmi,
      cooccurrence: c.cooccurrence,
      significance: c.significance,
    };
  });
}

/**
 * Get top collocations for a goal (high PMI pairs for fluency tasks).
 */
export async function getTopCollocations(
  goalId: string,
  limit: number = 50
): Promise<CollocationWithWords[]> {
  const db = getPrisma();

  return db.collocation.findMany({
    where: {
      word1: { goalId },
    },
    include: {
      word1: true,
      word2: true,
    },
    orderBy: { pmi: 'desc' },
    take: limit,
  });
}

/**
 * Bulk create collocations.
 */
export async function bulkCreateCollocations(
  collocations: CreateCollocationInput[]
): Promise<number> {
  const db = getPrisma();

  const result = await db.collocation.createMany({
    data: collocations,
    skipDuplicates: true,
  });

  return result.count;
}

/**
 * Update collocation statistics.
 */
export async function updateCollocation(
  word1Id: string,
  word2Id: string,
  updates: Partial<Pick<Collocation, 'pmi' | 'npmi' | 'cooccurrence' | 'significance'>>
): Promise<Collocation | null> {
  const db = getPrisma();

  // Find the collocation first
  const existing = await getCollocation(word1Id, word2Id);
  if (!existing) return null;

  return db.collocation.update({
    where: { id: existing.id },
    data: updates,
  });
}

/**
 * Delete a collocation.
 */
export async function deleteCollocation(
  word1Id: string,
  word2Id: string
): Promise<boolean> {
  const db = getPrisma();

  const existing = await getCollocation(word1Id, word2Id);
  if (!existing) return false;

  await db.collocation.delete({
    where: { id: existing.id },
  });

  return true;
}

/**
 * Get collocation network for visualization.
 */
export async function getCollocationNetwork(
  goalId: string,
  centerWordId?: string,
  depth: number = 2,
  minPMI: number = 2.0
): Promise<CollocationNetwork> {
  const db = getPrisma();

  const nodes: Map<string, CollocationNetwork['nodes'][0]> = new Map();
  const edges: CollocationNetwork['edges'] = [];
  const visited = new Set<string>();

  // BFS to build network
  const queue: Array<{ wordId: string; currentDepth: number }> = [];

  if (centerWordId) {
    queue.push({ wordId: centerWordId, currentDepth: 0 });
  } else {
    // Start from top priority words
    const topWords = await db.languageObject.findMany({
      where: { goalId },
      orderBy: { priority: 'desc' },
      take: 10,
    });
    topWords.forEach((w) => queue.push({ wordId: w.id, currentDepth: 0 }));
  }

  while (queue.length > 0) {
    const { wordId, currentDepth } = queue.shift()!;

    if (visited.has(wordId) || currentDepth > depth) continue;
    visited.add(wordId);

    // Get the word
    const word = await db.languageObject.findUnique({
      where: { id: wordId },
    });

    if (!word || word.goalId !== goalId) continue;

    // Add node
    nodes.set(wordId, {
      id: wordId,
      content: word.content,
      type: word.type,
      priority: word.priority,
    });

    // Get collocations
    const collocations = await db.collocation.findMany({
      where: {
        OR: [{ word1Id: wordId }, { word2Id: wordId }],
        pmi: { gte: minPMI },
      },
      include: {
        word1: true,
        word2: true,
      },
      orderBy: { pmi: 'desc' },
      take: 10,
    });

    for (const c of collocations) {
      const isWord1 = c.word1Id === wordId;
      const otherWord = isWord1 ? c.word2 : c.word1;
      const otherId = otherWord.id;

      // Only include words from same goal
      if (otherWord.goalId !== goalId) continue;

      // Add edge (avoid duplicates)
      const edgeKey = [wordId, otherId].sort().join('-');
      if (!edges.some((e) => [e.source, e.target].sort().join('-') === edgeKey)) {
        edges.push({
          source: wordId,
          target: otherId,
          weight: c.significance,
          pmi: c.pmi,
        });
      }

      // Queue neighbor for next depth
      if (!visited.has(otherId) && currentDepth < depth) {
        queue.push({ wordId: otherId, currentDepth: currentDepth + 1 });
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
  };
}

/**
 * Calculate relational density (hub score) for a word.
 */
export async function calculateRelationalDensity(wordId: string): Promise<number> {
  const db = getPrisma();

  const collocations = await db.collocation.findMany({
    where: {
      OR: [{ word1Id: wordId }, { word2Id: wordId }],
    },
  });

  if (collocations.length === 0) return 0;

  // Hub score = sum of PMI-weighted connections
  const totalPMI = collocations.reduce((sum, c) => sum + Math.max(0, c.pmi), 0);
  const avgPMI = totalPMI / collocations.length;

  // Normalize: more connections and higher average PMI = higher score
  // Using log to dampen effect of very high connection counts
  const connectionFactor = Math.log(collocations.length + 1);
  const pmiNormalized = Math.min(avgPMI / 10, 1); // Assume max useful PMI ~10

  return Math.min(connectionFactor * pmiNormalized, 1);
}

/**
 * Recalculate all relational densities for a goal.
 */
export async function recalculateRelationalDensities(goalId: string): Promise<number> {
  const db = getPrisma();

  const objects = await db.languageObject.findMany({
    where: { goalId },
    select: { id: true },
  });

  let updated = 0;

  for (const obj of objects) {
    const density = await calculateRelationalDensity(obj.id);

    await db.languageObject.update({
      where: { id: obj.id },
      data: { relationalDensity: density },
    });

    updated++;
  }

  return updated;
}

/**
 * Find low-PMI pairs for versatility tasks.
 */
export async function getLowPMIPairs(
  goalId: string,
  maxPMI: number = 2.0,
  limit: number = 20
): Promise<CollocationWithWords[]> {
  const db = getPrisma();

  return db.collocation.findMany({
    where: {
      word1: { goalId },
      pmi: { lte: maxPMI, gt: 0 }, // Low but positive PMI
    },
    include: {
      word1: true,
      word2: true,
    },
    orderBy: { pmi: 'asc' },
    take: limit,
  });
}

/**
 * Get collocation statistics for a goal.
 */
export async function getCollocationStats(goalId: string): Promise<{
  totalCollocations: number;
  averagePMI: number;
  highPMICount: number;
  lowPMICount: number;
  maxPMI: number;
  minPMI: number;
}> {
  const db = getPrisma();

  const collocations = await db.collocation.findMany({
    where: { word1: { goalId } },
  });

  if (collocations.length === 0) {
    return {
      totalCollocations: 0,
      averagePMI: 0,
      highPMICount: 0,
      lowPMICount: 0,
      maxPMI: 0,
      minPMI: 0,
    };
  }

  const pmis = collocations.map((c) => c.pmi);
  const totalPMI = pmis.reduce((a, b) => a + b, 0);
  const highPMICount = pmis.filter((p) => p >= 5).length;
  const lowPMICount = pmis.filter((p) => p > 0 && p < 2).length;

  return {
    totalCollocations: collocations.length,
    averagePMI: totalPMI / collocations.length,
    highPMICount,
    lowPMICount,
    maxPMI: Math.max(...pmis),
    minPMI: Math.min(...pmis),
  };
}
