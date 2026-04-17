import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent } from '@mui/material';

const MODELS = [
  { id: 'text-embedding-ada-002', label: 'Ada 002', dimensions: 1536, note: 'Legacy' },
  { id: 'text-embedding-3-small', label: 'Embedding 3 Small', dimensions: 1536, note: 'Cost-effective' },
  { id: 'text-embedding-3-large', label: 'Embedding 3 Large', dimensions: 3072, note: 'Most capable' },
];

interface ModelSelectorProps {
  model: string;
  onChange: (model: string) => void;
}

export default function ModelSelector({ model, onChange }: ModelSelectorProps) {
  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 260 }}>
      <InputLabel>Embedding Model</InputLabel>
      <Select value={model} label="Embedding Model" onChange={handleChange}>
        {MODELS.map((m) => (
          <MenuItem key={m.id} value={m.id}>
            {m.label} ({m.dimensions}d) &mdash; {m.note}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
