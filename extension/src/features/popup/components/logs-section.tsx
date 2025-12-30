import { Button } from "@/shared/components/ui/button";
import type { LogEntry } from "../popup.types";

export function LogsSection() {
  const handleViewLogs = async () => {
    try {
      const result = await chrome.storage.local.get(["syncwatch_logs"]);
      const logs: LogEntry[] = result.syncwatch_logs || [];

      if (logs.length === 0) {
        alert("No logs found");
        return;
      }

      const logText = logs
        .slice(-50)
        .map((log) => {
          const date = new Date(log.timestamp).toISOString();
          const level = ["DEBUG", "INFO", "WARN", "ERROR"][log.level] || "UNKNOWN";
          const data = log.data ? `\n  Data: ${JSON.stringify(log.data)}` : "";
          return `[${date}] [${level}] [${log.context}]\n  ${log.message}${data}`;
        })
        .join("\n\n");

      const blob = new Blob([logText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      chrome.tabs.create({ url });

      const download = confirm("Logs opened in new tab. Download as file?");
      if (download) {
        const a = document.createElement("a");
        const jsonBlob = new Blob([JSON.stringify(logs, null, 2)], {
          type: "application/json",
        });
        a.href = URL.createObjectURL(jsonBlob);
        a.download = `syncwatch-logs-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      }

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[SyncWatch Popup] Error viewing logs:", error);
      alert("Failed to view logs");
    }
  };

  return (
    <div className="sw:mt-4 sw:pt-3 sw:border-t sw:border-white/10">
      <Button
        variant="ghost"
        onClick={handleViewLogs}
        className="sw:w-full sw:text-xs sw:py-2"
      >
        View Logs
      </Button>
    </div>
  );
}
