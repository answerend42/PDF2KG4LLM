import axios from 'axios';
import { GraphData, QueryResponse, Settings, FileListResponse, FileReadResponse, FileStats } from '../types';

const API_BASE_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // Graph operations
  getGraph: async (): Promise<GraphData> => {
    const response = await api.get<GraphData>('/graph');
    return response.data;
  },

  // Query operations
  localQuery: async (question: string, modelId?: string): Promise<QueryResponse> => {
    const response = await api.post<QueryResponse>('/query/local', { question, model_id: modelId });
    return response.data;
  },

  globalQuery: async (question: string, modelId?: string): Promise<QueryResponse> => {
    const response = await api.post<QueryResponse>('/query/global', { question, model_id: modelId });
    return response.data;
  },

  // Direct chat without GraphRAG search
  chatOnly: async (question: string, modelId?: string): Promise<QueryResponse> => {
    const response = await api.post<QueryResponse>('/chat', { question, model_id: modelId });
    return response.data;
  },

  // Index operations
  buildIndex: async () => {
    const response = await api.post('/index/build');
    return response.data;
  },

  // Root path operations
  getRootPath: async (): Promise<{ root_path: string }> => {
    const response = await api.get<{ root_path: string }>('/root-path');
    return response.data;
  },

  updateRootPath: async (rootPath: string) => {
    const response = await api.put('/root-path', { root_path: rootPath });
    return response.data;
  },

  // Settings operations
  getSettings: async (): Promise<Settings> => {
    const response = await api.get<Settings>('/settings');
    return response.data;
  },

  updateSettings: async (settings: Settings) => {
    const response = await api.put('/settings', settings);
    return response.data;
  },

  // File operations
  listFiles: async (path: string = ''): Promise<FileListResponse> => {
    const response = await api.get<FileListResponse>('/files/list', { params: { path } });
    return response.data;
  },

  readFile: async (path: string): Promise<FileReadResponse> => {
    const response = await api.get<FileReadResponse>('/files/read', { params: { path } });
    return response.data;
  },

  getFileStats: async (): Promise<FileStats> => {
    const response = await api.get<FileStats>('/files/stats');
    return response.data;
  },
};
