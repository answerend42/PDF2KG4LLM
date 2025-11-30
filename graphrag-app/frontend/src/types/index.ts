export interface GraphNode {
  id: string;
  name: string;
  type: string;
  description: string;
  degree: number;
}

export interface GraphLink {
  source: string;
  target: string;
  description: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface QueryContextData {
  [key: string]: any[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  contextData?: QueryContextData;
}

export interface QueryResponse {
  response: string;
  context_data?: QueryContextData;
}

export interface Settings {
  models?: {
    default_chat_model?: any;
    default_embedding_model?: any;
  };
  input?: any;
  output?: any;
  [key: string]: any;
}

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  extension?: string;
}

export interface FileListResponse {
  current_path: string;
  items: FileItem[];
}

export interface FileReadResponse {
  path: string;
  content: string;
  size: number;
}

export interface FileStats {
  input_files: number;
  output_files: number;
  cache_files: number;
  total_size: number;
}
