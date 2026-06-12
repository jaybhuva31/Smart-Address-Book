import os
import json
import io
import datetime
from fastapi import FastAPI, HTTPException, Body, Header, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import pandas as pd
import requests
import httpx

# ReportLab imports for legacy PDF reports
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Core analytics functions
from analytics.contact_analysis import get_overview_metrics, get_category_metrics, get_village_metrics
from analytics.trends import analyze_monthly_trends
from analytics.quality import analyze_data_quality, detect_duplicates
from analytics.segmentation import segment_contacts

app = FastAPI(title="Smart Address Book Analytics Service")

# CORS middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NODE_SERVER_URL = "http://localhost:5000/api"
LOCAL_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server", "local_db.json"))
BACKUP_DIR = os.path.join(os.path.dirname(__file__), "backups")
FONT_PATH = os.path.join(os.path.dirname(__file__), "NotoSansGujarati-Regular.ttf")

os.makedirs(BACKUP_DIR, exist_ok=True)

# Copy font from old services folder if present
OLD_FONT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "python-services", "NotoSansGujarati-Regular.ttf"))
if os.path.exists(OLD_FONT_PATH) and not os.path.exists(FONT_PATH):
    try:
        import shutil
        shutil.copy(OLD_FONT_PATH, FONT_PATH)
        print("Copied NotoSansGujarati font from legacy python-services.")
    except Exception as e:
        print("Failed to copy legacy font file:", e)

# setup font logic
def setup_gujarati_font():
    try:
        if not os.path.exists(FONT_PATH):
            print("Downloading Noto Sans Gujarati Font...")
            font_url = "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansGujarati/NotoSansGujarati-Regular.ttf"
            res = requests.get(font_url, timeout=15)
            if res.status_code == 200:
                with open(FONT_PATH, "wb") as f:
                    f.write(res.content)
                print("Font downloaded successfully.")
        
        if os.path.exists(FONT_PATH):
            pdfmetrics.registerFont(TTFont("NotoSansGujarati", FONT_PATH))
            return "NotoSansGujarati"
    except Exception as e:
        print("Failed custom Gujarati font configuration, falling back:", e)
    return "Helvetica"

font_name = setup_gujarati_font()

# Dependency to fetch latest contacts & villages
async def get_contacts_and_villages(authorization: str = Header(None)):
    contacts = []
    villages = []
    
    # 1. Attempt to fetch from Node.js Express server
    if authorization:
        try:
            async with httpx.AsyncClient() as client:
                contacts_res = await client.get(f"{NODE_SERVER_URL}/contacts", headers={"Authorization": authorization}, timeout=8.0)
                villages_res = await client.get(f"{NODE_SERVER_URL}/villages", headers={"Authorization": authorization}, timeout=8.0)
                
                if contacts_res.status_code == 200 and villages_res.status_code == 200:
                    contacts = contacts_res.json().get("data", [])
                    villages = villages_res.json().get("data", [])
                    return contacts, villages
        except Exception as e:
            print(f"FastAPI: Node.js server fetch failed: {e}. Falling back to local_db.json.")
            
    # 2. Fallback to local_db.json
    if os.path.exists(LOCAL_DB_PATH):
        try:
            with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
                db_data = json.load(f)
                contacts = db_data.get("contacts", [])
                villages = db_data.get("cities", [])
                return contacts, villages
        except Exception as e:
            print(f"FastAPI: local_db.json read failed: {e}")
            
    return contacts, villages

# --- NEW ANALYTICS API ENDPOINTS ---

@app.get("/analytics/overview")
async def get_overview(data: tuple = Depends(get_contacts_and_villages)):
    contacts, villages = data
    return get_overview_metrics(contacts, villages)

@app.get("/analytics/categories")
async def get_categories(data: tuple = Depends(get_contacts_and_villages)):
    contacts, _ = data
    return get_category_metrics(contacts)

@app.get("/analytics/villages")
async def get_villages_list(data: tuple = Depends(get_contacts_and_villages)):
    contacts, _ = data
    return get_village_metrics(contacts)

@app.get("/analytics/monthly-trends")
async def get_monthly_trends(data: tuple = Depends(get_contacts_and_villages)):
    contacts, _ = data
    return analyze_monthly_trends(contacts)

@app.get("/analytics/recent-contacts")
async def get_recent_contacts(data: tuple = Depends(get_contacts_and_villages)):
    contacts, _ = data
    # Sort and slice last 10 entries
    recent = sorted(contacts, key=lambda x: x.get("createdAt", ""), reverse=True)[:10]
    return recent

@app.get("/analytics/data-quality")
async def get_data_quality(data: tuple = Depends(get_contacts_and_villages)):
    contacts, _ = data
    return analyze_data_quality(contacts)

@app.get("/analytics/duplicates")
async def get_duplicates(data: tuple = Depends(get_contacts_and_villages)):
    contacts, _ = data
    return detect_duplicates(contacts)

@app.get("/analytics/segments")
async def get_segments(data: tuple = Depends(get_contacts_and_villages)):
    contacts, _ = data
    return segment_contacts(contacts)

@app.get("/analytics/export/csv")
async def export_csv(authorization: str = Header(None)):
    contacts, _ = await get_contacts_and_villages(authorization)
    if not contacts:
        raise HTTPException(status_code=400, detail="No contacts available for export")
        
    df = pd.DataFrame(contacts)
    df_clean = df.copy()
    if 'id' in df_clean.columns:
        df_clean = df_clean.drop(columns=['id'])
    if 'syncStatus' in df_clean.columns:
        df_clean = df_clean.drop(columns=['syncStatus'])
        
    column_mapping = {
        "name": "Name",
        "mobile": "Mobile Number",
        "whatsapp": "WhatsApp Number",
        "village": "Village/City",
        "address": "Address",
        "notes": "Notes",
        "categories": "Categories",
        "createdAt": "Created Date"
    }
    df_clean = df_clean.rename(columns=column_mapping)
    if 'Categories' in df_clean.columns:
        df_clean['Categories'] = df_clean['Categories'].apply(lambda x: ", ".join(x) if isinstance(x, list) else x)
        
    stream = io.StringIO()
    df_clean.to_csv(stream, index=False)
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=smart_address_book_analytics.csv"
    return response

@app.get("/analytics/export/excel")
async def export_excel(authorization: str = Header(None)):
    contacts, _ = await get_contacts_and_villages(authorization)
    if not contacts:
        raise HTTPException(status_code=400, detail="No contacts available for export")
        
    df = pd.DataFrame(contacts)
    df_clean = df.copy()
    if 'id' in df_clean.columns:
        df_clean = df_clean.drop(columns=['id'])
    if 'syncStatus' in df_clean.columns:
        df_clean = df_clean.drop(columns=['syncStatus'])
        
    column_mapping = {
        "name": "Name",
        "mobile": "Mobile Number",
        "whatsapp": "WhatsApp Number",
        "village": "Village/City",
        "address": "Address",
        "notes": "Notes",
        "categories": "Categories",
        "createdAt": "Created Date"
    }
    df_clean = df_clean.rename(columns=column_mapping)
    if 'Categories' in df_clean.columns:
        df_clean['Categories'] = df_clean['Categories'].apply(lambda x: ", ".join(x) if isinstance(x, list) else x)
        
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_clean.to_excel(writer, index=False, sheet_name='Contacts Analytics')
    output.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="smart_address_book_analytics.xlsx"'
    }
    return StreamingResponse(output, headers=headers, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


# --- LEGACY API ENDPOINTS FOR BACKWARD COMPATIBILITY ---

@app.post("/api/python/analytics/summary")
def legacy_get_analytics(contacts: list = Body(..., embed=True)):
    if not contacts:
        return {
            "total_contacts": 0,
            "category_distribution": {},
            "village_distribution": {},
            "growth_timeline": {},
            "top_village": "N/A",
            "top_category": "N/A"
        }
    
    df = pd.DataFrame(contacts)
    
    category_counts = {}
    for cats in df.get('categories', []):
        if isinstance(cats, list):
            for cat in cats:
                category_counts[cat] = category_counts.get(cat, 0) + 1
        elif isinstance(cats, str):
            category_counts[cats] = category_counts.get(cats, 0) + 1
        else:
            category_counts['General'] = category_counts.get('General', 0) + 1

    df['village'] = df['village'].fillna("Unknown").replace("", "Unknown")
    village_counts = df['village'].value_counts().to_dict()

    df['date'] = pd.to_datetime(df['createdAt'], errors='coerce').dt.date
    timeline = df['date'].value_counts().sort_index().to_dict()
    timeline_str = {str(k): int(v) for k, v in timeline.items() if pd.notnull(k)}

    total = len(df)
    top_village = max(village_counts, key=village_counts.get) if village_counts else "N/A"
    top_category = max(category_counts, key=category_counts.get) if category_counts else "N/A"

    return {
        "total_contacts": total,
        "category_distribution": category_counts,
        "village_distribution": village_counts,
        "growth_timeline": timeline_str,
        "top_village": f"{top_village} ({village_counts.get(top_village, 0)})",
        "top_category": f"{top_category} ({category_counts.get(top_category, 0)})"
    }

@app.post("/api/python/reports/pdf")
def legacy_export_pdf(contacts: list = Body(...), category_name: str = Body("All")):
    global font_name
    setup_gujarati_font()

    buffer = io.BytesIO()
    
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=30, 
        leftMargin=30, 
        topMargin=30, 
        bottomMargin=30
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'GujTitle',
        parent=styles['Heading1'],
        fontName=font_name,
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1a73e8'),
        alignment=1, # Center
        spaceAfter=15
    )
    
    meta_style = ParagraphStyle(
        'GujMeta',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#5f6368'),
        alignment=1, # Center
        spaceAfter=20
    )

    cell_style = ParagraphStyle(
        'GujCell',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#202124')
    )

    header_style = ParagraphStyle(
        'GujHeader',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=10,
        leading=13,
        textColor=colors.white,
        fontStyle='Bold'
    )

    elements = []

    elements.append(Paragraph(f"Address Book CRM Report - {category_name}", title_style))
    
    today_str = datetime.datetime.now().strftime("%d/%m/%Y")
    elements.append(Paragraph(f"Date: {today_str}  |  Total Records: {len(contacts)}", meta_style))

    table_data = [[
        Paragraph("<b>No.</b>", header_style),
        Paragraph("<b>Name</b>", header_style),
        Paragraph("<b>Village</b>", header_style),
        Paragraph("<b>Mobile</b>", header_style),
        Paragraph("<b>WhatsApp</b>", header_style),
        Paragraph("<b>Notes</b>", header_style)
    ]]

    for i, c in enumerate(contacts):
        table_data.append([
            Paragraph(str(i + 1), cell_style),
            Paragraph(c.get('name', '') or '-', cell_style),
            Paragraph(c.get('village', '') or '-', cell_style),
            Paragraph(c.get('mobile', '') or '-', cell_style),
            Paragraph(c.get('whatsapp', '') or '-', cell_style),
            Paragraph(c.get('notes', '') or '-', cell_style)
        ])

    contact_table = Table(table_data, colWidths=[30, 130, 80, 85, 85, 125])
    contact_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a73e8')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dadce0')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))

    elements.append(contact_table)

    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=SmartAddressBook_{category_name}_{today_str}.pdf"}
    )

@app.post("/api/python/backup/run")
def legacy_run_backup(data: dict = Body(...)):
    contacts = data.get("contacts", [])
    cities = data.get("cities", [])
    
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_filename = f"Backup_SmartAddressBook_{timestamp}.json"
    backup_file_path = os.path.join(BACKUP_DIR, backup_filename)
    
    backup_payload = {
        "exportDate": datetime.datetime.now().isoformat(),
        "contacts": contacts,
        "cities": cities,
        "count": {
            "contacts": len(contacts),
            "cities": len(cities)
        }
    }
    
    try:
        with open(backup_file_path, "w", encoding="utf-8") as f:
            json.dump(backup_payload, f, ensure_ascii=False, indent=2)
            
        return {
            "success": True,
            "message": "Data backup created successfully!",
            "filename": backup_filename,
            "path": backup_file_path,
            "count": len(contacts)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write backup: {str(e)}")

@app.get("/api/python/backup/list")
def legacy_list_backups():
    try:
        files = os.listdir(BACKUP_DIR)
        backup_files = []
        for file in files:
            if file.startswith("Backup_") and file.endswith(".json"):
                full_path = os.path.join(BACKUP_DIR, file)
                stat = os.stat(full_path)
                backup_files.append({
                    "filename": file,
                    "size_bytes": stat.st_size,
                    "created_at": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        return {"success": True, "backups": sorted(backup_files, key=lambda x: x['created_at'], reverse=True)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/python/backup/download/{filename}")
def legacy_download_backup(filename: str):
    file_path = os.path.join(BACKUP_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, filename=filename, media_type="application/json")
    raise HTTPException(status_code=404, detail="Backup file not found")
