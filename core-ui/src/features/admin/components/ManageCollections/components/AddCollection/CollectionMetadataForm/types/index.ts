export interface Base64Image {
  mime_type: string;
  img_base64: string;
}

export type MetadataValue = string | string[] | Base64Image;

export interface CollectionMetadataFormProps {
  values: Record<string, MetadataValue>;
  onChange: (values: Record<string, MetadataValue>) => void;
  errors: Record<string, string>;
  onErrorsChange: (errors: Record<string, string>) => void;
  disabled?: boolean;
}

export interface MetadataFieldProps {
  fieldKey: string;
  label: string;
  required: boolean;
  value: MetadataValue;
  onChange: (value: MetadataValue) => void;
  disabled: boolean;
  error?: string;
}
