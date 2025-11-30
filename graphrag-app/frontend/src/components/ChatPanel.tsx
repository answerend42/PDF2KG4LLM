import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  Chip,
  alpha,
  Fade,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Send as SendIcon,
  FlashOnOutlined as LocalIcon,
  PublicOutlined as GlobalIcon,
  AutoAwesomeOutlined as SparkleIcon,
  OpenInFullOutlined as ExpandContextIcon,
  ArrowDropDown as ModelDropdownIcon,
} from '@mui/icons-material';
import { Message, QueryContextData } from '../types';
import { apiService } from '../services/api';

interface ChatPanelProps {
  height: string;
  onExpandContext?: (payload: { messageId: string; contextData: QueryContextData; title?: string }) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ height, onExpandContext }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'local' | 'global' | 'chat'>('local');
  const [statusText, setStatusText] = useState<string>('');
  const [expandedContextMessageIds, setExpandedContextMessageIds] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [activeModelId, setActiveModelId] = useState<string>('default_chat_model');
  const [modelMenuAnchor, setModelMenuAnchor] = useState<null | HTMLElement>(null);
  const [chatFontSize, setChatFontSize] = useState<number>(15);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    // 加载可用模型列表，并设置默认模型
    const loadModels = async () => {
        try {
          const settings = await apiService.getSettings();
          const models = settings.models ? Object.keys(settings.models) : [];
          setAvailableModels(models);
          if (models.length > 0) {
            const localId = (settings as any).local_search?.chat_model_id;
            const globalId = (settings as any).global_search?.chat_model_id;
            const defaultId = localId || globalId || models[0];
            setActiveModelId(defaultId);
          }
          const uiFontSize = (settings as any).ui?.chat_font_size;
          if (typeof uiFontSize === 'number' && !Number.isNaN(uiFontSize)) {
            setChatFontSize(uiFontSize);
          }
        } catch {
          // ignore, fallback to default_chat_model
        }
    };
    loadModels();
  }, []);

  const toggleContextForMessage = (id: string) => {
    setExpandedContextMessageIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setStatusText(
      searchMode === 'local'
        ? '正在执行本地搜索（GraphRAG local）…'
        : searchMode === 'global'
        ? '正在执行全局搜索（GraphRAG global）…'
        : '正在与大模型进行纯对话（不使用检索）…'
    );

    try {
      const response =
        searchMode === 'local'
          ? await apiService.localQuery(input, activeModelId)
          : searchMode === 'global'
          ? await apiService.globalQuery(input, activeModelId)
          : await apiService.chatOnly(input, activeModelId);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        contextData: (response as any).context_data as QueryContextData | undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      setStatusText('搜索失败');
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `抱歉，查询遇到问题：${error.message || '请稍后重试'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      if (!statusText.startsWith('搜索失败')) {
        setStatusText(
          searchMode === 'local'
            ? '本地搜索完成（结果来自 GraphRAG local）'
            : searchMode === 'global'
            ? '全局搜索完成（结果来自 GraphRAG global）'
            : '对话完成（结果来自默认聊天模型）'
        );
      }
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    '知识图谱中有哪些主要实体？',
    '总结文档的核心内容',
    '分析实体之间的关系',
  ];

  return (
    <Box
      sx={{
        height,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header with gradient: model selector + mode selector */}
      <Box
        sx={{
          padding: 3,
          background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(249,250,251,1) 100%)',
          borderBottom: '1px solid',
          borderColor: alpha('#111827', 0.06),
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Model selector: single tab with dropdown, left aligned */}
          <Box>
            <Chip
              icon={<ModelDropdownIcon sx={{ fontSize: 20 }} />}
              label={activeModelId || '选择模型'}
              onClick={e => setModelMenuAnchor(e.currentTarget)}
              size="medium"
              sx={{
                borderRadius: 16,
                px: 1.5,
                height: 32,
                fontSize: '0.9rem',
                backgroundColor: modelMenuAnchor ? '#f3f4f6' : 'transparent',
                color: '#111827',
                border: '1px solid',
                borderColor: modelMenuAnchor ? '#e5e7eb' : 'transparent',
                fontWeight: 500,
              }}
            />
            <Menu
              anchorEl={modelMenuAnchor}
              open={Boolean(modelMenuAnchor)}
              onClose={() => setModelMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
              {availableModels.length === 0 && (
                <MenuItem disabled>暂无可用模型</MenuItem>
              )}
              {availableModels.map(id => (
                <MenuItem
                  key={id}
                  selected={id === activeModelId}
                  onClick={() => {
                    setActiveModelId(id);
                    setModelMenuAnchor(null);
                  }}
                >
                  {id}
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Mode Selector */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={<LocalIcon sx={{ fontSize: 18 }} />}
            label="本地搜索"
            onClick={() => setSearchMode('local')}
            sx={{
              backgroundColor: searchMode === 'local' ? alpha('#2563eb', 0.12) : '#f3f4f6',
              color: searchMode === 'local' ? '#1d4ed8' : '#6b7280',
              border: '1px solid',
              borderColor: searchMode === 'local' ? alpha('#2563eb', 0.6) : 'transparent',
              fontWeight: searchMode === 'local' ? 600 : 400,
              '&:hover': {
                backgroundColor: searchMode === 'local' ? alpha('#2563eb', 0.18) : '#e5e7eb',
              },
            }}
          />
          <Chip
            icon={<GlobalIcon sx={{ fontSize: 18 }} />}
            label="全局搜索"
            onClick={() => setSearchMode('global')}
            sx={{
              backgroundColor: searchMode === 'global' ? alpha('#14b8a6', 0.12) : '#f3f4f6',
              color: searchMode === 'global' ? '#0f766e' : '#6b7280',
              border: '1px solid',
              borderColor: searchMode === 'global' ? alpha('#14b8a6', 0.6) : 'transparent',
              fontWeight: searchMode === 'global' ? 600 : 400,
              '&:hover': {
                backgroundColor: searchMode === 'global' ? alpha('#14b8a6', 0.18) : '#e5e7eb',
              },
            }}
          />
          <Chip
            icon={<SparkleIcon sx={{ fontSize: 18 }} />}
            label="纯对话（无搜索）"
            onClick={() => setSearchMode('chat')}
            sx={{
              backgroundColor: searchMode === 'chat' ? alpha('#a855f7', 0.12) : '#f3f4f6',
              color: searchMode === 'chat' ? '#7e22ce' : '#6b7280',
              border: '1px solid',
              borderColor: searchMode === 'chat' ? alpha('#a855f7', 0.6) : 'transparent',
              fontWeight: searchMode === 'chat' ? 600 : 400,
              '&:hover': {
                backgroundColor: searchMode === 'chat' ? alpha('#a855f7', 0.18) : '#e5e7eb',
              },
            }}
          />
          </Box>
        </Box>
      </Box>

      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          padding: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: alpha('#9ca3af', 0.6),
            borderRadius: '3px',
            '&:hover': {
              background: alpha('#4b5563', 0.7),
            },
          },
        }}
      >
        {/* Status / progress */}
        {statusText && (
          <Typography
            variant="caption"
            sx={{ color: '#6b7280', mb: 1 }}
          >
            {statusText}
          </Typography>
        )}

        {messages.length === 0 ? (
          // Empty State
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb 0%, #22c55e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.22)',
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': {
                    transform: 'scale(1)',
                    opacity: 1,
                  },
                  '50%': {
                    transform: 'scale(1.05)',
                    opacity: 0.9,
                  },
                },
              }}
            >
              <SparkleIcon sx={{ fontSize: 40, color: 'white' }} />
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#0f172a', mb: 1 }}>
                开始对话
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280', maxWidth: 300 }}>
                向 AI 助手提问关于知识图谱的任何问题
              </Typography>
            </Box>

            {/* Suggestions */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', maxWidth: 400 }}>
              {suggestions.map((suggestion, index) => (
                <Paper
                  key={index}
                  onClick={() => setInput(suggestion)}
                  sx={{
                    padding: 2,
                    backgroundColor: '#f9fafb',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    '&:hover': {
                      backgroundColor: '#eff6ff',
                      borderColor: alpha('#2563eb', 0.4),
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#111827' }}>
                    {suggestion}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Box>
        ) : (
          // Messages
          <>
            {messages.map((message) => (
              <Fade in key={message.id} timeout={300}>
                <Box sx={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <Box sx={{ maxWidth: '80%' }}>
                    <Paper
                      elevation={0}
                      sx={{
                        padding: message.role === 'user' ? 1.5 : 0,
                        backgroundColor: message.role === 'user' ? '#f3f4f6' : 'transparent',
                        border: message.role === 'user' ? '1px solid' : 'none',
                        borderColor: message.role === 'user' ? '#e5e7eb' : 'transparent',
                        boxShadow:
                          message.role === 'user'
                            ? '0 4px 12px rgba(15, 23, 42, 0.04)'
                            : 'none',
                        borderRadius: message.role === 'user' ? 3 : 0,
                      }}
                    >
                      {message.role === 'assistant' &&
                        message.contextData &&
                        Object.keys(message.contextData).length > 0 && (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            mb: 1,
                          }}
                          onClick={() => toggleContextForMessage(message.id)}
                        >
                          <Typography variant="caption" sx={{ color: '#6b7280', mr: 0.5 }}>
                            本轮查询使用的上下文
                          </Typography>
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-block',
                              transform: expandedContextMessageIds.includes(message.id) ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                              color: '#6b7280',
                              fontSize: '0.75rem',
                            }}
                          >
                            &gt;
                          </Box>
                        </Box>
                      )}

                      {message.role === 'assistant' ? (
                        <>
                          {message.contextData &&
                            Object.keys(message.contextData).length > 0 &&
                            expandedContextMessageIds.includes(message.id) && (
                              <Box
                                sx={{
                                  mt: 1,
                                  mb: 1,
                                  borderRadius: 2,
                                  border: '1px solid',
                                  borderColor: '#e5e7eb',
                                  backgroundColor: '#f9fafb',
                                  p: 1.5,
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    mb: 1,
                                  }}
                                >
                                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                    上下文预览
                                  </Typography>
                                  {onExpandContext && (
                                    <IconButton
                                      size="small"
                                      onClick={e => {
                                        e.stopPropagation();
                                        if (message.contextData) {
                                          onExpandContext({
                                            messageId: message.id,
                                            contextData: message.contextData,
                                            title: '上下文',
                                          });
                                        }
                                      }}
                                      sx={{
                                        color: '#6b7280',
                                        '&:hover': { color: '#111827' },
                                      }}
                                    >
                                      <ExpandContextIcon fontSize="inherit" />
                                    </IconButton>
                                  )}
                                </Box>
                                <Box sx={{ maxHeight: 260, overflow: 'auto' }}>
                                  {Object.entries(message.contextData || {}).map(([key, data]) => {
                                    const rows = Array.isArray(data) ? data : [];
                                    if (!rows.length) return null;
                                    const first = rows[0] as any;
                                    const columns = Object.keys(first);
                                    return (
                                      <Box key={key} sx={{ mb: 2 }}>
                                        <Typography
                                          variant="caption"
                                          sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}
                                        >
                                          {key}
                                        </Typography>
                                        <Table size="small">
                                          <TableHead>
                                            <TableRow>
                                              {columns.map(col => (
                                                <TableCell key={col}>
                                                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                                    {col}
                                                  </Typography>
                                                </TableCell>
                                              ))}
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {rows.slice(0, 20).map((row: any, rIdx) => (
                                              <TableRow key={rIdx}>
                                                {columns.map(col => (
                                                  <TableCell key={col}>
                                                    <Typography variant="caption" sx={{ color: '#4b5563' }}>
                                                      {typeof row[col] === 'string'
                                                        ? row[col]
                                                        : JSON.stringify(row[col])}
                                                    </Typography>
                                                  </TableCell>
                                                ))}
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              </Box>
                            )}

                          <ReactMarkdown
                            components={{
                              p: ({ node, ...props }) => (
                                <p
                                  style={{
                                    margin: '0 0 8px 0',
                                    color: '#111827',
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                  }}
                                  {...props}
                                />
                              ),
                              h1: ({ node, ...props }) => (
                                <h1
                                  style={{
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                    margin: '0 0 8px 0',
                                  }}
                                  {...props}
                                />
                              ),
                              h2: ({ node, ...props }) => (
                                <h2
                                  style={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    margin: '0 0 6px 0',
                                  }}
                                  {...props}
                                />
                              ),
                              li: ({ node, ...props }) => (
                                <li
                                  style={{ color: '#111827', marginBottom: 4 }}
                                  {...props}
                                />
                              ),
                              code: ({ node, ...props }) =>
                                (props as any).inline ? (
                                  <code
                                    style={{
                                      backgroundColor: '#e5e7eb',
                                      padding: '2px 4px',
                                      borderRadius: 4,
                                      fontSize: '0.85em',
                                    }}
                                    {...props}
                                  />
                                ) : (
                                  <pre
                                    style={{
                                      backgroundColor: '#111827',
                                      color: '#e5e7eb',
                                      padding: '8px 12px',
                                      borderRadius: 6,
                                      overflowX: 'auto',
                                    }}
                                  >
                                    <code {...props} />
                                  </pre>
                                ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </>
                      ) : (
                        <Typography
                          variant="body1"
                          sx={{
                            color: '#111827',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            lineHeight: 1.6,
                          }}
                        >
                          {message.content}
                        </Typography>
                      )}

                      {message.role === 'assistant' && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#6b7280',
                            display: 'block',
                            mt: 1,
                          }}
                        >
                          {message.timestamp.toLocaleTimeString()}
                        </Typography>
                      )}
                    </Paper>
                  </Box>
                </Box>
              </Fade>
            ))}

            {/* Loading bubble on assistant side */}
            {loading && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    padding: 0,
                    backgroundColor: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: '#111827',
                      animation: 'pulseDot 1.2s ease-in-out infinite',
                      '@keyframes pulseDot': {
                        '0%, 100%': {
                          transform: 'scale(0.8)',
                          opacity: 0.6,
                        },
                        '50%': {
                          transform: 'scale(1.3)',
                          opacity: 1,
                        },
                      },
                    }}
                  />
                </Paper>
              </Box>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box
        sx={{
          padding: 3,
          backgroundColor: '#f9fafb',
          borderTop: '1px solid',
          borderColor: alpha('#111827', 0.06),
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            backgroundColor: '#ffffff',
            borderRadius: 3,
            border: '1px solid',
            borderColor: '#e5e7eb',
            padding: '4px',
            transition: 'all 0.3s',
            '&:focus-within': {
              borderColor: '#9ca3af',
              boxShadow: 'none',
            },
          }}
        >
          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入你的问题..."
            disabled={loading}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                color: '#111827',
                fontSize: `${chatFontSize}px`,
                padding: '12px 16px',
                '& ::placeholder': {
                  color: '#9ca3af',
                  opacity: 1,
                },
              },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!input.trim() || loading}
            sx={{
              background: input.trim() && !loading
                ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                : '#e5e7eb',
              color: input.trim() && !loading ? 'white' : '#9ca3af',
              width: 44,
              height: 44,
              margin: 0.5,
              '&:hover': {
                background: input.trim() && !loading
                  ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)'
                  : '#d1d5db',
              },
              '&:disabled': {
                background: '#e5e7eb',
                color: '#9ca3af',
              },
              transition: 'all 0.3s',
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatPanel;
