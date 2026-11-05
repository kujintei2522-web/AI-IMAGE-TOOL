import React, { useEffect, useRef, useState } from "react";
import { removeBackground } from "@imgly/background-removal";
import {
  Upload, Sparkles, Download, Image as ImageIcon, RefreshCw,
  CheckCircle2, AlertCircle, Palette, Trash2
} from "lucide-react";

const colors = [
  { name: "โปร่งใส", value: "transparent" },
  { name: "ขาว", value: "#ffffff" },
  { name: "เทาอ่อน", value: "#e5e7eb" },
  { name: "ฟ้า", value: "#bfdbfe" },
  { name: "ชมพู", value: "#fbcfe8" },
  { name: "เขียว", value: "#bbf7d0" },
  { name: "ดำ", value: "#111827" }
];

export default function App() {
  const [file, setFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultBlob, setResultBlob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [background, setBackground] = useState("transparent");
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(1200);
  const [keepRatio, setKeepRatio] = useState(true);
  const [ratio, setRatio] = useState(1);
  const [scale, setScale] = useState("1");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [shadowEnabled, setShadowEnabled] = useState(true);
  const [shadowBlur, setShadowBlur] = useState(18);
  const [shadowOpacity, setShadowOpacity] = useState(28);
  const [shadowX, setShadowX] = useState(0);
  const [shadowY, setShadowY] = useState(12);
  const inputRef = useRef(null);

  const objectFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  const previewShadow = shadowEnabled
    ? `drop-shadow(${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity / 100}))`
    : "none";
  const previewImageStyle = { filter: `${objectFilter} ${previewShadow}` };

  useEffect(() => () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [originalUrl, resultUrl]);

  function loadFile(nextFile) {
    if (!nextFile) return;
    if (!nextFile.type.startsWith("image/")) {
      setError("กรุณาเลือกไฟล์รูปภาพ เช่น JPG, PNG หรือ WebP");
      return;
    }
    setError("");
    setFile(nextFile);
    const nextUrl = URL.createObjectURL(nextFile);
    setOriginalUrl(nextUrl);
    const probe = new Image();
    probe.onload = () => {
      setWidth(probe.naturalWidth);
      setHeight(probe.naturalHeight);
      setRatio(probe.naturalWidth / probe.naturalHeight || 1);
      setScale("1");
    };
    probe.src = nextUrl;
    setResultUrl("");
    setResultBlob(null);
    setProgress("");
    setBackground("transparent");
  }

  async function processImage() {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setProgress("กำลังเตรียม AI...");
    try {
      const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          if (total > 0) {
            const percent = Math.round((current / total) * 100);
            setProgress(`กำลังประมวลผล ${percent}%`);
          } else {
            setProgress("AI กำลังประมวลผลภาพ...");
          }
        }
      });
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
      setProgress("ลบพื้นหลังเรียบร้อยแล้ว");
    } catch (e) {
      console.error(e);
      setError("ประมวลผลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
      setProgress("");
    } finally {
      setBusy(false);
    }
  }

  function downloadPng() {
    if (!resultBlob) return;
    const requestedWidth = Math.max(1, Math.min(10000, Math.round(Number(width) || 1)));
    const requestedHeight = Math.max(1, Math.min(10000, Math.round(Number(height) || 1)));
    if (requestedWidth * requestedHeight > 50000000) {
      setError("ขนาดภาพใหญ่เกินไปสำหรับเบราว์เซอร์ กรุณาลดขนาดให้ไม่เกิน 50 ล้านพิกเซล");
      return;
    }
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = requestedWidth;
      canvas.height = requestedHeight;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (background !== "transparent") {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      // Apply tonal adjustments and a soft cast shadow to the isolated object.
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      if (shadowEnabled) {
        const sx = canvas.width / image.naturalWidth;
        const sy = canvas.height / image.naturalHeight;
        ctx.shadowColor = `rgba(0,0,0,${shadowOpacity / 100})`;
        ctx.shadowBlur = shadowBlur * ((sx + sy) / 2);
        ctx.shadowOffsetX = shadowX * sx;
        ctx.shadowOffsetY = shadowY * sy;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.filter = "none";
      canvas.toBlob(blob => {
        if (blob) saveBlob(blob, `background-studio-${requestedWidth}x${requestedHeight}.png`);
        else setError("สร้างไฟล์ภาพไม่สำเร็จ กรุณาลองลดขนาดภาพ");
      }, "image/png");
    };
    image.onerror = () => setError("ไม่สามารถอ่านภาพสำหรับดาวน์โหลดได้");
    image.src = resultUrl;
  }

  function setPreset(multiplier) {
    const image = new Image();
    image.onload = () => {
      const nextW = Math.min(10000, image.naturalWidth * multiplier);
      const nextH = Math.min(10000, image.naturalHeight * multiplier);
      setWidth(nextW);
      setHeight(nextH);
      setRatio(image.naturalWidth / image.naturalHeight || 1);
      setKeepRatio(true);
      setScale(String(multiplier));
    };
    image.src = resultUrl || originalUrl;
  }

  function changeWidth(value) {
    const next = Math.max(1, Math.min(10000, Number(value) || 1));
    setWidth(next);
    if (keepRatio) setHeight(Math.max(1, Math.round(next / ratio)));
    setScale("custom");
  }

  function changeHeight(value) {
    const next = Math.max(1, Math.min(10000, Number(value) || 1));
    setHeight(next);
    if (keepRatio) setWidth(Math.max(1, Math.round(next * ratio)));
    setScale("custom");
  }

  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setFile(null);
    setOriginalUrl("");
    setResultUrl("");
    setResultBlob(null);
    setProgress("");
    setError("");
    setWidth(1200);
    setHeight(1200);
    setScale("1");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-icon"><Sparkles size={19}/></span> AI Background Studio</a>
        <span className="privacy"><span className="privacy-dot"/> ประมวลผลบนเบราว์เซอร์ของคุณ</span>
      </header>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={14}/> AI IMAGE TOOL</div>
        <h1>ลบพื้นหลังรูปภาพ<br/><span>ง่าย ๆ ในคลิกเดียว</span></h1>
        <p>อัปโหลดรูปภาพ ให้ AI ช่วยแยกวัตถุออกจากพื้นหลัง แล้วดาวน์โหลดภาพ PNG ได้ทันที</p>
      </section>

      {!file ? (
        <section
          className={`upload-zone ${dragging ? "dragging" : ""}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files?.[0]); }}
        >
          <div className="upload-icon"><Upload size={27}/></div>
          <h2>เลือกรูปภาพที่ต้องการแก้ไข</h2>
          <p>ลากไฟล์มาวางที่นี่ หรือเลือกจากอุปกรณ์ของคุณ</p>
          <button className="primary-btn" onClick={() => inputRef.current?.click()}><Upload size={17}/> เลือกรูปภาพ</button>
          <small>รองรับ JPG, PNG และ WebP</small>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/*" hidden onChange={e => loadFile(e.target.files?.[0])}/>
        </section>
      ) : (
        <section className="workspace">
          <div className="workspace-head">
            <div><div className="file-label">ไฟล์ที่เลือก</div><strong>{file.name}</strong></div>
            <button className="ghost-btn" onClick={reset}><Trash2 size={16}/> เปลี่ยนรูป</button>
          </div>
          <div className="preview-grid">
            <div className="preview-card">
              <div className="preview-title"><ImageIcon size={16}/> ภาพต้นฉบับ</div>
              <div className="image-stage"><img src={originalUrl} alt="ภาพต้นฉบับ"/></div>
            </div>
            <div className="preview-card">
              <div className="preview-title"><Sparkles size={16}/> ผลลัพธ์จาก AI</div>
              <div className={`image-stage ${background === "transparent" ? "checker" : ""}`} style={{background: background === "transparent" ? undefined : background}}>
                {resultUrl ? <img src={resultUrl} alt="ภาพหลังลบพื้นหลัง" style={previewImageStyle}/> : <div className="empty-result"><Sparkles size={28}/><span>ผลลัพธ์จะแสดงที่นี่</span></div>}
              </div>
            </div>
          </div>

          {!resultBlob ? (
            <div className="action-area">
              <button className="primary-btn large" disabled={busy} onClick={processImage}>
                {busy ? <><RefreshCw className="spin" size={18}/> กำลังลบพื้นหลัง...</> : <><Sparkles size={18}/> ลบพื้นหลังด้วย AI</>}
              </button>
              {progress && <div className="status"><RefreshCw size={14} className={busy ? "spin" : ""}/>{progress}</div>}
            </div>
          ) : (
            <div className="editor-tools">
              <div className="tool-heading"><Palette size={17}/> เลือกพื้นหลังสำหรับตัวอย่างและไฟล์ดาวน์โหลด</div>
              <div className="swatches">
                {colors.map(c => <button key={c.value} title={c.name} aria-label={c.name} className={`swatch ${background === c.value ? "selected" : ""}`} style={{background: c.value === "transparent" ? "conic-gradient(#ddd 25%,white 0 50%,#ddd 0 75%,white 0)" : c.value}} onClick={() => setBackground(c.value)} />)}
              </div>
              <section className="size-panel lighting-panel">
                <div className="size-panel-title"><Sparkles size={16}/> ปรับแสงและมิติของวัตถุ</div>
                <div className="adjustment-grid">
                  <label>ความสว่าง <strong>{brightness}%</strong>
                    <input type="range" min="50" max="160" value={brightness} onChange={e => setBrightness(Number(e.target.value))}/>
                  </label>
                  <label>คอนทราสต์ <strong>{contrast}%</strong>
                    <input type="range" min="50" max="160" value={contrast} onChange={e => setContrast(Number(e.target.value))}/>
                  </label>
                  <label>ความสดของสี <strong>{saturation}%</strong>
                    <input type="range" min="0" max="180" value={saturation} onChange={e => setSaturation(Number(e.target.value))}/>
                  </label>
                </div>
                <div className="shadow-head">
                  <strong>เงาตกกระทบ</strong>
                  <label className="switch-label"><input type="checkbox" checked={shadowEnabled} onChange={e => setShadowEnabled(e.target.checked)}/> เปิดใช้เงา</label>
                </div>
                {shadowEnabled && <div className="adjustment-grid shadow-grid">
                  <label>ความฟุ้งของเงา <strong>{shadowBlur}px</strong>
                    <input type="range" min="0" max="60" value={shadowBlur} onChange={e => setShadowBlur(Number(e.target.value))}/>
                  </label>
                  <label>ความเข้มของเงา <strong>{shadowOpacity}%</strong>
                    <input type="range" min="0" max="80" value={shadowOpacity} onChange={e => setShadowOpacity(Number(e.target.value))}/>
                  </label>
                  <label>เลื่อนเงาแนวนอน <strong>{shadowX}px</strong>
                    <input type="range" min="-40" max="40" value={shadowX} onChange={e => setShadowX(Number(e.target.value))}/>
                  </label>
                  <label>เลื่อนเงาแนวตั้ง <strong>{shadowY}px</strong>
                    <input type="range" min="-40" max="60" value={shadowY} onChange={e => setShadowY(Number(e.target.value))}/>
                  </label>
                </div>}
                <button className="text-btn reset-adjustments" onClick={() => {
                  setBrightness(100); setContrast(100); setSaturation(100);
                  setShadowEnabled(true); setShadowBlur(18); setShadowOpacity(28);
                  setShadowX(0); setShadowY(12);
                }}>คืนค่าแสงและเงาเริ่มต้น</button>
              </section>
              <section className="size-panel">
                <div className="size-panel-title"><ImageIcon size={16}/> ปรับขนาดและความละเอียดภาพ</div>
                <div className="scale-buttons">
                  {[1, 2, 4].map(n => <button key={n} className={`scale-btn ${scale === String(n) ? "active" : ""}`} onClick={() => setPreset(n)}>{n}×</button>)}
                </div>
                <div className="dimension-fields">
                  <label>ความกว้าง (px)<input type="number" min="1" max="10000" value={width} onChange={e => changeWidth(e.target.value)}/></label>
                  <button className={`ratio-btn ${keepRatio ? "active" : ""}`} title="ล็อกอัตราส่วนภาพ" onClick={() => setKeepRatio(v => !v)}>{keepRatio ? "🔒" : "🔓"}</button>
                  <label>ความสูง (px)<input type="number" min="1" max="10000" value={height} onChange={e => changeHeight(e.target.value)}/></label>
                </div>
                <p className="size-hint">เลือก 2× หรือ 4× เพื่อขยายภาพ หรือกรอกขนาดเองได้ (สูงสุด 10,000 px ต่อด้าน)</p>
              </section>
              <div className="success-line"><CheckCircle2 size={16}/> ลบพื้นหลังสำเร็จแล้ว</div>
              <button className="primary-btn large" onClick={downloadPng}><Download size={18}/> ดาวน์โหลด PNG {width} × {height}</button>
              <p className="quality-note">ใช้การปรับขนาดคุณภาพสูงของเบราว์เซอร์ ไม่ใช่ AI สร้างรายละเอียดใหม่ การขยายมากอาจไม่ทำให้ภาพคมชัดเท่าภาพต้นฉบับความละเอียดสูง</p>
              <button className="text-btn" onClick={() => { setResultUrl(""); setResultBlob(null); setProgress(""); }}>ประมวลผลใหม่</button>
            </div>
          )}
          {error && <div className="error-box"><AlertCircle size={17}/>{error}</div>}
        </section>
      )}

      {error && !file && <div className="error-box">{error}</div>}
      <section className="steps">
        <h3>ใช้งานเพียง 3 ขั้นตอน</h3>
        <div className="step-list">
          <div><b>01</b><strong>อัปโหลดรูป</strong><span>เลือกรูปจากอุปกรณ์</span></div>
          <div><b>02</b><strong>ให้ AI ทำงาน</strong><span>ระบบแยกพื้นหลังอัตโนมัติ</span></div>
          <div><b>03</b><strong>ดาวน์โหลด</strong><span>บันทึกภาพ PNG ของคุณ</span></div>
        </div>
      </section>
      <footer>AI Background Studio · เครื่องมือทดลองสำหรับใช้งานส่วนตัว</footer>
    </main>
  );
}
