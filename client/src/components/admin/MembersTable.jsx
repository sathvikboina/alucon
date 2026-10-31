import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { getMembers } from "../../actions/analytics";

const MembersTable = ({ getMembers, analytics: { members, loading } }) => {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    getMembers();
  }, [getMembers]);

  // 🔍 Filter logic
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === "all" || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // 📅 Format date nicely
  const formatDate = (date) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 📥 Download CSV
  const downloadCSV = () => {
    const headers = ["Name", "Email", "Role", "Joined On"];

    const rows = filteredMembers.map((m) => [
      m.name,
      m.email,
      m.role,
      formatDate(m.date),
    ]);

    let csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");

    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "members_list.csv");

    document.body.appendChild(link);
    link.click();
  };

  if (loading) {
    return <h3 className="text-center mt-4">Loading Members...</h3>;
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-3 text-primary fw-bold">Members List</h2>

      {/* 🔍 Search + Filter + Download */}
      <div className="d-flex justify-content-between align-items-center mb-3 gap-3 flex-wrap">
        
        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or email"
          className="form-control"
          style={{ maxWidth: "400px" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="d-flex gap-2">
          {/* Filter */}
          <select
            className="form-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="alumni">Alumni</option>
          </select>

          {/* Download Button */}
          <button className="btn btn-success" onClick={downloadCSV}>
            📥 Download CSV
          </button>
        </div>
      </div>

      {/* 📊 Table */}
      <div className="table-responsive">
        <table className="table table-bordered table-hover shadow-sm">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined On</th>
            </tr>
          </thead>

          <tbody>
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <tr key={member._id}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td className="text-capitalize">{member.role}</td>
                  <td>{formatDate(member.date)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center">
                  No members found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  analytics: state.analytics,
});

export default connect(mapStateToProps, { getMembers })(MembersTable);