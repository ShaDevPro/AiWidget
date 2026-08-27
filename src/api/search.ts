import { call } from './_core';
import type { WebSearchResult } from '../types';

export const searchApi = {
  performWebSearch: (query: string, maxResults?: number): Promise<WebSearchResult[]> =>
    call<WebSearchResult[]>('perform_web_search', { query, maxResults }),
};
