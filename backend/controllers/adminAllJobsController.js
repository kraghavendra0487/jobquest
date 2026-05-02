const adminJobController = require('./adminJobController');

/**
 * GET /api/admin/all-jobs/merged-jobs
 * Admin All Jobs page — same merged pipeline job list as GET /api/admin/jobs/merged-jobs.
 */
exports.listMergedJobs = adminJobController.listMergedJobs;
