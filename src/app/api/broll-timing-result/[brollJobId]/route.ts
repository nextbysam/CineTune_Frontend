import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { jobManager } from '@/lib/job-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brollJobId: string }> }
) {
  const requestId = nanoid().slice(0, 8);
  const { brollJobId } = await params;
  


  // Handle CORS preflight request
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {

    if (!brollJobId) {
      return NextResponse.json(
        { error: 'B-roll job ID is required' },
        { status: 400 }
      );
    }

    const job = jobManager.getJob(brollJobId);

    if (!job) {
      return NextResponse.json(
        { 
          error: 'B-roll timing job not found',
          brollJobId
        },
        { status: 404 }
      );
    }

    const response: any = {
      brollJobId,
      status: job.status,
    };

    if (job.status === 'completed' && job.brollTimings) {
      response.brollTimings = job.brollTimings;
      response.message = 'B-roll timing suggestions generated successfully';
      response.count = job.brollTimings.length;
      
    } else if (job.status === 'failed') {
      response.error = job.error;
      response.message = 'B-roll timing generation failed';
    } else if (job.status === 'processing') {
      response.message = 'B-roll timing suggestions are still being generated';
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
} 