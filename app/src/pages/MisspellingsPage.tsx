import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SimilarityResult from '../components/SimilarityResult';
import { useCompare, type MultiModelResult } from '../hooks/useCompare';
import { ALL_MODEL_IDS } from '../data/models';
import { CONFUSABLE_GROUPS } from '../data/presets';
import { generateMisspellings } from '../utils/misspellings';

interface Suggestion {
  id: string;
  p1: string;
  p2: string;
}

export default function MisspellingsPage() {
  const [seed, setSeed] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [results, setResults] = useState<MultiModelResult[]>([]);
  const { compareAcrossModels, loading, error } = useCompare();

  const runPair = async (p1: string, p2: string) => {
    const a = p1.trim();
    const b = p2.trim();
    if (!a || !b) return;
    const r = await compareAcrossModels(a, b, ALL_MODEL_IDS);
    if (r) setResults((prev) => [r, ...prev]);
  };

  const handleSuggest = () => {
    const word = seed.trim();
    if (!word) return;
    const variants = generateMisspellings(word, 6);
    if (variants.length === 0) {
      setSuggestions([]);
      return;
    }
    setSuggestions(
      variants.map((v, i) => ({ id: `${word}-${i}-${v}`, p1: word, p2: v })),
    );
  };

  const handleSuggestKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSuggest();
    }
  };

  const updateSuggestion = (id: string, side: 'p1' | 'p2', value: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [side]: value } : s)),
    );
  };

  const removeSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const compareAll = async () => {
    await Promise.all(suggestions.map((s) => runPair(s.p1, s.p2)));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Confusables
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Compare a word or short phrase against its <strong>misspellings and other confusables</strong>{' '}
        — typos, homophones, look-alikes, and easily-mixed-up phrases — across all three embedding
        models. Embeddings often treat these as near-identical to the intended form.
      </Typography>

      {CONFUSABLE_GROUPS.map((group) => (
        <Box key={group.label} sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            {group.label}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Click a pair to compare it across all models.
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
              gap: 2,
            }}
          >
            {group.items.map((item) => (
              <Card key={`${group.label}-${item.p1}-${item.p2}`} variant="outlined">
                <CardActionArea onClick={() => runPair(item.p1, item.p2)} disabled={loading}>
                  <CardContent>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                      {item.p1}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">vs</Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                      {item.p2}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </Box>
      ))}

      <Typography variant="h6" gutterBottom>
        Suggest comparisons
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Type a word to get suggested misspellings (ie/ei swaps, double letters, transpositions,
        vowel substitutions). Edit either side before clicking Compare, or run them all at once.
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              label="Word"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              onKeyDown={handleSuggestKeyDown}
              placeholder="necessary"
              fullWidth
            />
            <Button
              variant="contained"
              size="large"
              onClick={handleSuggest}
              disabled={!seed.trim()}
              startIcon={<AutoFixHighIcon />}
              sx={{ minWidth: 200 }}
            >
              Suggest
            </Button>
          </Stack>

          {suggestions.length > 0 && (
            <Stack spacing={2} sx={{ mt: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {suggestions.length} draft{suggestions.length === 1 ? '' : 's'} — edit either
                  side, then Compare.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={compareAll}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : <CompareArrowsIcon />}
                >
                  Compare all
                </Button>
              </Stack>
              {suggestions.map((s) => (
                <Stack
                  key={s.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems="center"
                >
                  <TextField
                    value={s.p1}
                    onChange={(e) => updateSuggestion(s.id, 'p1', e.target.value)}
                    size="small"
                    fullWidth
                    inputProps={{ style: { fontFamily: 'monospace' } }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                    vs
                  </Typography>
                  <TextField
                    value={s.p2}
                    onChange={(e) => updateSuggestion(s.id, 'p2', e.target.value)}
                    size="small"
                    fullWidth
                    inputProps={{ style: { fontFamily: 'monospace' } }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => runPair(s.p1, s.p2)}
                    disabled={loading || !s.p1.trim() || !s.p2.trim()}
                    startIcon={<CompareArrowsIcon />}
                    sx={{ minWidth: 120 }}
                  >
                    Compare
                  </Button>
                  <Tooltip title="Remove">
                    <IconButton size="small" onClick={() => removeSuggestion(s.id)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {results.map((result, i) => (
        <SimilarityResult key={`${result.phrase1}-${result.phrase2}-${i}`} result={result} />
      ))}
    </Box>
  );
}
