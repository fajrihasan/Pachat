"use server";

import { z } from "zod";
import { CreateRoomSchema } from "../schemas/rooms";
import { getCurrentUser } from "../lib/getCurrentUser";
import { createAdminClient } from "../server";
import { redirect } from "next/navigation";
import { use } from "react";

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
    console.error(membershipError);
    return { error: true, message: "failed to add user to room" };
  }

  redirect(`/rooms/${room.id}`);
}

export async function addUserToRoom({
  roomId,
  userId,
}: {
  roomId: string;
  userId: string;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser == null) {
    return { error: true, message: "User not authenticated" };
  }

  const supabase = createAdminClient();

  const { data: roomMembership, error: roomMembershipError } = await supabase
    .from("chat_room_member")
    .select("member_id")
    .eq("chat_room_id", roomId)
    .eq("member_id", currentUser.id)
    .single();

    if (roomMembershipError || !roomMembership) {
    return { error: true, message: "Current user is not a member of this room" };
  }

  const { data: userProfile } = await supabase
    .from("user_profile")
    .select("id")
    .eq("id", userId)
    .single();

  if (userProfile == null) {
    return { error: false, message: "User not found" };
  }

  const { data: exitingMembership } = await supabase
    .from("chat_room_member")
    .select("id")
    .eq("chat_room_id", roomId)
    .eq("member_id", userProfile.id)
    .single();

    if (exitingMembership) {
    return { error: true, message: "User is already a member of this room" };
  }

  const { error: insertError } = await supabase
    .from("chat_room_member")
    .insert({ chat_room_id: roomId, member_id: userProfile.id });

    if (insertError) {
    return { error: true, message: "Failed to add user to room" };
  }

  return {error: false , message: "User added to room successfully"};
}
