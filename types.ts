
export interface BusinessResult {
  name: string;
  phone: string;
  address: string;
  website: string;
}

export interface AdvancedSearchOptions {
  industry?: string;
  companySize?: string;
  yearsInOperation?: string;
}

export interface SearchParams extends AdvancedSearchOptions {
  keyword: string;
  city: string;
}

export interface AppState {
  results: BusinessResult[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}
