"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { fetchProcessingJobs, type ProcessingJob } from "@/services/media-api";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-600",
  processing: "text-blue-600",
  completed: "text-green-600",
  failed: "text-red-600",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      fetchProcessingJobs()
        .then(setJobs)
        .catch(() => setJobs([]))
        .finally(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container-shell py-10">
      <h1 className="text-2xl font-bold mb-2">Processing Jobs</h1>
      <p className="text-muted-foreground mb-8">Monitor video processing and clip generation jobs</p>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : jobs.length === 0 ? (
        <p className="text-muted-foreground">No jobs yet</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Progress</th>
                <th className="px-4 py-3 text-left font-medium">Message</th>
                <th className="px-4 py-3 text-left font-medium">Video</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{job.jobType}</td>
                  <td className={`px-4 py-3 font-medium ${STATUS_COLORS[job.status] ?? ""}`}>{job.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${job.progress}%` }} />
                      </div>
                      <span>{job.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{job.message}</td>
                  <td className="px-4 py-3">
                    {job.videoId ? (
                      <Link href={`/studio/videos/${job.videoId}`} className="text-primary hover:underline">
                        View
                      </Link>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
