import React, { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import SettingsPage from './components/SettingsPage';

// Global MUI theme: light mode with white as the base background,
// and softer blue accents to move away from the GraphRAG Studio dark style.
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb', // blue-600
      light: '#60a5fa',
      dark: '#1d4ed8',
    },
    secondary: {
      main: '#14b8a6', // teal-500
      light: '#5eead4',
      dark: '#0f766e',
    },
    background: {
      default: '#f3f4f6', // app background
      paper: '#ffffff', // cards / panels
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
    },
    divider: 'rgba(15, 23, 42, 0.06)',
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          fontWeight: 600,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 6px 18px rgba(37, 99, 235, 0.25)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
        },
      },
    },
  },
});

const DRAWER_WIDTH = 260;

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState<'home' | 'settings'>('home');

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handlePageChange = (page: 'home' | 'settings') => {
    setCurrentPage(page);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'background.default' }}>
        <Sidebar
          open={sidebarOpen}
          onToggle={handleToggleSidebar}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: `calc(100% - ${sidebarOpen ? DRAWER_WIDTH : 0}px)`,
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            overflow: 'hidden',
          }}
        >
          {currentPage === 'home' ? <HomePage /> : <SettingsPage />}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
