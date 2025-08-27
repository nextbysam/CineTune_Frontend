import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { jobManager } from '@/lib/job-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brollJobId: string }> }
) {
  const requestId = nanoid().slice(0, 8);
  const { brollJobId } = await params;
  
  console.log(`🟡 ==========================================`);
  console.log(`🟡 [${requestId}] GET /api/broll-timing-result/${brollJobId} - REQUEST STARTED`);
  console.log(`🟡 ==========================================`);
  console.log(`🟡 [${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`🟡 [${requestId}] B-roll Job ID: ${brollJobId}`);

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
      console.error(`❌ [${requestId}] Missing brollJobId parameter`);
      return NextResponse.json(
        { error: 'B-roll job ID is required' },
        { status: 400 }
      );
    }

    console.log(`🟡 [${requestId}] Looking up B-roll timing job: ${brollJobId}`);
    const job = jobManager.getJob(brollJobId);

    if (!job) {
      console.error(`❌ [${requestId}] B-roll timing job not found: ${brollJobId}`);
      return NextResponse.json(
        { 
          error: 'B-roll timing job not found',
          brollJobId
        },
        { status: 404 }
      );
    }

    console.log(`🟡 [${requestId}] Job found with status: ${job.status}`);

    const response: any = {
      brollJobId,
      status: job.status,
    };

    if (job.status === 'completed' && job.brollTimings) {
      console.log(`✅ [${requestId}] B-roll timing job completed, timings available:`, job.brollTimings.length, 'timings');
      response.brollTimings = job.brollTimings;
      response.message = 'B-roll timing suggestions generated successfully';
      response.count = job.brollTimings.length;
      
    } else if (job.status === 'failed') {
      console.error(`❌ [${requestId}] B-roll timing job failed:`, job.error);
      response.error = job.error;
      response.message = 'B-roll timing generation failed';
    } else if (job.status === 'processing') {
      console.log(`⏳ [${requestId}] B-roll timing job still processing...`);
      response.message = 'B-roll timing suggestions are still being generated';
    }

    console.log(`✅ [${requestId}] Returning response:`,
      {
        ...response,
        brollTimings: response.brollTimings ? `${response.brollTimings.length} timings` : 'none'
      }
    );

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Error processing request:`, error);
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