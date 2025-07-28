import { ModeComponentProps, type CitationCollection, CitationEntry } from "@/util/modeDefinitions";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { LucideSearch, LucideBook, LucideDownload, LucideTrash, LucideExternalLink, LucideLoader2, LucideBookOpen, LucideCalendar, LucideUser, LucideFileText, LucideGraduationCap } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import type { BibifySearchResult, BibifyDetailResponse } from "@/util/bibifyClient";

interface CitationModeProps extends ModeComponentProps<CitationCollection> {
  // Add any additional props specific to citation mode
  preloadedResults?: { results: BibifySearchResult[]; query: string } | null;
}

export default function CitationMode({
  currentEntity: currentCollection,
  isEmpty: collectionEmpty,
  createEntity: createCollection,
  updateEntity: updateCollection,
  setCurrentEntity: setCurrentCollection,
  preloadedResults,
}: CitationModeProps) {
  const [searchQuery, setSearchQuery] = useState(preloadedResults?.query || "");
  const [searchType, setSearchType] = useState<string>(""); // book, article, thesis, etc.
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<BibifySearchResult[]>(preloadedResults?.results || []);
  const [selectedEntry, setSelectedEntry] = useState<BibifyDetailResponse | null>(null);
  const [totalResults, setTotalResults] = useState(preloadedResults?.results?.length || 0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [searchMessage, setSearchMessage] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load preloaded results when they change
  useEffect(() => {
    if (preloadedResults) {
      setSearchQuery(preloadedResults.query);
      setSearchResults(preloadedResults.results);
      setTotalResults(preloadedResults.results.length);
      setCurrentPage(1);
    }
  }, [preloadedResults]);

  const handleSearch = async (page: number = 1) => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/citation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: searchQuery.trim(),
          type: searchType || undefined,
          page: page,
          per_page: 10
        }),
      });

      const result = await response.json() as any;
      
      if (result.success && result.type === 'search') {
        setSearchResults(result.data || []);
        setTotalResults(result.count || 0);
        setCurrentPage(page);
        setSearchTerms(result.searchTerms || [searchQuery.trim()]);
        setSearchMessage(result.message || "");
      } else {
        console.error('Search failed:', result.error);
        setSearchResults([]);
        setTotalResults(0);
        setSearchTerms([]);
        setSearchMessage("");
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setTotalResults(0);
      setSearchTerms([]);
      setSearchMessage("");
    } finally {
      setIsSearching(false);
    }
  };

  const addToCollection = (result: BibifySearchResult) => {
    // Build the new citation entry first so we can use it in either branch
    const newEntry: CitationEntry = {
      id: result.id || crypto.randomUUID(),
      title: result.title,
      authors: Array.isArray(result.authors) ? result.authors : [result.authors],
      year: result.date ? parseInt(result.date.split('-')[0]) : undefined,
      type: result.type || (result.categories?.[0]?.toLowerCase()) || 'book',
      abstract: '', // The real API does not provide abstracts in search results
      publisher: result.publisher,
      addedAt: new Date(),
      searchQuery: searchQuery,
      // Additional fields from the real API
      pages: result.pages?.toString(),
      language: result.language || 'en',
    };

    // If there's no active collection yet, create one **with** the first entry already inside it
    if (!currentCollection) {
      const newCollectionId = createCollection({
        title: `Citations for "${searchQuery}"`,
        entries: [newEntry],
        lastSearchQuery: searchQuery,
      });
      // Immediately make the new collection the current one so subsequent additions work as expected
      setCurrentCollection(newCollectionId);
      return; // Nothing else to do – entry already saved
    }

    // If a collection already exists, append the new entry to it
    const updatedEntries = [...currentCollection.entries, newEntry];
    updateCollection(currentCollection.id, {
      entries: updatedEntries,
      lastSearchQuery: searchQuery,
    });
  };

  const removeFromCollection = (entryId: string) => {
    if (currentCollection) {
      const updatedEntries = currentCollection.entries.filter(entry => entry.id !== entryId);
      updateCollection(currentCollection.id, { entries: updatedEntries });
    }
  };

  const getDetailedInfo = async (id: string) => {
    try {
      const response = await fetch(`/api/citation?id=${id}`, {
        method: 'GET'
      });

      const result = await response.json() as any;
      
      if (result.success && result.type === 'detailed') {
        setSelectedEntry(result.data);
        return result.data;
      } else {
        console.error('Failed to get detailed info:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error fetching detailed info:', error);
      return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'book':
        return <LucideBook className="w-4 h-4" />;
      case 'article':
        return <LucideFileText className="w-4 h-4" />;
      case 'thesis':
        return <LucideGraduationCap className="w-4 h-4" />;
      default:
        return <LucideBookOpen className="w-4 h-4" />;
    }
  };

  const formatAuthors = (authors: string | string[]) => {
    if (Array.isArray(authors)) {
      return authors.join(', ');
    }
    return authors || 'Unknown Author';
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with search */}
      <div className="p-4 border-b bg-white">
        <div className="flex gap-2 mb-4">
          <div className="flex-1 flex gap-2">
            <Input
              ref={searchInputRef}
              placeholder="Search for academic papers, books, authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(1);
                }
              }}
              className="flex-1"
            />
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All Types</option>
              <option value="book">Books</option>
              <option value="article">Articles</option>
              <option value="thesis">Theses</option>
              <option value="conference">Conference Papers</option>
            </select>
          </div>
          <Button 
            onClick={() => handleSearch(1)} 
            disabled={isSearching || !searchQuery.trim()}
            className="px-6"
          >
            {isSearching ? (
              <LucideLoader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LucideSearch className="w-4 h-4" />
            )}
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {currentCollection && (
          <div className="text-sm text-gray-600">
            Collection: <span className="font-medium">{currentCollection.title}</span>
            {currentCollection.entries.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {currentCollection.entries.length} entries
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex h-0"> {/* Add h-0 to enable flex sizing */}
        {/* Search results */}
        <div className="flex-1 p-4 flex flex-col h-full">
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Search Results</h3>
              {totalResults > 0 && (
                <div className="text-sm text-gray-600">
                  Found {totalResults} results
                </div>
              )}
            </div>
            
            {/* Multi-term search info */}
            {searchTerms.length > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <LucideSearch className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Multi-term Search</span>
                </div>
                <p className="text-xs text-blue-700 mb-2">{searchMessage}</p>
                <div className="flex flex-wrap gap-1">
                  {searchTerms.map((term, index) => (
                    <Badge key={index} variant="outline" className="text-xs bg-blue-100 border-blue-300">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <ScrollArea className="flex-1 h-0"> {/* Change to flex-1 h-0 for proper scrolling */}
            <AnimatePresence>
              {searchResults.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.map((result: BibifySearchResult, index: number) => (
                    <motion.div
                      key={result.id || index}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex gap-4">
                        {/* Thumbnail */}
                        {result.thumbnail && (
                          <div className="flex-shrink-0">
                            <img 
                              src={result.thumbnail} 
                              alt={`Cover of ${result.title}`}
                              className="w-16 h-20 object-cover rounded shadow-sm"
                              onError={(e) => {
                                // Hide image if it fails to load
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 mb-2">
                                {result.title}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">
                                by {Array.isArray(result.authors) ? result.authors.join(', ') : result.authors}
                              </p>
                              
                              <div className="flex flex-wrap gap-2 mb-3">
                                {/* Search term badge - show which term this result came from */}
                                {result.searchTerm && searchTerms.length > 1 && (
                                  <Badge className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                                    <LucideSearch className="w-3 h-3 mr-1" />
                                    {result.searchTerm}
                                  </Badge>
                                )}
                                {result.date && (
                                  <Badge variant="outline" className="text-xs">
                                    <LucideCalendar className="w-3 h-3 mr-1" />
                                    {result.date.split('-')[0]}
                                  </Badge>
                                )}
                                {result.type && (
                                  <Badge variant="outline" className="text-xs">
                                    {getTypeIcon(result.type)}
                                    {result.type}
                                  </Badge>
                                )}
                                {result.categories && result.categories.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    <LucideFileText className="w-3 h-3 mr-1" />
                                    {result.categories[0]}
                                  </Badge>
                                )}
                                {result.publisher && (
                                  <Badge variant="outline" className="text-xs">
                                    {result.publisher}
                                  </Badge>
                                )}
                                {result.pages && (
                                  <Badge variant="outline" className="text-xs">
                                    {result.pages} pages
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => getDetailedInfo(result.id || `temp-${index}`)}
                                className="text-xs"
                              >
                                View Details
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => addToCollection(result)}
                                className="text-xs"
                              >
                                Add to Collection
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Pagination */}
                  {totalResults > 10 && (
                    <div className="flex justify-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch(currentPage - 1)}
                        disabled={currentPage <= 1 || isSearching}
                      >
                        Previous
                      </Button>
                      <span className="px-4 py-2 text-sm">
                        Page {currentPage} of {Math.ceil(totalResults / 10)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch(currentPage + 1)}
                        disabled={currentPage >= Math.ceil(totalResults / 10) || isSearching}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              ) : searchQuery && !isSearching ? (
                <div className="text-center text-gray-500 mt-8">
                  <LucideBookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No results found for "{searchQuery}"</p>
                  <p className="text-sm mt-2">Try different keywords or check your spelling</p>
                </div>
              ) : !searchQuery ? (
                <div className="text-center text-gray-500 mt-8">
                  <LucideSearch className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Search for academic papers, books, and more</p>
                  <p className="text-sm mt-2">Enter your search terms above to get started</p>
                </div>
              ) : null}
            </AnimatePresence>
          </ScrollArea>
        </div>

        {/* Collection sidebar */}
        <div className="w-80 border-l bg-gray-50 p-4">
          <h3 className="text-lg font-semibold mb-4">My Collection</h3>
          <ScrollArea className="h-full">
            {currentCollection && currentCollection.entries.length > 0 ? (
              <div className="space-y-3">
                {currentCollection.entries.map((entry) => (
                  <Card key={entry.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm line-clamp-2">{entry.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {formatAuthors(entry.authors)}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          {entry.year && (
                            <div className="flex items-center gap-1">
                              <LucideCalendar className="w-3 h-3" />
                              {entry.year}
                            </div>
                          )}
                          {(entry as any).type && (
                            <Badge variant="outline" className="text-xs">
                              {(entry as any).type}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromCollection(entry.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <LucideTrash className="w-3 h-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-8">
                <LucideBook className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No citations yet</p>
                <p className="text-xs mt-1">Add items from search results</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Detailed view modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{selectedEntry.title}</CardTitle>
                  <CardDescription>
                    {formatAuthors(selectedEntry.authors)}
                    {selectedEntry.year && ` (${selectedEntry.year})`}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEntry(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {selectedEntry.abstract && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Abstract</h4>
                    <p className="text-sm text-gray-600">{selectedEntry.abstract}</p>
                  </div>
                )}
                
                {/* Citation formats */}
                {(selectedEntry.apa_citation || selectedEntry.mla_citation || selectedEntry.bibtex) && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Citations</h4>
                    <div className="space-y-3">
                      {selectedEntry.apa_citation && (
                        <div>
                          <h5 className="text-sm font-medium">APA</h5>
                          <code className="text-xs bg-gray-100 p-2 rounded block">
                            {selectedEntry.apa_citation}
                          </code>
                        </div>
                      )}
                      {selectedEntry.mla_citation && (
                        <div>
                          <h5 className="text-sm font-medium">MLA</h5>
                          <code className="text-xs bg-gray-100 p-2 rounded block">
                            {selectedEntry.mla_citation}
                          </code>
                        </div>
                      )}
                      {selectedEntry.bibtex && (
                        <div>
                          <h5 className="text-sm font-medium">BibTeX</h5>
                          <code className="text-xs bg-gray-100 p-2 rounded block whitespace-pre">
                            {selectedEntry.bibtex}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  {selectedEntry.publisher && (
                    <div>
                      <span className="font-medium">Publisher:</span> {selectedEntry.publisher}
                    </div>
                  )}
                  {selectedEntry.journal && (
                    <div>
                      <span className="font-medium">Journal:</span> {selectedEntry.journal}
                    </div>
                  )}
                  {selectedEntry.doi && (
                    <div>
                      <span className="font-medium">DOI:</span> {selectedEntry.doi}
                    </div>
                  )}
                  {selectedEntry.isbn && (
                    <div>
                      <span className="font-medium">ISBN:</span> {selectedEntry.isbn}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 