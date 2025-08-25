import { NextRequest, NextResponse } from 'next/server';

// Placeholder POST handler for video grading with LUT
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { message: 'Video grading with LUT endpoint not implemented yet' },
    { status: 501 }
  );
}
