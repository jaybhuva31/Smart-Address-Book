import os
import json
import datetime
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import pandas as pd
import requests
import io

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

app = FastAPI(title="VyaparSetu Python Analytics & Reports API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EXPRESS_SERVER_URL = "http://localhost:5000/api"
BACKUP_DIR = os.path.join(os.path.dirname(__file__), "backups")
FONT_PATH = os.path.join(os.path.dirname(__file__), "NotoSansGujarati-Regular.ttf")

# Create backup dir if not exists
os.makedirs(BACKUP_DIR, exist_ok=True)

# Helper to download and register Noto Sans Gujarati Font programmatically if needed
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
            else:
                # Fallback to another source if main is down
                fallback_url = "https://github.com/google/fonts/raw/main/ofl/notosansgujarati/NotoSansGujarati-Regular.ttf"
                res = requests.get(fallback_url, timeout=15)
                if res.status_code == 200:
                    with open(FONT_PATH, "wb") as f:
                        f.write(res.content)
                    print("Font downloaded successfully from fallback.")
        
        if os.path.exists(FONT_PATH):
            pdfmetrics.registerFont(TTFont("NotoSansGujarati", FONT_PATH))
            print("NotoSansGujarati font registered in ReportLab.")
            return "NotoSansGujarati"
    except Exception as e:
        print("Failed to configure custom Gujarati font, using Helvetica fallback:", e)
    return "Helvetica"

font_name = setup_gujarati_font()

# --- ANALYTICS ENDPOINT ---
@app.post("/api/python/analytics/summary")
def get_analytics(contacts: list = Body(..., embed=True)):
    if not contacts:
        return {
            "total_contacts": 0,
            "category_distribution": {},
            "village_distribution": {},
            "activity_timeline": {}
        }
    
    df = pd.DataFrame(contacts)
    
    # 1. Category Distribution (handling array field 'categories')
    category_counts = {}
    for cats in df.get('categories', []):
        if isinstance(cats, list):
            for cat in cats:
                category_counts[cat] = category_counts.get(cat, 0) + 1
        elif isinstance(cats, str):
            category_counts[cats] = category_counts.get(cats, 0) + 1
        else:
            category_counts['Unassigned'] = category_counts.get('Unassigned', 0) + 1

    # 2. Village Distribution
    village_counts = df['village'].value_counts().to_dict()

    # 3. Growth Timeline (Contacts added per day)
    df['date'] = pd.to_datetime(df['createdAt'], errors='coerce').dt.date
    timeline = df['date'].value_counts().sort_index().to_dict()
    timeline_str = {str(k): int(v) for k, v in timeline.items() if pd.notnull(k)}

    # Summary Stats
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

# --- PDF REPORT GENERATION ---
@app.post("/api/python/reports/pdf")
def export_pdf(contacts: list = Body(...), category_name: str = Body("તમામ")):
    global font_name
    
    # Refresh font check
    font_name = setup_gujarati_font()

    buffer = io.BytesIO()
    
    # Create the document layout
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=30, 
        leftMargin=30, 
        topMargin=30, 
        bottomMargin=30
    )

    styles = getSampleStyleSheet()
    
    # Setup Gujarati compatible text styles
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

    # Title
    elements.append(Paragraph(f"સરનામા બુક CRM રિપોર્ટ - {category_name}", title_style))
    
    # Subtitle with date and count
    today_str = datetime.datetime.now().strftime("%d/%m/%Y")
    elements.append(Paragraph(f"તારીખ: {today_str}  |  કુલ રેકોર્ડ્સ: {len(contacts)}", meta_style))

    # Table columns: ક્રમ, નામ, ગામ, મોબાઇલ, વોટ્સએપ, સરનામું, નોંધ
    table_data = [[
        Paragraph("<b>ક્રમ</b>", header_style),
        Paragraph("<b>નામ</b>", header_style),
        Paragraph("<b>ગામ</b>", header_style),
        Paragraph("<b>મોબાઇલ નંબર</b>", header_style),
        Paragraph("<b>વોટ્સએપ</b>", header_style),
        Paragraph("<b>નોંધ</b>", header_style)
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

    # Table styles
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

    # Build PDF doc
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=VyaparSetu_{category_name}_{today_str}.pdf"}
    )

# --- AUTOMATED BACKUP ENDPOINT ---
@app.post("/api/python/backup/run")
def run_backup(data: dict = Body(...)):
    # Expected payload: { "contacts": [...], "cities": [...] }
    contacts = data.get("contacts", [])
    cities = data.get("cities", [])
    
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_filename = f"Backup_VyaparSetu_{timestamp}.json"
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
            "message": "ડેટા બેકઅપ સફળતાપૂર્વક લેવાયો!",
            "filename": backup_filename,
            "path": backup_file_path,
            "count": len(contacts)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write backup: {str(e)}")

# --- LIST BACKUPS ENDPOINT ---
@app.get("/api/python/backup/list")
def list_backups():
    try:
        files = os.listdir(BACKUP_DIR)
        backup_files = []
        for file in files:
            if file.startswith("Backup_VyaparSetu_") and file.endswith(".json"):
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

# --- DOWNLOAD BACKUP ENDPOINT ---
@app.get("/api/python/backup/download/{filename}")
def download_backup(filename: str):
    file_path = os.path.join(BACKUP_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, filename=filename, media_type="application/json")
    raise HTTPException(status_code=404, detail="Backup file not found")
