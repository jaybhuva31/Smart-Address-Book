import pandas as pd

def segment_contacts(contacts: list) -> dict:
    if not contacts:
        return {
            "segments": [],
            "insights": []
        }
        
    df = pd.DataFrame(contacts)
    df['village'] = df['village'].fillna("Unknown").replace("", "Unknown")
    
    # Expand categories
    records = []
    for idx, row in df.iterrows():
        cats = row.get("categories", [])
        if isinstance(cats, list):
            if not cats:
                cats = ["General"]
            for c in cats:
                records.append({
                    "id": row.get("id"),
                    "name": row.get("name"),
                    "village": row.get("village"),
                    "category": c
                })
        elif isinstance(cats, str) and cats:
            records.append({
                "id": row.get("id"),
                "name": row.get("name"),
                "village": row.get("village"),
                "category": cats
            })
        else:
            records.append({
                "id": row.get("id"),
                "name": row.get("name"),
                "village": row.get("village"),
                "category": "General"
            })
            
    if not records:
        return {
            "segments": [],
            "insights": []
        }
        
    udf = pd.DataFrame(records)
    
    # Calculate group sizes
    grouped = udf.groupby(['village', 'category']).size().reset_index(name='count')
    grouped = grouped.sort_values(by='count', ascending=False)
    
    segments = []
    for _, r in grouped.iterrows():
        segments.append({
            "village": str(r['village']),
            "category": str(r['category']),
            "count": int(r['count'])
        })
        
    # Generate automatic insights
    insights = []
    if not grouped.empty:
        top_segment = grouped.iloc[0]
        insights.append(
            f"Largest contact segment is '{top_segment['category']}' in '{top_segment['village']}' with {top_segment['count']} contacts."
        )
        
        # Category insights
        cat_counts = udf['category'].value_counts()
        top_cat = cat_counts.index[0]
        insights.append(f"Primary category across all regions is '{top_cat}', representing a key focus area.")
        
        # Village distribution insight
        village_counts = df['village'].value_counts()
        if len(village_counts) > 1:
            top_vill = village_counts.index[0]
            pct = round((village_counts.iloc[0] / len(df)) * 100, 1)
            insights.append(f"Village '{top_vill}' is the densest hub, accounting for {pct}% of the database.")
            
    return {
        "segments": segments,
        "insights": insights
    }
