// Web (PWA): give a file to the employee WITHOUT leaving the app. On a phone the share sheet (Save to Files, Print, WhatsApp…) is used;
// anywhere else the file downloads in this same window. Nothing opens a new tab: in the installed app a new tab takes you out
// of the app and you could only come back by quitting it.
export async function deliverFile(bytes: Uint8Array, name: string, mime: string): Promise<void> {
  const file = new File([bytes as BlobPart], name, { type: mime || "application/octet-stream" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title: name }); return; }
    catch (e) { if ((e as Error).name === "AbortError") return; /* the browser refused: download instead */ }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
