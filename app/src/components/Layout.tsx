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
import GitHubIcon from '@mui/icons-material/GitHub';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useHealthStatus } from '../hooks/useHealthStatus';

const navItems = [
  { label: 'Playground', path: '/', icon: <ScienceIcon /> },
  { label: 'Learn', path: '/learn', icon: <SchoolIcon /> },
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
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="center"
          alignItems="center"
          spacing={{ xs: 1, sm: 1.5 }}
        >
          <Link href="https://crankingai.com" target="_blank" rel="noopener">
            <Box
              component="img"
              src="/crankingai-logo.svg"
              alt="Cranking AI"
              sx={{ height: 28, verticalAlign: 'middle' }}
            />
          </Link>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Open-source embedding playground.
          </Typography>
          <Link
            href="https://github.com/CrankingAI/vectorplayground"
            target="_blank"
            rel="noopener"
            aria-label="View Vector Playground source on GitHub"
            underline="none"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.75,
              borderRadius: '999px',
              border: '1px solid rgba(124, 77, 255, 0.24)',
              backgroundColor: 'rgba(124, 77, 255, 0.08)',
              color: 'text.primary',
              fontWeight: 600,
              lineHeight: 1,
              transition: 'background-color 160ms ease, border-color 160ms ease, transform 160ms ease, color 160ms ease',
              '&:hover': {
                backgroundColor: 'rgba(124, 77, 255, 0.16)',
                borderColor: 'rgba(124, 77, 255, 0.42)',
                color: 'primary.light',
                transform: 'translateY(-1px)',
              },
            }}
          >
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
              }}
            >
              <GitHubIcon sx={{ fontSize: 16 }} />
            </Box>
            <Box component="span">View source</Box>
          </Link>
        </Stack>
      </Box>
    </Box>
  );
}
