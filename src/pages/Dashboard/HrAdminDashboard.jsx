//src/pages/Dashboard/HrAdminDashboard.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient.js';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import styles from './HrAdminDashboard.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const HrAdminDashboard = () => {
    const [turnoverData, setTurnoverData] = useState({ labels: [], datasets: [] });
    const [leaveApplications, setLeaveApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch Employee Turnover Rate Visualization Data [cite: 21]
            // This is a simplified example. Real turnover calculation requires more complex logic.
            const { data: employees, error: empError } = await supabase.from('employees').select('id, department');
            const { data: offboardedEmployees, error: offboardError } = await supabase.from('offboardingTasks').select('employeeId'); // Assuming offboardingTasks marks offboarded [cite: 54]

            if (empError) throw empError;
            if (offboardError) throw offboardError;

            const totalEmployees = employees.length;
            const turnoverCount = offboardedEmployees.length;
            const turnoverRate = totalEmployees > 0 ? (turnoverCount / totalEmployees) * 100 : 0;

            setTurnoverData({
                labels: ['Total Employees', 'Offboarded', 'Turnover Rate (%)'],
                datasets: [
                    {
                        label: 'Employee Overview',
                        data: [totalEmployees, turnoverCount, parseFloat(turnoverRate.toFixed(2))],
                        backgroundColor: ['#4CAF50', '#FF6384', '#FFCE56'],
                    },
                ],
            });

            // Fetch Leave Applications that need approval [cite: 4]
            const { data: pendingLeaves, error: leaveError } = await supabase
                .from('leaveRequests')
                .select(`
                    *,
                    employees (firstName, lastName)
                `)
                .eq('status', 'pending'); // Only fetch pending ones [cite: 5]

            if (leaveError) throw leaveError;
            setLeaveApplications(pendingLeaves);

        } catch (err) {
            setError(err.message);
            console.error('Error fetching HR/Admin dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveApproval = async (requestId, status) => {
        setLoading(true);
        setError('');
        try {
            const { error: updateError } = await supabase
                .from('leaveRequests')
                .update({ status: status })
                .eq('id', requestId);

            if (updateError) throw updateError;

            // Update leave balances if approved [cite: 5]
            if (status === 'approved') {
                const request = leaveApplications.find(req => req.id === requestId);
                if (request) {
                    const diffDays = (new Date(request.endDate) - new Date(request.startDate)) / (1000 * 60 * 60 * 24) + 1; // Calculate days
                    const { data: currentBalance, error: balanceFetchError } = await supabase
                        .from('leaveBalances')
                        .select('*')
                        .eq('employeeId', request.employeeId)
                        .eq('leaveType', request.leaveType)
                        .single();

                    if (balanceFetchError && balanceFetchError.code !== 'PGRST116') { // PGRST116 is 'no rows found'
                        throw balanceFetchError;
                    }

                    if (currentBalance) {
                        const newTaken = currentBalance.takenDays + diffDays;
                        const newRemaining = currentBalance.accruedDays - newTaken;

                        const { error: balanceUpdateError } = await supabase
                            .from('leaveBalances')
                            .update({ takenDays: newTaken, remainingDays: newRemaining })
                            .eq('id', currentBalance.id);
                        if (balanceUpdateError) throw balanceUpdateError;
                    } else {
                        // Handle case where balance record doesn't exist for type (e.g., first leave of this type)
                        console.warn(`No existing balance for employee ${request.employeeId} leave type ${request.leaveType}. Consider adding initial balances.`);
                    }
                }
            }

            fetchDashboardData(); // Refresh the list after approval/rejection
        } catch (err) {
            setError(err.message || 'Failed to update leave request.');
            console.error('Leave approval error:', err);
        } finally {
            setLoading(false);
        }
    };

    const turnoverChartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Employee Turnover Overview [cite: 21]',
            },
        },
    };

    //if (loading) return <div className={styles.loading}>Loading HR/Admin dashboard...</div>;
    //if (error) return <div className={styles.error}>Error: {error}</div>;

    return (
        <div className={styles.dashboardContainer}>
            <h1>HR/Admin Dashboard</h1>

            {/* Employee Turnover Rate Visualization [cite: 21] */}
            <div className={styles.card}>
                <h3>Employee Turnover Overview</h3>
                <div className={styles.chartContainer}>
                    <Bar options={turnoverChartOptions} data={turnoverData} />
                </div>
                <p className={styles.chartNote}>
                    Note: Turnover rate is a simplified calculation (Offboarded / Total Employees). More complex calculations would involve specific time periods and definitions[cite: 22].
                </p>
            </div>

            {/* Leave Applications for Approval [cite: 4] */}
            <div className={styles.card}>
                <h3>Pending Leave Applications for Approval</h3>
                {leaveApplications.length > 0 ? (
                    <ul className={styles.leaveList}>
                        {leaveApplications.map((app) => (
                            <li key={app.id} className={styles.leaveItem}>
                                <p><strong>Employee:</strong> {app.employees.firstName} {app.employees.lastName}</p>
                                <p><strong>Type:</strong> {app.leaveType} [cite: 4]</p>
                                <p><strong>Dates:</strong> {new Date(app.startDate).toLocaleDateString()} to {new Date(app.endDate).toLocaleDateString()}</p>
                                <p><strong>Reason:</strong> {app.reason || 'N/A'}</p>
                                <div className={styles.leaveActions}>
                                    <button
                                        className={styles.approveButton}
                                        onClick={() => handleLeaveApproval(app.id, 'approved')}
                                        disabled={loading}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        className={styles.rejectButton}
                                        onClick={() => handleLeaveApproval(app.id, 'rejected')}
                                        disabled={loading}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No pending leave applications to review.</p>
                )}
            </div>

            {/* Other HR/Admin specific details like Absenteeism/Tardiness Dashboard [cite: 23] etc. */}
            <div className={styles.card}>
                <h3>Other HR Insights (Coming Soon)</h3>
                <ul>
                    <li>Employee Absenteeism and Tardiness Dashboard [cite: 23]</li>
                    <li>Employees on Leave Tracker [cite: 25]</li>
                    <li>Performance Review Overviews [cite: 13]</li>
                    <li>Training Compliance Status [cite: 11]</li>
                    <li>Monthly Employee Rankings [cite: 17]</li>
                </ul>
            </div>
        </div>
    );
};

export default HrAdminDashboard;
