import { processReengageEmails } from '@/libs/email';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Debug logging removed for production
const result = await processReengageEmails();

    // Debug logging removed for production
return Response.json({
      success: true,
      message: 'Re-engagement emails processed successfully',
      ...result,
    });
  } catch (error) {
    console.error('Error processing re-engagement emails:', error);
    return Response.json(
      {
        error: 'Failed to process re-engagement emails',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
