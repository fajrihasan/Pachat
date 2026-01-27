"use server";

import { z } from "zod";
import { CreateRoomSchema } from "../schemas/rooms";
import { getCurrentUser } from "../lib/getCurrentUser";
import { createAdminClient } from "../server";
import { redirect } from "next/navigation";

export async function createRoom(unsafeData: z.infer<typeof CreateRoomSchema>) {
  const { success, data } = CreateRoomSchema.safeParse(unsafeData);
  if (!success) {
    return {
      error: data,
      message: "Invalid room data",
    };
  }

  const user = await getCurrentUser();
  if (user == null) {
    return {
      error: true,
      message: "User not found",
    };
  }

  const supabase = createAdminClient();

  const { data: room, error: roomError } = await supabase
    .from("chat_room")
    .insert({ name: data.name, is_public: data.isPublic })
    .select("id")
    .single();

  if (roomError || room == null) {
    return { error: true, message: "failed to create room" };
  }

  const { error: membershipError } = await supabase
    .from("chat_room_member")
    .insert({ chat_room_id: room.id, member_id: user.id });

    if (membershipError) {
        console.error(membershipError)
        return {error: true, message:"failed to add user to room"}
    }

    redirect(`/rooms/${room.id}`)
}
