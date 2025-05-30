//src/pages/Dashboard/EmployeeDashboard.js

import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../services/supabaseClient.js';
import { AuthContext } from '../../context/AuthContext.js'; 
import LeaveRequestForm from '../LeaveManagement/LeaveRequestForm.js';
import styles from './EmployeeDashboard.module.css';

const EmployeeDashboard = () => {
    const { session } = useContext(AuthContext); // Get user session from context
    const [employeeId, setEmployeeId] = useState(null);
    const [leaveBalances, setLeaveBalances] = useState([]);
    const [pendingLeaveApplications, setPendingLeaveApplications] = useState([]);
    const [showLeaveForm, setShowLeaveForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (session?.user?.id) {
            fetchEmployeeData(session.user.id);
        }
    }, [session]);

    const fetchEmployeeData = async (userId) => {
        setLoading(true);
        setError('');
        try {
            // First, get the employee's ID from the 'employees' table using the auth.uid()
            const { data: employeeData, error: employeeError } = await supabase
                .from('employees')
                .select('id')
                .eq('authUserId', userId) // Assuming 'authUserId' links to auth.users.id
                .single();

            if (employeeError) throw employeeError;
            if (!employeeData) throw new Error('Employee record not found.');

            setEmployeeId(employeeData.id);

            // Fetch leave balances for the employee [cite: 5]
            const { data: balances, error: balancesError } = await supabase
                .from('leaveBalances')
                .select('*')
                .eq('employeeId', employeeData.id);

            if (balancesError) throw balancesError;
            setLeaveBalances(balances);

            // Fetch pending leave applications for the employee [cite: 4]
            const { data: applications, error: applicationsError } = await supabase
                .from('leaveRequests')
                .select('*')
                .eq('employeeId', employeeData.id)
                .eq('status', 'pending');

            if (applicationsError) throw applicationsError;
            setPendingLeaveApplications(applications);

        } catch (err) {
            setError(err.message);
            console.error('Error fetching employee dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveRequestSubmitted = () => {
        setShowLeaveForm(false);
        if (employeeId) {
            fetchEmployeeData(session.user.id); // Refresh data after submission
        }
    };

    //if (loading) return <div className={styles.loading}>Loading employee dashboard...</div>;
    //if (error) return <div className={styles.error}>Error: {error}</div>;
    if (!employeeId) return <div className={styles.noData}>Employee data not found.</div>;

    return (
        <div className={styles.dashboardContainer}>
            <h1>Employee Dashboard</h1>

            {/* Button to apply for leave [cite: 4] */}
            <button
                className={styles.applyLeaveButton}
                onClick={() => setShowLeaveForm(true)}
            >
                Apply for Leave
            </button>

            {showLeaveForm && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <LeaveRequestForm
                            employeeId={employeeId}
                            onClose={() => setShowLeaveForm(false)}
                            onSuccess={handleLeaveRequestSubmitted}
                        />
                    </div>
                </div>
            )}

            {/* Leave Details Card */}
            <div className={styles.card}>
                <h3>Your Leave Details</h3>
                {leaveBalances.length > 0 ? (
                    <div className={styles.leaveBalances}>
                        {leaveBalances.map((balance) => (
                            <p key={balance.id}>
                                <strong>{balance.leaveType}:</strong> Accrued: {balance.accruedDays}, Taken: {balance.takenDays}, Remaining: {balance.remainingDays} [cite: 5]
                            </p>
                        ))}
                    </div>
                ) : (
                    <p>No leave balances found.</p>
                )}

                <h4>Pending Leave Applications:</h4>
                {pendingLeaveApplications.length > 0 ? (
                    <ul className={styles.pendingApplicationsList}>
                        {pendingLeaveApplications.map((app) => (
                            <li key={app.id} className={styles.pendingApplicationItem}>
                                {app.leaveType} from {new Date(app.startDate).toLocaleDateString()} to {new Date(app.endDate).toLocaleDateString()} - Status: {app.status} [cite: 4]
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No pending leave applications.</p>
                )}
            </div>
            {/* Other employee-specific modules can be added here */}
        </div>
    );
};

export default EmployeeDashboard;
