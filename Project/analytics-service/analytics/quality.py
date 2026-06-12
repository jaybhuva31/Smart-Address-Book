import pandas as pd

def analyze_data_quality(contacts: list) -> dict:
    if not contacts:
        return {
            "missing_percentages": {
                "name": 100.0,
                "mobile": 100.0,
                "village": 100.0,
                "category": 100.0,
                "address": 100.0
            },
            "completeness_score": 0.0,
            "gauge_data": {"score": 0.0}
        }
        
    df = pd.DataFrame(contacts)
    total = len(df)
    
    fields = {
        "name": "name",
        "mobile": "mobile",
        "village": "village",
        "category": "categories",
        "address": "address"
    }
    
    missing_counts = {}
    for key, col in fields.items():
        if col not in df.columns:
            missing_counts[key] = total
        else:
            if col == "categories":
                # check for empty lists or nulls
                missing_counts[key] = df[col].apply(lambda x: len(x) == 0 if isinstance(x, list) else pd.isna(x)).sum()
            else:
                missing_counts[key] = df[col].apply(lambda x: str(x).strip() == "" or pd.isna(x)).sum()
                
    missing_percentages = {k: round((v / total) * 100, 2) for k, v in missing_counts.items()}
    
    # Completeness score (average non-missing percentage of key fields)
    field_scores = [100.0 - pct for pct in missing_percentages.values()]
    completeness_score = round(sum(field_scores) / len(field_scores), 2)
    
    return {
        "missing_percentages": missing_percentages,
        "completeness_score": completeness_score,
        "gauge_data": {"score": completeness_score}
    }

def detect_duplicates(contacts: list) -> dict:
    if not contacts:
        return {
            "duplicates": [],
            "duplicate_count": 0,
            "risk_level": "Low"
        }
        
    # Group by identical mobile numbers
    mobile_groups = {}
    for c in contacts:
        mob = str(c.get("mobile", "")).strip()
        if mob and mob != "0000000000":
            mobile_groups.setdefault(mob, []).append(c)
            
    duplicates_list = []
    seen_ids = set()
    
    # 1. Identify high risk (exact mobile duplicate)
    for mob, group in mobile_groups.items():
        if len(group) > 1:
            for x in group:
                seen_ids.add(x.get("id"))
            duplicates_list.append({
                "type": "Duplicate Phone Number",
                "reason": f"Multiple contacts sharing mobile number: {mob}",
                "contacts": [{"id": x.get("id"), "name": x.get("name"), "mobile": x.get("mobile"), "village": x.get("village")} for x in group],
                "risk": "High"
            })
            
    # 2. Identify medium risk (same name but different phone numbers)
    name_groups = {}
    for c in contacts:
        cid = c.get("id")
        if cid in seen_ids:
            continue
        name = str(c.get("name", "")).strip().lower()
        if name:
            name_groups.setdefault(name, []).append(c)
            
    for name, group in name_groups.items():
        if len(group) > 1:
            duplicates_list.append({
                "type": "Duplicate Name",
                "reason": f"Multiple contacts sharing name: {name.title()}",
                "contacts": [{"id": x.get("id"), "name": x.get("name"), "mobile": x.get("mobile"), "village": x.get("village")} for x in group],
                "risk": "Medium"
            })
            
    # Calculate risk level
    total_dups = len(duplicates_list)
    risk_level = "Low"
    if any(d["risk"] == "High" for d in duplicates_list):
        risk_level = "High"
    elif total_dups > 0:
        risk_level = "Medium"
        
    return {
        "duplicates": duplicates_list,
        "duplicate_count": total_dups,
        "risk_level": risk_level
    }
