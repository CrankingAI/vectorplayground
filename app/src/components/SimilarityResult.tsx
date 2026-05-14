import { Box, LinearProgress, Typography, Paper, Chip, Stack, Alert, Tooltip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { CompareResult, MultiModelResult, ModelComparison } from '../hooks/useCompare';
import { getModelLabel, getSimilarityInfo } from '../data/models';

const ADA_MODEL_ID = 'text-embedding-ada-002';
const ADA_BASELINE_NOTE =
  'Ada 002 is anisotropic: unrelated pairs typically score ~0.75 in this model. Read this score relative to that baseline, not as an absolute percentage. See the Learn tab for details.';

interface SimilarityResultProps {
  result: CompareResult | MultiModelResult;
}

function isMultiModel(r: CompareResult | MultiModelResult): r is MultiModelResult {
  return Array.isArray((r as MultiModelResult).perModel);
}

function AdaBaselineHint() {
  return (
    <Tooltip title={ADA_BASELINE_NOTE} arrow placement="top">
      <IconButton size="small" sx={{ p: 0.25 }} aria-label="Ada 002 baseline note">
        <InfoOutlinedIcon fontSize="inherit" color="warning" />
      </IconButton>
    </Tooltip>
  );
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
  const { label, color } = getSimilarityInfo(similarity, row.model);
  const isAda = row.model === ADA_MODEL_ID;
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{getModelLabel(row.model)}</Typography>
          {row.dimensions !== undefined && (
            <Typography variant="caption" color="text.secondary">{row.dimensions}d</Typography>
          )}
          {isAda && <AdaBaselineHint />}
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
  const { label, color } = getSimilarityInfo(result.similarity, result.model);
  const isAda = result.model === ADA_MODEL_ID;

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

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip label={getModelLabel(result.model)} size="small" variant="outlined" />
        <Chip label={`${result.dimensions} dimensions`} size="small" variant="outlined" />
        {isAda && <AdaBaselineHint />}
      </Stack>

      <PhrasePair phrase1={result.phrase1} phrase2={result.phrase2} />
    </Paper>
  );
}
