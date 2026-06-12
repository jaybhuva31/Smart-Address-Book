import pandas as pd
from datetime import datetime, timezone

def get_overview_metrics(contacts: list, villages_list: list) -> dict:
    if not contacts:
        return {
            "total_contacts": 0,
            "active_contacts": 0,
            "added_today": 0,
            "added_week": 0,
            "added_month": 0,
            "unique_villages": 0,
            "unique_categories": 0,
            "avg_contacts_per_village": 0.0
        }
    
    df = pd.DataFrame(contacts)
    
    # 1. Date calculations
    df['createdAt_dt'] = pd.to_datetime(df['createdAt'], errors='coerce')
    now = datetime.now(timezone.utc)
    
    # Standardize timezones
    if df['createdAt_dt'].dt.tz is None:
        df['createdAt_dt'] = df['createdAt_dt'].dt.tz_localize(timezone.utc)
    else:
        df['createdAt_dt'] = df['createdAt_dt'].dt.tz_convert(timezone.utc)
        
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - pd.Timedelta(days=7)
    month_start = now - pd.Timedelta(days=30)
    
    added_today = int((df['createdAt_dt'] >= today_start).sum())
    added_week = int((df['createdAt_dt'] >= week_start).sum())
    added_month = int((df['createdAt_dt'] >= month_start).sum())
    
    # 2. Locations and Categories
    unique_vills = df['village'].dropna().unique()
    unique_vills = [v for v in unique_vills if str(v).strip() != ""]
    
    all_categories = []
    for cats in df.get('categories', []):
        if isinstance(cats, list):
            all_categories.extend(cats)
        elif isinstance(cats, str) and cats:
            all_categories.append(cats)
            
    unique_cats = list(set(all_categories))
    
    avg_per_village = len(df) / len(unique_vills) if unique_vills else 0.0
    
    return {
        "total_contacts": len(df),
        "active_contacts": len(df),  # Assuming all records in local_db are active
        "added_today": added_today,
        "added_week": added_week,
        "added_month": added_month,
        "unique_villages": len(unique_vills),
        "unique_categories": len(unique_cats),
        "avg_contacts_per_village": round(avg_per_village, 2)
    }

def get_category_metrics(contacts: list) -> dict:
    if not contacts:
        return {
            "distribution": {},
            "most_common": "N/A",
            "least_common": "N/A",
            "percentages": {}
        }
    
    df = pd.DataFrame(contacts)
    all_categories = []
    
    for cats in df.get('categories', []):
        if isinstance(cats, list):
            all_categories.extend(cats)
        elif isinstance(cats, str) and cats:
            all_categories.append(cats)
        else:
            all_categories.append("General")
            
    if not all_categories:
        all_categories = ["General"]
        
    s = pd.Series(all_categories)
    counts = s.value_counts().to_dict()
    total = len(all_categories)
    percentages = {k: round((v / total) * 100, 2) for k, v in counts.items()}
    
    most_common = s.mode().iloc[0] if not s.empty else "General"
    least_common = s.value_counts().idxmin() if not s.empty else "General"
    
    return {
        "distribution": counts,
        "most_common": most_common,
        "least_common": least_common,
        "percentages": percentages
    }

def get_village_metrics(contacts: list) -> dict:
    if not contacts:
        return {
            "distribution": {},
            "top_10": [],
            "percentages": {}
        }
    
    df = pd.DataFrame(contacts)
    df['village'] = df['village'].fillna("Unknown").replace("", "Unknown")
    
    total = len(df)
    v_counts = df['village'].value_counts()
    distribution = v_counts.to_dict()
    percentages = {k: round((v / total) * 100, 2) for k, v in distribution.items()}
    
    top_10 = []
    for k, v in v_counts.head(10).items():
        top_10.append({
            "village": k,
            "count": int(v),
            "percentage": round((v / total) * 100, 2)
        })
        
    return {
        "distribution": distribution,
        "top_10": top_10,
        "percentages": percentages
    }
