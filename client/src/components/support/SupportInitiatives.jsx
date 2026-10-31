import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { connect } from 'react-redux';
import { Link, useHistory } from 'react-router-dom';
import './support.css';

const SupportInitiatives = ({ auth: { authUser: user, loadingAuth: loading } }) => {
    const [options, setOptions] = useState([]);
    const [userResponse, setUserResponse] = useState([]);
    const [newOption, setNewOption] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const history = useHistory();

    useEffect(() => {
        if (!loading && user) {
            if (user.role && user.role.toLowerCase() === 'student') {
                history.push('/'); // Redirect students
            } else {
                fetchSupportData();
            }
        }
    }, [user, loading, history]);

    const fetchSupportData = async () => {
        try {
            const res = await axios.get('/api/support');
            setOptions(res.data.options || []);
            setUserResponse(res.data.userResponse || []);
        } catch (err) {
            console.error('Error fetching support data', err);
        }
    };

    const handleCheckboxChange = (text) => {
        setUserResponse(prev => 
            prev.includes(text) ? prev.filter(item => item !== text) : [...prev, text]
        );
    };

    const handleSubmitResponse = async () => {
        setIsSubmitting(true);
        try {
            await axios.post('/api/support/respond', { selectedOptions: userResponse });
            alert('Your support response has been saved. Thank you!');
        } catch (err) {
            console.error(err);
            alert('Error submitting response');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddOption = async (e) => {
        e.preventDefault();
        if (!newOption.trim()) return;
        try {
            const res = await axios.post('/api/support/options', { text: newOption });
            setOptions(res.data.options);
            setNewOption('');
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteOption = async (id) => {
        if (!window.confirm("Are you sure you want to delete this option?")) return;
        try {
            const res = await axios.delete(`/api/support/options/${id}`);
            setOptions(res.data.options);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading || !user) return <div className="support-loader">Loading...</div>;

    const isAdmin = user.isAdmin;

    return (
        <div className="support-container">
            <div className="support-header">
                <h1>Alumni Support Initiatives</h1>
                <p>The Alumni may extend support to IIITA in the following areas. Please select the areas you wish to contribute to.</p>
                {isAdmin && (
                    <Link to="/admin/support-responses" className="support-btn-primary dashboard-link">
                        View Responses Dashboard
                    </Link>
                )}
            </div>

            <div className="support-content">
                <div className="support-list">
                    {options.map((opt) => (
                        <div key={opt._id} className="support-item">
                            <label className="support-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={userResponse.includes(opt.text)}
                                    onChange={() => handleCheckboxChange(opt.text)}
                                />
                                <span className="custom-checkbox"></span>
                                <span className="support-text">{opt.text}</span>
                            </label>
                            {isAdmin && (
                                <button 
                                    className="delete-option-btn" 
                                    onClick={() => handleDeleteOption(opt._id)}
                                    title="Delete Option"
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    ))}
                    {options.length === 0 && <p>No support initiatives available yet.</p>}
                </div>

                {!isAdmin && (
                    <button 
                        className="support-submit-btn" 
                        onClick={handleSubmitResponse}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Support Response'}
                    </button>
                )}

                {isAdmin && (
                    <form className="add-option-form" onSubmit={handleAddOption}>
                        <h3>Add New Support Area</h3>
                        <div className="add-option-input-group">
                            <input
                                type="text"
                                placeholder="Enter new support initiative..."
                                value={newOption}
                                onChange={(e) => setNewOption(e.target.value)}
                                className="add-option-input"
                            />
                            <button type="submit" className="support-btn-secondary">Add Option</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

const mapStateToProps = (state) => ({
    auth: state.auth
});

export default connect(mapStateToProps)(SupportInitiatives);
