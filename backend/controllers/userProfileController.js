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
    };

    if (name) updateData.name = name;

    const { data, error } = await supabase
      .from('users')
      .upsert(updateData)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
