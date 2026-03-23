type SearchParamValue = string | string[] | undefined;

type AdminPageSearchParams = {
  classId?: SearchParamValue;
  objectId?: SearchParamValue;
  mode?: SearchParamValue;
};

type AdminPageProps = {
  searchParams: Promise<AdminPageSearchParams>;
};

type CatalogPageSearchParams = {
  q?: SearchParamValue;
  type?: SearchParamValue;
  char?: SearchParamValue;
};

type CatalogPageProps = {
  searchParams: Promise<CatalogPageSearchParams>;
};

type AnimalDetailPageProps = {
  params: Promise<{
    identifier: string;
  }>;
};

type AdminResourceRouteContext = {
  params: Promise<{
    resource: string;
  }>;
};

type AdminResourceWithIdRouteContext = {
  params: Promise<{
    resource: string;
    id: string;
  }>;
};

type AdminAnimalMediaRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AdminAnimalMediaItemRouteContext = {
  params: Promise<{
    id: string;
    mediaId: string;
  }>;
};

export type {
  AnimalDetailPageProps,
  AdminAnimalMediaItemRouteContext,
  AdminAnimalMediaRouteContext,
  AdminPageProps,
  AdminPageSearchParams,
  AdminResourceRouteContext,
  AdminResourceWithIdRouteContext,
  CatalogPageProps,
  CatalogPageSearchParams,
  SearchParamValue,
};
