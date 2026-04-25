const excelParser = require('../utils/excelParser');
const { normalize } = require('../utils/jobNormalizer');
const { parseFetchedAtFromFilename } = require('../utils/fetchedAt');
const jobModel = require('../models/jobModel');
const jobUploadModel = require('../models/jobUploadModel');
const uploadCache = require('../services/uploadCache');

// Stub for Phase 5 pipeline
const kickOffPipeline = async (uploadId) => {
  console.log(`[Phase 5 Stub] Kicking off pipeline for upload ${uploadId}`);
};

const jobUploadController = {
  /**
   * POST /api/admin/job-uploads/preview
   * Parses Excel, normalizes rows, and returns a preview summary.
   */
  async preview(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const rawRows = excelParser.parseBuffer(req.file.buffer);
      const total_rows = rawRows.length;

      const filenameFetchedAt = parseFetchedAtFromFilename(req.file.originalname);
      const fetched_at = filenameFetchedAt || new Date().toISOString();
      const fetched_at_source = filenameFetchedAt ? 'filename' : 'upload_time';

      const normalized = rawRows.map(row => normalize(row, { fetchedAt: fetched_at }));
      const validRows = normalized.filter(n => n.valid);
      const invalidRowsCount = normalized.length - validRows.length;

      // Dedupe within file
      const seenIds = new Set();
      const withinFileDeduped = [];
      let duplicateInFileCount = 0;

      for (const n of validRows) {
        if (seenIds.has(n.job.linkedin_job_id)) {
          duplicateInFileCount++;
          withinFileDeduped.push({ ...n, status: 'duplicate_in_file' });
        } else {
          seenIds.add(n.job.linkedin_job_id);
          withinFileDeduped.push({ ...n, status: 'pending_db_check' });
        }
      }

      // Dedupe against DB
      const idsToCheck = Array.from(seenIds);
      const existingIds = await jobModel.findExistingIds(idsToCheck);
      
      let duplicateInDbCount = 0;
      let newJobsCount = 0;

      const finalRows = withinFileDeduped.map(n => {
        if (n.status === 'duplicate_in_file') return n;
        
        if (existingIds.has(n.job.linkedin_job_id)) {
          duplicateInDbCount++;
          return { ...n, status: 'duplicate_in_db' };
        } else {
          newJobsCount++;
          return { ...n, status: 'new' };
        }
      });

      // Add invalid rows back to the list for preview
      const previewRows = normalized.map((n, index) => {
        const status = n.valid ? finalRows.find(f => f.job.linkedin_job_id === n.job.linkedin_job_id && normalized.indexOf(n) === normalized.lastIndexOf(n, index))?.status || 'duplicate_in_file' : 'invalid';
        
        return {
          row_index: index,
          status: n.valid ? status : 'invalid',
          reason: n.reason || null,
          linkedin_job_id: n.job?.linkedin_job_id || null,
          title: n.job?.title || n.raw.title || n.raw.title_full || 'Unknown',
          company: n.job?.company || n.raw.company || 'Unknown',
          location: n.job?.location || n.raw.location || 'Unknown',
          work_mode: n.job?.work_mode || null,
          employment_type: n.job?.employment_type || null,
          posted_relative: n.job?.posted_relative || null,
          applicant_count: n.job?.applicant_count || null,
        };
      });

      // Create upload record
      const uploadRecord = await jobUploadModel.create({
        uploaded_by: req.user.id,
        filename: req.file.originalname,
        total_rows,
        valid_rows: validRows.length,
        invalid_rows: invalidRowsCount,
        duplicate_rows: duplicateInFileCount + duplicateInDbCount,
        status: 'previewed',
        fetched_at: fetched_at
      });

      // Cache the payload for the save step
      const jobsToInsert = finalRows
        .filter(n => n.status === 'new')
        .map(n => ({ 
          ...n.job, 
          uploaded_by: req.user.id, 
          upload_id: uploadRecord.id,
          fetched_at: fetched_at
        }));

      uploadCache.set(uploadRecord.id, {
        upload_id: uploadRecord.id,
        jobs: jobsToInsert,
        fetched_at: fetched_at,
        summary: {
          new: newJobsCount,
          duplicate_in_db: duplicateInDbCount,
          duplicate_in_file: duplicateInFileCount,
          invalid: invalidRowsCount
        }
      });

      res.json({
        upload_id: uploadRecord.id,
        filename: req.file.originalname,
        total_rows,
        fetched_at,
        fetched_at_source,
        summary: {
          new: newJobsCount,
          duplicate_in_db: duplicateInDbCount,
          duplicate_in_file: duplicateInFileCount,
          invalid: invalidRowsCount
        },
        rows: previewRows
      });

    } catch (err) {
      console.error('[Upload Preview Error]', err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * POST /api/admin/job-uploads/:upload_id/save
   * Commits the cached 'new' jobs to the database.
   */
  async save(req, res) {
    const { upload_id } = req.params;
    
    try {
      const cached = uploadCache.get(upload_id);
      if (!cached) {
        return res.status(410).json({ error: 'Preview expired or invalid. Please re-upload the file.' });
      }

      if (cached.jobs.length === 0) {
        await jobUploadModel.update(upload_id, { status: 'saved', inserted_rows: 0 });
        return res.json({ upload_id, inserted: 0, status: 'saved' });
      }

      // Quick sanity check before insert — log a sample
      console.log('[save] sample row fetched_at + posted_at:', {
        fetched_at: cached.jobs[0]?.fetched_at,
        posted_at: cached.jobs[0]?.posted_at,
        posted_relative: cached.jobs[0]?.posted_relative,
      });

      const inserted = await jobModel.bulkInsert(cached.jobs);

      await jobUploadModel.update(upload_id, { 
        status: 'saved', 
        inserted_rows: inserted 
      });

      // Cleanup cache
      uploadCache.delete(upload_id);

      // Trigger Phase 5 pipeline (fire and forget)
      kickOffPipeline(upload_id).catch(err => console.error('[Pipeline Kickoff Error]', err));

      res.json({ 
        upload_id, 
        inserted, 
        status: 'saved',
        pipeline_started: true 
      });

    } catch (err) {
      console.error('[Upload Save Error]', err);
      await jobUploadModel.update(upload_id, { status: 'failed', error: err.message });
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * POST /api/admin/job-uploads/:upload_id/refetched-at
   * Updates the fetched_at timestamp for a cached preview.
   */
  async refetchedAt(req, res) {
    const { upload_id } = req.params;
    const { fetched_at } = req.body;

    if (!fetched_at) {
      return res.status(400).json({ error: 'fetched_at is required' });
    }

    try {
      const cached = uploadCache.get(upload_id);
      if (!cached) {
        return res.status(404).json({ error: 'Preview not found or expired' });
      }

      // Re-run normalize logic for cached jobs
      // Note: cached.jobs already contains normalized data. 
      // We need to update posted_at based on the new fetched_at.
      const updatedJobs = cached.jobs.map(job => {
        // Recalculate posted_at using parseMeta logic (simplified here since we already have offset)
        // Actually, it's safer to re-normalize from raw if available, 
        // but we only cached the normalized job objects.
        // Let's re-parse the meta_info to get the correct posted_at.
        const { parseMeta } = require('../utils/jobNormalizer');
        const meta = parseMeta(job.meta_info, fetched_at);
        
        return {
          ...job,
          fetched_at,
          posted_at: meta.posted_at
        };
      });

      // Update cache
      uploadCache.set(upload_id, {
        ...cached,
        fetched_at,
        jobs: updatedJobs
      });

      // Update upload record
      await jobUploadModel.update(upload_id, { fetched_at });

      res.json({ success: true, fetched_at });
    } catch (err) {
      console.error('[Refetched At Error]', err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /api/admin/job-uploads
   * Lists upload history.
   */
  async listUploads(req, res) {
    try {
      const uploads = await jobUploadModel.list();
      res.json(uploads);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /api/admin/jobs
   * Lists master jobs with filtering.
   */
  async listJobs(req, res) {
    try {
      const result = await jobModel.list(req.query);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = jobUploadController;
