const { supabase } = require('../config/supabase');

const School = {
  findAll: async () => {
    return await supabase.from('schools').select('*').order('name');
  },
  findById: async (id) => {
    return await supabase.from('schools').select('*').eq('id', id).single();
  },
  create: async (data) => {
    return await supabase.from('schools').insert([data]).select().single();
  },
  update: async (id, data) => {
    return await supabase.from('schools').update(data).eq('id', id).select().single();
  },
  delete: async (id) => {
    return await supabase.from('schools').delete().eq('id', id);
  },
  countReferences: async (id) => {
    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('school_id', id);
    return { users: userCount || 0 };
  }
};

module.exports = School;
