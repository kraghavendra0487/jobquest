const School = require('../models/schoolModel');

exports.getSchools = async (req, res) => {
  try {
    const { data, error } = await School.findAll();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createSchool = async (req, res) => {
  let { name, code } = req.body;
  name = name?.trim();
  code = code?.trim() || null;

  if (!name) return res.status(400).json({ error: 'School name is required' });

  try {
    const { data, error } = await School.create({ name, code });
    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'School name or code already exists' });
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSchool = async (req, res) => {
  const { id } = req.params;
  let { name, code } = req.body;
  const updateData = {};
  if (name !== undefined) {
    name = name?.trim();
    if (!name) return res.status(400).json({ error: 'School name cannot be empty' });
    updateData.name = name;
  }
  if (code !== undefined) {
    updateData.code = code?.trim() || null;
  }

  try {
    const { data, error } = await School.update(id, updateData);
    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'School name or code already exists' });
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSchool = async (req, res) => {
  const { id } = req.params;
  try {
    const refs = await School.countReferences(id);
    if (refs.users > 0 || refs.programs > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete school with existing users or programs', 
        references: refs 
      });
    }

    const { error } = await School.delete(id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
