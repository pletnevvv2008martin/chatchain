import { NextRequest, NextResponse } from 'next/server';

// Кэш для превью (в памяти, простой вариант)
const previewCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 минут

interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
  favicon: string;
}

// Извлечение OpenGraph данных из HTML
function extractOpenGraph(html: string, url: string): LinkPreview {
  const getMeta = (name: string): string => {
    // og:meta
    const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']og:${name}["'][^>]*content=["']([^"']*)["']`, 'i'));
    if (ogMatch) return ogMatch[1];
    
    // meta name
    const nameMatch = html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'));
    if (nameMatch) return nameMatch[1];
    
    // twitter:meta
    const twMatch = html.match(new RegExp(`<meta[^>]*name=["']twitter:${name}["'][^>]*content=["']([^"']*)["']`, 'i'));
    if (twMatch) return twMatch[1];
    
    return '';
  };
  
  const getTitle = (): string => {
    const og = getMeta('title');
    if (og) return og;
    
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : '';
  };
  
  const getDescription = (): string => {
    const og = getMeta('description');
    if (og) return og;
    return getMeta('description');
  };
  
  const getImage = (): string => {
    const og = getMeta('image');
    if (og) {
      if (og.startsWith('//')) return 'https:' + og;
      if (og.startsWith('/')) {
        try {
          const urlObj = new URL(url);
          return `${urlObj.protocol}//${urlObj.host}${og}`;
        } catch { return og; }
      }
      return og;
    }
    return '';
  };
  
  const getSiteName = (): string => {
    const og = getMeta('site_name');
    if (og) return og;
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch { return ''; }
  };
  
  const getFavicon = (): string => {
    const iconMatch = html.match(/<link[^>]*rel=["'(?:icon|shortcut icon)["'][^>]*href=["']([^"']*)["']/i);
    if (iconMatch) {
      let favicon = iconMatch[1];
      if (favicon.startsWith('//')) return 'https:' + favicon;
      if (favicon.startsWith('/')) {
        try {
          const urlObj = new URL(url);
          return `${urlObj.protocol}//${urlObj.host}${favicon}`;
        } catch { return favicon; }
      }
      return favicon;
    }
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
    } catch { return ''; }
  };
  
  return {
    url,
    title: getTitle(),
    description: getDescription(),
    image: getImage(),
    siteName: getSiteName(),
    favicon: getFavicon()
  };
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }
  
  // Проверяем кэш
  const cached = previewCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ success: true, preview: cached.data });
  }
  
  try {
    const urlObj = new URL(url);
    
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChatChainBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return NextResponse.json({ 
        success: true, 
        preview: {
          url,
          title: urlObj.hostname,
          description: '',
          image: '',
          siteName: urlObj.hostname,
          favicon: `${urlObj.protocol}//${urlObj.host}/favicon.ico`
        }
      });
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.startsWith('image/')) {
      const preview: LinkPreview = {
        url,
        title: urlObj.pathname.split('/').pop() || 'Image',
        description: contentType,
        image: url,
        siteName: urlObj.hostname,
        favicon: `${urlObj.protocol}//${urlObj.host}/favicon.ico`
      };
      previewCache.set(url, { data: preview, timestamp: Date.now() });
      return NextResponse.json({ success: true, preview });
    }
    
    if (!contentType.includes('text/html')) {
      const preview: LinkPreview = {
        url,
        title: urlObj.pathname.split('/').pop() || urlObj.hostname,
        description: contentType,
        image: '',
        siteName: urlObj.hostname,
        favicon: `${urlObj.protocol}//${urlObj.host}/favicon.ico`
      };
      previewCache.set(url, { data: preview, timestamp: Date.now() });
      return NextResponse.json({ success: true, preview });
    }
    
    const html = await response.text();
    const limitedHtml = html.substring(0, 50000);
    const preview = extractOpenGraph(limitedHtml, url);
    
    previewCache.set(url, { data: preview, timestamp: Date.now() });
    
    return NextResponse.json({ success: true, preview });
    
  } catch (error: any) {
    try {
      const urlObj = new URL(url);
      return NextResponse.json({ 
        success: true, 
        preview: {
          url,
          title: urlObj.hostname,
          description: '',
          image: '',
          siteName: urlObj.hostname,
          favicon: `${urlObj.protocol}//${urlObj.host}/favicon.ico`
        }
      });
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
  }
}
