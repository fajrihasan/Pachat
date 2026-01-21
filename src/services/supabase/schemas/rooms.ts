import { z } from "zod";

export const CreateRoomSchema = z.object({
  name: z.string().min(1).trim(),
  isPublic: z.boolean(),
});