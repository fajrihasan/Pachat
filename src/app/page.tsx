import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { MessageSquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
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
