import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { sendEmail } from '@/libs/resend';
import { strictRateLimit } from '@/libs/rateLimit';

const updateResultsWithBatch = (results, batchResults) => {
  for (const result of batchResults) {
    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
      results.errors.push({
        email: result.email,
        error: result.error,
      });
    }
  }
};

export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = strictRateLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error.message },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.error.retryAfter.toString(),
          },
        }
      );
    }

    const {
      subject,
      htmlContent,
      textContent,
      batchSize = 50,
      delayMs = 1000,
    } = await request.json();

    if (!subject || !htmlContent) {
      return NextResponse.json({ error: 'Subject and HTML content are required' }, { status: 400 });
    }

    // Validate batch size and delay
    if (batchSize < 1 || batchSize > 100) {
      return NextResponse.json({ error: 'Batch size must be between 1 and 100' }, { status: 400 });
    }

    if (delayMs < 0 || delayMs > 10000) {
      return NextResponse.json(
        { error: 'Delay must be between 0 and 10000 milliseconds' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role key for admin access
    const supabase = await createClient();

    // Get all users with email addresses
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .not('email', 'is', null)
      .not('email', 'eq', '');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'No users found' }, { status: 404 });
    }

    console.log(`Found ${users.length} users to email`);

    // Process users in batches
    const results = {
      totalUsers: users.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)}`
      );

      // Process batch in parallel with retry logic
      const batchPromises = batch.map(async (user) => {
        const maxRetries = 2;
        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            // Personalize email content
            const personalizedHtml = htmlContent
              .replaceAll('{{first_name}}', user.first_name || '')
              .replaceAll('{{last_name}}', user.last_name || '')
              .replaceAll('{{email}}', user.email || '');

            const personalizedText = textContent
              ? textContent
                  .replaceAll('{{first_name}}', user.first_name || '')
                  .replaceAll('{{last_name}}', user.last_name || '')
                  .replaceAll('{{email}}', user.email || '')
              : undefined;

            await sendEmail({
              to: user.email,
              subject,
              html: personalizedHtml,
              text: personalizedText,
            });

            return { success: true, email: user.email };
          } catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt + 1} failed for ${user.email}:`, error.message);

            // If this is not the last attempt, wait before retrying
            if (attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            }
          }
        }

        // All retries failed
        console.error(`All retries failed for ${user.email}:`, lastError.message);
        return {
          success: false,
          email: user.email,
          error: lastError.message,
        };
      });

      const batchResults = await Promise.all(batchPromises);

      // Update results
      updateResultsWithBatch(results, batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < users.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    console.log(`Bulk email completed: ${results.successful} successful, ${results.failed} failed`);

    return NextResponse.json({
      message: 'Bulk email processing completed',
      results,
    });
  } catch (error) {
    console.error('Bulk email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
