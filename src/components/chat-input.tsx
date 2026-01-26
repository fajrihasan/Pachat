"use client";

import { SendIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "./ui/input-group";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { sendMessage } from "@/services/supabase/actions/messages";

export function ChatInput({ roomId }: { roomId: string }) {
  const [message, setMessage] = useState("");

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const text = message.trim();
    if (!text) return;

    setMessage("")
    const result = await sendMessage({ text, roomId });
    if (result.error) {
      toast.error(result.message);
    } else {
      setMessage("");
    }
  }
  return (
    <form onSubmit={handleSubmit} className="p-3">
      <InputGroup>
        <InputGroupTextarea
          placeholder="Type your message..."
          className="field-sizing-content min-h-auto"
          onChange={(e) => setMessage(e.target.value)}
          value={message}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="submit"
            aria-label="send"
            title="send"
            size="icon-sm"
          >
            <SendIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
