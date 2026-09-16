## Technical Challenges

- NYT search relevance vs. actual coverage depth
    Not great data here basically for CUs, pivoted away from news idea
-Both CU and Branch data not under contracted APIs; cached both but used API pattern. Could hit API directly but this is better for a demo


Data sources:

CU data:
    - [not real-time but still uses API pattern] NCUA data - CU data
Branch data: 
    - [real-time] ArcGIS https://services8.arcgis.com/DlJzJLOZpPXmMpWi/arcgis/rest/services/National_Credit_Union_Branches/FeatureServer/0/query - branch data