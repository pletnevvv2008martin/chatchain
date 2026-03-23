import { NextResponse } from 'next/server';

// URL игрового сервера
const GAME_SERVER_URL = 'wss://geological-unit-concept-congress.trycloudflare.com';

export async function GET() {
  return NextResponse.json({
    gameServerUrl: GAME_SERVER_URL,
    timestamp: Date.now(),
    source: 'auto'
  });
}
