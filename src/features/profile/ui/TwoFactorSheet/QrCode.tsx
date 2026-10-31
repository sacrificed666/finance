"use client";

import makeQr from "qrcode-generator";

import styles from "./TwoFactorSheet.module.scss";

interface QrCodeProps {
  value: string;
  label: string;
  size?: number;
}

// The white margin around the code, in modules
const QUIET = 2;

// A QR code of a text, drawn as one path on white
const QrCode = ({ value, label, size = 176 }: QrCodeProps) => {
  const qr = makeQr(0, "M");
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  const cells = Array.from({ length: count * count }, (_, index) => {
    const row = Math.floor(index / count);
    const col = index % count;
    return qr.isDark(row, col) ? `M${String(col + QUIET)} ${String(row + QUIET)}h1v1h-1z` : "";
  });
  const side = count + QUIET * 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${String(side)} ${String(side)}`}
      shapeRendering="crispEdges"
      className={styles.qr}
    >
      <title>{label}</title>
      <path d={cells.join("")} fill="#07130c" />
    </svg>
  );
};

export default QrCode;
