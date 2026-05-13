import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ModelSelector from '../components/ModelSelector';
import SimilarityResult from '../components/SimilarityResult';
import { useCompare, type CompareResult, type MultiModelResult } from '../hooks/useCompare';
import { PRESET_GROUPS } from '../data/presets';
import { ALL_MODEL_IDS } from '../data/models';

type ResultEntry = CompareResult | MultiModelResult;

const DEFAULT_MODEL = 'text-embedding-3-small';

export default function PlaygroundPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [phrase1, setPhrase1] = useState(searchParams.get('p1') ?? '');
  const [phrase2, setPhrase2] = useState(searchParams.get('p2') ?? '');
  const [model, setModel] = useState(searchParams.get('model') ?? DEFAULT_MODEL);
  const [allModels, setAllModels] = useState(searchParams.get('all') === '1');
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const { compare, compareAcrossModels, loading, error } = useCompare();
  const autoRanRef = useRef(false);

  const runCompare = async (p1: string, p2: string, m: string, all: boolean) => {
    const r = all
      ? await compareAcrossModels(p1, p2, ALL_MODEL_IDS)
      : await compare(p1, p2, m);
    if (r) setResults((prev) => [r, ...prev]);
  };

  const updateUrl = (p1: string, p2: string, m: string, all: boolean) => {
    const params: Record<string, string> = { p1, p2 };
    if (all) params.all = '1';
    else params.model = m;
    setSearchParams(params, { replace: false });
  };

  const handleCompare = async () => {
    if (!phrase1.trim() || !phrase2.trim()) return;
    const p1 = phrase1.trim();
    const p2 = phrase2.trim();
    updateUrl(p1, p2, model, allModels);
    await runCompare(p1, p2, model, allModels);
  };

  useEffect(() => {
    if (autoRanRef.current) return;
    autoRanRef.current = true;
    const p1 = (searchParams.get('p1') ?? '').trim();
    const p2 = (searchParams.get('p2') ?? '').trim();
    if (p1 && p2) {
      const m = searchParams.get('model') ?? DEFAULT_MODEL;
      const all = searchParams.get('all') === '1';
      runCompare(p1, p2, m, all);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCompare();
    }
  };

  const handlePreset = (p1: string, p2: string) => {
    setPhrase1(p1);
    setPhrase2(p2);
    setMenuAnchor(null);
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

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              flexWrap="wrap"
              useFlexGap
            >
              <ModelSelector
                model={model}
                onChange={setModel}
                allModels={allModels}
                onAllModelsChange={setAllModels}
              />
              <Button
                variant="outlined"
                size="medium"
                startIcon={<LibraryBooksIcon />}
                endIcon={<ArrowDropDownIcon />}
                onClick={(e) => setMenuAnchor(e.currentTarget)}
              >
                Load example
              </Button>
              <Menu
                anchorEl={menuAnchor}
                open={!!menuAnchor}
                onClose={() => setMenuAnchor(null)}
              >
                {PRESET_GROUPS.flatMap((group) => [
                  <ListSubheader key={`hdr-${group.label}`}>{group.label}</ListSubheader>,
                  ...group.items.map((item) => (
                    <MenuItem
                      key={`${group.label}-${item.p1}-${item.p2}`}
                      onClick={() => handlePreset(item.p1, item.p2)}
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {item.p1} &nbsp;↔&nbsp; {item.p2}
                    </MenuItem>
                  )),
                ])}
              </Menu>
              <Box sx={{ flexGrow: 1 }} />
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

      {results.map((result, i) => (
        <SimilarityResult key={`${result.phrase1}-${result.phrase2}-${i}`} result={result} />
      ))}
    </Box>
  );
}
