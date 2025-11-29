export interface BusinessResult {
  name: string;
  phone: string;
  address: string;
  website: string;
}

export interface SearchParams {
  keyword: string;
  city: string;
}

export interface AppState {
  results: BusinessResult[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}