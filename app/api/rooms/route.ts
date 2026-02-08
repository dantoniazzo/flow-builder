import { NextRequest, NextResponse } from "next/server";

const LIVEBLOCKS_API = "https://api.liveblocks.io/v2";

// Get all rooms
export async function GET() {
  try {
    const response = await fetch(`${LIVEBLOCKS_API}/rooms`, {
      headers: {
        Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch rooms: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Create a new room
export async function POST(request: NextRequest) {
  try {
    const { id, name } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    // Create the room with metadata for the name
    const response = await fetch(`${LIVEBLOCKS_API}/rooms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        metadata: {
          name: name || "Untitled Flow",
        },
        defaultAccesses: ["room:write"],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to create room: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
