import React, { useState, useEffect } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import api from "../../utils/api";

export default function AchievementFilter({ filters, onChange }) {
  const [categories, setCategories] = useState([]);
  const [searchInput, setSearchInput]   = useState(filters.search || "");

  useEffect(() => {
    api
      .get("/achievement-categories")
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.search) {
        onChange({ ...filters, search: searchInput });
      }
    }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleCategory = (val) =>
    onChange({ ...filters, category: val === filters.category ? "" : val });

  const handleRecipientType = (val) =>
    onChange({
      ...filters,
      recipientType: val === filters.recipientType ? "" : val,
    });

  const clearAll = () => {
    setSearchInput("");
    onChange({ category: "", recipientType: "", search: "" });
  };

  const hasActiveFilters =
    filters.category || filters.recipientType || filters.search;

  return (
    <div className="achievement-filter">
      <div className="filter-bar">
        {/* Search */}
        <div className="search-wrapper">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search achievements, names, awards…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              className="clear-search"
              onClick={() => setSearchInput("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Recipient type */}
        <div className="filter-group">
          <SlidersHorizontal size={14} />
          {["alumni", "faculty"].map((type) => (
            <button
              key={type}
              className={`filter-chip${filters.recipientType === type ? " active" : ""}`}
              onClick={() => handleRecipientType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <button className="clear-all" onClick={clearAll}>
            <X size={14} /> Clear filters
          </button>
        )}
      </div>

      {/* Category pills */}
      {categories?.length > 0 && (
        <div className="category-filter-row">
          {categories.map((cat) => (
            <button
              key={cat._id}
              className={`category-chip${filters.category === cat._id ? " active" : ""}`}
              style={{
                "--chip-color": cat.color,
              }}
              onClick={() => handleCategory(cat._id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}