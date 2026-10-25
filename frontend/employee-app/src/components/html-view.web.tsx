// Web (PWA) viewer for an HTML document: an iframe sandboxed with NO script permission and WITHOUT `allow-same-origin`, so a
// document is plain content: it cannot run code and can never read the app's storage (the access token lives in localStorage).
// Links open in a new tab (`allow-popups`).
export function HtmlView({ html }: { html: string }) {
  return (
    <iframe
      title="document"
      srcDoc={html}
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      style={{ flex: 1, width: "100%", height: "100%", border: 0, background: "#fff" }}
    />
  );
}
