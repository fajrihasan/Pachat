"use client";

import { ChatInput } from "@/components/chat-input";
import { Message } from "@/services/supabase/actions/messages";
import { ChatMessage } from "@/components/chat-message";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/services/supabase/client";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

// Dynamic import untuk menghindari hydration mismatch pada Dialog component
const InviteUserModalLazy = dynamic(() => import("@/components/invite.user.modal").then(mod => ({ default: mod.InviteUserModal })), {
  ssr: false,
  loading: () => <Button size="sm" variant="outline" disabled>Loading...</Button>
});

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

  const {
    loadMoreMessages,
    messages: oldMessage,
    status,
    triggerQueryRef,
  } = useInfiniteScrollChat({
    roomId: room.id,
    startingMessages: messages,
  });

  const [sentMessages, setSentMessages] = useState<
    (Message & { status: "pending" | "error" | "success" })[]
  >([]);

  const visibleMessages = oldMessage.concat(
    realtimeMessages,
    sentMessages.filter((m) => !realtimeMessages.find((rm) => rm.id === m.id)),
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll ke bawah ketika ada pesan baru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "instant",
    });
  }, [visibleMessages.length]);

  return (
    <div className="container mx-auto h-screen-with-header border border-y-0 flex flex-col">
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="border-b">
          <h1 className="text-2xl font-bold">{room.name}</h1>
          {/* TODO: make real data */}
          <p className="text-sm text-muted-foreground">
            {connectedUsers}
            {connectedUsers === 1 ? " user" : " users"} Online
          </p>
        </div>
        <InviteUserModalLazy roomId={room.id} />
      </div>
      <div
        className="grow overflow-y-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        <div>
          {status === "loading" && (
            <p className="text-center text-sm text-muted-foreground py-2">
              Loading more messages...
            </p>
          )}
          {status === "error" && (
            <div className="text-center">
              <p className="text-sm text-destructive py-2">
                Error loading messages.
              </p>
              <Button onClick={loadMoreMessages} variant="outline">
                Retry
              </Button>
            </div>
          )}
          {visibleMessages.map((message, index) => (
            <ChatMessage
              key={message.id}
              {...message}
              ref={
                index === 0 && status === "idle" ? triggerQueryRef : null
              }
            />
          ))}
          <div ref={messagesEndRef}></div>
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

function userRealTimeChat({
  roomId,
  userId,
}: {
  roomId: string;
  userId: string;
}) {
  const [connectedUsers, setConnectedUsers] = useState<number>(1);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const supabase = createClient();
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
        // Listen for database changes (pesan baru)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "message",
            filter: `chat_room_id=eq.${roomId}`,
          },
          (payload) => {
            const record = payload.new;
            
            // author_data bisa ada dari trigger atau kosong
            let authorData = record.author_data;
            
            // Jika kosong, fetch dari client
            if (!authorData) {
              supabase
                .from("user_profile")
                .select("name, image_url")
                .eq("id", record.author_id)
                .single()
                .then(({ data }) => {
                  if (!cancel && data) {
                    authorData = { name: data.name, image_url: data.image_url };
                    setMessages((prevMessages) => [
                      ...prevMessages,
                      {
                        id: record.id,
                        text: record.text,
                        created_at: record.created_at,
                        author_id: record.author_id,
                        author: {
                          name: authorData.name || "",
                          image_url: authorData.image_url || null,
                        },
                      },
                    ]);
                  }
                });
            } else {
              setMessages((prevMessages) => [
                ...prevMessages,
                {
                  id: record.id,
                  text: record.text,
                  created_at: record.created_at,
                  author_id: record.author_id,
                  author: {
                    name: authorData.name || "",
                    image_url: authorData.image_url || null,
                  },
                },
              ]);
            }
          }
        )
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

const LIMIT = 25;
function useInfiniteScrollChat({
  startingMessages,
  roomId,
}: {
  startingMessages: Message[];
  roomId: string;
}) {
  const [messages, setMessages] = useState<Message[]>(startingMessages);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">(
    startingMessages.length === 0 ? "done" : "idle",
  );

  async function loadMoreMessages() {
    if (status === "loading" || status === "done") return;
    const supabase = createClient();
    setStatus("loading");

    await new Promise((resolve) => setTimeout(resolve, 1000)); // simulate delay

    const { data, error } = await supabase
      .from("message")
      .select(
        "id, text, created_at, author_id, author:user_profile (name, image_url)",
      )
      .eq("chat_room_id", roomId)
      .lt("created_at", messages[0]?.created_at)
      .order("created_at", { ascending: false })
      .limit(LIMIT);

    if (error) {
      setStatus("error");
      return;
    }

    setMessages((prev) => [...data.toReversed(), ...prev]);
    setStatus(data.length < LIMIT ? "done" : "idle");
  }

  function triggerQueryRef(node: HTMLDivElement | null) {
    if (node == null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMoreMessages();
          }
        });
      },
      { rootMargin: "50px" },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }

  return { messages, loadMoreMessages, triggerQueryRef, status };
}
