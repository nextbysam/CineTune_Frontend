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
    console.log(`🔵 [JobManager] Creating job: ${jobId}`);
    this.jobs.set(jobId, {
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ [JobManager] Job created: ${jobId}, total jobs: ${this.jobs.size}`);
  }

  getJob(jobId: string): JobStatus | undefined {
    console.log(`🔵 [JobManager] Getting job: ${jobId}`);
    const job = this.jobs.get(jobId);
    console.log(`🔵 [JobManager] Job ${jobId} found:`, !!job, job ? `status: ${job.status}` : 'not found');
    return job;
  }

  updateJob(jobId: string, updates: Partial<JobStatus>): void {
    console.log(`🔵 [JobManager] Updating job: ${jobId}`, updates);
    const job = this.jobs.get(jobId);
    if (job) {
      const updatedJob = {
        ...job,
        ...updates,
        updatedAt: new Date(),
      };
      this.jobs.set(jobId, updatedJob);
      console.log(`✅ [JobManager] Job updated: ${jobId}, new status: ${updatedJob.status}`);
    } else {
      console.error(`❌ [JobManager] Cannot update job: ${jobId} - not found`);
    }
  }

  deleteJob(jobId: string): boolean {
    console.log(`🔵 [JobManager] Deleting job: ${jobId}`);
    const deleted = this.jobs.delete(jobId);
    console.log(`🔵 [JobManager] Job ${jobId} deleted: ${deleted}, total jobs: ${this.jobs.size}`);
    return deleted;
  }

  getAllJobs(): string[] {
    const jobIds = Array.from(this.jobs.keys());
    console.log(`🔵 [JobManager] Getting all jobs: ${jobIds.length} jobs`);
    return jobIds;
  }

  cleanupOldJobs(maxAge: number = 24 * 60 * 60 * 1000): void {
    console.log(`🔵 [JobManager] Cleaning up old jobs (max age: ${maxAge}ms)`);
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (now.getTime() - job.updatedAt.getTime() > maxAge) {
        this.jobs.delete(jobId);
        cleanedCount++;
        console.log(`🧹 [JobManager] Cleaned up old job: ${jobId}`);
      }
    }
    
    console.log(`✅ [JobManager] Cleanup completed: ${cleanedCount} jobs removed, ${this.jobs.size} remaining`);
  }

  // Debug method to log all jobs
  debugJobs(): void {
    console.log(`🔍 [JobManager] Debug - Total jobs: ${this.jobs.size}`);
    for (const [jobId, job] of this.jobs.entries()) {
      console.log(`🔍 [JobManager] Job ${jobId}:`, {
        status: job.status,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        captionsCount: job.captions ? job.captions.length : 0,
        hasError: !!job.error
      });
    }
  }
}

// Export singleton instance
export const jobManager = new JobManager(); 