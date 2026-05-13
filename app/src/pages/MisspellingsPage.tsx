import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SimilarityResult from '../components/SimilarityResult';
import { useCompare, type MultiModelResult } from '../hooks/useCompare';
import { ALL_MODEL_IDS } from '../data/models';
import { MISSPELLING_PRESETS } from '../data/presets';
import { generateMisspellings } from '../utils/misspellings';

export default function MisspellingsPage() {
  const [seed, setSeed] = useState('');
  const [results, setResults] = useState<MultiModelResult[]>([]);
  const { compareAcrossModels, loading, error } = useCompare();

  const runPair = async (p1: string, p2: string) => {
    const r = await compareAcrossModels(p1, p2, ALL_MODEL_IDS);
    if (r) setResults((prev) => [r, ...prev]);
  };

  const handleGenerate = async () => {
    const word = seed.trim();
    if (!word) return;
    const variants = generateMisspellings(word, 6);
    if (variants.length === 0) return;
    await Promise.all(variants.map((v) => runPair(word, v)));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Similarly-Spelled Words
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Compare a word against its common misspellings across all three embedding models.
        Strong embeddings should treat a word and its near-typos as highly similar.
      </Typography>

      <Typography variant="h6" gutterBottom>
        Common pairs
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Click a pair to compare it across all models.
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
          gap: 2,
          mb: 4,
        }}
      >
        {MISSPELLING_PRESETS.map((item) => (
          <Card key={`${item.p1}-${item.p2}`} variant="outlined">
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

      <Typography variant="h6" gutterBottom>
        Generate variants
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter a word to auto-generate common misspellings (ie/ei swaps, double letters,
        transpositions, vowel substitutions) and compare each against the original.
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              label="Word"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="necessary"
              fullWidth
            />
            <Button
              variant="contained"
              size="large"
              onClick={handleGenerate}
              disabled={loading || !seed.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
              sx={{ minWidth: 200 }}
            >
              {loading ? 'Comparing...' : 'Generate & compare'}
            </Button>
          </Stack>
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
