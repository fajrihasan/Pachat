"use client";

import { ChatInput } from "@/components/chat-input";
import { Message } from "@/services/supabase/actions/messages";
import { ChatMessage } from "@/components/chat-message";
import { RealtimeChannel } from "@supabase/supabase-js";
import { use, useEffect, useState } from "react";
import { createClient } from "@/services/supabase/client";

export default function RoomClient({
  room,
  user,
  messages,
}: {
  user: {
    id: string;
    name: string;
    image_url: string | null;
  };
  room: {
    id: string;
    name: string;
  };
  messages: Message[];
}) {
  const { connectedUsers } = userRealTimeChat({
    roomId: room.id,
    userId: user.id,
  });

  return (
    <div className="container mx-auto h-screen-with-header border border-y-0 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold">{room.name}</h1>
          {/* TODO: make real data */}
          <p className="text-sm text-muted-foreground">
            {connectedUsers}
            {connectedUsers === 1 ? " user" : " users"} Online
          </p>
        </div>
        <InviteUserModal roomId={room.id} />
      </div>
      <div
        className="grow overflow-y-auto flex flex-col-reverse"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        <div>
          {messages.toReversed().map((message) => (
            <ChatMessage key={message.id} {...message} />
          ))}
        </div>
      </div>
      <ChatInput roomId={room.id} />
    </div>
  );
}

function InviteUserModal({ roomId }: { roomId: string }) {
  return null;
}

function userRealTimeChat({
  roomId,
  userId,
}: {
  roomId: string;
  userId: string;
}) {
  // const [channel, setChannel] = useState<RealtimeChannel>();
  const [connectedUsers, setConnectedUsers] = useState<number>(1);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let newChannel: RealtimeChannel;
    let cancel = false;

    supabase.realtime.setAuth().then(() => {
      if (cancel) return;
      newChannel = supabase.channel(`room:${roomId}:messages`, {
        config: {presence: { key: userId } },
      });

      newChannel
        .on("presence", { event: "sync" }, () => {
          setConnectedUsers(Object.keys(newChannel.presenceState()).length);
        })
        .on("broadcast", { event: "INSERT" }, (payload) => {
          const record = payload.payload.record
          console.log(payload)
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: record.id,
              text: record.text,
              created_at: record.created_at,
              author_id: record.author_id,
              author: {
                name: record.author.name,
                image_url: record.author.image_url,
              },
            },
          ])
        })
        .subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          newChannel.track({ userId });
        })
    })

    return () => {
      cancel = true;
      if (!newChannel) return;
      newChannel.untrack();
      newChannel.unsubscribe();
    };
  }, [roomId, userId]);

  return { connectedUsers, messages };
}

