const express = require('express');
const router = express.Router();
const authAdmin = require('../middleware/authAdmin');
const Alumni = require('../models/Alumni');
const Research = require('../models/Research');
const ShowcaseEvent = require('../models/ShowcaseEvent');
const Infra = require('../models/Infra');
const Timeline = require('../models/TimeLine');
const Media = require('../models/Media');

const crudRoutes = (router, path, Model) => {

  // GET all — supports ?category=&isFeatured=&search=
  router.get(path, async (req, res) => {
    try {
      const filter = {};
      const { category, isFeatured, isHighlight, search } = req.query;
      if (category)    filter.category    = category;
      if (isFeatured)  filter.isFeatured  = isFeatured === 'true';
      if (isHighlight) filter.isHighlight = isHighlight === 'true';
      if (search)      filter.$or = [
        { title:  { $regex: search, $options: 'i' } },
        { name:   { $regex: search, $options: 'i' } },
      ];
      const data = await Model.find(filter).sort({ createdAt: -1 });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET single
  router.get(`${path}/:id`, async (req, res) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: 'Not found' });
      res.json(doc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST create
  router.post(path, authAdmin, async (req, res) => {
    try {
      const doc = await new Model(req.body).save();
      res.status(201).json(doc);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // PUT update
  router.put(`${path}/:id`, authAdmin, async (req, res) => {
    try {
      const doc = await Model.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!doc) return res.status(404).json({ error: 'Not found' });
      res.json(doc);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE
  router.delete(`${path}/:id`, authAdmin, async (req, res) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};

crudRoutes(router, '/alumni',   Alumni);
crudRoutes(router, '/research', Research);
crudRoutes(router, '/events',   ShowcaseEvent);
crudRoutes(router, '/infra',    Infra);
crudRoutes(router, '/timeline', Timeline);
crudRoutes(router, '/media',    Media);

module.exports = router;