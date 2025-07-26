declare module 'archive_of_anna' {
  /**
   * Search result item from Anna's Archive
   */
  export interface SearchResult {
    /** Array of authors */
    authors: string;
    /** URL of the cover image */
    coverUrl: string;
    /** MD5 hash of the content */
    md5: string;
    /** Title of the content */
    title: string;
  }

  /**
   * Download links organized by source
   */
  export interface DownloadLinks {
    /** LibGen RS fork download links */
    libgenRsFork: string[];
    /** LibGen LI fork download links */
    libgenLiFork: string[];
    /** IPFS download links */
    ipfs: string[];
    /** Z-Library TOR download links */
    zLibTor: string[];
  }

  /**
   * Detailed content information from fetch_by_md5
   */
  export interface FetchResult {
    /** Array of authors */
    authors: string[];
    /** URL of the cover image */
    coverUrl: string;
    /** Sanitized description of the content */
    description: string;
    /** Segregated download links by source */
    downloadLinks: DownloadLinks;
    /** File extension of the content */
    extension: string;
    /** Sanitized ISBN codes (for books) */
    isbnCodes: string[];
    /** MD5 hash of the content */
    md5: string;
    /** Publisher of the content */
    publisher: string;
    /** Title of the content */
    title: string;
    /** Year of publication */
    year: number;
  }

  /**
   * Search options for filtering results
   */
  export interface SearchOptions {
    /** The text to search for */
    text: string;
    /** The language of the content (optional) */
    lang?: string;
    /** The type of content to search for (optional) */
    content?: string;
    /** The file extension to search for (optional) */
    ext?: string;
    /** The sort order of results (optional) */
    sort?: string;
  }

  /**
   * The main API wrapper for Anna's Archive
   * 
   * @example
   * ```typescript
   * import ArchiveOfAnna from 'archive_of_anna';
   * 
   * // Search for books
   * const results = await ArchiveOfAnna.search('JavaScript programming');
   * 
   * // Fetch detailed information by MD5
   * const details = await ArchiveOfAnna.fetch_by_md5('abc123...');
   * ```
   */
  export default class ArchiveOfAnna {
    /**
     * Constructor is not allowed - this is a static-only class
     */
    private constructor();

    /**
     * Search for content in Anna's Archive
     * 
     * @param text - The text to search for
     * @param lang - The language of the content (optional)
     * @param content - The type of content to search for (optional)
     * @param ext - The file extension to search for (optional)
     * @param sort - The sort order of results (optional)
     * @returns Promise<SearchResult[]> - Array of search results
     * 
     * @example
     * ```typescript
     * // Basic search
     * const results = await ArchiveOfAnna.search('Python programming');
     * 
     * // Search with filters
     * const results = await ArchiveOfAnna.search(
     *   'machine learning',
     *   'en',           // English language
     *   'books',        // Books only
     *   'pdf',          // PDF files only
     *   'year'          // Sort by year
     * );
     * ```
     */
    static search(
      text: string,
      lang?: string,
      content?: string,
      ext?: string,
      sort?: string
    ): Promise<SearchResult[]>;

    /**
     * Fetch detailed information about content by its MD5 hash
     * 
     * @param md5 - The MD5 hash of the file (can be obtained from search results)
     * @returns Promise<FetchResult> - Detailed content information
     * 
     * @example
     * ```typescript
     * // Get detailed information about a book
     * const details = await ArchiveOfAnna.fetch_by_md5('abc123def456...');
     * console.log(details.title);
     * console.log(details.downloadLinks.libgenRsFork);
     * ```
     */
    static fetch_by_md5(md5: string): Promise<FetchResult>;
  }
} 