const { supabase } = require('../config/supabase');
const School = require('../models/schoolModel');
const Program = require('../models/programModel');

exports.upsertProfile = async (req, res) => {
  const { school_id, program_id, usn, name } = req.body;
  const userId = req.user.id;

  if (!school_id || !program_id || !usn) {
    return res.status(400).json({ error: 'school_id, program_id, and usn are required' });
  }

  try {
    // 1. Validate program belongs to school
    const { data: program, error: pErr } = await Program.findById(program_id);
    if (pErr || !program) return res.status(400).json({ error: 'Invalid program_id' });
    if (program.school_id !== school_id) {
      return res.status(400).json({ error: 'Program does not belong to the selected school' });
    }

    // 2. Fetch school name for legacy field
    const { data: school, error: sErr } = await School.findById(school_id);
    if (sErr || !school) return res.status(400).json({ error: 'Invalid school_id' });

    // 3. Upsert profile
    const updateData = {
      id: userId,
      school_id,
      program_id,
      usn,
      school: school.name, // Legacy text field
      program: program.name, // Legacy text field
      updated_at: new Date()
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
