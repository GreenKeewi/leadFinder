import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, AlertCircle, Building2, Copy, Share2, Check, X, ChevronLeft, ChevronRight, SlidersHorizontal, Loader2 } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
  Input, Button, Label,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Skeleton,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from './components/ui';
import { CityAutocomplete } from './components/CityAutocomplete';
import { fetchBusinessData } from './services/geminiService';
import { BusinessResult, AppState } from './types';

// Cast motion.div to any to avoid TypeScript errors with animation props
const MotionDiv = motion.div as any;

const ITEMS_PER_PAGE = 10;

export default function App() {
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  
  // Advanced Filter State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [yearsInOperation, setYearsInOperation] = useState('');

  const [isCopied, setIsCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isShareable, setIsShareable] = useState(false);
  
  // Loading Bar State
  const [loadingProgress, setLoadingProgress] = useState(0);
  const progressInterval = useRef<number | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  
  const [state, setState] = useState<AppState>({
    results: [],
    isLoading: false,
    error: null,
    hasSearched: false
  });

  // Handle Loading Bar Animation
  useEffect(() => {
    if (state.isLoading) {
      setLoadingProgress(0);
      // Simulate progress up to 90%
      progressInterval.current = window.setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 90) return prev;
          // Logarithmic-ish slowdown
          const increment = Math.max(1, (90 - prev) / 10);
          return prev + increment;
        });
      }, 500);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
      setLoadingProgress(100);
      // Reset after animation completes
      const timeout = setTimeout(() => {
        setLoadingProgress(0);
      }, 500);
      return () => clearTimeout(timeout);
    }

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [state.isLoading]);

  // Reusable search function
  const performSearch = useCallback(async (
    searchKeyword: string, 
    searchCity: string,
    searchIndustry?: string,
    searchSize?: string,
    searchYears?: string
  ) => {
    if (!searchKeyword.trim() || !searchCity.trim()) return;

    setState(prev => ({ ...prev, isLoading: true, error: null, hasSearched: true, results: [] }));
    setCurrentPage(1); // Reset to first page on new search

    try {
      const data = await fetchBusinessData(searchKeyword, searchCity, {
        industry: searchIndustry,
        companySize: searchSize,
        yearsInOperation: searchYears
      });
      setState(prev => ({ ...prev, results: data, isLoading: false }));
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: (err && err.message) || String(err) || "An unexpected error occurred." 
      }));
    }
  }, []);

  // Check URL params on mount and determine environment
  useEffect(() => {
    try {
      // Browsers restrict history API on 'blob:' urls (common in previews)
      const isBlob = window.location.protocol === 'blob:';
      setIsShareable(!isBlob);

      const params = new URLSearchParams(window.location.search);
      const urlKeyword = params.get('keyword');
      const urlCity = params.get('city');
      const urlIndustry = params.get('industry') || '';
      const urlSize = params.get('size') || '';
      const urlYears = params.get('years') || '';

      if (urlKeyword && urlCity) {
        setKeyword(urlKeyword);
        setCity(urlCity);
        setIndustry(urlIndustry);
        setCompanySize(urlSize);
        setYearsInOperation(urlYears);
        
        if (urlIndustry || urlSize || urlYears) {
          setShowAdvanced(true);
        }

        performSearch(urlKeyword, urlCity, urlIndustry, urlSize, urlYears);
      }
    } catch (e) {
      console.error("Error parsing URL parameters:", e);
    }
  }, [performSearch]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // Only update URL if we are in a supported environment (not blob)
    if (isShareable) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('keyword', keyword);
        url.searchParams.set('city', city);
        if (industry) url.searchParams.set('industry', industry);
        else url.searchParams.delete('industry');
        
        if (companySize) url.searchParams.set('size', companySize);
        else url.searchParams.delete('size');

        if (yearsInOperation) url.searchParams.set('years', yearsInOperation);
        else url.searchParams.delete('years');

        window.history.pushState({}, '', url.toString());
      } catch (e) {
        // Silently fail if history update is blocked
        console.warn("Could not update URL history in this environment.");
      }
    }

    performSearch(keyword, city, industry, companySize, yearsInOperation);
  }, [keyword, city, industry, companySize, yearsInOperation, performSearch, isShareable]);

  const handleClearSearch = useCallback(() => {
    setKeyword('');
    setCity('');
    setIndustry('');
    setCompanySize('');
    setYearsInOperation('');
    setShowAdvanced(false);

    setState({
      results: [],
      isLoading: false,
      error: null,
      hasSearched: false
    });
    setCurrentPage(1);

    if (isShareable) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('keyword');
        url.searchParams.delete('city');
        url.searchParams.delete('industry');
        url.searchParams.delete('size');
        url.searchParams.delete('years');
        window.history.pushState({}, '', url.toString());
      } catch (e) {
        console.warn("Could not clear URL history.");
      }
    }
  }, [isShareable]);

  const handleShareLink = useCallback(async () => {
    if (!isShareable) return;

    try {
      const url = new URL(window.location.href);
      // Ensure current state is in URL even if search hasn't been clicked yet
      if (keyword && city) {
          url.searchParams.set('keyword', keyword);
          url.searchParams.set('city', city);
          if (industry) url.searchParams.set('industry', industry);
          if (companySize) url.searchParams.set('size', companySize);
          if (yearsInOperation) url.searchParams.set('years', yearsInOperation);
      }
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url.toString());
        setIsLinkCopied(true);
        setTimeout(() => setIsLinkCopied(false), 2000);
      } else {
        console.warn("Clipboard API unavailable");
      }
    } catch (err) {
      console.error("Failed to copy link to clipboard:", err);
    }
  }, [keyword, city, industry, companySize, yearsInOperation, isShareable]);

  const handleCopyText = useCallback(async () => {
    if (state.results.length === 0) return;

    const textContent = state.results.map(r => 
      `Name: ${r.name || 'N/A'}\nPhone: ${r.phone || 'N/A'}\nAddress: ${r.address || 'N/A'}\nWebsite: ${r.website || 'N/A'}\n`
    ).join('\n-------------------\n\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textContent);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        console.warn("Clipboard API unavailable");
      }
    } catch (err) {
      console.error("Failed to copy text to clipboard:", err);
    }
  }, [state.results]);

  const handleDownloadCSV = useCallback(() => {
    if (state.results.length === 0) return;

    try {
      // Convert to CSV
      const headers = ['Business Name', 'Phone', 'Address', 'Website'];
      const rows = state.results.map(r => [
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.phone || '').replace(/"/g, '""')}"`,
        `"${(r.address || '').replace(/"/g, '""')}"`,
        `"${(r.website || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Safety check for URL creation
      if (typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `business_finder_${city || 'city'}_${keyword || 'search'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        console.error("URL.createObjectURL is not supported");
      }
    } catch (e) {
      console.error("Error downloading CSV:", e);
    }
  }, [state.results, city, keyword]);

  // Pagination Calculations
  const totalPages = Math.ceil(state.results.length / ITEMS_PER_PAGE);
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = state.results.slice(indexOfFirstItem, indexOfLastItem);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <TooltipProvider>
      {/* Loading Bar Overlay */}
      <AnimatePresence>
        {(state.isLoading || loadingProgress > 0) && (
          <MotionDiv 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 w-full z-50 pointer-events-none"
          >
            <div className="h-1.5 w-full bg-slate-200">
              <MotionDiv 
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: `${loadingProgress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
            {state.isLoading && (
              <div className="absolute top-4 w-full text-center">
                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/90 text-white text-sm font-medium rounded-full shadow-lg backdrop-blur-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing... Estimated time: 5-10 seconds
                 </div>
              </div>
            )}
          </MotionDiv>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans pt-12">
        <div className="mx-auto max-w-4xl space-y-8">
          
          {/* Header Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">North America Business Finder</h1>
            <p className="text-lg text-muted-foreground font-light italic">
              Discover verified businesses across the continent.
            </p>
          </div>

          {/* Search Card */}
          <Card className="border-slate-200 bg-white shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 bg-slate-50/50 px-6 py-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5 text-primary" />
                Find Businesses
              </CardTitle>
              {(keyword && city && isShareable) && (
                  <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleShareLink}
                      className="text-xs text-muted-foreground hover:text-primary gap-1.5"
                      type="button"
                  >
                      {isLinkCopied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                      {isLinkCopied ? 'Link Copied' : 'Share Search'}
                  </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="keyword" className="font-semibold text-slate-700">Keyword</Label>
                    <Input
                      id="keyword"
                      placeholder="e.g. Italian Restaurant, Plumber"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      className="bg-white h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="font-semibold text-slate-700">City</Label>
                    <CityAutocomplete 
                      id="city"
                      value={city}
                      onChange={setCity}
                      placeholder="e.g. Toronto, New York"
                      className="bg-white h-11"
                    />
                  </div>
                </div>

                {/* Advanced Options Toggle */}
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-primary hover:bg-primary/5 hover:text-primary -ml-2"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
                  </Button>
                </div>

                {/* Advanced Options Content */}
                <AnimatePresence>
                  {showAdvanced && (
                    <MotionDiv
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-6 md:grid-cols-3 pt-2 pb-2">
                        <div className="space-y-2">
                          <Label htmlFor="industry" className="text-sm font-medium text-slate-600">Specific Industry</Label>
                          <Input
                            id="industry"
                            placeholder="e.g. Commercial, Residential"
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            className="bg-slate-50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="size" className="text-sm font-medium text-slate-600">Company Size</Label>
                          <select
                            id="size"
                            value={companySize}
                            onChange={(e) => setCompanySize(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Any Size</option>
                            <option value="Small (1-10 employees)">Small (1-10)</option>
                            <option value="Medium (11-50 employees)">Medium (11-50)</option>
                            <option value="Large (50+ employees)">Large (50+)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="years" className="text-sm font-medium text-slate-600">Years in Operation</Label>
                          <select
                            id="years"
                            value={yearsInOperation}
                            onChange={(e) => setYearsInOperation(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Any</option>
                            <option value="New (< 2 years)">New (&lt; 2 years)</option>
                            <option value="Established (2-10 years)">Established (2-10 years)</option>
                            <option value="Veteran (10+ years)">Veteran (10+ years)</option>
                          </select>
                        </div>
                      </div>
                    </MotionDiv>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-2">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleClearSearch}
                    disabled={!keyword && !city}
                    className="px-4 h-11"
                    title="Clear Search"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={state.isLoading || !keyword || !city}
                    className="flex-1 h-11 text-base font-medium"
                  >
                    {state.isLoading ? 'Searching...' : 'Search Businesses'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Error Message */}
          {state.error && (
            <MotionDiv 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-red-50 p-4 text-red-900 border border-red-200 flex items-center gap-2 shadow-sm"
            >
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-medium">{state.error}</p>
            </MotionDiv>
          )}

          {/* Results Section */}
          <AnimatePresence mode='wait'>
            {state.isLoading ? (
              <MotionDiv
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-9 w-32" />
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="mb-6 flex gap-4 last:mb-0">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-3 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </MotionDiv>
            ) : state.hasSearched && state.results.length > 0 ? (
              <MotionDiv
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <h2 className="text-xl font-bold tracking-tight text-slate-800">
                    Found {state.results.length} verified results
                  </h2>
                  <div className="flex gap-2 w-full sm:w-auto">
                      <Button variant="outline" onClick={handleCopyText} className="gap-2 flex-1 sm:flex-none">
                          {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {isCopied ? 'Copied' : 'Copy Text'}
                      </Button>
                      <Button variant="default" onClick={handleDownloadCSV} className="gap-2 flex-1 sm:flex-none">
                          <Download className="h-4 w-4" />
                          Download CSV
                      </Button>
                  </div>
                </div>

                <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead className="w-[30%]">Business Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead className="text-right">Website</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentItems.map((biz, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <Building2 className="h-4 w-4 text-slate-600" />
                              </div>
                              <span className="font-bold text-slate-700">{biz?.name || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600 font-medium">{biz?.phone || 'N/A'}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-slate-600" title={biz?.address || ''}>
                            {biz?.address === 'N/A' ? <span className="text-slate-400 italic">No specific address</span> : biz?.address}
                          </TableCell>
                          <TableCell className="text-right">
                            {biz?.website && biz.website !== 'N/A' ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <a 
                                    href={biz.website.startsWith('http') ? biz.website : `https://${biz.website}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-end font-semibold text-primary hover:text-primary/80 hover:underline transition-colors text-sm"
                                  >
                                    Visit Site
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {biz.website.startsWith('http') ? biz.website : `https://${biz.website}`}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">N/A</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200/50 pt-6">
                    <div className="text-sm text-slate-500 font-medium">
                        Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, state.results.length)} of {state.results.length}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={prevPage}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Prev
                        </Button>
                        <div className="px-2 text-sm font-semibold text-slate-700">
                          {currentPage} / {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={nextPage}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                  </div>
                )}

              </MotionDiv>
            ) : state.hasSearched && !state.isLoading && state.results.length === 0 ? (
              <MotionDiv 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-dashed border-slate-300"
              >
                <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 ring-1 ring-slate-100">
                  <Search className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No results found</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  We couldn't find any businesses in {city} matching "{keyword}" that have both a phone number and website.
                </p>
                <p className="text-slate-400 text-sm mt-2">Try relaxing your advanced filters.</p>
              </MotionDiv>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}