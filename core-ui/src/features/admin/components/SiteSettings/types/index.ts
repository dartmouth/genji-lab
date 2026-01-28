export interface MetadataField {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'textarea' | 'list' | 'image';
}