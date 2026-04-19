import { Box, Link, Paper, Typography } from '@mui/material';

export default function HistoryPage() {
  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        A Bit of History
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Vector Playground is a new generation of what used to live at{' '}
        <Link href="https://funwithvectors.com" target="_blank" rel="noopener">
          funwithvectors.com
        </Link>
        .
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, display: 'inline-block' }}>
        <Box
          component="img"
          src="/funwithvectors-screenshot.png"
          alt="Screenshot of the original Fun with Vectors app"
          sx={{ display: 'block', maxWidth: '100%', height: 'auto', borderRadius: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          The original <em>Fun with Vectors</em> &mdash; preserved for posterity.
        </Typography>
      </Paper>
    </Box>
  );
}
