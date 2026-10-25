// The in-app viewer for an HTML document (forms, letters, settlements): the system web view on the phone.
// The web build uses html-view.web.tsx (an iframe), because react-native-webview has no web implementation.
import { WebView } from "react-native-webview";

export function HtmlView({ html }: { html: string }) {
  return <WebView originWhitelist={["*"]} source={{ html }} style={{ flex: 1 }} />;
}
