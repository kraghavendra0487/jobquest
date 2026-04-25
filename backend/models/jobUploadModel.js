const { supabase } = require('../config/supabase');

const jobUploadModel = {
  /**
   * Creates a new upload record (previewed status).
   */
  async create(uploadData) {
    const { data, error } = await supabase
      .from('job_uploads')
      .insert([uploadData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Updates an upload record (e.g., to 'saved' or to log errors).
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('job_uploads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Lists recent uploads.
   */
  async list() {
    const { data, error } = await supabase
      .from('job_uploads')
      .select(`
        *,
        uploader:uploaded_by ( name )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  /**
   * Gets a single upload by ID.
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('job_uploads')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
};

module.exports = jobUploadModel;
