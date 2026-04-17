import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ModelSelector from '../components/ModelSelector';
import SimilarityResult from '../components/SimilarityResult';
import { useCompare, type CompareResult } from '../hooks/useCompare';

const EXAMPLE_PAIRS = [
  { phrase1: 'dog', phrase2: 'cat', label: 'Animals' },
  { phrase1: 'happy', phrase2: 'sad', label: 'Opposites' },
  { phrase1: 'thank you', phrase2: 'gracias', label: 'Languages' },
  { phrase1: 'doctor', phrase2: 'physician', label: 'Synonyms' },
  { phrase1: 'cup', phrase2: 'CUP', label: 'Capitalization' },
  { phrase1: 'king - man + woman', phrase2: 'queen', label: 'Arithmetic' },
];

export default function PlaygroundPage() {
  const [phrase1, setPhrase1] = useState('');
  const [phrase2, setPhrase2] = useState('');
  const [model, setModel] = useState('text-embedding-3-small');
  const [results, setResults] = useState<CompareResult[]>([]);
  const { compare, loading, error } = useCompare();

  const handleCompare = async () => {
    if (!phrase1.trim() || !phrase2.trim()) return;
    const result = await compare(phrase1.trim(), phrase2.trim(), model);
    if (result) {
      setResults((prev) => [result, ...prev]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCompare();
    }
  };

  const handleExample = (p1: string, p2: string) => {
    setPhrase1(p1);
    setPhrase2(p2);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Compare Phrases
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Enter two phrases to measure their semantic similarity using vector embeddings.
        Use <code>+</code> and <code>-</code> for vector arithmetic.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Phrase 1"
                value={phrase1}
                onChange={(e) => setPhrase1(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="king - man + woman"
                fullWidth
                autoFocus
              />
              <TextField
                label="Phrase 2"
                value={phrase2}
                onChange={(e) => setPhrase2(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="queen"
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <ModelSelector model={model} onChange={setModel} />
              <Button
                variant="contained"
                size="large"
                onClick={handleCompare}
                disabled={loading || !phrase1.trim() || !phrase2.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <CompareArrowsIcon />}
                sx={{ minWidth: 140 }}
              >
                {loading ? 'Comparing...' : 'Compare'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Try an example:
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        {EXAMPLE_PAIRS.map((ex) => (
          <Chip
            key={ex.label}
            label={`${ex.phrase1} vs ${ex.phrase2}`}
            variant="outlined"
            size="small"
            onClick={() => handleExample(ex.phrase1, ex.phrase2)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Stack>

      {results.map((result, i) => (
        <SimilarityResult key={`${result.phrase1}-${result.phrase2}-${result.model}-${i}`} result={result} />
      ))}
    </Box>
  );
}
