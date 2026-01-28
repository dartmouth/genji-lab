// components/shared/CollectionSelect.tsx

import React from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";

export interface CollectionOption {
  id: number;
  title: string;
}

export interface CollectionSelectProps {
  value: string;
  onChange: (event: SelectChangeEvent<string>) => void;
  collections: CollectionOption[];
  label?: string;
  id?: string;
  disabled?: boolean;
  maxWidth?: string | number;
  placeholder?: string;
}

export const CollectionSelect: React.FC<CollectionSelectProps> = ({
  value,
  onChange,
  collections,
  label = "Select a collection",
  id = "collection-select",
  disabled = false,
  maxWidth = "400px",
  placeholder = "Select a collection",
}) => {
  const labelId = `${id}-label`;

  return (
    <FormControl fullWidth sx={{ maxWidth }}>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select
        labelId={labelId}
        id={id}
        value={value}
        label={label}
        onChange={onChange}
        disabled={disabled}
      >
        <MenuItem value="">
          <em>{placeholder}</em>
        </MenuItem>
        {collections.map((collection) => (
          <MenuItem key={collection.id} value={collection.id.toString()}>
            {collection.title}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default CollectionSelect;