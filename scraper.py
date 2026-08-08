import datetime
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client

# Supabase Bilgileri (URL'in sonundaki /rest/v1/ KALDIRILDI)
SUPABASE_URL = 'https://lwyfaoljighmhiamving.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eWZhb2xqaWdobWhpYW12aW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMDgxOTEsImV4cCI6MjEwMTc4NDE5MX0.ep4PggdHISF0YSkU9MsU-GuwgQ_UvujqFWNo8MHmdWM'

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def piyasa_fiyatlarini_cek():
    print("Güncel piyasa fiyatları güncelleniyor...")
    
    # Otomatik güncellenecek piyasa ortalama fiyatları
    guncel_fiyatlar = {
        "beton": 2850,       # C25/30 m3 ortalama fiyatı (TL)
        "demir": 28.2,       # Q8-Q12 kg ortalama fiyatı (TL)
        "celikhasir": 33.0,   # kg fiyatı (TL)
        "duvar": 13.0,       # Tuğla adet (TL)
        "siva": 4.8,         # Hazır sıva kg (TL)
        "cimento": 5.2,       # kg (TL)
        "kum": 480,          # m3 (TL)
        "seramik": 360,      # m2 (TL)
        "alcipan": 185,      # levha (TL)
        "boya": 125          # litre (TL)
    }

    payload = {
        "prices": guncel_fiyatlar,
        "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

    try:
        supabase.table("rates").insert({"config_data": payload}).execute()
        print("Supabase veritabanı otomatik olarak güncellendi! 🎉")
    except Exception as e:
        print(f"Hata oluştu: {e}")

if __name__ == "__main__":
    piyasa_fiyatlarini_cek()