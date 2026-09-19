import type { KnowledgeSearchResult } from '../../types';
import { knowledgeBase } from './knowledge-base';

// ============================================================
// Knowledge Service (RAG)
// Simple keyword-based search over the built-in knowledge base.
// Can be upgraded to pgvector or external vector DB later.
// ============================================================

// Vietnamese stopwords
const STOPWORDS = new Set([
  'của', 'và', 'là', 'trong', 'cho', 'với', 'để', 'một', 'các', 'được',
  'the', 'and', 'is', 'in', 'for', 'with', 'a', 'to', 'of',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function scoreDocument(query: string, doc: { title: string; content: string; tags?: string[] }): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  const titleTokens = tokenize(doc.title);
  const contentTokens = tokenize(doc.content);
  const tagTokens = doc.tags ? doc.tags.flatMap((t) => tokenize(t)) : [];

  let score = 0;
  for (const qt of queryTokens) {
    // Title match: weight 3
    if (titleTokens.includes(qt)) score += 3;
    // Tag match: weight 2
    if (tagTokens.includes(qt)) score += 2;
    // Content match: weight 1
    if (contentTokens.includes(qt)) score += 1;
  }

  // Normalize by query length
  return score / queryTokens.length;
}

export function searchKnowledge(query: string, limit: number = 3): KnowledgeSearchResult[] {
  const results = knowledgeBase
    .map((doc) => {
      const score = scoreDocument(query, doc);
      const snippet = doc.content.length > 200 ? doc.content.substring(0, 200) + '...' : doc.content;
      return { document: doc, score, snippet };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return results;
}

export function getKnowledgeByCategory(category: string) {
  return knowledgeBase.filter((d) => d.category === category);
}

export function getAllKnowledge() {
  return knowledgeBase;
}
