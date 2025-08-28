import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function terminalAuthMiddleware(req: NextRequest) {
  try {
    // Check for API key in header
    const apiKey = req.headers.get('x-api-key');
    if (apiKey) {
      const key = await prisma.apiKey.findUnique({
        where: { key: apiKey },
        include: { user: true },
      });

      if (key && (!key.expiresAt || key.expiresAt > new Date())) {
        // Update last used timestamp
        await prisma.apiKey.update({
          where: { id: key.id },
          data: { lastUsed: new Date() },
        });
        return key.user;
      }
    }

    // Check for JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    
    const { payload } = await jwtVerify(token, secret);
    
    if (!payload.sub) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
    });

    return user;
  } catch (error) {
    console.error('Auth middleware error:', error);
    return null;
  }
}
