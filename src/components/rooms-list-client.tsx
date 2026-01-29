"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/services/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import JoinRoomButton from "./join-room-button";
import LeaveRoomButton from "./leave-room-button";

type Room = {
  id: string;
  name: string;
  memberCount: number;
};

export function RoomsListClient({
  userId,
  initialJoinedRooms,
  initialPublicRooms,
}: {
  userId: string;
  initialJoinedRooms: Room[];
  initialPublicRooms: Room[];
}) {
  const [joinedRooms, setJoinedRooms] = useState<Room[]>(initialJoinedRooms);
  const [publicRooms, setPublicRooms] = useState<Room[]>(initialPublicRooms);

  const refetchRooms = useCallback(async () => {
    const joinedRoomsFresh = await fetchJoinedRooms(userId);
    const publicRoomsFresh = await fetchPublicRooms();
    setJoinedRooms(joinedRoomsFresh);
    setPublicRooms(publicRoomsFresh);
  }, [userId]);

  useEffect(() => {
    const supabase = createClient();
    let channel: any = null;
    let cancel = false;

    supabase.realtime.setAuth().then(() => {
      if (cancel) return;

      // Subscribe to chat_room_member changes
      channel = supabase.channel(`user:${userId}:rooms`);

      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_room_member",
            filter: `member_id=eq.${userId}`,
          },
          async (_payload: any) => {
            if (!cancel) {
              // Ada perubahan di membership user ini
              // Fetch updated rooms list dari server
              await refetchRooms();
            }
          }
        )
        .subscribe();
    });

    return () => {
      cancel = true;
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [userId, refetchRooms]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <RoomList title="Your Rooms" rooms={joinedRooms} isJoined onRoomsChange={refetchRooms} />
      <RoomList
        title="Public Rooms"
        rooms={publicRooms.filter(
          (room) => !joinedRooms.some((r) => r.id === room.id),
        )}
        onRoomsChange={refetchRooms}
      />
    </div>
  );
}

function RoomList({
  title,
  rooms,
  isJoined,
  onRoomsChange,
}: {
  title: string;
  rooms: Room[];
  isJoined?: boolean;
  onRoomsChange?: () => void;
}) {
  if (rooms.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl">{title}</h2>
        <Button asChild>
          <Link href="rooms/new">Create Room</Link>
        </Button>
      </div>
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(250px,1fr))]">
        {rooms.map((room) => (
          <RoomCard {...room} key={room.id} isJoined={isJoined} onRoomsChange={onRoomsChange} />
        ))}
      </div>
    </div>
  );
}

function RoomCard({
  id,
  name,
  memberCount,
  isJoined,
  onRoomsChange,
}: {
  id: string;
  name: string;
  memberCount: number;
  isJoined?: boolean;
  onRoomsChange?: () => void;
}) {
  const handleAfterAction = () => {
    // Call refresh after a short delay to let DB update propagate
    setTimeout(() => {
      onRoomsChange?.();
    }, 500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </CardDescription>
      </CardHeader>
      <CardFooter className="gap-2">
        {isJoined ? (
          <>
            <Button asChild className="grow" size="sm">
              <Link href={`/rooms/${id}`}>Enter</Link>
            </Button>
            {
              <LeaveRoomButton 
                roomId={id} 
                size="sm" 
                variant="destructive"
                onSuccess={handleAfterAction}
              >
                Leave
              </LeaveRoomButton>
            }
          </>
        ) : (
          <JoinRoomButton
            roomId={id}
            variant="outline"
            className="grow"
            size="sm"
            onSuccess={handleAfterAction}
          >
            Join
          </JoinRoomButton>
        )}
      </CardFooter>
    </Card>
  );
}

async function fetchJoinedRooms(userId: string): Promise<Room[]> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("chat_room")
      .select("id, name, chat_room_member (member_id)")
      .order("name", { ascending: true });

    if (error) {
      return [];
    }

    return data
      .filter((room) => room.chat_room_member.some((u) => u.member_id === userId))
      .map((room) => ({
        id: room.id,
        name: room.name,
        memberCount: room.chat_room_member.length,
      }));
  } catch (error) {
    console.error("Error fetching joined rooms:", error);
    return [];
  }
}

async function fetchPublicRooms(): Promise<Room[]> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("chat_room")
      .select("id, name, chat_room_member (count)")
      .order("created_at", { ascending: true });

    if (error) {
      return [];
    }

    return data.map((room) => ({
      id: room.id,
      name: room.name,
      memberCount: room.chat_room_member[0].count,
    }));
  } catch (error) {
    console.error("Error fetching public rooms:", error);
    return [];
  }
}
