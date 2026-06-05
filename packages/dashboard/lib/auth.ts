import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";
import { users } from "@kontex/shared/schema";
import { eq } from "drizzle-orm";

export async function auth() {
  const { userId: clerkId, getToken } = await clerkAuth();
  
  console.log("From Lib/Auth.ts")
  console.log(clerkId)


  if (!clerkId) {
    return null;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }

  // Ensure user exists in our DB
  let [user] = await db().select().from(users).where(eq(users.clerkId, clerkId)).limit(1);

  if (!user) {
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const name = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || email;
    
    [user] = await db()
      .insert(users)
      .values({
        clerkId,
        email,
        name
      })
      .returning();
  }

  // Use the Clerk session token as the API key for MCP calls
  const apiKey = await getToken();

  return {
    user: { id: user.id },
    apiKey: apiKey ?? undefined
  };
}