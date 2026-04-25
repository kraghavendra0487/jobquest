const { supabase } = require('../config/supabase');

const Program = {
  findAll: async () => {
    return await supabase.from('programs').select('*').order('name');
  },
  findBySchoolId: async (schoolId) => {
    return await supabase.from('programs').select('*').eq('school_id', schoolId).order('name');
  },
  findById: async (id) => {
    return await supabase.from('programs').select('*').eq('id', id).single();
  },
  create: async (data) => {
    return await supabase.from('programs').insert([data]).select().single();
  },
  update: async (id, data) => {
    return await supabase.from('programs').update(data).eq('id', id).select().single();
  },
  delete: async (id) => {
    return await supabase.from('programs').delete().eq('id', id);
  },
  countReferences: async (id) => {
    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('program_id', id);
    return { users: userCount || 0 };
  }
};

module.exports = Program;
