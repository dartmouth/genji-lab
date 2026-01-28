import { CollectionMetadata } from "@/store/slice/documentCollectionSlice";

export type MetadataValue = string | string[] | Base64Image;

export interface Base64Image {
  mime_type: string;
  img_base64: string;
}

export interface CollectionMetadataFormProps {
  values: CollectionMetadata;
  onChange: (values: CollectionMetadata) => void;
  errors: Record<string, string>;
  onErrorsChange: (errors: Record<string, string>) => void;
  disabled?: boolean;
}

export interface MetadataFieldProps {
  fieldKey: string;
  label: string;
  value: MetadataValue | undefined;
  error?: string;
  onChange: (key: string, value: MetadataValue) => void;
  disabled?: boolean;
  required?: boolean;
}
