import React, { useState, useMemo } from "react";
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  ExternalLink, 
  ArrowUpDown, 
  Edit2, 
  Trash2, 
  Search, 
  Plus, 
  Check, 
  AlertTriangle, 
  RefreshCw,
  Trash
} from "lucide-react";
import { CATEGORY_MAP } from "./ContactForm";
import * as XLSX from "xlsx";
import { contactsAPI, pythonAPI } from "../services/api";

export default function ReportTable({ 
  contacts, 
  onEditContact, 
  onDeleteContact, 
  onAddDataView,
  activeCategory,
  setActiveCategory,
  googleSheetsViewUrl,
  onRefreshData,
  showToast
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  // Multi-select bulk delete state
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Sheet sync loading states
  const [syncLoading, setSyncLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  // Filter contacts by active category (English ID) and search query
  const filteredContacts = useMemo(() => {
    return contacts
      .filter((contact) => {
        // Category filter
        if (activeCategory !== "All") {
          const cats = contact.categories || [];
          if (!cats.includes(activeCategory)) return false;
        }

        // Search query filter
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        
        // Translate categories to English for search
        const catLabels = (contact.categories || [])
          .map(cid => CATEGORY_MAP.find(m => m.id === cid)?.label || cid)
          .join(" ")
          .toLowerCase();

        return (
          (contact.name || "").toLowerCase().includes(query) ||
          (contact.address || "").toLowerCase().includes(query) ||
          (contact.village || "").toLowerCase().includes(query) ||
          (contact.mobile || "").toLowerCase().includes(query) ||
          (contact.whatsapp || "").toLowerCase().includes(query) ||
          (contact.notes || "").toLowerCase().includes(query) ||
          catLabels.includes(query)
        );
      })
      .sort((a, b) => {
        if (!sortField) return 0;
        
        let valA = a[sortField] || "";
        let valB = b[sortField] || "";

        let compareResult = 0;
        if (typeof valA === "string" && typeof valB === "string") {
          compareResult = valA.localeCompare(valB, "en");
        } else {
          compareResult = valA < valB ? -1 : valA > valB ? 1 : 0;
        }

        return sortDirection === "asc" ? compareResult : -compareResult;
      });
  }, [contacts, activeCategory, searchQuery, sortField, sortDirection]);

  // Pagination logic
  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredContacts.slice(startIndex, startIndex + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredContacts.length / pageSize) || 1;

  // Change page
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Toggle Sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = paginatedContacts.map(c => c.id);
      setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    } else {
      const pageIds = paginatedContacts.map(c => c.id);
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(rowId => rowId !== id));
    }
  };

  // Delete handlers
  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      onDeleteContact(id);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete the ${selectedIds.length} selected contacts?`)) {
      try {
        for (const id of selectedIds) {
          await contactsAPI.delete(id);
        }
        showToast("Selected contacts deleted successfully!", "success");
        setSelectedIds([]);
        onRefreshData();
      } catch (err) {
        showToast("Bulk delete failed: " + err.message, "error");
      }
    }
  };

  // Google Sheets Retry Action
  const handleRetrySync = async () => {
    setSyncLoading(true);
    try {
      const res = await contactsAPI.retrySync();
      showToast(res.message, "success");
      onRefreshData();
    } catch (err) {
      showToast("Sync failed: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setSyncLoading(false);
    }
  };

  // Google Sheets Connection Test
  const handleTestConnection = async () => {
    const webhook = localStorage.getItem("crm_sheets_webhook") || "";
    if (!webhook) {
      showToast("Please configure the Webhook URL in Settings first!", "error");
      return;
    }
    setTestLoading(true);
    try {
      const res = await contactsAPI.testConnection(webhook);
      showToast(res.message, "success");
    } catch (err) {
      showToast("Connection failed: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setTestLoading(false);
    }
  };

  // Export to Excel (.xlsx)
  const exportToExcel = () => {
    try {
      const dataToExport = filteredContacts.map((c, index) => {
        const catNames = (c.categories || [])
          .map(cid => CATEGORY_MAP.find(m => m.id === cid)?.label || cid)
          .join(", ");
        return {
          "No.": index + 1,
          "Name": c.name || "",
          "Address": c.address || "",
          "Village/City": c.village || "",
          "WhatsApp": c.whatsapp || "",
          "Mobile": c.mobile || "",
          "Category": catNames,
          "Notes": c.notes || "",
          "Created Date": c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-US") : ""
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");
      
      const categoryLabel = activeCategory === "All" ? "All" : (CATEGORY_MAP.find(m => m.id === activeCategory)?.label || activeCategory);
      const fileName = `SmartAddressBook_${categoryLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      showToast("Excel file downloaded successfully!", "success");
    } catch (err) {
      showToast("Excel export failed: " + err.message, "error");
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    try {
      const headers = ["No.", "Name", "Address", "Village/City", "WhatsApp", "Mobile", "Category", "Notes", "Date"];
      const rows = filteredContacts.map((c, index) => {
        const catNames = (c.categories || [])
          .map(cid => CATEGORY_MAP.find(m => m.id === cid)?.label || cid)
          .join("; ");
        return [
          index + 1,
          `"${c.name || ''}"`,
          `"${c.address || ''}"`,
          `"${c.village || ''}"`,
          c.whatsapp || "",
          c.mobile || "",
          `"${catNames}"`,
          `"${c.notes || ''}"`,
          c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-US") : ""
        ];
      });

      let csvContent = "\ufeff"; // UTF-8 BOM
      csvContent += headers.join(",") + "\n";
      rows.forEach(row => {
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      
      const categoryLabel = activeCategory === "All" ? "All" : (CATEGORY_MAP.find(m => m.id === activeCategory)?.label || activeCategory);
      link.setAttribute("download", `SmartAddressBook_${categoryLabel}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("CSV file downloaded successfully!", "success");
    } catch (err) {
      showToast("CSV export failed: " + err.message, "error");
    }
  };

  // Download Advanced Unicode PDF via Python FastAPI
  const handleDownloadPDF = async () => {
    showToast("Generating PDF report...", "success");
    try {
      const categoryLabel = activeCategory === "All" ? "All" : (CATEGORY_MAP.find(m => m.id === activeCategory)?.label || activeCategory);
      const blobData = await pythonAPI.downloadPDF(filteredContacts, categoryLabel);
      
      const blob = new Blob([blobData], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SmartAddressBook_${categoryLabel}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("PDF downloaded successfully!", "success");
    } catch (err) {
      showToast("FastAPI PDF generation failed. Using standard system print dialog.", "warning");
      window.print(); // fallback
    }
  };

  // Open Google Sheet
  const openGoogleSheet = () => {
    if (googleSheetsViewUrl) {
      window.open(googleSheetsViewUrl, "_blank");
    } else {
      showToast("Google Sheet View Link is not set in settings!", "error");
    }
  };

  const activeCategoryLabel = activeCategory === "All" ? "All Contacts" : (CATEGORY_MAP.find(m => m.id === activeCategory)?.label || activeCategory);

  const allPageRowsSelected = paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.includes(c.id));

  return (
    <div className="report-view-container">
      {/* Sync Control and Health Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        marginBottom: '16px',
        fontSize: '13px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '600' }}>Google Sheets Connection:</span>
          <button 
            type="button" 
            className="btn btn-outline" 
            style={{ padding: '4px 10px', fontSize: '12px' }} 
            onClick={handleTestConnection}
            disabled={testLoading}
          >
            {testLoading ? "Testing..." : "Test Connection"}
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {contacts.some(c => c.syncStatus === "failed") && (
            <span style={{ color: 'var(--btn-danger)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
              <AlertTriangle size={15} /> Failed sync data exists
            </span>
          )}
          <button 
            type="button" 
            className="btn btn-success" 
            style={{ padding: '4px 12px', fontSize: '12px' }}
            onClick={handleRetrySync}
            disabled={syncLoading}
          >
            <RefreshCw size={12} className={syncLoading ? "spin" : ""} style={{ marginRight: '4px' }} />
            Retry Failed Syncs
          </button>
        </div>
      </div>

      {/* Dynamic Title Header */}
      <div style={{
        backgroundColor: 'var(--primary)',
        color: 'white',
        padding: '12px 0',
        textCenter: 'center',
        fontSize: '20px',
        fontWeight: '700',
        borderRadius: '4px',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        {activeCategoryLabel} ({filteredContacts.length})
      </div>

      {/* Grid of buttons at top of report list */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '8px',
        marginBottom: '20px'
      }}>
        <button
          className={`btn-cat ${activeCategory === "All" ? 'active' : ''}`}
          style={{ justifyContent: 'center' }}
          onClick={() => {
            setActiveCategory("All");
            setCurrentPage(1);
          }}
        >
          All Contacts
        </button>

        {CATEGORY_MAP.map((cat, idx) => (
          <button
            key={cat.id}
            className={`btn-cat ${activeCategory === cat.id ? 'active' : ''}`}
            style={{ justifyContent: 'center' }}
            onClick={() => {
              setActiveCategory(cat.id);
              setCurrentPage(1);
            }}
          >
            {cat.label}
          </button>
        ))}
        
        <button
          className="btn-cat"
          style={{ backgroundColor: '#188038', color: 'white', justifyContent: 'center' }}
          onClick={onAddDataView}
        >
          Add Contact (+)
        </button>
      </div>

      {/* Actions and Search Box */}
      <div className="search-controls">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" style={{ fontSize: '13px' }} onClick={exportToExcel}>
            <FileSpreadsheet size={15} /> Excel Sheet
          </button>
          <button className="btn btn-outline" style={{ fontSize: '13px' }} onClick={exportToCSV}>
            <Download size={15} /> CSV File
          </button>
          <button className="btn btn-outline" style={{ fontSize: '13px' }} onClick={handleDownloadPDF}>
            <FileText size={15} /> Advanced PDF
          </button>
          <button className="btn btn-outline" style={{ fontSize: '13px' }} onClick={() => window.print()}>
            <FileText size={15} /> Print View
          </button>
          {googleSheetsViewUrl && (
            <button className="btn btn-outline" style={{ fontSize: '13px' }} onClick={openGoogleSheet}>
              <ExternalLink size={15} /> Google Sheet View
            </button>
          )}
          
          {/* Bulk delete action button */}
          {selectedIds.length > 0 && (
            <button 
              className="btn btn-danger" 
              style={{ fontSize: '13px', marginLeft: 'auto' }} 
              onClick={handleBulkDelete}
            >
              <Trash size={14} /> Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>

        {/* Search */}
        <div className="search-box">
          <label style={{ fontWeight: '600' }}>Search:</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Print-only title layout */}
      <div className="print-header">
        <h1>Smart Address Book CRM - {activeCategoryLabel} Report</h1>
        <p>Date: {new Date().toLocaleDateString("en-US")} | Total Records: {filteredContacts.length}</p>
      </div>

      {/* Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px', cursor: 'default' }}>
                <input 
                  type="checkbox" 
                  checked={allPageRowsSelected} 
                  onChange={handleSelectAll} 
                />
              </th>
              <th onClick={() => handleSort("name")}>
                Name <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th onClick={() => handleSort("village")}>
                Village <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th onClick={() => handleSort("mobile")}>
                Mobile No. <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th onClick={() => handleSort("whatsapp")}>
                WhatsApp No. <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th>Address</th>
              <th>Notes</th>
              <th>Category</th>
              <th style={{ textAlign: 'center' }}>Sync Status</th>
              <th className="actions-cell" style={{ justifyContent: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedContacts.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No matching records found
                </td>
              </tr>
            ) : (
              paginatedContacts.map((c) => {
                const isChecked = selectedIds.includes(c.id);
                // Translate categories to English labels
                const catLabels = (c.categories || [])
                  .map(cid => CATEGORY_MAP.find(m => m.id === cid)?.label || cid)
                  .join(", ");

                return (
                  <tr key={c.id} style={{ backgroundColor: isChecked ? 'rgba(26, 115, 232, 0.05)' : 'transparent' }}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={(e) => handleSelectRow(c.id, e.target.checked)} 
                      />
                    </td>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.village || "-"}</td>
                    <td>{c.mobile}</td>
                    <td>
                      <a 
                        href={`https://wa.me/91${c.whatsapp}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}
                      >
                        {c.whatsapp}
                      </a>
                    </td>
                    <td>{c.address || "-"}</td>
                    <td>{c.notes || "-"}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                        {(c.categories || []).map(cid => {
                          const label = CATEGORY_MAP.find(m => m.id === cid)?.label || cid;
                          return (
                            <span 
                              key={cid}
                              style={{ 
                                padding: '2px 6px', 
                                backgroundColor: 'rgba(26, 115, 232, 0.1)', 
                                borderRadius: '4px', 
                                fontSize: '10px',
                                color: 'var(--primary)',
                                fontWeight: '600'
                              }}
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {c.syncStatus === 'synced' ? (
                        <span
                          style={{
                            padding: '3px 8px',
                            backgroundColor: 'rgba(24, 128, 56, 0.1)',
                            color: 'var(--btn-success)',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}
                          title="Synced successfully"
                        >
                          ✓ Synced
                        </span>
                      ) : c.syncStatus === 'pending' ? (
                        <span
                          style={{
                            padding: '3px 8px',
                            backgroundColor: 'rgba(242, 153, 0, 0.1)',
                            color: 'var(--btn-warning)',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}
                          title="Sync pending"
                        >
                          ⚠ Pending
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '3px 8px',
                            backgroundColor: 'rgba(217, 48, 37, 0.1)',
                            color: 'var(--btn-danger)',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}
                          title="Sync failed, check settings"
                        >
                          ✗ Failed
                        </span>
                      )}
                    </td>
                    <td className="actions-cell" style={{ justifyContent: 'center' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => onEditContact(c)}
                        title="Edit"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => handleDelete(c.id)}
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer controls */}
        <div className="table-controls">
          <div>
            Showing {filteredContacts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredContacts.length)} of {filteredContacts.length} entries{" "}
            {searchQuery && `(filtered from ${contacts.length} total entries)`}
          </div>

          <div className="pagination-btn-group">
            <button 
              className="btn btn-outline" 
              style={{ padding: '6px 12px', fontSize: '12px' }}
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </button>
            <span style={{ padding: '6px 12px', alignSelf: 'center', fontWeight: '500' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button 
              className="btn btn-outline" 
              style={{ padding: '6px 12px', fontSize: '12px', marginLeft: '4px' }}
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
