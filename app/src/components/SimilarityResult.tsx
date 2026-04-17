import { Box, LinearProgress, Typography, Paper, Chip, Stack } from '@mui/material';

interface CompareResult {
  phrase1: string;
  phrase2: string;
  model: string;
  dimensions: number;
  similarity: number;
}

interface SimilarityResultProps {
  result: CompareResult;
}

function getSimilarityLabel(score: number): { label: string; color: 'success' | 'warning' | 'error' | 'info' } {
  if (score >= 0.9) return { label: 'Nearly identical', color: 'success' };
  if (score >= 0.7) return { label: 'Very similar', color: 'success' };
  if (score >= 0.5) return { label: 'Somewhat similar', color: 'info' };
  if (score >= 0.3) return { label: 'Loosely related', color: 'warning' };
  return { label: 'Not very similar', color: 'error' };
}

export default function SimilarityResult({ result }: SimilarityResultProps) {
  const percentage = Math.max(0, result.similarity * 100);
  const { label, color } = getSimilarityLabel(result.similarity);

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" color="primary" sx={{ fontFamily: 'monospace' }}>
          {(result.similarity * 100).toFixed(2)}%
        </Typography>
        <Chip label={label} color={color} variant="outlined" />
      </Stack>

      <LinearProgress
        variant="determinate"
        value={percentage}
        color={color}
        sx={{ height: 10, borderRadius: 5, mb: 2 }}
      />

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <Chip label={result.model} size="small" variant="outlined" />
        <Chip label={`${result.dimensions} dimensions`} size="small" variant="outlined" />
      </Stack>

      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Paper variant="outlined" sx={{ flex: 1, p: 1.5, minWidth: 200 }}>
          <Typography variant="caption" color="text.secondary">Phrase 1</Typography>
          <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
            {result.phrase1}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ flex: 1, p: 1.5, minWidth: 200 }}>
          <Typography variant="caption" color="text.secondary">Phrase 2</Typography>
          <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
            {result.phrase2}
          </Typography>
        </Paper>
      </Box>
    </Paper>
  );
}
