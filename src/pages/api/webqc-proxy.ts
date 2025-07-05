import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    // Extract query parameters
    const searchParams = new URL(request.url).searchParams;
    const token = searchParams.get('token');
    const maxMatches = searchParams.get('max_matches') || '10';
    const useSimilar = searchParams.get('use_similar') || '0';

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing token parameter' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Build the webqc.org API URL
    const webqcUrl = `https://www.webqc.org/complete-compound.php?token=${encodeURIComponent(token)}&max_matches=${maxMatches}&use_similar=${useSimilar}`;

    // Make the request to webqc.org
    const response = await fetch(webqcUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    // Return the data with proper CORS headers
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error proxying webqc request:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch from webqc.org',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};

// Handle OPTIONS requests for CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
