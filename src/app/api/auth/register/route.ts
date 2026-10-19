import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { registerSchema } from "@/lib/validations/auth";
import { eq, or } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      }
      return NextResponse.json({ errors }, { status: 400 });
    }

    const { username, displayName, email, password } = parsed.data;

    // Check uniqueness — both at once to avoid two round trips
    const [existing] = await db
      .select({ id: users.id, username: users.username, email: users.email })
      .from(users)
      .where(
        or(
          eq(users.username, username.toLowerCase()),
          eq(users.email, email.toLowerCase())
        )
      )
      .limit(1);

    if (existing) {
      if (existing.username === username.toLowerCase()) {
        return NextResponse.json(
          { errors: { username: "This username is already taken" } },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { errors: { email: "An account with this email already exists" } },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        username: username.toLowerCase(),
        displayName,
        email: email.toLowerCase(),
        passwordHash,
      })
      .returning({ id: users.id, username: users.username });

    return NextResponse.json(
      { user: { id: newUser.id, username: newUser.username } },
      { status: 201 }
    );
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
