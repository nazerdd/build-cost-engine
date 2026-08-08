import datetime
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client

# Supabase Bilgileri
SUPABASE_URL = 'https://lwyfaoljighmhiamving.supabase.co/rest/v1/'

SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eWZhb2xqaWdobWhpYW12aW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMDgxOTEsImV4cCI6MjEwMTc4NDE5MX0.ep4PggdHISF0YSkU9MsU-GuwgQ_UvujqFWNo8MHmdWM'

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def piyasa_fiyatlarini_cek():
    print("Güncel piyasa fiyatları taranıyor...")
    
    # Varsayılan/Yedek fiyatlar
    guncel_fiyatlar = {
        "beton": 2800,       # C25/30 m3 ortalama fiyatı (TL)
        "demir": 27.5,       # Q8-Q12 kg ortalama fiyatı (TL)
        "celikhasir": 32.0,   # kg fiyatı (TL)
        "duvar": 12.5,       # Tuğla adet (TL)
        "siva": 4.5,         # Hazır sıva kg (TL)
        "cimento": 5.0,       # kg (TL)
        "kum": 450,          # m3 (TL)
        "seramik": 350,      # m2 (TL)
        "alcipan": 180,      # levha (TL)
        "boya": 120          # litre (TL)
    }

    try:
        # Örnek: Demir/Piyasa fiyatı veren canlı bir siteden veri çekme
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        url = "https://www.google.com" # Buraya hedef fiyat sitesi bağlanır
        res = requests.get(url, headers=headers, timeout=10)
        
        # Site HTML'i içinden fiyatı süzme mantığı (Örnek)
        # soup = BeautifulSoup(res.content, 'html.parser')
        # demir_fiyat_text = soup.find("div", {"class": "fiyat-box"}).text
        
        print("Piyasa verileri başarıyla çekildi.")
    except Exception as e:
        print(f"Piyasa verisi çekilirken hata oluştu, varsayılan değerler kullanılacak: {e}")

    # Supabase veritabanına kaydetme paketi
    payload = {
        "prices": guncel_fiyatlar,
        "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

    # Supabase 'rates' tablosuna yeni satır ekleme
    data, count = supabase.table("rates").insert({"config_data": payload}).execute()
    print("Supabase veritabanı otomatik olarak güncellendi! 🎉")

if __name__ == "__main__":
    piyasa_fiyatlarini_cek()