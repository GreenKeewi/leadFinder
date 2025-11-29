import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, AlertCircle, Building2 } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
  Input, Button, Label,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Skeleton
} from './components/ui';
import { fetchBusinessData } from './services/geminiService';
import { BusinessResult, AppState } from './types';

export default function App() {
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  
  const [state, setState] = useState<AppState>({
    results: [],
    isLoading: false,
    error: null,
    hasSearched: false
  });

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !city.trim()) return;

    setState(prev => ({ ...prev, isLoading: true, error: null, hasSearched: true, results: [] }));

    try {
      const data = await fetchBusinessData(keyword, city);
      setState(prev => ({ ...prev, results: data, isLoading: false }));
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: err.message || "An unexpected error occurred." 
      }));
    }
  }, [keyword, city]);

  const handleDownloadCSV = useCallback(() => {
    if (state.results.length === 0) return;

    // Convert to CSV
    const headers = ['Business Name', 'Phone', 'Address', 'Website'];
    const rows = state.results.map(r => [
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.phone.replace(/"/g, '""')}"`,
      `"${r.address.replace(/"/g, '""')}"`,
      `"${r.website.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ontario_businesses_${city}_${keyword}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [state.results, city, keyword]);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Ontario Business Finder</h1>
          <p className="text-lg text-muted-foreground">
            Search for businesses across Ontario by keyword and city.
          </p>
        </div>

        {/* Search Card */}
        <Card className="border-slate-200 bg-white/50 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Search Parameters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="grid gap-6 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="keyword">Keyword</Label>
                <Input
                  id="keyword"
                  placeholder="e.g. Plumber, Dentist, Cafe"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City (Ontario)</Label>
                <Input
                  id="city"
                  placeholder="e.g. Toronto, Ottawa, Hamilton"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-white"
                />
              </div>
              <Button 
                type="submit" 
                disabled={state.isLoading || !keyword || !city}
                className="w-full md:w-auto"
              >
                {state.isLoading ? 'Searching...' : 'Search'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error Message */}
        {state.error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-red-50 p-4 text-red-900 border border-red-200 flex items-center gap-2"
          >
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">{state.error}</p>
          </motion.div>
        )}

        {/* Results Section */}
        <AnimatePresence mode='wait'>
          {state.isLoading ? (
             <motion.div
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
               <div className="rounded-md border bg-white p-4">
                 {[1, 2, 3, 4, 5].map((i) => (
                   <div key={i} className="mb-4 flex gap-4 last:mb-0">
                     <Skeleton className="h-12 w-12 rounded-full" />
                     <div className="space-y-2 flex-1">
                       <Skeleton className="h-4 w-1/3" />
                       <Skeleton className="h-4 w-1/2" />
                     </div>
                   </div>
                 ))}
               </div>
             </motion.div>
          ) : state.hasSearched && state.results.length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold tracking-tight">
                  Found {state.results.length} results
                </h2>
                <Button variant="outline" onClick={handleDownloadCSV} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download CSV
                </Button>
              </div>

              <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right">Website</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.results.map((biz, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                             <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                               <Building2 className="h-4 w-4 text-primary" />
                             </div>
                             {biz.name}
                          </div>
                        </TableCell>
                        <TableCell>{biz.phone}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={biz.address}>{biz.address}</TableCell>
                        <TableCell className="text-right">
                          {biz.website !== 'N/A' ? (
                            <a 
                              href={biz.website.startsWith('http') ? biz.website : `https://${biz.website}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm"
                            >
                              Visit Site
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          ) : state.hasSearched && !state.isLoading && state.results.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No results found</h3>
              <p className="text-slate-500 max-w-sm mt-2">
                We couldn't find any businesses matching "{keyword}" in {city}. Try broadening your search terms.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}