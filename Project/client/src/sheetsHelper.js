/**
 * Sync contact data with Google Sheets in real-time.
 * Uses a Google Apps Script Web App URL to append a row.
 */
export const syncContactToGoogleSheet = async (webhookUrl, contact) => {
  if (!webhookUrl) {
    console.warn("Google Sheets Webhook URL is not configured. Skipping sheets sync.");
    return false;
  }

  // Generate date and time in IST (or user local time format)
  const now = new Date();
  
  // Format Date: DD/MM/YYYY
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dateStr = `${day}/${month}/${year}`;

  // Format Time: HH:MM:SS AM/PM (12hr format)
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const timeStr = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;

  // Prepare the row data matching user requirements:
  // Columns: Date, Time, Mobile, WhatsApp, Name, Village, Address, Notes, Category
  const payload = {
    date: dateStr,
    time: timeStr,
    mobile: contact.mobile || "",
    whatsapp: contact.whatsapp || "",
    name: contact.name || "",
    village: contact.village || "",
    address: contact.address || "",
    notes: contact.notes || "",
    category: contact.category || ""
  };

  try {
    // Send standard POST request to Google Apps Script
    // We send it using mode: 'no-cors' if it is a simple trigger, 
    // but a standard application/json fetch is best. Google App Script web apps 
    // redirects, so fetch with POST works great.
    const response = await fetch(webhookUrl, {
      method: "POST",
      mode: "no-cors", // Necessary for Google Script redirects in browser without CORS errors
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log("Google Sheet sync completed successfully (no-cors mode).");
    return true;
  } catch (err) {
    console.error("Failed to sync contact to Google Sheets:", err);
    throw err;
  }
};
