import { createClient } from "../server";

export const getCurrentUser = async () => {
    const supabase = await createClient();
    return (await supabase.auth.getUser()).data.user;
}