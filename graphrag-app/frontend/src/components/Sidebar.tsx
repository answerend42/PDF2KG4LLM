import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Typography,
  alpha,
} from '@mui/material';
import {
  HomeOutlined as HomeIcon,
  SettingsOutlined as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  Menu as MenuIcon,
  AutoGraphOutlined as GraphIcon,
} from '@mui/icons-material';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  currentPage: 'home' | 'settings';
  onPageChange: (page: 'home' | 'settings') => void;
}

const DRAWER_WIDTH = 260;

const Sidebar: React.FC<SidebarProps> = ({ open, onToggle, currentPage, onPageChange }) => {
  return (
    <>
      {/* Toggle button when closed */}
      {!open && (
        <IconButton
          onClick={onToggle}
          sx={{
            position: 'fixed',
            left: 16,
            top: 16,
            zIndex: 1200,
            backgroundColor: '#ffffff',
            borderRadius: 2,
            border: '1px solid',
            borderColor: alpha('#111827', 0.08),
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
            '&:hover': {
              backgroundColor: '#f9fafb',
              borderColor: alpha('#2563eb', 0.4),
            },
          }}
        >
          <MenuIcon sx={{ color: '#2563eb' }} />
        </IconButton>
      )}

      {/* Drawer */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          width: open ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: '#ffffff',
            borderRight: '1px solid',
            borderColor: alpha('#111827', 0.08),
            boxShadow: '0 0 30px rgba(15, 23, 42, 0.04)',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 3,
            minHeight: 80,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #2563eb 0%, #22c55e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(37, 99, 235, 0.28)',
              }}
            >
              <GraphIcon sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                GraphRAG
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                知识图谱助手
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onToggle}
            sx={{
              color: '#9ca3af',
              '&:hover': {
                color: '#2563eb',
                backgroundColor: alpha('#2563eb', 0.06),
              },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        </Box>

        {/* Navigation */}
        <List sx={{ padding: 2, paddingTop: 0 }}>
          <ListItem disablePadding sx={{ marginBottom: 1 }}>
            <ListItemButton
              selected={currentPage === 'home'}
              onClick={() => onPageChange('home')}
              sx={{
                borderRadius: 3,
                padding: '12px 16px',
                '&.Mui-selected': {
                  backgroundColor: alpha('#2563eb', 0.08),
                  border: '1px solid',
                  borderColor: alpha('#2563eb', 0.4),
                  '&:hover': {
                    backgroundColor: alpha('#2563eb', 0.12),
                  },
                  '& .MuiListItemIcon-root': {
                    color: '#2563eb',
                  },
                  '& .MuiListItemText-primary': {
                    color: '#1d4ed8',
                    fontWeight: 600,
                  },
                },
                '&:hover': {
                  backgroundColor: '#f3f4f6',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: '#9ca3af' }}>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText
                primary="主页面"
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: '15px',
                    fontWeight: currentPage === 'home' ? 600 : 400,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton
              selected={currentPage === 'settings'}
              onClick={() => onPageChange('settings')}
              sx={{
                borderRadius: 3,
                padding: '12px 16px',
                '&.Mui-selected': {
                  backgroundColor: alpha('#2563eb', 0.08),
                  border: '1px solid',
                  borderColor: alpha('#2563eb', 0.4),
                  '&:hover': {
                    backgroundColor: alpha('#2563eb', 0.12),
                  },
                  '& .MuiListItemIcon-root': {
                    color: '#2563eb',
                  },
                  '& .MuiListItemText-primary': {
                    color: '#1d4ed8',
                    fontWeight: 600,
                  },
                },
                '&:hover': {
                  backgroundColor: '#f3f4f6',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: '#9ca3af' }}>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText
                primary="设置"
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: '15px',
                    fontWeight: currentPage === 'settings' ? 600 : 400,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>

        {/* Footer */}
        <Box
          sx={{
            marginTop: 'auto',
            padding: 3,
            borderTop: '1px solid',
            borderColor: alpha('#111827', 0.06),
          }}
        >
          <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mb: 0.5 }}>
            版本 1.1.0
          </Typography>
          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
            Powered by GraphRAG
          </Typography>
        </Box>
      </Drawer>
    </>
  );
};

export default Sidebar;
