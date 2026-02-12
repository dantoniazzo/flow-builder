import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import {
  MoreHorizontal,
  Plus,
  ChevronDown,
  Trash2,
  Pencil,
} from 'lucide-react';

interface Room {
  id: string;
  metadata?: {
    name?: string;
  };
  createdAt?: string;
}

interface RoomSelectorProps {
  currentRoomId: string;
  onRoomChange: (roomId: string) => void;
}

export function RoomSelector({
  currentRoomId,
  onRoomChange,
}: RoomSelectorProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const doubleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch rooms on mount
  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRooms(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Focus input when editing
  useEffect(() => {
    if (editingRoomId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingRoomId]);

  const getCurrentRoomName = () => {
    const room = rooms.find((r) => r.id === currentRoomId);
    return room?.metadata?.name || currentRoomId;
  };

  const createRoom = async () => {
    const newRoomId = `room-${Date.now()}`;
    const newRoomName = 'Untitled Flow';

    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newRoomId, name: newRoomName }),
      });

      if (response.ok) {
        const newRoom = await response.json();
        setRooms((prev) => [newRoom, ...prev]);
        // Start editing the new room name immediately
        setEditingRoomId(newRoomId);
        setEditingName(newRoomName);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const renameRoom = async (roomId: string, newName: string) => {
    if (!newName.trim()) {
      setEditingRoomId(null);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/rooms/${encodeURIComponent(roomId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName.trim() }),
        },
      );

      if (response.ok) {
        setRooms((prev) =>
          prev.map((room) =>
            room.id === roomId
              ? {
                  ...room,
                  metadata: { ...room.metadata, name: newName.trim() },
                }
              : room,
          ),
        );
      }
    } catch (error) {
      console.error('Failed to rename room:', error);
    } finally {
      setEditingRoomId(null);
    }
  };

  const deleteRoom = async (roomId: string) => {
    if (rooms.length <= 1) {
      alert('Cannot delete the last room');
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/rooms/${encodeURIComponent(roomId)}`,
        {
          method: 'DELETE',
        },
      );

      if (response.ok) {
        setRooms((prev) => prev.filter((room) => room.id !== roomId));
        // If deleting current room, switch to another
        if (roomId === currentRoomId) {
          const remaining = rooms.filter((r) => r.id !== roomId);
          if (remaining.length > 0) {
            onRoomChange(remaining[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete room:', error);
    }
  };

  const handleRoomClick = (roomId: string) => {
    // Clear any pending double-click timeout
    if (doubleClickTimeoutRef.current) {
      clearTimeout(doubleClickTimeoutRef.current);
      doubleClickTimeoutRef.current = null;
    }

    // Set a timeout to handle single click (switch room)
    doubleClickTimeoutRef.current = setTimeout(() => {
      if (roomId !== currentRoomId) {
        onRoomChange(roomId);
        setIsOpen(false);
      }
    }, 200);
  };

  const handleRoomDoubleClick = (roomId: string, currentName: string) => {
    // Clear the single-click timeout
    if (doubleClickTimeoutRef.current) {
      clearTimeout(doubleClickTimeoutRef.current);
      doubleClickTimeoutRef.current = null;
    }

    // Start editing
    setEditingRoomId(roomId);
    setEditingName(currentName);
  };

  const handleKeyDown = (e: React.KeyboardEvent, roomId: string) => {
    if (e.key === 'Enter') {
      renameRoom(roomId, editingName);
    } else if (e.key === 'Escape') {
      setEditingRoomId(null);
    }
  };

  const startRename = (roomId: string, currentName: string) => {
    setEditingRoomId(roomId);
    setEditingName(currentName);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="absolute top-4 left-4 z-[100] flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm hover:bg-zinc-700 transition-colors max-w-[200px]">
          <span className="truncate">{getCurrentRoomName()}</span>
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 bg-zinc-900 border-zinc-700"
        sideOffset={4}
      >
        {/* Header with + button */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Workflows
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              createRoom();
            }}
            className="p-1 hover:bg-zinc-700 rounded transition-colors"
            title="Create new workflow"
          >
            <Plus className="w-4 h-4 text-zinc-400 hover:text-white" />
          </button>
        </div>
        <DropdownMenuSeparator className="bg-zinc-700" />

        {/* Scrollable room list */}
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="px-2 py-4 text-center text-zinc-500 text-sm">
              Loading...
            </div>
          ) : rooms.length === 0 ? (
            <div className="px-2 py-4 text-center text-zinc-500 text-sm">
              No workflows yet
            </div>
          ) : (
            rooms.map((room) => {
              const roomName = room.metadata?.name || room.id;
              const isEditing = editingRoomId === room.id;
              const isActive = room.id === currentRoomId;

              return (
                <div
                  key={room.id}
                  className={`group flex items-center gap-2 px-2 py-1.5 mx-1 rounded cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'hover:bg-zinc-800 text-zinc-300'
                  }`}
                  onClick={() => !isEditing && handleRoomClick(room.id)}
                  onDoubleClick={() =>
                    !isEditing && handleRoomDoubleClick(room.id, roomName)
                  }
                >
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => renameRoom(room.id, editingName)}
                      onKeyDown={(e) => handleKeyDown(e, room.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-1 py-0.5 bg-zinc-800 border border-zinc-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <span className="flex-1 truncate text-sm">{roomName}</span>
                  )}

                  {/* Room actions menu */}
                  {!isEditing && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 rounded transition-all"
                        >
                          <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-zinc-900 border-zinc-700"
                      >
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(room.id, roomName);
                          }}
                          className="text-zinc-300 focus:bg-zinc-800 focus:text-white cursor-pointer"
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRoom(room.id);
                          }}
                          className="text-red-400 focus:bg-red-500/20 focus:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
