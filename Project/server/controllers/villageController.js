import { dbOps } from "../models/db.js";

export const getVillages = async (req, res) => {
  try {
    const list = await dbOps.getCities();
    return res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err) {
    console.error("Fetch villages error:", err);
    return res.status(500).json({ success: false, message: "Error fetching villages" });
  }
};

export const addVillage = async (req, res) => {
  const { villageName } = req.body;

  if (!villageName || !villageName.trim()) {
    return res.status(400).json({ success: false, message: "Village name is required" });
  }

  try {
    const citiesList = await dbOps.getCities();
    const exists = citiesList.some(c => c.villageName.toLowerCase() === villageName.trim().toLowerCase());
    
    if (exists) {
      return res.status(400).json({ success: false, message: "This village is already in the list!" });
    }

    const city = await dbOps.addCity(villageName.trim());
    return res.status(201).json({ success: true, message: "Village added successfully!", data: city });
  } catch (err) {
    console.error("Add village error:", err);
    return res.status(500).json({ success: false, message: "Error adding village" });
  }
};

export const deleteVillage = async (req, res) => {
  const { id } = req.params;

  try {
    await dbOps.deleteCity(id);
    return res.status(200).json({ success: true, message: "Village deleted successfully!", id });
  } catch (err) {
    console.error("Delete village error:", err);
    return res.status(500).json({ success: false, message: "Error deleting village" });
  }
};
