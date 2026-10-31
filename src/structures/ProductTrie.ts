/**
 * src/structures/ProductTrie.ts
 *
 * Classical Data Structure: In-Memory Prefix Trie (Tree)
 * Satisfies Academic Syllabus: Data Structures — Search Trees & Autocomplete
 *
 * Provides O(L) time complexity prefix lookups, where L is string length,
 * independent of total catalog size N.
 */

export interface TrieProductPayload {
  id: string;
  sku: string;
  name: string;
  price: number;
}

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEndOfWord: boolean = false;
  payloads: TrieProductPayload[] = [];
}

export class ProductTrie {
  private root: TrieNode;
  private _wordCount: number = 0;

  constructor() {
    this.root = new TrieNode();
  }

  get wordCount(): number {
    return this._wordCount;
  }

  /**
   * Inserts a keyword and associates product payload.
   * Time Complexity: O(L) where L = word.length
   */
  insert(word: string, payload: TrieProductPayload): void {
    const normalized = word.toLowerCase().trim();
    if (!normalized) return;

    let current = this.root;
    for (const char of normalized) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;
    }

    if (!current.isEndOfWord) {
      current.isEndOfWord = true;
      this._wordCount++;
    }

    if (!current.payloads.some((p) => p.id === payload.id)) {
      current.payloads.push(payload);
    }
  }

  /**
   * Finds all products whose keywords start with the specified prefix.
   * Time Complexity: O(P + K) where P = prefix length, K = descendants count
   */
  searchPrefix(prefix: string): TrieProductPayload[] {
    const normalized = prefix.toLowerCase().trim();
    if (!normalized) return [];

    let current = this.root;
    for (const char of normalized) {
      if (!current.children.has(char)) {
        return [];
      }
      current = current.children.get(char)!;
    }

    const results: TrieProductPayload[] = [];
    const visitedIds = new Set<string>();

    const dfs = (node: TrieNode) => {
      if (node.isEndOfWord) {
        for (const p of node.payloads) {
          if (!visitedIds.has(p.id)) {
            visitedIds.add(p.id);
            results.push(p);
          }
        }
      }
      for (const child of node.children.values()) {
        dfs(child);
      }
    };

    dfs(current);
    return results;
  }

  /**
   * Autocomplete suggestion generator: returns list of matching search keywords.
   */
  autocomplete(prefix: string, limit = 5): string[] {
    const normalized = prefix.toLowerCase().trim();
    if (!normalized) return [];

    let current = this.root;
    for (const char of normalized) {
      if (!current.children.has(char)) return [];
      current = current.children.get(char)!;
    }

    const words: string[] = [];
    const dfs = (node: TrieNode, currentWord: string) => {
      if (words.length >= limit) return;
      if (node.isEndOfWord) {
        words.push(currentWord);
      }
      for (const [char, child] of node.children.entries()) {
        dfs(child, currentWord + char);
      }
    };

    dfs(current, normalized);
    return words;
  }
}
