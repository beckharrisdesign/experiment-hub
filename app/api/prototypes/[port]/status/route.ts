import { NextRequest, NextResponse } from "next/server";
import net from "net";

export async function GET(
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

  const isRunning = await checkPort(portNumber);

  return NextResponse.json({ port: portNumber, running: isRunning });
}

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    // Try to connect to the port as a client
    // If we can connect, something is listening on that port
    const socket = new net.Socket();
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(false);
      }
    }, 1000); // 1 second timeout

    socket.once("connect", () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        socket.destroy();
        resolve(true); // Successfully connected = server is running
      }
    });

    socket.once("error", (err: NodeJS.ErrnoException) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        // ECONNREFUSED means nothing is listening
        // Other errors also mean nothing is listening
        resolve(false);
      }
    });

    socket.connect(port, "127.0.0.1");
  });
}

