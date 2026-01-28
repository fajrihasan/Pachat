"use client";

import { ChatInput } from "@/components/chat-input";
import { Message } from "@/services/supabase/actions/messages";
import { ChatMessage } from "@/components/chat-message";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
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
  const { connectedUsers, messages: realtimeMessages } = userRealTimeChat({
    roomId: room.id,
    userId: user.id,
  });
  const [sentMessages, setSentMessages] = useState<
    (Message & { status: "pending" | "error" | "success" })[]
  >([]);

  const visibleMessages = messages.toReversed().concat(
    realtimeMessages,
    sentMessages.filter((m) => !realtimeMessages.find((rm) => rm.id === m.id)),
  );

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
        className="grow overflow-y-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        <div>
          {visibleMessages.map((message) => (
            <ChatMessage key={message.id} {...message} />
          ))}
        </div>
      </div>
      <ChatInput
        roomId={room.id}
        onSend={(message) => {
          setSentMessages((prev) => [
            ...prev,
            {
              id: message.id,
              text: message.text,
              created_at: new Date().toISOString(),
              author_id: user.id,
              author: {
                name: user.name,
                image_url: user.image_url,
              },
              status: "pending",
            },
          ]);
        }}
        onSuccessfullSend={(message) => {
          setSentMessages((prev) =>
            prev.map((m) =>
              m.id === message.id ? { ...message, status: "success" } : m,
            ),
          );
        }}
        onErrorSend={(id) => {
          setSentMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, status: "error" } : m)),
          );
        }}
      />
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
    console.log("use effect jalan");
    let newChannel: RealtimeChannel;
    let cancel = false;

    supabase.realtime.setAuth().then(() => {
      if (cancel) return;
      newChannel = supabase.channel(`room:${roomId}:messages`, {
        config: { presence: { key: userId }, broadcast: { self: true } },
      });

      newChannel
        .on("presence", { event: "sync" }, () => {
          setConnectedUsers(Object.keys(newChannel.presenceState()).length);
        })
        .on("broadcast", { event: "new_message" }, (payload) => {
          console.log("Realtime payload:", payload.payload);
          const record = payload.payload;
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
          ]);
        })
        .subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          newChannel.track({ userId });
        });
    });

    return () => {
      cancel = true;
      if (!newChannel) return;
      newChannel.untrack();
      newChannel.unsubscribe();
    };
  }, [roomId, userId]);

  return { connectedUsers, messages };
}
