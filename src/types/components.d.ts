import type { ReactNode } from "react";
import type { AdminAnimalMediaItem, AdminClassCapabilities, AdminClassId, AdminFormState } from "@/src/types/admin";
import type { CatalogAnimalCard, CatalogFilterData } from "@/src/types/catalog";

type ObjectsType = {
  identifier: string;
  label: string;
  description?: string;
};

interface SectionProps {
  label: string;
  items?: ObjectsType[];
  queryKey: string;
  selectedIdentifier?: string;
  clearKeys?: string[];
  emptyMessage?: string;
  headerAction?: ReactNode;
  searchPlaceholder?: string;
}

interface ListObjectsProps {
  items?: ObjectsType[];
  queryKey: string;
  selectedIdentifier?: string;
  clearKeys?: string[];
  emptyMessage?: string;
  searchPlaceholder?: string;
}

type DetailField = {
  label: string;
  value: string;
};

type DetailListItem = {
  label: string;
  description?: string;
  badge?: string;
};

type DetailSection = {
  title: string;
  description?: string;
  fields?: DetailField[];
  items?: DetailListItem[];
  emptyMessage?: string;
};

type DetailView = {
  title: string;
  subtitle?: string;
  badges?: string[];
  sections: DetailSection[];
};

type LoadingStateProps = {
  label?: string;
  className?: string;
  inline?: boolean;
};

type AdminDetailPanelProps = {
  animalMedia: AdminAnimalMediaItem[];
  classId: AdminClassId;
  classLabel: string;
  objectId?: string;
  detail: DetailView | null;
  formState: AdminFormState | null;
  capabilities: AdminClassCapabilities;
};

type AdminDetailViewProps = {
  detail: DetailView;
};

type AdminQueryButtonProps = {
  label: string;
  loadingLabel: string;
  className?: string;
  updates?: Record<string, string | undefined>;
  clears?: string[];
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
};

type AnimalMediaManagerProps = {
  animalId: string;
  items: AdminAnimalMediaItem[];
  canManage: boolean;
};

type AnimalCarouselItem = {
  id: string;
  kind: "image" | "video";
  url: string;
  title?: string;
  description?: string;
  href?: string;
};

type AnimalCarouselProps = {
  items: AnimalCarouselItem[];
  className?: string;
  showThumbnails?: boolean;
};

type CatalogToolbarProps = {
  filters: CatalogFilterData;
  initialSearch: string;
  initialAnimalTypes: string[];
  initialCharacteristicTokens: string[];
};

type CustomCardProps = {
  item: CatalogAnimalCard;
};

type CustomButtonProps = {
  label?: string;
  message?: string;
  className?: string;
  floating?: boolean;
};

export type {
  AdminDetailPanelProps,
  AdminDetailViewProps,
  AdminQueryButtonProps,
  AnimalCarouselItem,
  AnimalCarouselProps,
  AnimalMediaManagerProps,
  CustomButtonProps,
  CatalogToolbarProps,
  CustomCardProps,
  DetailField,
  DetailListItem,
  DetailSection,
  DetailView,
  ListObjectsProps,
  LoadingStateProps,
  ObjectsType,
  SectionProps,
};
