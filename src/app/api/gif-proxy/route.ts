import { NextRequest, NextResponse } from 'next/server';

// Прокси для загрузки GIF изображений - обходит CORS
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  try {
    // Декодируем URL если он был закодирован
    const decodedUrl = decodeURIComponent(url);
    
    const response = await fetch(decodedUrl, {
      headers: {
        'Accept': 'image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': new URL(decodedUrl).origin,
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error('Proxy fetch failed:', response.status, decodedUrl);
      return NextResponse.json({ error: 'Failed to fetch', status: response.status }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/gif';
    
    // Проверяем что это действительно изображение
    if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
      console.error('Not an image:', contentType, decodedUrl);
      return NextResponse.json({ error: 'Not an image' }, { status: 400 });
    }
    
    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}
