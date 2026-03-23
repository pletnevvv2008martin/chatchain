import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Force Node.js runtime for fs access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VOICES_DIR = path.join(process.cwd(), 'data', 'voices');

// Ensure voices directory exists
const ensureDir = () => {
  if (!fs.existsSync(VOICES_DIR)) {
    fs.mkdirSync(VOICES_DIR, { recursive: true });
  }
};

// Save voice message metadata
interface VoiceMetadata {
  id: string;
  userId: string;
  userName: string;
  duration: number;
  mimeType: string;
  createdAt: number;
}

// GET - retrieve voice message
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const voiceId = searchParams.get('id');

  console.log('GET /api/voice - voiceId:', voiceId);

  if (!voiceId) {
    return NextResponse.json({ error: 'Voice ID required' }, { status: 400 });
  }

  try {
    ensureDir();

    // Find the voice file
    const files = fs.readdirSync(VOICES_DIR);
    console.log('Files in voices dir:', files);
    
    const voiceFile = files.find(f => f.startsWith(voiceId) && !f.endsWith('.json'));

    if (!voiceFile) {
      console.log('Voice file not found for ID:', voiceId);
      return NextResponse.json({ error: 'Voice not found', voiceId }, { status: 404 });
    }

    const filePath = path.join(VOICES_DIR, voiceFile);
    console.log('Found voice file:', voiceFile);

    // Determine MIME type from extension
    let mimeType = 'audio/webm';
    if (voiceFile.endsWith('.mp4') || voiceFile.endsWith('.m4a')) {
      mimeType = 'audio/mp4';
    } else if (voiceFile.endsWith('.ogg')) {
      mimeType = 'audio/ogg';
    }

    const fileBuffer = fs.readFileSync(filePath);
    console.log('Reading file, size:', fileBuffer.length, 'bytes, mime:', mimeType);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error reading voice file:', error);
    return NextResponse.json({ error: 'Failed to read voice', details: String(error) }, { status: 500 });
  }
}

// POST - save voice message
export async function POST(request: NextRequest) {
  console.log('POST /api/voice - saving voice message');
  
  try {
    ensureDir();
    
    const body = await request.json();
    const { audioData, userId, userName, duration, mimeType } = body;

    console.log('Received voice data:', {
      hasAudioData: !!audioData,
      audioDataLength: audioData?.length,
      mimeType,
      duration,
      userId,
      userName
    });

    if (!audioData) {
      return NextResponse.json({ error: 'Audio data required' }, { status: 400 });
    }

    // Generate unique ID
    const voiceId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine file extension from MIME type
    let extension = 'webm';
    if (mimeType?.includes('mp4') || mimeType?.includes('m4a')) {
      extension = 'm4a';
    } else if (mimeType?.includes('ogg')) {
      extension = 'ogg';
    }

    // Extract base64 data - remove data URI prefix if present
    let base64Data = audioData;
    if (audioData.includes(',')) {
      base64Data = audioData.split(',')[1];
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(base64Data, 'base64');

    // Save file
    const fileName = `${voiceId}.${extension}`;
    const filePath = path.join(VOICES_DIR, fileName);
    fs.writeFileSync(filePath, audioBuffer);

    // Save metadata
    const metadata: VoiceMetadata = {
      id: voiceId,
      userId: userId || 'anonymous',
      userName: userName || 'Anonymous',
      duration: duration || 0,
      mimeType: mimeType || `audio/${extension}`,
      createdAt: Date.now(),
    };

    const metadataPath = path.join(VOICES_DIR, `${voiceId}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata));

    console.log('Voice saved successfully:', voiceId, 'size:', audioBuffer.length, 'bytes');

    return NextResponse.json({
      success: true,
      voiceId,
      url: `/api/voice?id=${voiceId}`,
      size: audioBuffer.length,
    });
  } catch (error) {
    console.error('Error saving voice:', error);
    return NextResponse.json({ error: 'Failed to save voice', details: String(error) }, { status: 500 });
  }
}

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
