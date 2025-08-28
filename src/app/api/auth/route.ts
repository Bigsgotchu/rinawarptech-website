import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../lib/db';
import { sign, verify } from 'jsonwebtoken';
import { hash, compare } from 'bcrypt';

const COOKIE_NAME = 'rinawarp_auth';
const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user from database
const user = await db.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        subscription: {
          select: {
            status: true
          }
        }
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
const isValid = await compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session token
    const token = sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie
    cookies().set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // Return user info
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionStatus: user.subscription?.status || 'inactive',
      },
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME);

    if (!token) {
      return NextResponse.json({ isAuthenticated: false });
    }

    // Verify token
    const payload = verify(token.value, JWT_SECRET) as {
      userId: string;
      email: string;
    };

    // Get user
const user = await db.user.findFirst({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        subscription: {
          select: {
            status: true
          }
        }
      },
    });

    if (!user) {
      return NextResponse.json({ isAuthenticated: false });
    }

    return NextResponse.json({
      isAuthenticated: true,
      user,
    });
  } catch (error) {
    console.error('Auth validation error:', error);
    return NextResponse.json({ isAuthenticated: false });
  }
}

export async function DELETE() {
  cookies().delete(COOKIE_NAME);
  return NextResponse.json({ success: true });
}
