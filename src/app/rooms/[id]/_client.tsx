"use client";

import { ChatInput } from "@/components/chat-input";
import { Message } from "@/services/supabase/actions/messages";
import { ChatMessage } from "@/components/chat-message";

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
  return (
    <div className="container mx-auto h-screen-with-header border border-y-0 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold">{room.name}</h1>
          {/* TODO: make real data */}
          <p className="text-sm text-muted-foreground">0 User Online</p>
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