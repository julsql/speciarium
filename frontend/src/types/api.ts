export interface UserDto {
  id: number;
  username: string;
  email: string;
  isDemo: boolean;
  isStaff: boolean;
  currentCollectionId: number | null;
  themeName: string | null;
  mapTilesServer: string | null;
}

export interface PhotoSummary {
  id: number;
  thumbnail: string;
  photo: string;
  year: number | null;
  date: string | null;
  continent: string;
  country: string;
  region: string;
  details: string;
  latitude: number | null;
  longitude: number | null;
  numberPicture: string;
}

export interface SpeciesRowDto {
  specieId: number;
  latinName: string;
  genus: string;
  species: string;
  frenchName: string;
  kingdom: string;
  classField: string;
  orderField: string;
  family: string;
  minYear: number | null;
  continents: string[];
  countries: string[];
  regions: string[];
  numberPicture: number;
  allPhotos: PhotoSummary[];
}

export interface PhotoDto {
  id: number;
  year: number | null;
  date: string | null;
  latitude: number | null;
  longitude: number | null;
  continent: string;
  country: string;
  region: string;
  photo: string;
  thumbnail: string;
  hash: string;
  details: string;
  speciesId: number;
  latinName: string;
  frenchName: string;
  uploadActionId: string | null;
  numberPicture: string;
}

export interface CollectionDto {
  id: number;
  title: string;
  ownerId: number | null;
  ownerUsername: string | null;
  createdAt: string;
  photoCount: number;
  speciesCount: number;
}

export interface ThemeDto {
  id: number;
  name: string;
  description: string;
  sheet: string;
  active: boolean;
}

export interface MapTilesDto {
  id: number;
  name: string;
  description: string;
  server: string;
  active: boolean;
}

export interface NotificationDto {
  uploadId: string;
  createdAt: string;
  imagesUploaded: number;
  collectionId: number;
  collectionTitle: string;
  username: string;
  seen: boolean;
}

export interface UploadHistoryDto {
  uploadId: string;
  createdAt: string;
  imagesUploaded: number;
  imagesDeleted: number;
  imagesChanged: number;
  collectionId: number;
  collectionTitle: string;
}

export interface ComparisonColumn {
  id: number;
  label: string;
}

export interface ComparisonRow {
  name: string;
  isTotal?: boolean;
  /** Count par collection : clé `collection_<id>` */
  [key: `collection_${number}`]: number;
}

export interface ComparisonResult {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}
