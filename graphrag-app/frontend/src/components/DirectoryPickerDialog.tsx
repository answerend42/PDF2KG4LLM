import React, { useEffect, useState } from 'react';
import {
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  Folder as FolderIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { FileItem } from '../types';
import { apiService } from '../services/api';

interface DirectoryPickerDialogProps {
  open: boolean;
  initialPath?: string;
  title?: string;
  onClose: () => void;
  onSelect: (path: string) => void;
}

const DirectoryPickerDialog: React.FC<DirectoryPickerDialogProps> = ({
  open,
  initialPath = '',
  title = '选择目录',
  onClose,
  onSelect,
}) => {
  const [currentPath, setCurrentPath] = useState<string>(initialPath || '');
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      const data = await apiService.listFiles(path);
      // Only keep directories for selection
      setItems(data.items.filter(item => item.type === 'directory'));
      setCurrentPath(data.current_path);
    } catch (error) {
      console.error('Error loading directory for picker:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      const startPath = initialPath || '';
      setCurrentPath(startPath);
      loadDirectory(startPath);
    }
  }, [open, initialPath]);

  const handleBreadcrumbClick = (path: string) => {
    loadDirectory(path);
  };

  const handleDirClick = (item: FileItem) => {
    if (item.type === 'directory') {
      loadDirectory(item.path);
    }
  };

  const handleConfirm = () => {
    onSelect(currentPath || '');
  };

  const pathSegments = currentPath ? currentPath.split('/').filter(Boolean) : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
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
        </Box>

        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 240,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
            <List dense>
              {items.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                  此目录下没有子目录
                </Typography>
              ) : (
                items.map(item => (
                  <ListItemButton key={item.path} onClick={() => handleDirClick(item)}>
                    <ListItemIcon>
                      <FolderIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={item.name} />
                  </ListItemButton>
                ))
              )}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleConfirm}>
          选择当前目录
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DirectoryPickerDialog;

