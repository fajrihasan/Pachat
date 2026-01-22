import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { MessageSquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createAdminClient } from "@/services/supabase/server";
import { getCurrentUser } from "@/services/supabase/lib/getCurrentUser";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function Home() {
  const user = await getCurrentUser();

  if (user == null) {
    redirect("./auth/login");
  }

  const [publicRooms, joinedRooms] = await Promise.all([
    getPublicRooms(),
    getJoinedRooms(user.id),
  ]);

  if (publicRooms.length === 0 && joinedRooms.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
        <Empty className="border border-dashead">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareIcon />
            </EmptyMedia>
            <EmptyTitle>No chat room title</EmptyTitle>
            <EmptyDescription>
              Create a new chat room to get started
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="rooms/new">Create Room</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <RoomList title="Your Rooms" rooms={publicRooms} isJoined />
      <RoomList
        title="Joined Rooms"
        rooms={publicRooms.filter(
          (room) => !joinedRooms.some((r) => r.id === room.id),
        )}
      />
    </div>
  );
}

function RoomList({
  title,
  rooms,
  isJoined,
}: {
  title: string;
  rooms: { id: string; name: string; memberCount: number }[];
  isJoined?: boolean;
}) {
  if (rooms.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Button asChild>
          <Link href="rooms/new">Create Room</Link>
        </Button>
      </div>
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(250px,1fr))]">
        {rooms.map((room) => (
          <RoomCard {...room} key={room.id} isJoined={isJoined} />
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
}: {
  id: string
  name: string
  memberCount: number
  isJoined?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>
          {memberCount} {memberCount === 2 ? "member" : "members"}
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-2">
        {isJoined ? (
          <>
          <Button asChild className="grow" size="sm">
            <Link href={`/room/${id}`}>Enter</Link>
          </Button>
          </>
        ): null }
      </CardContent>
    </Card>
  );
}

async function getPublicRooms() {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("chat_room")
    .select("id, name, chat_room_member(count)")
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return data.map((room) => ({
    id: room.id,
    name: room.name,
    memberCount: room.chat_room_member[0].count,
  }));
}
async function getJoinedRooms(userId: string) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("chat_room")
    .select("id, name, chat_room_member(member_id)")
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return data
    .filter((room) =>
      room.chat_room_member.some((u) => u.member_id === "current_user_id"),
    )
    .map((room) => ({
      id: room.id,
      name: room.name,
      memberCount: room.chat_room_member.length,
    }));
}
