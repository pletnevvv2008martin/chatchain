import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Секретный ключ для защиты endpoint
const DEPLOY_SECRET = process.env.DEPLOY_SECRET || "chatchain_deploy_2024";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { secret } = body;

    // Проверка секретного ключа
    if (secret !== DEPLOY_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }

    // Выполняем git pull и перезапуск
    const { stdout: pullOutput } = await execAsync("git pull origin master");
    console.log("Git pull:", pullOutput);

    // Перезапуск PM2 процессов (если есть)
    try {
      await execAsync("pm2 restart all 2>/dev/null || echo 'PM2 not running'");
    } catch {
      // PM2 может не быть установлен локально
    }

    return NextResponse.json({
      success: true,
      message: "Deploy completed",
      output: pullOutput
    });
  } catch (error: any) {
    console.error("Deploy error:", error);
    return NextResponse.json({
      error: "Deploy failed",
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/deploy",
    method: "POST",
    required: "secret"
  });
}
