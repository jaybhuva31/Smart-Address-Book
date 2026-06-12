import React, { useState, useEffect, useRef } from "react";
import { Plus, Users, Eye, Check, Search, X } from "lucide-react";

export const CATEGORY_MAP = [
  { id: "Retail Customer", label: "Retail Customer" },
  { id: "Wholesale Customer", label: "Wholesale Customer" },
  { id: "Relative", label: "Relative" },
  { id: "Friend", label: "Friend" },
  { id: "Transporter", label: "Transporter" },
  { id: "Religious Organization", label: "Religious Organization" },
  { id: "Purchase Merchant", label: "Purchase Merchant" },
  { id: "Salesman", label: "Salesman" },
  { id: "Contractor", label: "Contractor" },
  { id: "Labor", label: "Labor" },
  { id: "Broker", label: "Broker" },
  { id: "General", label: "General" }
];

export default function ContactForm({ 
  cities, 
  onAddCity, 
  onSaveContact, 
  editContact, 
  onCancelEdit,
  onViewAll, 
  onViewCategory 
}) {
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Village search states
  const [villageSearch, setVillageSearch] = useState("");
  const [showVillageDropdown, setShowVillageDropdown] = useState(false);
  const villageRef = useRef(null);

  // Village Modal state
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [citySubmitting, setCitySubmitting] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (villageRef.current && !villageRef.current.contains(event.target)) {
        setShowVillageDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // If in edit mode, populate the fields
  useEffect(() => {
    if (editContact) {
      setMobile(editContact.mobile || "");
      setWhatsapp(editContact.whatsapp || "");
      setName(editContact.name || "");
      setVillage(editContact.village || "");
      setVillageSearch(editContact.village || "");
      setAddress(editContact.address || "");
      setNotes(editContact.notes || "");
      setSelectedCategories(editContact.categories || []);
    } else {
      clearForm();
    }
  }, [editContact]);

  const clearForm = () => {
    setMobile("");
    setWhatsapp("");
    setName("");
    setVillage("");
    setVillageSearch("");
    setAddress("");
    setNotes("");
    setSelectedCategories(["General"]); // Default
  };

  // Toggle Category selection
  const handleToggleCategory = (catId) => {
    setSelectedCategories(prev => {
      if (prev.includes(catId)) {
        // Enforce at least one category
        if (prev.length === 1) return prev;
        return prev.filter(c => c !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  // Submit contact
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert("Please enter full name!");
      return;
    }
    if (!mobile.trim()) {
      alert("Please enter mobile number!");
      return;
    }
    if (!/^\d{10}$/.test(mobile.trim())) {
      alert("Mobile number must be exactly 10 digits!");
      return;
    }

    const contactData = {
      mobile: mobile.trim(),
      whatsapp: whatsapp.trim() || mobile.trim(), // Auto fill whatsapp with mobile if blank
      name: name.trim(),
      village: village || "",
      address: address.trim(),
      notes: notes.trim(),
      categories: selectedCategories.length > 0 ? selectedCategories : ["General"]
    };

    onSaveContact(contactData);
    if (!editContact) {
      clearForm();
    }
  };

  // Handle Add Village Submit
  const handleAddCitySubmit = async (e) => {
    e.preventDefault();
    if (!newCityName.trim()) return;

    setCitySubmitting(true);
    try {
      const addedCity = await onAddCity(newCityName.trim());
      // Auto-select the newly added village
      setVillage(addedCity.villageName);
      setVillageSearch(addedCity.villageName);
      setNewCityName("");
      setIsCityModalOpen(false);
    } catch (err) {
      alert("Error adding village: " + err.message);
    } finally {
      setCitySubmitting(false);
    }
  };

  // Filter villages based on typing search
  const filteredVillages = cities.filter(city => 
    (city.villageName || "").toLowerCase().includes(villageSearch.toLowerCase())
  );

  return (
    <div className="crm-layout">
      {/* Left Column: Form Card */}
      <div className="form-card">
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={20} style={{ color: 'var(--primary)' }} />
          {editContact ? "Edit Contact" : "New Contact Registration Form"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">1) Mobile Number *</label>
            <input 
              type="tel" 
              className="form-input" 
              placeholder="10-digit mobile number" 
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">2) WhatsApp Number</label>
            <input 
              type="tel" 
              className="form-input" 
              placeholder="WhatsApp number (defaults to mobile number if blank)" 
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">3) Full Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Enter full name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">4) Village / City</label>
            <div className="village-select-container" ref={villageRef} style={{ position: 'relative' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search or select village..."
                  value={villageSearch}
                  onChange={(e) => {
                    setVillageSearch(e.target.value);
                    setVillage(e.target.value); // fallback to manual typing
                    setShowVillageDropdown(true);
                  }}
                  onFocus={() => setShowVillageDropdown(true)}
                />
                <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              </div>
              
              {showVillageDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 200,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  marginTop: '4px'
                }}>
                  {filteredVillages.length === 0 ? (
                    <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No village found. Click the button to add a new village.
                    </div>
                  ) : (
                    filteredVillages.map((city) => (
                      <div 
                        key={city.id} 
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-color)',
                          fontSize: '13px',
                          backgroundColor: village === city.villageName ? 'rgba(26, 115, 232, 0.1)' : 'transparent'
                        }}
                        onClick={() => {
                          setVillage(city.villageName);
                          setVillageSearch(city.villageName);
                          setShowVillageDropdown(false);
                        }}
                      >
                        {city.villageName}
                      </div>
                    ))
                  )}
                </div>
              )}

              <button 
                type="button" 
                className="btn btn-primary"
                style={{ padding: '0 12px', height: '40px', fontSize: '13px' }}
                onClick={() => setIsCityModalOpen(true)}
              >
                <Plus size={16} /> Add Village
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">5) Full Address</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Enter full address" 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">6) Additional Notes</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Any additional notes..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Form Actions (Multi-Category Selector Checkboxes) */}
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-main)' }}>
              Select Category (Multiple selection allowed)
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '10px',
              marginBottom: '20px'
            }}>
              {CATEGORY_MAP.map((cat, idx) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`btn-cat ${isSelected ? 'active' : ''}`}
                    style={{ 
                      backgroundColor: isSelected ? 'var(--btn-category)' : 'transparent',
                      color: isSelected ? 'white' : 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      justifyContent: 'flex-start',
                      gap: '6px',
                      padding: '8px 10px'
                    }}
                    onClick={() => handleToggleCategory(cat.id)}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      border: '1.5px solid currentColor',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? 'currentColor' : 'transparent'
                    }}>
                      {isSelected && <Check size={12} style={{ color: 'var(--bg-card)' }} />}
                    </div>
                    <span>{idx + 1}) {cat.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
              {editContact && (
                <button type="button" className="btn btn-outline" onClick={onCancelEdit}>
                  Cancel
                </button>
              )}
              <button 
                type="submit" 
                className="btn btn-success" 
                style={{ padding: '10px 24px', fontSize: '15px', fontWeight: '600' }}
              >
                Save Contact
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Right Column: Navigation Sidebar */}
      <div className="sidebar-card">
        <button 
          className="btn btn-primary" 
          style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: '600' }}
          onClick={onViewAll}
        >
          <Eye size={16} /> View All Contacts
        </button>

        <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }}></div>

        <div className="sidebar-grid">
          {CATEGORY_MAP.map((cat, idx) => (
            <button 
              key={cat.id} 
              className="btn-cat" 
              style={{ justifyContent: 'center' }}
              onClick={() => onViewCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inline Modal: Add New City */}
      {isCityModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Add New Village</h3>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
                onClick={() => setIsCityModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddCitySubmit}>
              <div className="modal-body">
                <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Village Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter village name"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setIsCityModalOpen(false)}
                  disabled={citySubmitting}
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={citySubmitting}
                >
                  {citySubmitting ? "Saving..." : "Save Village"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
