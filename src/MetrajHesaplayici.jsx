import React, { useState, useEffect } from "react";
import { Layers, Grid3x3, Building2, PaintBucket, Ruler, Download, Trash2, Plus, Hash, LayoutGrid, PanelTop, Package, Settings, Check } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";

const DEFAULT_RATES = {
  demirKgM: { 8: 0.395, 10: 0.617, 12: 0.888, 14: 1.21, 16: 1.58, 20: 2.47, 22: 2.98, 25: 3.85 },
  duvarTipi: {
    standart_tugla: { label: "Standart delikli tuğla (19x19x8.5)", adetM2: 55 },
    yatay_delikli: { label: "Yatay delikli tuğla (19x19x13.5)", adetM2: 40 },
    gazbeton_10: { label: "Gazbeton blok (10cm)", adetM2: 8.3 },
    gazbeton_20: { label: "Gazbeton blok (20cm)", adetM2: 8.3 },
    briket: { label: "Briket (19x19x39)", adetM2: 12.5 },
  },
  sivaKgM2Cm: 17,
  boyaLtM2Kat: 0.1,
  hasirTipi: {
    q131: { label: "Q131 (ince döşeme)", kgM2: 1.57 },
    q188: { label: "Q188", kgM2: 2.22 },
    q221: { label: "Q221", kgM2: 2.61 },
    q257: { label: "Q257 (kalın döşeme)", kgM2: 3.02 },
  },
  harcOrani: {
    "1:2": { label: "1:2 (yüksek dayanım)", cimentoKgM3: 510, kumM3M3: 1.0 },
    "1:3": { label: "1:3 (standart harç)", cimentoKgM3: 400, kumM3M3: 1.05 },
    "1:4": { label: "1:4 (duvar örgü harcı)", cimentoKgM3: 320, kumM3M3: 1.08 },
    "1:6": { label: "1:6 (kaba iş harcı)", cimentoKgM3: 230, kumM3M3: 1.1 },
  },
  alcipanM2Levha: 3,
  prices: {
    beton: 0, demir: 0, celikhasir: 0, duvar: 0, siva: 0,
    cimento: 0, kum: 0, seramik: 0, alcipan: 0, boya: 0,
  },
  updatedAt: null,
};

const CATS = {
  beton: { label: "Beton", icon: Layers, unit: "m³", color: "#4B5563" },
  demir: { label: "Demir (İnşaat Çeliği)", icon: Grid3x3, unit: "kg", color: "#B45309" },
  celikhasir: { label: "Çelik Hasır", icon: Hash, unit: "kg", color: "#7C2D12" },
  duvar: { label: "Tuğla / Blok Duvar", icon: Building2, unit: "adet", color: "#991B1B" },
  siva: { label: "Sıva", icon: Ruler, unit: "kg", color: "#0F766E" },
  cimento: { label: "Çimento (Harç)", icon: Package, unit: "kg", color: "#78716C" },
  kum: { label: "Kum (Harç)", icon: Package, unit: "m³", color: "#A8A29E" },
  seramik: { label: "Seramik", icon: LayoutGrid, unit: "m²", color: "#0369A1" },
  alcipan: { label: "Alçıpan", icon: PanelTop, unit: "levha", color: "#6D28D9" },
  boya: { label: "Boya", icon: PaintBucket, unit: "litre", color: "#1D4ED8" },
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function fmt(n, digits = 2) {
  return Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: digits });
}

function RateInput({ label, value, onChange, suffix }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-slate-500 py-1">
      <span className="flex-1">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 border border-slate-300 rounded px-2 py-1 text-sm text-right font-mono"
        />
        {suffix && <span className="text-slate-400 w-10">{suffix}</span>}
      </span>
    </label>
  );
}

export default function MetrajHesaplayici() {
  const [activeTab, setActiveTab] = useState("beton");
  const [rows, setRows] = useState([]);
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [ratesLoaded, setRatesLoaded] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [beton, setBeton] = useState({ ad: "", uzunluk: "", genislik: "", kalinlik: "", adet: 1 });
  const [demir, setDemir] = useState({ ad: "", cap: "12", boy: "", adet: "" });
  const [duvar, setDuvar] = useState({ ad: "", uzunluk: "", yukseklik: "", bosluk: "0", tip: "standart_tugla" });
  const [siva, setSiva] = useState({ ad: "", alan: "", kalinlik: "2" });
  const [boya, setBoya] = useState({ ad: "", alan: "", kat: "2" });
  const [celikhasir, setCelikHasir] = useState({ ad: "", alan: "", tip: "q188" });
  const [harc, setHarc] = useState({ ad: "", alan: "", kalinlik: "3", oran: "1:3" });
  const [seramik, setSeramik] = useState({ ad: "", alan: "", fire: "10" });
  const [alcipan, setAlcipan] = useState({ ad: "", alan: "" });

  useEffect(() => {
    async function fetchRates() {
      try {
        const { data, error } = await supabase
          .from("rates")
          .select("config_data")
          .order("id", { ascending: false })
          .limit(1)
          .single();

        if (data && data.config_data && Object.keys(data.config_data).length > 0) {
          setRates((prev) => ({ ...prev, ...data.config_data }));
        }
      } catch (e) {
        console.error("Buluttan veri çekme hatası:", e);
      } finally {
        setRatesLoaded(true);
      }
    }
    fetchRates();
  }, []);

  async function saveRates(newRates) {
    const withDate = { ...newRates, updatedAt: new Date().toISOString() };
    setRates(withDate);
    try {
      const { error } = await supabase
        .from("rates")
        .insert([{ config_data: withDate }]);

      if (!error) {
        setSaveMsg("Veriler buluta kaydedildi!");
      } else {
        setSaveMsg("Kaydetme hatası oluştu.");
      }
    } catch (e) {
      setSaveMsg("Bağlantı hatası!");
    }
    setTimeout(() => setSaveMsg(""), 2500);
  }

  function updateRate(path, value) {
    const next = JSON.parse(JSON.stringify(rates));
    let obj = next;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
    obj[path[path.length - 1]] = value === "" ? "" : Number(value);
    setRates(next);
  }

  function addRow(cat, ad, miktar, detay) {
    if (!ad || !miktar || isNaN(miktar) || miktar <= 0) return;
    setRows((r) => [...r, { id: uid(), cat, ad, miktar: Number(miktar.toFixed(2)), detay }]);
  }

  function handleAddBeton() {
    const { ad, uzunluk, genislik, kalinlik, adet } = beton;
    const hacim = Number(uzunluk) * Number(genislik) * Number(kalinlik) * Number(adet || 1);
    addRow("beton", ad || "Beton eleman", hacim, `${uzunluk}×${genislik}×${kalinlik} m, ${adet} adet`);
    setBeton({ ad: "", uzunluk: "", genislik: "", kalinlik: "", adet: 1 });
  }

  function handleAddDemir() {
    const { ad, cap, boy, adet } = demir;
    const kg = rates.demirKgM[cap] * Number(boy) * Number(adet);
    addRow("demir", ad || `Ø${cap} donatı`, kg, `Ø${cap}mm, ${boy}m × ${adet} adet`);
    setDemir({ ad: "", cap: "12", boy: "", adet: "" });
  }

  function handleAddDuvar() {
    const { ad, uzunluk, yukseklik, bosluk, tip } = duvar;
    const netAlan = Number(uzunluk) * Number(yukseklik) - Number(bosluk || 0);
    const adetSayi = Math.max(netAlan, 0) * rates.duvarTipi[tip].adetM2;
    addRow("duvar", ad || rates.duvarTipi[tip].label, adetSayi, `${uzunluk}×${yukseklik}m, boşluk -${bosluk || 0}m² | ${rates.duvarTipi[tip].label}`);
    setDuvar({ ad: "", uzunluk: "", yukseklik: "", bosluk: "0", tip });
  }

  function handleAddSiva() {
    const { ad, alan, kalinlik } = siva;
    const kg = Number(alan) * Number(kalinlik) * rates.sivaKgM2Cm;
    addRow("siva", ad || "Sıva yüzeyi", kg, `${alan} m², ${kalinlik} cm kalınlık`);
    setSiva({ ad: "", alan: "", kalinlik: "2" });
  }

  function handleAddBoya() {
    const { ad, alan, kat } = boya;
    const lt = Number(alan) * Number(kat) * rates.boyaLtM2Kat;
    addRow("boya", ad || "Boya yüzeyi", lt, `${alan} m², ${kat} kat`);
    setBoya({ ad: "", alan: "", kat: "2" });
  }

  function handleAddCelikHasir() {
    const { ad, alan, tip } = celikhasir;
    const kg = Number(alan) * rates.hasirTipi[tip].kgM2;
    addRow("celikhasir", ad || rates.hasirTipi[tip].label, kg, `${alan} m² × ${rates.hasirTipi[tip].label}`);
    setCelikHasir({ ad: "", alan: "", tip });
  }

  function handleAddHarc() {
    const { ad, alan, kalinlik, oran } = harc;
    const hacim = Number(alan) * (Number(kalinlik) / 100);
    const oranData = rates.harcOrani[oran];
    const cimentoKg = hacim * oranData.cimentoKgM3;
    const kumM3 = hacim * oranData.kumM3M3;
    addRow("cimento", (ad || "Harç") + " - çimento", cimentoKg, `${alan} m², ${kalinlik} cm, ${oranData.label}`);
    addRow("kum", (ad || "Harç") + " - kum", kumM3, `${alan} m², ${kalinlik} cm, ${oranData.label}`);
    setHarc({ ad: "", alan: "", kalinlik: "3", oran });
  }

  function handleAddSeramik() {
    const { ad, alan, fire } = seramik;
    const m2 = Number(alan) * (1 + Number(fire || 0) / 100);
    addRow("seramik", ad || "Seramik kaplama", m2, `${alan} m² + %${fire} fire payı`);
    setSeramik({ ad: "", alan: "", fire });
  }

  function handleAddAlcipan() {
    const { ad, alan } = alcipan;
    const levha = Math.ceil(Number(alan) / rates.alcipanM2Levha);
    addRow("alcipan", ad || "Alçıpan yüzey", levha, `${alan} m² ÷ ${rates.alcipanM2Levha} m²/levha (yukarı yuvarlanmış)`);
    setAlcipan({ ad: "", alan: "" });
  }

  function removeRow(id) {
    setRows((r) => r.filter((x) => x.id !== id));
  }

  const summary = {};
  for (const cat of Object.keys(CATS)) summary[cat] = 0;
  for (const row of rows) summary[row.cat] += row.miktar;

  const grandTotal = Object.keys(CATS).reduce((sum, cat) => sum + summary[cat] * (rates.prices[cat] || 0), 0);
  const hasPrices = Object.values(rates.prices).some((p) => Number(p) > 0);

  function exportExcel() {
    const wb = XLSX.utils.book_new();

    const detailData = rows.map((r, i) => ({
      "#": i + 1,
      Kategori: CATS[r.cat].label,
      Kalem: r.ad,
      Detay: r.detay,
      Miktar: r.miktar,
      Birim: CATS[r.cat].unit,
      "Birim Fiyat (TL)": rates.prices[r.cat] || 0,
      "Tutar (TL)": Number((r.miktar * (rates.prices[r.cat] || 0)).toFixed(2)),
    }));
    const wsDetail = XLSX.utils.json_to_sheet(detailData);
    wsDetail["!cols"] = [{ wch: 4 }, { wch: 22 }, { wch: 22 }, { wch: 34 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsDetail, "Detay Metraj");

    const summaryData = Object.keys(CATS).map((cat) => ({
      Kategori: CATS[cat].label,
      "Toplam Miktar": Number(summary[cat].toFixed(2)),
      Birim: CATS[cat].unit,
      "Birim Fiyat (TL)": rates.prices[cat] || 0,
      "Toplam Tutar (TL)": Number((summary[cat] * (rates.prices[cat] || 0)).toFixed(2)),
    }));
    summaryData.push({ Kategori: "GENEL TOPLAM", "Toplam Miktar": "", Birim: "", "Birim Fiyat (TL)": "", "Toplam Tutar (TL)": Number(grandTotal.toFixed(2)) });
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 8 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Özet");

    XLSX.writeFile(wb, "metraj-hesabi.xlsx");
  }

  const tabs = Object.entries(CATS)
    .filter(([key]) => key !== "kum")
    .map(([key, cat]) => (key === "cimento" ? [key, { ...cat, label: "Kum / Çimento (Harç)" }] : [key, cat]));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* LOGOLU BAŞLIK */}
        <div className="mb-6 border-b-2 border-amber-600 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <img 
                src="/logo.png" 
                alt="Famer İnşaat Logo" 
                className="h-16 w-auto object-contain rounded-lg shadow-sm"
              />
              <div>
                <h1 className="text-2xl font-black tracking-wider text-slate-900 uppercase font-mono">
                  FAMER <span className="text-amber-600">İNŞAAT</span>
                </h1>
                <p className="text-xs font-medium text-slate-500 mt-0.5 tracking-wide">
                  🏗️ Profesyonel Metraj & Maliyet Hesaplama Portalı
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-slate-600 font-mono">v1.0 Canlı Sistem</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap gap-1 mb-4 border-b border-slate-200">
              {tabs.map(([key, cat]) => {
                const Icon = cat.icon;
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                      active ? "border-slate-800 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Icon size={15} />
                    {cat.label}
                  </button>
                );
              })}
              <button
                onClick={() => setActiveTab("ayarlar")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ml-auto ${
                  activeTab === "ayarlar" ? "border-slate-800 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <Settings size={15} />
                Ayarlar
              </button>
            </div>

            {activeTab === "beton" && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <input placeholder="Kalem adı (örn: Temel kirişi)" value={beton.ad}
                  onChange={(e) => setBeton({ ...beton, ad: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <div className="grid grid-cols-4 gap-2">
                  <input type="number" placeholder="Uzunluk (m)" value={beton.uzunluk}
                    onChange={(e) => setBeton({ ...beton, uzunluk: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                  <input type="number" placeholder="Genişlik (m)" value={beton.genislik}
                    onChange={(e) => setBeton({ ...beton, genislik: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                  <input type="number" placeholder="Kalınlık (m)" value={beton.kalinlik}
                    onChange={(e) => setBeton({ ...beton, kalinlik: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                  <input type="number" placeholder="Adet" value={beton.adet}
                    onChange={(e) => setBeton({ ...beton, adet: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                </div>
                <button onClick={handleAddBeton} className="flex items-center gap-1.5 bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded hover:bg-slate-700">
                  <Plus size={15} /> Listeye ekle
                </button>
              </div>
            )}

            {activeTab === "demir" && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <input placeholder="Kalem adı (örn: Kolon donatısı)" value={demir.ad}
                  onChange={(e) => setDemir({ ...demir, ad: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <div className="grid grid-cols-3 gap-2">
                  <select value={demir.cap} onChange={(e) => setDemir({ ...demir, cap: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm">
                    {Object.keys(rates.demirKgM).map((cap) => (
                      <option key={cap} value={cap}>Ø{cap} mm</option>
                    ))}
                  </select>
                  <input type="number" placeholder="Boy (m)" value={demir.boy}
                    onChange={(e) => setDemir({ ...demir, boy: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                  <input type="number" placeholder="Adet" value={demir.adet}
                    onChange={(e) => setDemir({ ...demir, adet: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                </div>
                <button onClick={handleAddDemir} className="flex items-center gap-1.5 bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded hover:bg-slate-700">
                  <Plus size={15} /> Listeye ekle
                </button>
              </div>
            )}

            {activeTab === "celikhasir" && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <input placeholder="Kalem adı (örn: Döşeme hasırı)" value={celikhasir.ad}
                  onChange={(e) => setCelikHasir({ ...celikhasir, ad: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Alan (m²)" value={celikhasir.alan}
                    onChange={(e) => setCelikHasir({ ...celikhasir, alan: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                  <select value={celikhasir.tip} onChange={(e) => setCelikHasir({ ...celikhasir, tip: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm">
                    {Object.entries(rates.hasirTipi).map(([key, v]) => (
                      <option key={key} value={key}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleAddCelikHasir} className="flex items-center gap-1.5 bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded hover:bg-slate-700">
                  <Plus size={15} /> Listeye ekle
                </button>
              </div>
            )}

            {activeTab === "duvar" && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <input placeholder="Kalem adı (örn: Salon iç duvarı)" value={duvar.ad}
                  onChange={(e) => setDuvar({ ...duvar, ad: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <select value={duvar.tip} onChange={(e) => setDuvar({ ...duvar, tip: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2 py-2 text-sm">
                  {Object.entries(rates.duvarTipi).map(([key, v]) => (
                    <option key={key} value={key}>{v.label}</option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" placeholder="Uzunluk (m)" value={duvar.uzunluk}
                    onChange={(e) => setDuvar({ ...duvar, uzunluk: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                  <input type="number" placeholder="Yükseklik (m)" value={duvar.yukseklik}
                    onChange={(e) => setDuvar({ ...duvar, yukseklik: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                  <input type="number" placeholder="Boşluk (m², kapı/pencere)" value={duvar.bosluk}
                    onChange={(e) => setDuvar({ ...duvar, bosluk: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                </div>
                <button onClick={handleAddDuvar} className="flex items-center gap-1.5 bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded hover:bg-slate-700">
                  <Plus size={15} /> Listeye ekle
                </button>
              </div>
            )}

            {activeTab === "siva" && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <input placeholder="Kalem adı (örn: Mutfak duvarı sıvası)" value={siva.ad}
                  onChange={(e) => setSiva({ ...siva, ad: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Alan (m²)" value={siva.alan}
                    onChange={(e) => setSiva({ ...siva, alan: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                  <input type="number" placeholder="Kalınlık (cm)" value={siva.kalinlik}
                    onChange={(e) => setSiva({ ...siva, kalinlik: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                </div>
                <button onClick={handleAddSiva} className="flex items-center gap-1.5 bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded hover:bg-slate-700">
                  <Plus size={15} /> Listeye ekle
                </button>
              </div>
            )}

            {(activeTab === "cimento" || activeTab === "kum") && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <p className="text-xs text-slate-400">Bu form hem çimento hem kum miktarını birlikte hesaplayıp iki ayrı kalem olarak ekler.</p>
                <input placeholder="Kalem adı (örn: Duvar örgü harcı)" value={harc.ad}
                  onChange={(e) => setHarc({ ...harc, ad: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <select value={harc.oran} onChange={(e) => setHarc({ ...harc, oran: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2 py-2 text-sm">
                  {Object.entries(rates.harcOrani).map(([key, v]) => (
                    <option key={key} value={key}>{v.label}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Alan (m²)" value={harc.alan}
                    onChange={(e) => setHarc({ ...harc, alan: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                  <input type="number" placeholder="Kalınlık (cm)" value={harc.kalinlik}
                    onChange={(e) => setHarc({ ...harc, kalinlik: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                </div>
                <button onClick={handleAddHarc} className="flex items-center gap-1.5 bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded hover:bg-slate-700">
                  <Plus size={15} /> Listeye ekle
                </button>
              </div>
            )}

            {activeTab === "seramik" && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <input placeholder="Kalem adı (örn: Banyo zemini)" value={seramik.ad}
                  onChange={(e) => setSeramik({ ...seramik, ad: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Alan (m²)" value={seramik.alan}
                    onChange={(e) => setSeramik({ ...seramik, alan: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                  <input type="number" placeholder="Fire payı (%)" value={seramik.fire}
                    onChange={(e) => setSeramik({ ...seramik, fire: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                </div>
                <button onClick={handleAddSeramik} className="flex items-center gap-1.5 bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded hover:bg-slate-700">
                  <Plus size={15} /> Listeye ekle
                </button>
              </div>
            )}

            {activeTab === "alcipan" && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <input placeholder="Kalem adı (örn: Asma tavan)" value={alcipan.ad}
                  onChange={(e) => setAlcipan({ ...alcipan, ad: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <input type="number" placeholder="Alan (m²)" value={alcipan.alan}
                  onChange={(e) => setAlcipan({ ...alcipan, alan: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
                <p className="text-xs text-slate-400">Standart levha ölçüsü 1.20 × 2.50 m ({rates.alcipanM2Levha} m²) varsayılıyor.</p>
                <button onClick={handleAddAlcipan} className="flex items-center gap-1.5 bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded hover:bg-slate-700">
                  <Plus size={15} /> Listeye ekle
                </button>
              </div>
            )}

            {activeTab === "boya" && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <input placeholder="Kalem adı (örn: Yatak odası boyası)" value={boya.ad}
                  onChange={(e) => setBoya({ ...boya, ad: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Alan (m²)" value={boya.alan}
                    onChange={(e) => setBoya({ ...boya, alan: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm" />
                  <select value={boya.kat} onChange={(e) => setBoya({ ...boya, kat: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-2 text-sm">
                    <option value="1">1 kat</option>
                    <option value="2">2 kat</option>
                    <option value="3">3 kat</option>
                  </select>
                </div>
                <button onClick={handleAddBoya} className="flex items-center gap-1.5 bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded hover:bg-slate-700">
                  <Plus size={15} /> Listeye ekle
                </button>
              </div>
            )}

            {activeTab === "ayarlar" && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-5">
                <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded p-3 leading-relaxed">
                  Girdiğin birim fiyatlar ve katsayılar Supabase bulut veritabanına kaydedilir ve tüm kullanıcılarda anında güncellenir.
                  {rates.updatedAt && (
                    <div className="mt-1 font-medium text-amber-700">
                      Son güncelleme: {new Date(rates.updatedAt).toLocaleString("tr-TR")}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Teknik katsayılar</h3>
                  <div className="grid grid-cols-2 gap-x-6">
                    <div>
                      <div className="text-xs font-medium text-slate-400 uppercase mt-2 mb-1">Demir (kg/m)</div>
                      {Object.keys(rates.demirKgM).map((cap) => (
                        <RateInput key={cap} label={`Ø${cap} mm`} value={rates.demirKgM[cap]}
                          onChange={(v) => updateRate(["demirKgM", cap], v)} suffix="kg/m" />
                      ))}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-400 uppercase mt-2 mb-1">Duvar (adet/m²)</div>
                      {Object.keys(rates.duvarTipi).map((key) => (
                        <RateInput key={key} label={rates.duvarTipi[key].label} value={rates.duvarTipi[key].adetM2}
                          onChange={(v) => updateRate(["duvarTipi", key, "adetM2"], v)} suffix="ad/m²" />
                      ))}
                      <div className="text-xs font-medium text-slate-400 uppercase mt-3 mb-1">Çelik hasır (kg/m²)</div>
                      {Object.keys(rates.hasirTipi).map((key) => (
                        <RateInput key={key} label={rates.hasirTipi[key].label} value={rates.hasirTipi[key].kgM2}
                          onChange={(v) => updateRate(["hasirTipi", key, "kgM2"], v)} suffix="kg/m²" />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 mt-2">
                    <RateInput label="Sıva sarfiyatı" value={rates.sivaKgM2Cm}
                      onChange={(v) => updateRate(["sivaKgM2Cm"], v)} suffix="kg/m²/cm" />
                    <RateInput label="Boya sarfiyatı" value={rates.boyaLtM2Kat}
                      onChange={(v) => updateRate(["boyaLtM2Kat"], v)} suffix="lt/m²/kat" />
                    <RateInput label="Alçıpan levha alanı" value={rates.alcipanM2Levha}
                      onChange={(v) => updateRate(["alcipanM2Levha"], v)} suffix="m²/levha" />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Birim fiyatlar (TL)</h3>
                  <div className="grid grid-cols-2 gap-x-6">
                    {Object.keys(CATS).map((cat) => (
                      <RateInput key={cat} label={CATS[cat].label} value={rates.prices[cat]}
                        onChange={(v) => updateRate(["prices", cat], v)} suffix={`TL/${CATS[cat].unit}`} />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <button onClick={() => saveRates(rates)}
                    className="flex items-center gap-1.5 bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded hover:bg-emerald-800">
                    <Check size={15} /> Buluta Kaydet
                  </button>
                  {saveMsg && <span className="text-xs text-emerald-700">{saveMsg}</span>}
                </div>
              </div>
            )}

            {activeTab !== "ayarlar" && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-slate-600 mb-2">Eklenen kalemler ({rows.length})</h2>
                {rows.length === 0 ? (
                  <div className="text-sm text-slate-400 border border-dashed border-slate-300 rounded-lg p-6 text-center">
                    Henüz kalem eklenmedi. Yukarıdaki formu doldurup "Listeye ekle"ye bas.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 text-slate-500 text-xs uppercase">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Kalem</th>
                          <th className="text-left px-3 py-2 font-medium">Detay</th>
                          <th className="text-right px-3 py-2 font-medium">Miktar</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">
                              <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: CATS[r.cat].color }} />
                              {r.ad}
                            </td>
                            <td className="px-3 py-2 text-slate-400 font-mono text-xs">{r.detay}</td>
                            <td className="px-3 py-2 text-right font-mono">{fmt(r.miktar)} {CATS[r.cat].unit}</td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={() => removeRow(r.id)} className="text-slate-300 hover:text-red-500">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-lg p-4 sticky top-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Genel Özet</h2>
              <div className="space-y-2.5">
                {Object.entries(CATS).map(([key, cat]) => {
                  const Icon = cat.icon;
                  return (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Icon size={14} style={{ color: cat.color }} />
                        {cat.label}
                      </div>
                      <span className="font-mono font-medium text-slate-800">
                        {fmt(summary[key])} {cat.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
              {hasPrices && (
                <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-slate-200">
                  <span className="font-semibold text-slate-700">Genel Toplam</span>
                  <span className="font-mono font-semibold text-emerald-700">{fmt(grandTotal)} TL</span>
                </div>
              )}
              <button
                onClick={exportExcel}
                disabled={rows.length === 0}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium px-4 py-2.5 rounded hover:bg-emerald-800"
              >
                <Download size={15} /> Excel'e Aktar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}