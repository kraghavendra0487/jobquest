const { supabase } = require('../config/supabase');

const School = {
  findAll: async () => {
    return await supabase.from('schools').select('*').order('name');
  },
  findNameCodeMap: async () => {
    const { data, error } = await supabase.from('schools').select('name, code');
    if (error) return { data: null, error };

    const map = new Map(
      (data || [])
        .filter((school) => school?.name)
        .map((school) => [school.name, school.code || school.name])
    );

    return { data: map, error: null };
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
