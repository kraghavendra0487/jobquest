const { supabase } = require('../config/supabase');
const School = require('../models/schoolModel');

exports.upsertProfile = async (req, res) => {
  const { school_id, usn, name } = req.body;
  const userId = req.user.id;

  if (!school_id || !usn) {
    return res.status(400).json({ error: 'school_id and usn are required' });
  }

  try {
    // 1. Fetch school name for legacy field
    const { data: school, error: sErr } = await School.findById(school_id);
    if (sErr || !school) return res.status(400).json({ error: 'Invalid school_id' });

    // 2. Upsert profile
    const updateData = {
      id: userId,
      email: req.user.email,
      school_id,
      usn,
      school: school.name,
      role: req.user.role || 'student',
    };

    if (name) updateData.name = name;

    const { error } = await supabase
      .from('users')
      .upsert(updateData)
      .select('id')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const { data: hydratedUser, error: hydrateError } = await supabase
      .from('users')
      .select('*, schools(name)')
      .eq('id', userId)
      .single();

    if (hydrateError) return res.status(500).json({ error: hydrateError.message });
    res.json(hydratedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
