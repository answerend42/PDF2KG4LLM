import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Breadcrumbs,
  Link,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  NavigateNext as NavigateNextIcon,
  Close as CloseIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { FileItem } from '../types';
import { apiService } from '../services/api';

interface FileBrowserProps {
  open: boolean;
  onClose: () => void;
}

const FileBrowser: React.FC<FileBrowserProps> = ({ open, onClose }) => {
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      const data = await apiService.listFiles(path);
      setItems(data.items);
      setCurrentPath(data.current_path);
    } catch (error) {
      console.error('Error loading directory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadDirectory('');
    }
  }, [open]);

  const handleItemClick = async (item: FileItem) => {
    if (item.type === 'directory') {
      loadDirectory(item.path);
    } else {
      // Load file content
      setSelectedFile(item.path);
      setLoadingContent(true);
      try {
        const data = await apiService.readFile(item.path);
        setFileContent(data.content);
      } catch (error: any) {
        setFileContent(`Error: ${error.message || 'Failed to load file'}`);
      } finally {
        setLoadingContent(false);
      }
    }
  };

  const handleBreadcrumbClick = (path: string) => {
    loadDirectory(path);
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const pathSegments = currentPath ? currentPath.split('/').filter(Boolean) : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">文件浏览器 - 数据目录</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ minHeight: 400 }}>
          {/* Breadcrumbs */}
          <Paper sx={{ padding: 2, marginBottom: 2, backgroundColor: '#f5f5f5' }}>
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
              <Link
                component="button"
                variant="body2"
                onClick={() => handleBreadcrumbClick('')}
                underline="hover"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <HomeIcon fontSize="small" />
                数据根目录
              </Link>
              {pathSegments.map((segment, index) => {
                const path = pathSegments.slice(0, index + 1).join('/');
                const isLast = index === pathSegments.length - 1;
                return isLast ? (
                  <Typography key={path} color="text.primary" variant="body2">
                    {segment}
                  </Typography>
                ) : (
                  <Link
                    key={path}
                    component="button"
                    variant="body2"
                    onClick={() => handleBreadcrumbClick(path)}
                    underline="hover"
                  >
                    {segment}
                  </Link>
                );
              })}
            </Breadcrumbs>
          </Paper>

          {/* File list */}
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 300,
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Left: File list */}
              <Paper sx={{ flex: 1, maxHeight: 500, overflow: 'auto' }}>
                <List dense>
                  {items.length === 0 ? (
                    <ListItem>
                      <ListItemText primary="目录为空" secondary="没有文件或文件夹" />
                    </ListItem>
                  ) : (
                    items.map(item => (
                      <ListItemButton key={item.path} onClick={() => handleItemClick(item)}>
                        <ListItemIcon>
                          {item.type === 'directory' ? (
                            <FolderIcon color="primary" />
                          ) : (
                            <FileIcon color="action" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.name}
                          secondary={
                            item.type === 'file' ? (
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Typography variant="caption">{formatFileSize(item.size)}</Typography>
                                {item.extension && (
                                  <Chip label={item.extension} size="small" variant="outlined" />
                                )}
                              </Box>
                            ) : null
                          }
                        />
                      </ListItemButton>
                    ))
                  )}
                </List>
              </Paper>

              {/* Right: File preview */}
              {selectedFile && (
                <Paper
                  sx={{
                    flex: 1,
                    padding: 2,
                    maxHeight: 500,
                    overflow: 'auto',
                    backgroundColor: '#f9f9f9',
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    文件预览: {selectedFile}
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      marginTop: 1,
                      padding: 2,
                      backgroundColor: '#fff',
                      borderRadius: 1,
                      overflow: 'auto',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {loadingContent ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      fileContent
                    )}
                  </Box>
                </Paper>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default FileBrowser;
