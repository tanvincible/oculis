import pandas as pd

df = pd.DataFrame(
    [
        {
            "Company Name": "AlphaCorp",
            "Year": 2022,
            "Revenue": 500000,
            "Net Income": 70000,
            "Total Assets": 800000,
            "Total Liabilities": 300000,
        },
        {
            "Company Name": "AlphaCorp",
            "Year": 2023,
            "Revenue": 600000,
            "Net Income": 90000,
            "Total Assets": 850000,
            "Total Liabilities": 320000,
        },
        {
            "Company Name": "BetaCorp",
            "Year": 2023,
            "Revenue": 1000000,
            "Net Income": 250000,
            "Total Assets": 1200000,
            "Total Liabilities": 400000,
        },
    ]
)

df.to_excel("ample_balance_sheets.xlsx", index=False)
