import { NextResponse } from 'next/server';
import { log, redact } from '@/lib/logging';

export const runtime = 'edge';

const LLAMA_CLOUD_API_KEY = process.env.LLAMA_CLOUD_API_KEY;

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const formData = await req.formData();
    const file = formData.get('myFile');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'Uploaded file is not a valid Blob' },
        { status: 400 },
      );
    }

    const fileBlob = new Blob([file], {
      type: file.type || 'application/octet-stream',
    });

    const uploadFormData = new FormData();
    uploadFormData.append(
      'file',
      fileBlob,
      (file as any).name || 'uploaded-file',
    );
    uploadFormData.append('mode', 'fast'); // Add this line to enable fast parsing

    // Upload the file
    const uploadResponse = await fetch(
      'https://api.cloud.llamaindex.ai/api/parsing/upload',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${LLAMA_CLOUD_API_KEY}`,
        },
        body: uploadFormData,
      },
    );

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      log({
        level: 'ERROR',
        service: 'resource-parsing',
        message: 'Upload failed',
        correlationId,
        error: errorData,
        metadata: redact({
          detail: errorData.detail,
        }),
      });
      throw new Error(`Upload failed: ${errorData.detail || 'Unknown error'}`);
    }

    const uploadResult = await uploadResponse.json();
    const jobId = uploadResult.id;

    // Poll for job status
    let jobStatus = '';
    while (jobStatus !== 'SUCCESS') {
      const statusResponse = await fetch(
        `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${LLAMA_CLOUD_API_KEY}`,
          },
        },
      );

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        log({
          level: 'ERROR',
          service: 'resource-parsing',
          message: 'Status check failed',
          correlationId,
          error: errorData,
          metadata: redact({
            detail: errorData.detail,
          }),
        });
        throw new Error(`Status check failed: ${errorData.detail}`);
      }

      const statusResult = await statusResponse.json();
      jobStatus = statusResult.status;

      if (jobStatus === 'ERROR') {
        throw new Error('Parsing job failed.');
      } else if (jobStatus !== 'SUCCESS') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Retrieve the parsed result
    const resultResponse = await fetch(
      `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/raw/markdown`,
      {
        headers: {
          Authorization: `Bearer ${LLAMA_CLOUD_API_KEY}`,
          Accept: 'text/markdown',
        },
      },
    );

    if (!resultResponse.ok) {
      const errorData = await resultResponse.json();
      log({
        level: 'ERROR',
        service: 'resource-parsing',
        message: 'Result retrieval failed',
        correlationId,
        error: errorData,
        metadata: redact({
          detail: errorData.detail,
        }),
      });
      throw new Error(`Result retrieval failed: ${errorData.detail}`);
    }

    const markdown = await resultResponse.text();
    return NextResponse.json({ markdown });
  } catch (error) {
    log({
      level: 'ERROR',
      service: 'resource-parsing',
      message: 'Error processing file',
      correlationId,
      error,
      metadata: redact({
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }),
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
