const { supabase } = require('../config/supabase');

const User = {
  create: async (userData) => {
    const { id, email, name, school, program, usn, role } = userData;
    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          id, // This is now a UUID from auth.users
          email, 
          name, 
          school, 
          program, 
          usn, 
          role: role || 'student' 
        }
      ])
      .select()
      .single();
    
    return { data, error };
  },
  findByEmail: async (email) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    return { data, error };
  },
  findById: async (id) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    return { data, error };
  }
};

module.exports = User;
