import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { connect } from 'react-redux';
import { Link, useHistory } from 'react-router-dom';
import './support.css';

const SupportResponses = ({ auth: { authUser: user, loadingAuth: loading } }) => {
    const [responses, setResponses] = useState([]);
    const history = useHistory();

    useEffect(() => {
        if (!loading && user) {
            if (!user.isAdmin) {
                history.push('/'); // Redirect non-admins
            } else {
                fetchResponses();
            }
        }
    }, [user, loading, history]);

    const fetchResponses = async () => {
        try {
            const res = await axios.get('/api/support');
            // Assuming the admin GET route populates responses
            setResponses(res.data.responses || []);
        } catch (err) {
            console.error('Error fetching responses', err);
        }
    };

    const downloadCSV = () => {
        if (responses.length === 0) {
            alert('No data to download');
            return;
        }

        const headers = ['Name', 'Email', 'Selected Areas', 'Date Submitted'];
        const csvRows = [];
        csvRows.push(headers.join(','));

        responses.forEach(res => {
            const name = res.user ? res.user.name : 'Unknown User';
            const email = res.user ? res.user.email : 'No Email';
            const areas = res.selectedOptions ? res.selectedOptions.join('; ') : '';
            const date = new Date(res.date).toLocaleDateString();

            // Escape quotes and wrap fields in quotes to handle commas within strings
            const row = [
                `"${name.replace(/"/g, '""')}"`,
                `"${email.replace(/"/g, '""')}"`,
                `"${areas.replace(/"/g, '""')}"`,
                `"${date}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'alumni_support_responses.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (loading || !user) return <div className="support-loader">Loading...</div>;

    return (
        <div className="support-container dashboard-container">
            <div className="support-header">
                <Link to="/support-initiatives" className="back-link">&larr; Back to Initiatives</Link>
                <h1>Support Responses Dashboard</h1>
                <p>View which alumni have pledged support for the various initiatives.</p>
                <button onClick={downloadCSV} className="support-btn-secondary download-btn">
                    Download CSV
                </button>
            </div>

            <div className="support-table-wrapper">
                <table className="support-table">
                    <thead>
                        <tr>
                            <th>Alumni Name</th>
                            <th>Email</th>
                            <th>Selected Support Areas</th>
                            <th>Date Submitted</th>
                        </tr>
                    </thead>
                    <tbody>
                        {responses.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center' }}>No responses yet.</td>
                            </tr>
                        ) : (
                            responses.map((response) => (
                                <tr key={response._id}>
                                    <td>
                                        <div className="user-info">
                                            {response.user && response.user.avatar ? (
                                                <img src={response.user.avatar} alt="avatar" className="response-avatar" />
                                            ) : (
                                                <div className="response-avatar-placeholder"></div>
                                            )}
                                            <span>{response.user ? response.user.name : 'Unknown User'}</span>
                                        </div>
                                    </td>
                                    <td>{response.user ? response.user.email : 'N/A'}</td>
                                    <td>
                                        <ul className="selected-areas-list">
                                            {response.selectedOptions && response.selectedOptions.length > 0 ? (
                                                response.selectedOptions.map((opt, idx) => (
                                                    <li key={idx}>{opt}</li>
                                                ))
                                            ) : (
                                                <span className="no-selection">No specific areas selected</span>
                                            )}
                                        </ul>
                                    </td>
                                    <td>{new Date(response.date).toLocaleDateString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const mapStateToProps = (state) => ({
    auth: state.auth
});

export default connect(mapStateToProps)(SupportResponses);
