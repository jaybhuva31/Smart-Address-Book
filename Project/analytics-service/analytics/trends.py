import pandas as pd

def analyze_monthly_trends(contacts: list) -> dict:
    if not contacts:
        return {
            "timeline": [],
            "growth_percentage": 0.0,
            "yearly_trends": {}
        }
        
    df = pd.DataFrame(contacts)
    df['createdAt_dt'] = pd.to_datetime(df['createdAt'], errors='coerce')
    df = df.dropna(subset=['createdAt_dt'])
    
    if df.empty:
        return {
            "timeline": [],
            "growth_percentage": 0.0,
            "yearly_trends": {}
        }
        
    # Group by year-month
    df['month'] = df['createdAt_dt'].dt.to_period('M')
    monthly_counts = df.groupby('month').size().sort_index()
    
    timeline = []
    cumulative = 0
    prev_count = 0
    
    for m, count in monthly_counts.items():
        cumulative += count
        growth_rate = 0.0
        if prev_count > 0:
            growth_rate = round(((count - prev_count) / prev_count) * 100, 2)
        timeline.append({
            "month": str(m),
            "count": int(count),
            "cumulative": int(cumulative),
            "growth_rate": growth_rate
        })
        prev_count = count
        
    # Growth rate for the last month in the list compared to previous
    last_month_growth = timeline[-1]["growth_rate"] if len(timeline) > 1 else 0.0
    
    # Group by year
    df['year'] = df['createdAt_dt'].dt.year
    yearly_counts = df.groupby('year').size().to_dict()
    yearly_trends = {str(k): int(v) for k, v in yearly_counts.items()}
    
    return {
        "timeline": timeline,
        "growth_percentage": last_month_growth,
        "yearly_trends": yearly_trends
    }
