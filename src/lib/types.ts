export type FieldType =
  | "short_text" | "long_text" | "dropdown" | "multi_select" | "checkbox"
  | "star_rating" | "url" | "wallet_address" | "file_upload" | "image_upload"
  | "video_upload" | "audio_upload" | "date" | "rich_text" | "confirmation";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  privacy: "public" | "encrypted" | "admin_only";
  options?: string[];
}

export interface FormSchema {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  createdBy: string;
  createdAt: number;
  version: 1;
  encryptionPublicKey?: string; // ECDH P-256 public key (base64) for field encryption (v2 / legacy)
  sealPackageId?: string;       // Deployed address_gate package ID for Seal v3 threshold encryption
}

export interface FieldResponse {
  fieldId: string;
  fieldLabel: string;
  fieldType: FieldType;
  value: string | string[];
  encrypted: boolean;
}

export interface FormResponse {
  formId: string;
  formTitle: string;
  respondedAt: number;
  submitter?: string;
  responses: FieldResponse[];
}

export interface StoredForm {
  blobId: string;
  title: string;
  description: string;
  createdAt: number;
  owner: string;
}
