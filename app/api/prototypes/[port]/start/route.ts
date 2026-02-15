import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { promises as fs } from "fs";
import { getPrototypes } from "@/lib/data";

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

  // Find prototype by port
  const prototypes = await getPrototypes();
  const prototype = prototypes.find((p) => p.port === portNumber);

  if (!prototype) {
    return NextResponse.json(
      { error: "Prototype not found for this port" },
      { status: 404 }
    );
  }

  // Get prototype directory path
  const prototypePath = path.join(process.cwd(), prototype.linkPath);

  // Check if directory exists
  try {
    const stats = await fs.stat(prototypePath);
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { error: "Prototype directory not found" },
        { status: 404 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Prototype directory not found" },
      { status: 404 }
    );
  }

  // Check if package.json exists
  const packageJsonPath = path.join(prototypePath, "package.json");
  try {
    await fs.access(packageJsonPath);
  } catch {
    return NextResponse.json(
      { error: "package.json not found in prototype directory" },
      { status: 404 }
    );
  }

  // Start the server
  try {
    const child = spawn("npm", ["run", "dev"], {
      cwd: prototypePath,
      detached: true,
      stdio: "ignore",
      shell: false,
    });

    child.unref();

    // Give it a moment to start
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return NextResponse.json({
      success: true,
      message: "Server starting",
      port: portNumber,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to start server: ${error.message}` },
      { status: 500 }
    );
  }
}

