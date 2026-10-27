import { useEffect, useState } from "react";
import QRCode from "qrcode";

// 주소 → QR 이미지(data URL). 사이트가 어디에 올라가든 현재 주소 기준으로 만든다.
export function useQR(url: string, size = 300, dark = "#171A33") {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { width: size, margin: 1, errorCorrectionLevel: "M", color: { dark, light: "#FFFFFF" } }).then((s) => { if (alive) setSrc(s); });
    return () => { alive = false; };
  }, [url, size, dark]);
  return src;
}

export function QR({ url, size = 150, alt = "QR", dark, className }: { url: string; size?: number; alt?: string; dark?: string; className?: string }) {
  const src = useQR(url, size * 2, dark);
  return src ? <img src={src} width={size} height={size} alt={alt} className={className} /> : <div style={{ width: size, height: size, background: "#eee" }} />;
}
