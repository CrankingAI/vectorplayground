import { Box, LinearProgress, Typography, Paper, Chip, Stack, Alert } from '@mui/material';
import type { CompareResult, MultiModelResult, ModelComparison } from '../hooks/useCompare';
import { getModelLabel } from '../data/models';

type SimilarityColor = 'success' | 'warning' | 'error' | 'info';

interface SimilarityResultProps {
  result: CompareResult | MultiModelResult;
}

function isMultiModel(r: CompareResult | MultiModelResult): r is MultiModelResult {
  return Array.isArray((r as MultiModelResult).perModel);
}

function getSimilarityInfo(score: number): { label: string; color: SimilarityColor } {
  if (score >= 0.9) return { label: 'Nearly identical', color: 'success' };
  if (score >= 0.7) return { label: 'Very similar', color: 'success' };
  if (score >= 0.5) return { label: 'Somewhat similar', color: 'info' };
  if (score >= 0.3) return { label: 'Loosely related', color: 'warning' };
  return { label: 'Not very similar', color: 'error' };
}

function PhrasePair({ phrase1, phrase2 }: { phrase1: string; phrase2: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <Paper variant="outlined" sx={{ flex: 1, p: 1.5, minWidth: 200 }}>
        <Typography variant="caption" color="text.secondary">Phrase 1</Typography>
        <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
          {phrase1}
        </Typography>
      </Paper>
      <Paper variant="outlined" sx={{ flex: 1, p: 1.5, minWidth: 200 }}>
        <Typography variant="caption" color="text.secondary">Phrase 2</Typography>
        <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
          {phrase2}
        </Typography>
      </Paper>
    </Box>
  );
}

function ModelRow({ row }: { row: ModelComparison }) {
  if (row.error !== undefined) {
    return (
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{getModelLabel(row.model)}</Typography>
          <Chip label="Failed" color="error" size="small" variant="outlined" />
        </Stack>
        <Alert severity="error" sx={{ py: 0.5 }}>{row.error}</Alert>
      </Box>
    );
  }
  const similarity = row.similarity ?? 0;
  const percentage = Math.max(0, similarity * 100);
  const { label, color } = getSimilarityInfo(similarity);
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{getModelLabel(row.model)}</Typography>
          {row.dimensions !== undefined && (
            <Typography variant="caption" color="text.secondary">{row.dimensions}d</Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="body2" sx={{ fontFamily: 'monospace', minWidth: 60, textAlign: 'right' }}>
            {(similarity * 100).toFixed(2)}%
          </Typography>
          <Chip label={label} color={color} size="small" variant="outlined" />
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percentage}
        color={color}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
}

export default function SimilarityResult({ result }: SimilarityResultProps) {
  if (isMultiModel(result)) {
    return (
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="overline" color="text.secondary">All models</Typography>
        <Box sx={{ mb: 2 }}>
          <PhrasePair phrase1={result.phrase1} phrase2={result.phrase2} />
        </Box>
        <Stack spacing={2}>
          {result.perModel.map((row) => (
            <ModelRow key={row.model} row={row} />
          ))}
        </Stack>
      </Paper>
    );
  }

  const percentage = Math.max(0, result.similarity * 100);
  const { label, color } = getSimilarityInfo(result.similarity);

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

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip label={getModelLabel(result.model)} size="small" variant="outlined" />
        <Chip label={`${result.dimensions} dimensions`} size="small" variant="outlined" />
      </Stack>

      <PhrasePair phrase1={result.phrase1} phrase2={result.phrase2} />
    </Paper>
  );
}
