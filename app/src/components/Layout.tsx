import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  Link,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import SchoolIcon from '@mui/icons-material/School';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useHealthStatus } from '../hooks/useHealthStatus';

const navItems = [
  { label: 'Playground', path: '/', icon: <ScienceIcon /> },
  { label: 'Learn', path: '/learn', icon: <SchoolIcon /> },
  { label: 'History', path: '/history', icon: <HistoryIcon /> },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isHealthy, isLoading, version } = useHealthStatus();

  const tabIndex = navItems.findIndex((item) => item.path === location.pathname);
  const [value, setValue] = useState(tabIndex >= 0 ? tabIndex : 0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    navigate(navItems[newValue].path);
  };

  const renderHealthStatus = () => {
    if (isLoading) {
      return (
        <Chip
          icon={<CircularProgress size={14} color="inherit" />}
          label="Checking..."
          size="small"
          variant="outlined"
        />
      );
    }

    if (!isHealthy) {
      return (
        <Chip
          icon={<ErrorIcon />}
          label="API Offline"
          size="small"
          color="error"
        />
      );
    }

    return (
      <Chip
        icon={<CheckCircleIcon />}
        label={version ? `API v${version}` : 'API Online'}
        size="small"
        color="success"
        variant="outlined"
      />
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="transparent" elevation={0}
        sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Toolbar>
          <Typography variant="h5" component="div"
            sx={{ mr: 4, cursor: 'pointer', color: 'primary.main' }}
            onClick={() => { setValue(0); navigate('/'); }}>
            Vector Playground
          </Typography>
          <Tabs value={value} onChange={handleTabChange}
            textColor="primary" indicatorColor="primary"
            sx={{ flexGrow: 1 }}>
            {navItems.map((item) => (
              <Tab key={item.path} icon={item.icon} label={item.label}
                iconPosition="start" sx={{ minHeight: 64 }} />
            ))}
          </Tabs>
          {renderHealthStatus()}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ flex: 1, py: 4 }}>
        <Outlet />
      </Container>

      <Box component="footer"
        sx={{ py: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Stack direction="row" justifyContent="center" alignItems="center" spacing={1.5}>
          <Link href="https://crankingai.com" target="_blank" rel="noopener">
            <Box
              component="img"
              src="/crankingai-logo.svg"
              alt="Cranking AI"
              sx={{ height: 28, verticalAlign: 'middle' }}
            />
          </Link>
          <Link
            href="https://github.com/CrankingAI/vectorplayground"
            target="_blank"
            rel="noopener"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
          >
            <GitHubIcon fontSize="small" />
            <Typography variant="body2">Source</Typography>
          </Link>
        </Stack>
      </Box>
    </Box>
  );
}
