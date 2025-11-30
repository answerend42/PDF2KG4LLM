import React, { useState, useRef } from 'react';
import {
  Box,
  Fab,
  Tooltip,
  Tabs,
  Tab,
  IconButton,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  alpha,
} from '@mui/material';
import { FolderOpenOutlined as FolderIcon, CloseOutlined as CloseIcon } from '@mui/icons-material';
import KnowledgeGraph from './KnowledgeGraph';
import ChatPanel from './ChatPanel';
import FileBrowser from './FileBrowser';
import { QueryContextData } from '../types';

interface ContextTabInfo {
  id: string;
  title: string;
  contextData: QueryContextData;
}

const HomePage: React.FC = () => {
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);
  const [activeLeftTab, setActiveLeftTab] = useState<string>('graph');
  const [contextTabs, setContextTabs] = useState<ContextTabInfo[]>([]);

  const handleExpandContext = (payload: { messageId: string; contextData: QueryContextData; title?: string }) => {
    const { messageId, contextData, title } = payload;
    if (!contextData || Object.keys(contextData).length === 0) return;
    setContextTabs(prev => {
      if (prev.find(tab => tab.id === messageId)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: messageId,
          title: title || '上下文',
          contextData,
        },
      ];
    });
    setActiveLeftTab(messageId);
  };

  const handleCloseContextTab = (id: string) => {
    setContextTabs(prev => prev.filter(tab => tab.id !== id));
    setActiveLeftTab(prev => (prev === id ? 'graph' : prev));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        gap: 2.5,
        padding: 3,
        backgroundColor: 'background.default',
        position: 'relative',
      }}
    >
      {/* Knowledge Graph - 70% */}
      <Box sx={{ flex: 7, minWidth: 0 }}>
        <Box
          sx={{
            height: '100%',
            borderRadius: 4,
            border: '1px solid',
            borderColor: alpha('#111827', 0.08),
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Navigation Tabs above graph / context */}
          <Box
            sx={{
              borderBottom: '1px solid',
              borderColor: alpha('#111827', 0.06),
              px: 2,
              pt: 1.5,
              pb: 0,
            }}
          >
            <Tabs
              value={activeLeftTab}
              onChange={(_, val) => setActiveLeftTab(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 36,
                '& .MuiTab-root': {
                  minHeight: 36,
                  paddingX: 1.5,
                  paddingY: 0.5,
                  textTransform: 'none',
                },
              }}
            >
              <Tab
                label="知识图谱"
                value="graph"
              />
              {contextTabs.map(tab => (
                <Tab
                  key={tab.id}
                  value={tab.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption">
                        {tab.title}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          handleCloseContextTab(tab.id);
                        }}
                        sx={{
                          ml: 0.5,
                          color: '#9ca3af',
                          '&:hover': { color: '#111827' },
                        }}
                      >
                        <CloseIcon fontSize="inherit" />
                      </IconButton>
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Box>

          {/* Content Area */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            {activeLeftTab === 'graph' ? (
              <KnowledgeGraph height="100%" />
            ) : (
              (() => {
                const tab = contextTabs.find(t => t.id === activeLeftTab);
                if (!tab) return null;
                return <ContextTableView contextData={tab.contextData} />;
              })()
            )}
          </Box>
        </Box>
      </Box>

      {/* Chat Panel - 30% */}
      <Box sx={{ flex: 3, minWidth: 0 }}>
        <ChatPanel height="100%" onExpandContext={handleExpandContext} />
      </Box>

      {/* Floating Action Button for File Browser */}
      <Tooltip title="浏览 ragtest 文件" placement="right">
        <Fab
          onClick={() => setFileBrowserOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 32,
            left: 32,
            background: 'linear-gradient(135deg, #2563eb 0%, #22c55e 100%)',
            color: 'white',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.25)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1d4ed8 0%, #16a34a 100%)',
              boxShadow: '0 14px 35px rgba(15, 23, 42, 0.3)',
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.3s',
          }}
        >
          <FolderIcon />
        </Fab>
      </Tooltip>

      {/* File Browser Dialog */}
      <FileBrowser open={fileBrowserOpen} onClose={() => setFileBrowserOpen(false)} />
    </Box>
  );
};

interface ContextTableViewProps {
  contextData: QueryContextData;
}

const ContextTableView: React.FC<ContextTableViewProps> = ({ contextData }) => {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const resizingRef = useRef<{
    tableKey: string;
    targetKey: string;
    startX: number;
    startWidths: { [key: string]: number };
    totalWidth: number;
  } | null>(null);

  const handleResizeMouseDown = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    tableKey: string,
    columns: string[],
    targetCol: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const th = e.currentTarget.parentElement as HTMLElement | null;
    const headerRow = th?.parentElement as HTMLElement | null;
    if (!th || !headerRow) return;

    const totalWidth = headerRow.offsetWidth || headerRow.getBoundingClientRect().width;
    const cells = Array.from(headerRow.children) as HTMLElement[];

    const startWidths: { [key: string]: number } = {};
    columns.forEach((colName, idx) => {
      const cell = cells[idx];
      const key = `${tableKey}:${colName}`;
      const current = columnWidths[key];
      startWidths[key] = current || (cell ? cell.offsetWidth : totalWidth / columns.length);
    });

    const targetKey = `${tableKey}:${targetCol}`;
    resizingRef.current = {
      startX: e.clientX,
      tableKey,
      targetKey,
      startWidths,
      totalWidth,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      const info = resizingRef.current;
      if (!info) return;
      const { targetKey, startX, startWidths, totalWidth } = info;
      const delta = ev.clientX - startX;

      const colKeys = Object.keys(startWidths);
      const minWidth = 80;

      const targetStartWidth = startWidths[targetKey] ?? (totalWidth / colKeys.length);
      const maxWidthForTarget =
        totalWidth - minWidth * (colKeys.length - 1);

      let newTargetWidth = targetStartWidth + delta;
      newTargetWidth = Math.max(minWidth, Math.min(maxWidthForTarget, newTargetWidth));

      const otherKeys = colKeys.filter(k => k !== targetKey);
      const totalOtherStart = otherKeys.reduce(
        (sum, k) => sum + (startWidths[k] ?? 0),
        0
      );

      const nextWidths: { [key: string]: number } = {};
      nextWidths[targetKey] = newTargetWidth;

      if (otherKeys.length && totalOtherStart > 0) {
        const remainingWidth = totalWidth - newTargetWidth;
        const scale = remainingWidth / totalOtherStart;

        otherKeys.forEach(k => {
          const w = Math.max(minWidth, (startWidths[k] ?? 0) * scale);
          nextWidths[k] = w;
        });

        // 调整最后一列，确保总宽度精确等于容器宽度，避免漂移
        const sum = Object.values(nextWidths).reduce((s, w) => s + w, 0);
        const diff = totalWidth - sum;
        const lastKey = otherKeys[otherKeys.length - 1] || targetKey;
        nextWidths[lastKey] = (nextWidths[lastKey] || 0) + diff;
      }

      setColumnWidths(prev => ({
        ...prev,
        ...nextWidths,
      }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', p: 2.5 }}>
      {Object.entries(contextData || {}).map(([key, data]) => {
        const rows = Array.isArray(data) ? data : [];
        if (!rows.length) return null;
        const first = rows[0] as any;
        const columns = Object.keys(first);
        return (
          <Box key={key} sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              sx={{ color: '#0f172a', fontWeight: 600, mb: 1 }}
            >
              {key}
            </Typography>
            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  {columns.map(col => {
                    const colKey = `${key}:${col}`;
                    const width = columnWidths[colKey];
                    return (
                      <TableCell
                        key={col}
                        sx={{
                          position: 'relative',
                          paddingRight: 1,
                          width: width ? `${width}px` : 'auto',
                          maxWidth: width ? `${width}px` : 'none',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {col}
                        </Typography>
                        <Box
                          onMouseDown={e => handleResizeMouseDown(e, key, columns, col)}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 4,
                            height: '100%',
                            cursor: 'col-resize',
                            backgroundColor: '#d1d5db',
                          }}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.slice(0, 50).map((row: any, rIdx) => (
                  <TableRow
                    key={rIdx}
                    sx={{
                      backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#f3f4f6',
                    }}
                  >
                    {columns.map(col => {
                      const colKey = `${key}:${col}`;
                      const width = columnWidths[colKey];
                      return (
                        <TableCell
                          key={col}
                          sx={{
                            width: width ? `${width}px` : 'auto',
                            maxWidth: width ? `${width}px` : 'none',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                          }}
                        >
                          <Typography variant="caption" sx={{ color: '#4b5563' }}>
                            {typeof row[col] === 'string' ? row[col] : JSON.stringify(row[col])}
                          </Typography>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        );
      })}
    </Box>
  );
};

export default HomePage;
