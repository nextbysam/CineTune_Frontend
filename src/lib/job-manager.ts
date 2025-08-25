// Shared job status management
export interface JobStatus {
  status: 'processing' | 'completed' | 'failed';
  captions?: any[];
  brollTimings?: any[]; // Add B-roll timing results
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: string;
  failedAt?: string;
  videoPath?: string;
  orientation?: string;
}

class JobManager {
  private jobs = new Map<string, JobStatus>();

  createJob(jobId: string): void {
    this.jobs.set(jobId, {
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  getJob(jobId: string): JobStatus | undefined {
    return this.jobs.get(jobId);
  }

  updateJob(jobId: string, updates: Partial<JobStatus>): void {
    const job = this.jobs.get(jobId);
    if (job) {
      const updatedJob = {
        ...job,
        ...updates,
        updatedAt: new Date(),
      };
      this.jobs.set(jobId, updatedJob);
    }
  }

  deleteJob(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  getAllJobs(): string[] {
    return Array.from(this.jobs.keys());
  }

  cleanupOldJobs(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = new Date();
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (now.getTime() - job.updatedAt.getTime() > maxAge) {
        this.jobs.delete(jobId);
      }
    }
  }

  // Debug method to log all jobs
  debugJobs(): void {
    // Debug functionality preserved but console logs removed
  }
}

// Export singleton instance
export const jobManager = new JobManager(); 