import {
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  type SelectChangeEvent,
} from '@mui/material';
import { MODELS } from '../data/models';

interface ModelSelectorProps {
  model: string;
  onChange: (model: string) => void;
  allModels?: boolean;
  onAllModelsChange?: (value: boolean) => void;
}

export default function ModelSelector({ model, onChange, allModels, onAllModelsChange }: ModelSelectorProps) {
  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value);
  };

  return (
    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
      <FormControl size="small" sx={{ minWidth: 260 }} disabled={allModels}>
        <InputLabel>Embedding Model</InputLabel>
        <Select value={model} label="Embedding Model" onChange={handleChange}>
          {MODELS.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              {m.label} ({m.dimensions}d) &mdash; {m.note}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {onAllModelsChange && (
        <FormControlLabel
          control={
            <Switch
              checked={!!allModels}
              onChange={(e) => onAllModelsChange(e.target.checked)}
            />
          }
          label="All models"
        />
      )}
    </Stack>
  );
}
