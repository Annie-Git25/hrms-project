//src/pages/LeaveManagement/LeaveRequestForm.jsx (Component for applying leave)

import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient.js';
//import styles from './LeaveRequestForm.module.css'; // Create this CSS module

const LeaveRequestForm = ({ employeeId, onClose, onSuccess }) => {
    const [leaveType, setLeaveType] = useState('vacation');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');

        if (!startDate || !endDate || new Date(startDate) > new Date(endDate)) {
            setError('Please select valid start and end dates.');
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('leaveRequests')
                .insert([
                    {
                        employeeId: employeeId,
                        leaveType: leaveType,
                        startDate: startDate,
                        endDate: endDate,
                        reason: reason,
                        status: 'pending', // Initial status is pending [cite: 4]
                    },
                ]);

            if (error) throw error;

            setSuccessMessage('Leave request submitted successfully! [cite: 4]');
            // Clear form
            setLeaveType('vacation');
            setStartDate('');
            setEndDate('');
            setReason('');
            onSuccess(); // Trigger refresh on parent dashboard
        } catch (err) {
            setError(err.message || 'Failed to submit leave request.');
            console.error('Leave request error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.formContainer}>
            <h2>Apply for Leave</h2>
            <form onSubmit={handleSubmit} className={styles.leaveForm}>
                <div className={styles.formGroup}>
                    <label htmlFor="leaveType">Leave Type: [cite: 4]</label>
                    <select
                        id="leaveType"
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        required
                    >
                        <option value="vacation">Vacation</option>
                        <option value="sick">Sick</option>
                        <option value="maternity">Maternity</option>
                        <option value="paternity">Paternity</option>
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="startDate">Start Date:</label>
                    <input
                        type="date"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="endDate">End Date:</label>
                    <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="reason">Reason (Optional):</label>
                    <textarea
                        id="reason"
                        rows="3"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    ></textarea>
                </div>

                {error && <p className={styles.error}>{error}</p>}
                {successMessage && <p className={styles.success}>{successMessage}</p>}

                <div className={styles.formActions}>
                    <button type="submit" disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                    <button type="button" onClick={onClose} className={styles.cancelButton}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default LeaveRequestForm;
