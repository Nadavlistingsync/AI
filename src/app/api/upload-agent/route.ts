import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!file || !name || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Only ZIP files are allowed' },
        { status: 400 }
      );
    }

    // Upload file to S3
    const fileExt = file.name.split('.').pop();
    const s3Key = `uploads/${uuidv4()}.${fileExt}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
    }));

    // Create agent in database
    const agent = await prisma.deployment.create({
      data: {
        name,
        description,
        createdBy: session.user.id,
        isPublic: true,
        version: '1.0.0',
        environment: 'production',
        framework: 'custom',
        modelType: 'custom',
        status: 'active',
        accessLevel: 'public',
        licenseType: 'free',
        deployedBy: session.user.id,
        startDate: new Date(),
        rating: 0,
        totalRatings: 0,
        downloadCount: 0,
        health: {},
        source: s3Key,
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: { 
        id: agent.id,
        name: agent.name,
        fileUrl: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`
      } 
    });

  } catch (error) {
    console.error('Error uploading agent:', error);
    return NextResponse.json(
      { error: 'Failed to upload agent' },
      { status: 500 }
    );
  }
} 