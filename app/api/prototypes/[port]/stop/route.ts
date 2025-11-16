import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params;
  const portNumber = parseInt(port, 10);

  if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
    return NextResponse.json(
      { error: "Invalid port number" },
      { status: 400 }
    );
  }

  try {
    // Find and kill process using the port
    // On macOS/Linux, use lsof to find the process
    const isWindows = process.platform === "win32";
    let pid: string | null = null;

    if (isWindows) {
      // Windows: use netstat to find PID, then taskkill
      try {
        const { stdout } = await execAsync(
          `netstat -ano | findstr :${portNumber}`
        );
        const lines = stdout.trim().split("\n");
        if (lines.length > 0) {
          // Extract PID from last column
          const lastLine = lines[0].trim();
          const parts = lastLine.split(/\s+/);
          pid = parts[parts.length - 1];
        }
      } catch {
        // No process found
      }

      if (pid) {
        await execAsync(`taskkill /F /PID ${pid}`);
        return NextResponse.json({
          success: true,
          message: "Server stopped",
          port: portNumber,
        });
      }
    } else {
      // macOS/Linux: use lsof
      try {
        const { stdout } = await execAsync(`lsof -ti:${portNumber}`);
        pid = stdout.trim();
      } catch {
        // No process found
      }

      if (pid) {
        await execAsync(`kill -9 ${pid}`);
        return NextResponse.json({
          success: true,
          message: "Server stopped",
          port: portNumber,
        });
      }
    }

    return NextResponse.json({
      success: false,
      message: "No process found on this port",
      port: portNumber,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to stop server: ${error.message}` },
      { status: 500 }
    );
  }
}

