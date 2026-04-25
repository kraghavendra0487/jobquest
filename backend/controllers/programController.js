const Program = require('../models/programModel');

exports.getPrograms = async (req, res) => {
  const { school_id } = req.query;
  try {
    const { data, error } = school_id 
      ? await Program.findBySchoolId(school_id)
      : await Program.findAll();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createProgram = async (req, res) => {
  let { name, school_id, code } = req.body;
  name = name?.trim();
  code = code?.trim() || null;

  if (!name) return res.status(400).json({ error: 'Program name is required' });
  if (!school_id) return res.status(400).json({ error: 'school_id is required' });

  try {
    const { data, error } = await Program.create({ name, school_id, code });
    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Program name already exists for this school' });
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProgram = async (req, res) => {
  const { id } = req.params;
  let { name, code, school_id } = req.body;
  const updateData = {};
  
  if (name !== undefined) {
    name = name?.trim();
    if (!name) return res.status(400).json({ error: 'Program name cannot be empty' });
    updateData.name = name;
  }
  if (code !== undefined) {
    updateData.code = code?.trim() || null;
  }
  if (school_id !== undefined) {
    updateData.school_id = school_id;
  }

  try {
    const { data, error } = await Program.update(id, updateData);
    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Program name already exists for this school' });
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteProgram = async (req, res) => {
  const { id } = req.params;
  try {
    const refs = await Program.countReferences(id);
    if (refs.users > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete program with existing users', 
        references: refs 
      });
    }

    const { error } = await Program.delete(id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
