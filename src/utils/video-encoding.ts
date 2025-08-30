import axios from "axios";

export interface EncodingJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  originalSize?: number;
  compressedSize?: number;
  processingTime?: number;
  outputUrl?: string;
}

export interface EncodingCallbacks {
  onProgress?: (jobId: string, progress: number) => void;
  onStatus?: (jobId: string, status: EncodingJob['status'], outputUrl?: string) => void;
  onError?: (jobId: string, error: string) => void;
  onComplete?: (jobId: string, result: { outputUrl: string; originalSize: number; compressedSize: number }) => void;
}

/**
 * Start video encoding for a given file path
 */
export async function startVideoEncoding(
  filePath: string, 
  fileName?: string
): Promise<{ jobId: string; outputUrl: string }> {
  try {
    const response = await axios.post('/api/uploads/encode-video', {
      filePath,
      fileName
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to start encoding');
    }

    return {
      jobId: response.data.jobId,
      outputUrl: response.data.outputUrl
    };
  } catch (error) {
    console.error('Failed to start video encoding:', error);
    throw error;
  }
}

/**
 * Get encoding job status
 */
export async function getEncodingStatus(jobId: string): Promise<EncodingJob> {
  try {
    const response = await axios.get(`/api/uploads/encode-video?jobId=${jobId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to get encoding status:', error);
    throw error;
  }
}

/**
 * Poll encoding job status with callbacks
 */
export function pollEncodingStatus(
  jobId: string,
  callbacks: EncodingCallbacks,
  pollInterval: number = 1000
): () => void {
  let isPolling = true;
  let pollCount = 0;
  const maxPolls = 300; // 5 minutes at 1 second intervals

  const poll = async () => {
    if (!isPolling || pollCount >= maxPolls) {
      if (pollCount >= maxPolls) {
        callbacks.onError?.(jobId, 'Encoding timeout - job took too long');
      }
      return;
    }

    try {
      const status = await getEncodingStatus(jobId);
      pollCount++;

      // Call progress callback
      if (callbacks.onProgress && status.progress !== undefined) {
        callbacks.onProgress(jobId, status.progress);
      }

      // Call status callback
      if (callbacks.onStatus) {
        callbacks.onStatus(jobId, status.status, status.outputUrl);
      }

      // Handle completion
      if (status.status === 'completed' && status.outputUrl) {
        isPolling = false;
        callbacks.onComplete?.(jobId, {
          outputUrl: status.outputUrl,
          originalSize: status.originalSize || 0,
          compressedSize: status.compressedSize || 0
        });
        return;
      }

      // Handle failure
      if (status.status === 'failed') {
        isPolling = false;
        callbacks.onError?.(jobId, status.error || 'Encoding failed');
        return;
      }

      // Continue polling
      setTimeout(poll, pollInterval);
    } catch (error) {
      isPolling = false;
      callbacks.onError?.(jobId, `Polling failed: ${error}`);
    }
  };

  // Start polling
  poll();

  // Return cancel function
  return () => {
    isPolling = false;
  };
}

/**
 * Process video file with encoding and return optimized version
 * This function works by first uploading the file via the regular upload process,
 * then triggering encoding on the server-side uploaded file.
 */
export async function processVideoFile(
  file: File,
  callbacks: EncodingCallbacks
): Promise<{ encodedUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`📁 Processing video file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

      // First, we need to upload this file via the existing upload system
      // This will create a presigned URL and upload to cloud storage
      const uploadResponse = await axios.post('/api/uploads/presign', {
        userId: "PJ1nkaufw0hZPyhN7bWCP",
        fileNames: [file.name],
      });

      const uploadInfo = uploadResponse.data.uploads[0];
      
      // Upload the file
      await axios.put(uploadInfo.presignedUrl, file, {
        headers: { "Content-Type": uploadInfo.contentType },
      });

      console.log(`✅ File uploaded to: ${uploadInfo.filePath}`);

      // Now start encoding using the uploaded file path
      const { jobId, outputUrl } = await startVideoEncoding(
        uploadInfo.filePath, 
        file.name
      );

      // Poll for completion
      pollEncodingStatus(jobId, {
        onProgress: callbacks.onProgress,
        onStatus: callbacks.onStatus,
        onError: (id, error) => {
          callbacks.onError?.(id, error);
          reject(new Error(error));
        },
        onComplete: (id, result) => {
          callbacks.onComplete?.(id, result);
          resolve({
            encodedUrl: result.outputUrl,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize
          });
        }
      });

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Process video file from uploaded path with encoding
 */
export async function processUploadedVideoFile(
  filePath: string,
  fileName: string,
  callbacks: EncodingCallbacks
): Promise<{ encodedUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise(async (resolve, reject) => {
    try {
      // Start encoding from the uploaded file path
      const { jobId, outputUrl } = await startVideoEncoding(filePath, fileName);

      // Poll for completion
      const cancelPolling = pollEncodingStatus(jobId, {
        onProgress: callbacks.onProgress,
        onStatus: callbacks.onStatus,
        onError: (id, error) => {
          callbacks.onError?.(id, error);
          reject(new Error(error));
        },
        onComplete: (id, result) => {
          callbacks.onComplete?.(id, result);
          resolve({
            encodedUrl: result.outputUrl,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize
          });
        }
      });

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Check if a file is a video and should be encoded
 * Updated to be more permissive with larger files and better format detection
 */
export function shouldEncodeVideo(file: File, maxSizeForEncoding: number = 25 * 1024 * 1024): boolean {
  // Check if it's a video file
  if (!file.type.startsWith('video/')) {
    return false;
  }

  // Always encode videos larger than 25MB (reduced from 50MB to catch more files)
  if (file.size > maxSizeForEncoding) {
    return true;
  }

  // Also encode videos with high-bitrate formats that would benefit from compression
  const highBitrateFormats = [
    'video/mov', 'video/quicktime',    // iPhone/Mac recordings
    'video/avi',                       // Uncompressed AVI
    'video/x-msvideo',                 // AVI variant
    'video/mts', 'video/m2ts',         // AVCHD formats
    'video/x-ms-wmv',                  // Windows Media Video
    'video/3gpp', 'video/3gp2'         // Mobile formats
  ];
  
  if (highBitrateFormats.some(format => file.type.includes(format))) {
    return file.size > 10 * 1024 * 1024; // 10MB threshold for high-bitrate formats
  }

  // For already compressed formats, only encode if they're quite large
  const compressedFormats = ['video/mp4', 'video/webm', 'video/ogg'];
  if (compressedFormats.includes(file.type)) {
    return file.size > 100 * 1024 * 1024; // 100MB threshold for already compressed
  }

  return false;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Calculate compression percentage
 */
export function getCompressionRatio(originalSize: number, compressedSize: number): number {
  if (originalSize === 0) return 0;
  return Math.round(((originalSize - compressedSize) / originalSize) * 100);
}