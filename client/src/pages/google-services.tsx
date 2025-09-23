import { GoogleServicesPanel } from "@/components/google-services/GoogleServicesPanel";
import { ThemeProvider } from "@/components/ui/theme-provider";

export default function GoogleServices() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <GoogleServicesPanel />
      </div>
    </ThemeProvider>
  );
}