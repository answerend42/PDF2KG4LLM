import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  TextField,
  InputAdornment,
  FormControlLabel,
  Switch,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  alpha,
} from '@mui/material';
import {
  RefreshOutlined as RefreshIcon,
  ZoomInOutlined as ZoomInIcon,
  ZoomOutOutlined as ZoomOutIcon,
  CenterFocusStrongOutlined as CenterIcon,
  CloseOutlined as CloseIcon,
  SearchOutlined as SearchIcon,
} from '@mui/icons-material';
import { GraphData, GraphNode } from '../types';
import { apiService } from '../services/api';

interface KnowledgeGraphProps {
  height: string;
}

const makeLinkKey = (a: string, b: string) => `${a}__${b}`;

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ height }) => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightNodeIds, setHighlightNodeIds] = useState<Set<string>>(new Set());
  const [highlightLinkKeys, setHighlightLinkKeys] = useState<Set<string>>(new Set());
  const [showLabels, setShowLabels] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [activeTypes, setActiveTypes] = useState<string[]>([
    'organization',
    'person',
    'geo',
    'event',
    'entity',
  ]);
  const [onlyChinese, setOnlyChinese] = useState(false);
  const [excludeNumeric, setExcludeNumeric] = useState(false);
  const graphRef = useRef<any>();

  const loadGraphData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getGraph();
      setGraphData(data);
    } catch (err: any) {
      setError(err.message || '加载图谱数据失败');
      console.error('Error loading graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraphData();
  }, []);

  const allNodesCount = graphData.nodes.length;
  const allLinksCount = graphData.links.length;

  const filteredGraphData: GraphData = useMemo(() => {
    const active = new Set(activeTypes.map(t => t.toLowerCase()));
    const hasChinese = (text: string) => /[\u4e00-\u9fff]/.test(text);
    const isNumericLike = (text: string) => !!text && /^[0-9]+$/.test(text);

    const filteredNodes = graphData.nodes.filter(node => {
      const typeOk = active.has((node.type || 'entity').toLowerCase());
      if (!typeOk) return false;
      const name = node.name || '';
      if (onlyChinese && !hasChinese(name)) return false;
      if (excludeNumeric && isNumericLike(name)) return false;
      return true;
    });
    const allowedIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = graphData.links.filter(link => {
      const sourceId =
        typeof (link as any).source === 'object'
          ? ((link as any).source.id as string)
          : (link as any).source;
      const targetId =
        typeof (link as any).target === 'object'
          ? ((link as any).target.id as string)
          : (link as any).target;
      return allowedIds.has(String(sourceId)) && allowedIds.has(String(targetId));
    });
    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, activeTypes, onlyChinese, excludeNumeric]);

  const nodeById = useMemo(() => {
    const map = new Map<string, GraphNode>();
    filteredGraphData.nodes.forEach(node => {
      map.set(node.id, node);
    });
    return map;
  }, [filteredGraphData]);

  const adjacency = useMemo(() => {
    const map = new Map<string, { neighborId: string; linkKey: string }[]>();
    filteredGraphData.links.forEach(link => {
      const rawSource = (link as any).source;
      const rawTarget = (link as any).target;
      const sourceId =
        typeof rawSource === 'object' ? (rawSource.id as string) : (rawSource as string);
      const targetId =
        typeof rawTarget === 'object' ? (rawTarget.id as string) : (rawTarget as string);

      if (!sourceId || !targetId) return;

      const key = makeLinkKey(String(sourceId), String(targetId));

      if (!map.has(sourceId)) {
        map.set(sourceId, []);
      }
      if (!map.has(targetId)) {
        map.set(targetId, []);
      }

      map.get(sourceId)!.push({ neighborId: String(targetId), linkKey: key });
      map.get(targetId)!.push({ neighborId: String(sourceId), linkKey: key });
    });
    return map;
  }, [filteredGraphData]);

  const updateHighlightFromNode = useCallback(
    (nodeId?: string | null) => {
      if (!nodeId) {
        setHighlightNodeIds(new Set());
        setHighlightLinkKeys(new Set());
        return;
      }
      const neighbors = adjacency.get(nodeId) || [];
      const nodeIds = new Set<string>([nodeId]);
      const linkKeys = new Set<string>();

      neighbors.forEach(entry => {
        nodeIds.add(entry.neighborId);
        linkKeys.add(entry.linkKey);
      });

      setHighlightNodeIds(nodeIds);
      setHighlightLinkKeys(linkKeys);
    },
    [adjacency]
  );

  const selectedNeighbors: GraphNode[] = useMemo(() => {
    if (!selectedNode) return [];
    const entries = adjacency.get(selectedNode.id) || [];
    return entries
      .map(entry => nodeById.get(entry.neighborId))
      .filter((n): n is GraphNode => Boolean(n));
  }, [selectedNode, adjacency, nodeById]);

  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.2);
    }
  };

  const handleFocusNode = (node: GraphNode) => {
    setSelectedNode(node);
    updateHighlightFromNode(node.id);
    if (graphRef.current && (node as any).x != null && (node as any).y != null) {
      graphRef.current.centerAt((node as any).x, (node as any).y, 400);
      graphRef.current.zoom(4, 400);
    }
    setSearchDrawerOpen(false);
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.2);
    }
  };

  const handleCenter = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  };

  const handleToggleType = (type: string) => {
    setActiveTypes(prev => {
      const lower = type.toLowerCase();
      if (prev.includes(lower)) {
        // 至少保留一个类型
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== lower);
      }
      return [...prev, lower];
    });
  };

  const handleSearch = () => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      setSearchResults([]);
      setSearchDrawerOpen(false);
      updateHighlightFromNode(null);
      return;
    }

    const nodes = filteredGraphData.nodes;
    const results = nodes.filter(
      n =>
        (n.name || '').toLowerCase().includes(term) ||
        (n.description || '').toLowerCase().includes(term)
    );

    setSearchResults(results);
    setSearchDrawerOpen(results.length > 0);

    if (results.length > 0) {
      const match = results[0];
      setSelectedNode(match);
      updateHighlightFromNode(match.id);
      if (graphRef.current && (match as any).x != null && (match as any).y != null) {
        graphRef.current.centerAt((match as any).x, (match as any).y, 400);
        graphRef.current.zoom(4, 400);
      }
    } else {
      updateHighlightFromNode(null);
    }
  };

  const getNodeColor = (node: GraphNode) => {
    const colors: { [key: string]: string } = {
      organization: '#ff6b9d',
      person: '#00d4ff',
      geo: '#7b68ee',
      event: '#ffa500',
      entity: '#00e5cc',
      document: '#6366f1',
      text_unit: '#22c55e',
      community: '#f97316',
      covariate: '#a855f7',
    };
    return colors[node.type.toLowerCase()] || '#00e5cc';
  };

  const getNodeSize = (node: GraphNode) => {
    return Math.max(5, Math.min(15, node.degree / 2 + 5));
  };

  return (
    <Box
      sx={{
        height,
        position: 'relative',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          padding: 3,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.9) 70%, rgba(255,255,255,0.7) 100%)',
          borderBottom: '1px solid',
          borderColor: alpha('#111827', 0.06),
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#0f172a', mb: 0.5 }}>
              知识图谱
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              实体关系可视化 · 支持搜索、过滤和邻居高亮
            </Typography>
          </Box>

          {/* Controls + Search */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="刷新">
                <IconButton
                  onClick={loadGraphData}
                  sx={{
                    backgroundColor: alpha('#2563eb', 0.06),
                    color: '#2563eb',
                    '&:hover': {
                      backgroundColor: alpha('#2563eb', 0.12),
                    },
                  }}
                  size="small"
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="放大">
                <IconButton
                  onClick={handleZoomIn}
                  sx={{
                    backgroundColor: alpha('#2563eb', 0.06),
                    color: '#2563eb',
                    '&:hover': {
                      backgroundColor: alpha('#2563eb', 0.12),
                    },
                  }}
                  size="small"
                >
                  <ZoomInIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="缩小">
                <IconButton
                  onClick={handleZoomOut}
                  sx={{
                    backgroundColor: alpha('#2563eb', 0.06),
                    color: '#2563eb',
                    '&:hover': {
                      backgroundColor: alpha('#2563eb', 0.12),
                    },
                  }}
                  size="small"
                >
                  <ZoomOutIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="居中">
                <IconButton
                  onClick={handleCenter}
                  sx={{
                    backgroundColor: alpha('#2563eb', 0.06),
                    color: '#2563eb',
                    '&:hover': {
                      backgroundColor: alpha('#2563eb', 0.12),
                    },
                  }}
                  size="small"
                >
                  <CenterIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <TextField
              size="small"
              placeholder="搜索节点名称或描述..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              InputProps={{
                sx: { minWidth: 220 },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleSearch}>
                      <SearchIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={showLabels}
                    onChange={e => setShowLabels(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    始终显示标签
                  </Typography>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={onlyChinese}
                    onChange={e => setOnlyChinese(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    仅中文节点
                  </Typography>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={excludeNumeric}
                    onChange={e => setExcludeNumeric(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    排除纯数字
                  </Typography>
                }
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Graph */}
      {loading ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            gap: 2,
          }}
        >
          <CircularProgress sx={{ color: '#00d4ff' }} />
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            加载图谱数据...
          </Typography>
        </Box>
      ) : error ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}
        >
          <Typography variant="body1" color="error">
            {error}
          </Typography>
        </Box>
      ) : (
        <ForceGraph2D
          ref={graphRef}
          graphData={filteredGraphData}
          nodeLabel={(node: any) => `${node.name}\n${node.description.substring(0, 100)}...`}
          nodeColor={(node: any) => {
            const baseColor = getNodeColor(node);
            if (!highlightNodeIds.size || highlightNodeIds.has(node.id)) {
              return baseColor;
            }
            return alpha(baseColor, 0.25);
          }}
          nodeVal={(node: any) => getNodeSize(node)}
          nodeCanvasObjectMode={() => 'after'}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Draw node circle with glow
            const size = getNodeSize(node);
            const color = getNodeColor(node);

            // Glow effect
            const isHighlighted = !highlightNodeIds.size || highlightNodeIds.has(node.id);
            const drawColor = isHighlighted ? color : alpha(color, 0.25);

            ctx.shadowBlur = isHighlighted ? 10 : 0;
            ctx.shadowColor = alpha(drawColor, 0.6);
            ctx.fillStyle = drawColor;
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Label
            if (showLabels || globalScale > 1.2) {
              ctx.fillStyle = '#111827';
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 3;
              ctx.strokeText(label, node.x, node.y + size + fontSize + 2);
              ctx.fillText(label, node.x, node.y + size + fontSize + 2);
            }
          }}
          linkColor={(link: any) => {
            const rawSource = link.source;
            const rawTarget = link.target;
            const sourceId =
              typeof rawSource === 'object' ? (rawSource.id as string) : (rawSource as string);
            const targetId =
              typeof rawTarget === 'object' ? (rawTarget.id as string) : (rawTarget as string);
            const key = makeLinkKey(String(sourceId), String(targetId));
            const isHighlighted =
              !highlightLinkKeys.size || highlightLinkKeys.has(key) || highlightLinkKeys.has(makeLinkKey(String(targetId), String(sourceId)));
            return isHighlighted ? alpha('#2563eb', 0.6) : alpha('#9ca3af', 0.2);
          }}
          linkWidth={1.5}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={() => alpha('#2563eb', 0.6)}
          backgroundColor="#ffffff"
          onNodeClick={(node: any) => {
            const graphNode = node as GraphNode;
            setSelectedNode(graphNode);
            updateHighlightFromNode(graphNode.id);
          }}
          onNodeHover={(node: any) => {
            const graphNode = node as GraphNode | null;
            updateHighlightFromNode(graphNode ? graphNode.id : null);
          }}
          d3VelocityDecay={0.3}
        />
      )}

      {/* Stats Panel */}
      <Paper
        elevation={0}
        sx={{
          position: 'absolute',
          top: 100,
          right: 24,
          padding: 2,
          backgroundColor: alpha('#ffffff', 0.95),
          border: '1px solid',
          borderColor: alpha('#111827', 0.08),
          boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
        }}
      >
        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
          统计信息
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              节点
            </Typography>
            <Typography variant="caption" sx={{ color: '#2563eb', fontWeight: 600 }}>
              {filteredGraphData.nodes.length} / {allNodesCount}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              关系
            </Typography>
            <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 600 }}>
              {filteredGraphData.links.length} / {allLinksCount}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Legend */}
      <Paper
        elevation={0}
        sx={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          padding: 2,
          backgroundColor: alpha('#ffffff', 0.95),
          border: '1px solid',
          borderColor: alpha('#111827', 0.08),
          boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
        }}
      >
        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
          图层过滤
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {[
            { type: 'organization', label: '组织', color: '#ff6b9d' },
            { type: 'person', label: '人物', color: '#00d4ff' },
            { type: 'geo', label: '地点', color: '#7b68ee' },
            { type: 'event', label: '事件', color: '#ffa500' },
            { type: 'entity', label: '其他实体', color: '#00e5cc' },
            { type: 'document', label: '文档', color: '#6366f1' },
            { type: 'text_unit', label: 'Text Unit', color: '#22c55e' },
            { type: 'community', label: '社区', color: '#f97316' },
            { type: 'covariate', label: '协变量', color: '#a855f7' },
          ].map(item => (
            <Chip
              key={item.type}
              label={item.label}
              size="small"
              sx={{
                backgroundColor: activeTypes.includes(item.type)
                  ? alpha(item.color, 0.2)
                  : alpha('#e5e7eb', 0.6),
                color: activeTypes.includes(item.type) ? item.color : '#6b7280',
                border: '1px solid',
                borderColor: activeTypes.includes(item.type)
                  ? alpha(item.color, 0.6)
                  : '#e5e7eb',
                fontSize: '11px',
                height: 24,
              }}
              variant={activeTypes.includes(item.type) ? 'filled' : 'outlined'}
              onClick={() => handleToggleType(item.type)}
            />
          ))}
        </Box>
      </Paper>

      {/* Search Drawer */}
      <Drawer
        anchor="right"
        open={searchDrawerOpen}
        onClose={() => setSearchDrawerOpen(false)}
        sx={{ zIndex: 1300 }}
      >
        <Box sx={{ width: 320, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1">搜索结果</Typography>
            <IconButton size="small" onClick={() => setSearchDrawerOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 1 }} />
          {searchResults.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              没有匹配的节点
            </Typography>
          ) : (
            <List dense>
              {searchResults.map(node => (
                <ListItemButton
                  key={node.id}
                  onClick={() => handleFocusNode(node)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {node.name || node.id}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        类型: {node.type} · 连接数: {node.degree}
                      </Typography>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </Drawer>

      {/* Detail Drawer */}
      <Drawer
        anchor="bottom"
        open={!!selectedNode}
        onClose={() => setSelectedNode(null)}
        sx={{ zIndex: 1250 }}
      >
        {selectedNode && (
          <Box
            sx={{
              p: 2.5,
              borderTop: '1px solid',
              borderColor: alpha('#111827', 0.08),
              maxHeight: '40vh',
              overflowY: 'auto',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 600 }}>
                {selectedNode.name}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setSelectedNode(null)}
                sx={{
                  color: '#9ca3af',
                  '&:hover': {
                    color: '#111827',
                  },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            <Chip
              label={selectedNode.type}
              size="small"
              sx={{
                backgroundColor: alpha(getNodeColor(selectedNode), 0.2),
                color: getNodeColor(selectedNode),
                border: '1px solid',
                borderColor: alpha(getNodeColor(selectedNode), 0.3),
                mb: 1.5,
              }}
            />

            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
              连接数: {selectedNode.degree}
            </Typography>

            <Typography variant="body2" sx={{ color: '#111827', lineHeight: 1.6, mt: 1 }}>
              {selectedNode.description}
            </Typography>

            {selectedNeighbors.length > 0 && (
              <>
                <Typography
                  variant="caption"
                  sx={{ color: '#6b7280', display: 'block', mt: 2, mb: 0.5 }}
                >
                  相关节点
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selectedNeighbors.map(neighbor => (
                    <Chip
                      key={neighbor.id}
                      label={neighbor.name || neighbor.id}
                      size="small"
                      sx={{
                        backgroundColor: alpha(getNodeColor(neighbor), 0.12),
                        color: getNodeColor(neighbor),
                        border: '1px solid',
                        borderColor: alpha(getNodeColor(neighbor), 0.4),
                      }}
                      onClick={() => handleFocusNode(neighbor)}
                    />
                  ))}
                </Box>
              </>
            )}
          </Box>
        )}
      </Drawer>
    </Box>
  );
};

export default KnowledgeGraph;
