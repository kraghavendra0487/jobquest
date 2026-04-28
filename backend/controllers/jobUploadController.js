const excelParser = require('../utils/excelParser');
const { normalize } = require('../utils/jobNormalizer');
const { parseFetchedAtFromFilename } = require('../utils/fetchedAt');
const jobModel = require('../models/jobModel');
const jobUploadModel = require('../models/jobUploadModel');
const uploadCache = require('../services/uploadCache');
const { supabase } = require('../config/supabase');

// No-op for Phase 6 (manual pipeline)
const kickOffPipeline = async (uploadId) => {
  // Manual flow: Admin triggers rating and categorization from UI
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
        raw_rows: rawRows, // Cache raw rows for step one
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
   * GET /api/admin/job-uploads/:upload_id/preview-summary
   * Returns the cached preview summary if still in cache.
   * If cache expired (server restart), returns 410.
   */
  async getPreviewSummary(req, res) {
    const { upload_id } = req.params;
    try {
      const cached = uploadCache.get(upload_id);
      if (!cached) {
        // Check if it was already saved
        const upload = await jobUploadModel.findById(upload_id);
        if (upload && upload.status !== 'previewed') {
          return res.json({
            upload_id,
            already_saved: true,
            status: upload.status,
            inserted_rows: upload.inserted_rows,
          });
        }
        return res.status(410).json({ error: 'Preview expired. Please re-upload.' });
      }
      return res.json({
        upload_id,
        already_saved: false,
        total_rows: cached.jobs.length + (cached.summary.duplicate_in_db || 0) + (cached.summary.duplicate_in_file || 0) + (cached.summary.invalid || 0),
        valid_rows: cached.jobs.length + (cached.summary.duplicate_in_db || 0) + (cached.summary.duplicate_in_file || 0),
        invalid_rows: cached.summary.invalid || 0,
        duplicate_in_file: cached.summary.duplicate_in_file || 0,
        duplicate_in_db: cached.summary.duplicate_in_db || 0,
        new_rows: cached.summary.new || 0,
        sample: cached.jobs.slice(0, 10).map(j => ({
          title: j.title,
          company: j.company,
          location: j.location,
          posted_relative: j.posted_relative
        })),
      });
    } catch (err) {
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
        // Check if it was already saved
        const upload = await jobUploadModel.findById(upload_id);
        if (upload && (upload.status === 'saved' || upload.status === 'completed')) {
          return res.json({ 
            upload_id, 
            inserted: upload.inserted_rows, 
            status: upload.status, 
            message: 'Already saved' 
          });
        }
        return res.status(410).json({ error: 'Preview expired or invalid. Please re-upload the file.' });
      }

      // === NEW: Save Raw Data to raw_jobs table ===
      // We save raw data REGARDLESS of whether there are new jobs
      if (cached.raw_rows && cached.raw_rows.length > 0) {
        const rawToInsert = cached.raw_rows.map(row => ({
          upload_id: upload_id,
          raw_data: row
        }));
        
        console.log(`[save] attempting to insert ${rawToInsert.length} raw rows into raw_jobs`);
        const { error: rawErr } = await supabase
          .from('raw_jobs')
          .insert(rawToInsert);
          
        if (rawErr) {
          console.error('[save] raw_jobs insert failed:', rawErr.message);
          // If table is missing, we still want to proceed with jobs if any
        } else {
          console.log(`[save] raw_jobs: ${rawToInsert.length} rows inserted successfully`);
        }
      }

      if (cached.jobs.length === 0) {
        await jobUploadModel.update(upload_id, { status: 'completed', inserted_rows: 0 });
        uploadCache.delete(upload_id);
        return res.json({ upload_id, inserted: 0, status: 'completed', message: 'Raw data saved, no new jobs to insert.' });
      }

      // Quick sanity check before insert — log a sample
      console.log('[save] sample row fetched_at + posted_at:', {
        fetched_at: cached.jobs[0]?.fetched_at,
        posted_at: cached.jobs[0]?.posted_at,
        posted_relative: cached.jobs[0]?.posted_relative,
      });

      const inserted = await jobModel.bulkInsert(cached.jobs);

      // === Phase 4.7: Populate companies + link FK ===
      const { extractUniqueCompanies } = require('../utils/companyExtract');

      const companyRows = extractUniqueCompanies(cached.jobs);
      let companiesUpserted = 0;
      let jobsLinked = 0;

      if (companyRows.length > 0) {
        // Upsert companies on `name` (which we set to lowercase normalized).
        // onConflict: 'name' — name is already UNIQUE per migration 006.
        const { data: upserted, error: upsertErr } = await supabase
          .from('companies')
          .upsert(companyRows, { onConflict: 'name', ignoreDuplicates: false })
          .select('id, name');

        if (upsertErr) {
          console.error('[save] company upsert failed:', upsertErr.message);
          // Do NOT fail the whole save. Jobs are inserted, FK linking can be retried later.
        } else {
          companiesUpserted = upserted.length;
          // Build name -> id lookup
          const idByName = Object.fromEntries(upserted.map(c => [c.name, c.id]));

          // Update jobs.company_id for this upload. One UPDATE per company is fine at this scale.
          for (const [norm, id] of Object.entries(idByName)) {
            const { error: linkErr, count } = await supabase
              .from('jobs')
              .update({ company_id: id }, { count: 'exact' })
              .eq('upload_id', upload_id)
              .ilike('company', norm);  // case-insensitive match
            if (linkErr) {
              console.error(`[save] link failed for "${norm}":`, linkErr.message);
            } else {
              jobsLinked += count || 0;
            }
          }
        }
      }

      console.log(`[save] upload ${upload_id}: jobs=${inserted}, companies=${companiesUpserted}, links=${jobsLinked}`);

      await jobUploadModel.update(upload_id, { 
        status: 'completed', 
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
        manual_pipeline: true 
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
  },

  /**
   * DELETE /api/admin/job-uploads/purge-all
   * DANGEROUS: Deletes all uploads, jobs, companies, and raw data.
   */
  async purgeAll(req, res) {
    try {
      // Order matters for FK constraints if cascade not fully set
      try {
        await supabase.from('raw_jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        console.log('raw_jobs table might be missing, skipping delete');
      }
      
      try {
        await supabase.from('ai_batch_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        console.log('ai_batch_logs table might be missing, skipping delete');
      }

      await supabase.from('ai_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('job_uploads').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      res.json({ status: 'success', message: 'All data purged successfully' });
    } catch (err) {
      console.error('[Purge All Error]', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = jobUploadController;
