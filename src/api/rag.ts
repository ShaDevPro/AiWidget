import { call } from './_core';
import type { RAGDocument, RAGSearchResult, RAGSemanticSearchResult, VectorDBStats } from '../types';

export const ragApi = {
  listRAGDocuments: (): Promise<RAGDocument[]> =>
    call<RAGDocument[]>('list_rag_documents'),

  indexRAGDocument: (filePath: string, fileBytes?: number[]): Promise<RAGDocument> =>
    call<RAGDocument>('index_rag_document', { filePath, fileBytes }),

  deleteRAGDocument: (id: string): Promise<void> =>
    call<void>('delete_rag_document', { id }),

  clearRAGDocuments: (): Promise<void> =>
    call<void>('clear_rag_documents'),

  searchRAG: (query: string, topK?: number): Promise<RAGSearchResult[]> =>
    call<RAGSearchResult[]>('search_rag', { query, topK }),

  searchRAGSemantic: (query: string, topK?: number, minSimilarity?: number): Promise<RAGSemanticSearchResult[]> =>
    call<RAGSemanticSearchResult[]>('search_rag_semantic', { query, topK, minSimilarity }),

  getVectorDBStats: (): Promise<VectorDBStats> =>
    call<VectorDBStats>('get_vector_db_stats'),

  reindexRAGVectors: (): Promise<number> =>
    call<number>('reindex_rag_vectors'),

  ocrExtractImage: (imagePathOrBase64: string): Promise<string> =>
    call<string>('ocr_extract_image', { imagePathOrBase64 }),

  readImageBase64: (filePath: string): Promise<string> =>
    call<string>('read_image_base64', { filePath }),

  extractDocumentText: (filePath: string, fileBytes?: number[]): Promise<string> =>
    call<string>('extract_document_text', { filePath, fileBytes }),
};
