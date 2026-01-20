export interface MetadataField {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'textarea';
}

export interface CollectionMetadataFormProps {
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  errors: Record<string, string>;
  onErrorsChange: (errors: Record<string, string>) => void;
  disabled?: boolean;
}