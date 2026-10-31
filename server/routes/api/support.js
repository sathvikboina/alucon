const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const SupportForm = require('../../models/SupportForm');
const User = require('../../models/User');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user && user.isAdmin) {
            next();
        } else {
            res.status(401).json({ msg: 'Not authorized as admin' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Middleware to check if user is not a student
const isNotStudent = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user && user.role.toLowerCase() !== 'student') {
            next();
        } else {
            res.status(401).json({ msg: 'Students are not authorized to view this page' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   GET api/support
// @desc    Get support options and responses (if admin)
// @access  Private (Non-Student)
router.get('/', [auth, isNotStudent], async (req, res) => {
    try {
        let form = await SupportForm.findOne();
        if (!form) {
            form = new SupportForm({ options: [], responses: [] });
            await form.save();
        }
        
        const user = await User.findById(req.user.id);
        
        // If the user is an admin, they get everything including populated responses
        if (user.isAdmin) {
            form = await SupportForm.findOne().populate('responses.user', ['name', 'email', 'avatar']);
            return res.json(form);
        }
        
        // If not admin, just return options and only THEIR response
        const userResponse = form.responses.find(r => r.user.toString() === req.user.id);
        
        res.json({
            options: form.options,
            userResponse: userResponse ? userResponse.selectedOptions : []
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/support/options
// @desc    Add a new support option
// @access  Private (Admin Only)
router.post('/options', [auth, isAdmin], async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ msg: 'Option text is required' });
        }

        let form = await SupportForm.findOne();
        if (!form) {
            form = new SupportForm({ options: [], responses: [] });
        }

        form.options.push({ text });
        await form.save();
        
        const populatedForm = await SupportForm.findOne().populate('responses.user', ['name', 'email', 'avatar']);
        res.json(populatedForm);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/support/options/:option_id
// @desc    Delete a support option
// @access  Private (Admin Only)
router.delete('/options/:option_id', [auth, isAdmin], async (req, res) => {
    try {
        let form = await SupportForm.findOne();
        if (!form) {
            return res.status(404).json({ msg: 'Support form not found' });
        }

        form.options = form.options.filter(opt => opt._id.toString() !== req.params.option_id);
        await form.save();

        const populatedForm = await SupportForm.findOne().populate('responses.user', ['name', 'email', 'avatar']);
        res.json(populatedForm);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/support/respond
// @desc    Submit support response
// @access  Private (Non-Student)
router.post('/respond', [auth, isNotStudent], async (req, res) => {
    try {
        const { selectedOptions } = req.body; // array of option texts
        
        let form = await SupportForm.findOne();
        if (!form) {
            return res.status(404).json({ msg: 'Support form not found' });
        }

        // Check if user already responded
        const responseIndex = form.responses.findIndex(r => r.user.toString() === req.user.id);

        if (responseIndex > -1) {
            // Update existing response
            form.responses[responseIndex].selectedOptions = selectedOptions;
            form.responses[responseIndex].date = Date.now();
        } else {
            // Add new response
            form.responses.push({
                user: req.user.id,
                selectedOptions
            });
        }

        await form.save();
        
        const userResponse = form.responses.find(r => r.user.toString() === req.user.id);
        res.json({
            options: form.options,
            userResponse: userResponse.selectedOptions
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
