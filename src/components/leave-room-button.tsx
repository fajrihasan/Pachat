"use client";

import { ComponentProps } from "react";
import { ActionButton } from "./ui/action-button";
import { createClient } from "@/services/supabase/client";
import { useCurrentUser } from "@/services/supabase/hooks/useCurrentUser";
import { useRouter } from "next/navigation";

export default function LeaveRoomButton({
  children,
  roomId,
  onSuccess,
  ...props
}: Omit<ComponentProps<typeof ActionButton>, "action"> & { roomId: string; onSuccess?: () => void }) {
  const { user } = useCurrentUser();
  const router = useRouter();

  async function leaveRoom() {
    if (user == null) {
      return { error: true, message: "User not logged in" };
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("chat_room_member")
      .delete()
      .eq("chat_room_id", roomId)
      .eq("member_id", user.id);

    if (error) {
      return { error: true, message: "Failed to leave room" };
    }

    onSuccess?.();
    router.refresh();

    return { error: false };
  }

  return (
    <ActionButton {...props} action={leaveRoom}>
      {children}
    </ActionButton>
  );
}
