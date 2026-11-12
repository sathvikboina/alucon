import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { getDemographics, getRegistrations } from "../../actions/analytics";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";
import "../../App.css";
import "./AnalyticsDashboard.css";
import MembersTable from "./MembersTable";

const COLORS = ["#2563b0", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const StatCard = ({ value, label, icon }) => (
  <div className="stat-card">
    <div className="stat-icon">{icon}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

const AnalyticsDashboard = ({
  getDemographics,
  getRegistrations,
  analytics,
  auth: { user },
}) => {
  const demographics = analytics?.demographics || [];
  const registrations = analytics?.registrations || [];
  const loading = analytics?.loading;

  useEffect(() => {
    getDemographics();
    getRegistrations();
  }, [getDemographics, getRegistrations]);

  if (loading || !analytics) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner" />
        <p>Loading Analytics...</p>
      </div>
    );
  }

  if (user && user.adminType !== "head") {
    return (
      <div className="analytics-denied">
        <span className="denied-icon">🔒</span>
        <h2>Access Denied</h2>
        <p>This dashboard is restricted to Head Admins only.</p>
      </div>
    );
  }

  const totalMembers = demographics.reduce((acc, curr) => acc + curr.value, 0);
  const alumniCount  = demographics.find((d) => d.name.toLowerCase() === "alumni")?.value || 0;
  const studentCount = demographics.find((d) => d.name.toLowerCase() === "student")?.value || 0;
  const newThisMonth = registrations.length > 0 ? registrations[registrations.length - 1].users : 0;

  return (
    <div className="analytics-page">

      {/* ── Header ── */}
      <div className="analytics-hero">
        <div>
          <span className="analytics-kicker">Administration &amp; Telemetry</span>
          <h1 className="analytics-title">Analytics Dashboard</h1>
          <p className="analytics-subtitle">Head Admin · Real-time portal metrics &amp; community growth</p>
        </div>
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Live
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="stats-row">
        <StatCard value={totalMembers} label="Total Members"  icon="👥" />
        <StatCard value={alumniCount}  label="Alumni"         icon="🎓" />
        <StatCard value={studentCount} label="Students"       icon="📚" />
        <StatCard value={newThisMonth} label="New This Month" icon="📈" />
      </div>

      {/* ── Charts ── */}
      <div className="charts-row">

        {/* Pie */}
        <div className="chart-card">
          <div className="chart-card-header">
            <span className="chart-card-icon">🍩</span>
            <h3>User Distribution by Role</h3>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={demographics}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={45}
                  paddingAngle={3}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {demographics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line */}
        <div className="chart-card">
          <div className="chart-card-header">
            <span className="chart-card-icon">📊</span>
            <h3>Registration Growth Over Time</h3>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={registrations}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563b0" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563b0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4fb" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#2563b0"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#2563b0", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── Members Table ── */}
      <div className="members-section">
        <div className="members-section-header">
          <span className="chart-card-icon">🗃️</span>
          <h3>Members Directory</h3>
        </div>
        <MembersTable />
      </div>

    </div>
  );
};

AnalyticsDashboard.propTypes = {
  getDemographics: PropTypes.func.isRequired,
  getRegistrations: PropTypes.func.isRequired,
  analytics: PropTypes.object,
  auth: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  analytics: state.analytics,
  auth: state.auth,
});

export default connect(mapStateToProps, { getDemographics, getRegistrations })(AnalyticsDashboard);