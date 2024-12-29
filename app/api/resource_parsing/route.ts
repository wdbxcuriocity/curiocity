import { NextResponse } from 'next/server';

export const runtime = 'edge';

const LLAMA_CLOUD_API_KEY = process.env.LLAMA_CLOUD_API_KEY;

interface ResponseData {
  pages: {
    text?: string;
    md?: string;
    images?: { url: string }[];
  }[];
}

export async function POST(req: Request) {
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
      console.error('Upload failed:', errorData);
      throw new Error(`Upload failed: ${errorData.message || 'Unknown error'}`);
    }

    const uploadResult = await uploadResponse.json();
    const jobId = uploadResult.id;

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
        console.error('Status check failed:', errorData);
        throw new Error(`Status check failed: ${errorData.message}`);
      }

      const statusResult = await statusResponse.json();
      jobStatus = statusResult.status;

      if (jobStatus === 'ERROR') {
        throw new Error('Parsing job failed.');
      } else if (jobStatus !== 'SUCCESS') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log('Job completed successfully. Fetching result...');

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
      console.error('Result retrieval failed:', errorData);
      throw new Error(`Result retrieval failed: ${errorData.message}`);
    }

    const markdown = await resultResponse.text();
    return NextResponse.json({ markdown });
  } catch (error) {
    console.error('Error processing file:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
