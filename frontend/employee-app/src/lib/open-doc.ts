// Open one of my documents (their downloadDoc): HTML in the in-app viewer, anything else saved to the cache and handed
// to the system share sheet (Files, Mail, print …).
import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import { docs } from "./port";

export async function openDocument(id: string, title?: string) {
  const d = await docs.content(id);
  const isHtml = /\.html?$/i.test(d.file_name) || /text\/html/i.test(d.mime_type);
  if (isHtml) {
    router.push({ pathname: "/document/[id]", params: { id, title: title ?? d.file_name } });
    return;
  }
  if (Platform.OS === "web") {
    // PWA: no share sheet and no file system — open the file in the browser (PDF / images) or let it download.
    const bytes = Uint8Array.from(atob(d.base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: d.mime_type || "application/octet-stream" }));
    const a = document.createElement("a");
    a.href = url; a.download = d.file_name; a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const f = new File(Paths.cache, `${id}-${d.file_name.replace(/[^\w.\-]+/g, "_")}`);
  if (f.exists) f.delete();
  f.create();
  f.write(Uint8Array.from(atob(d.base64), (c) => c.charCodeAt(0)));
  await Sharing.shareAsync(f.uri, { mimeType: d.mime_type, dialogTitle: title ?? d.file_name });
}
