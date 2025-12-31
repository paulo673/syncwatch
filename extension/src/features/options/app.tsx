import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export function App() {
  const [username, setUsername] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load current settings
  useEffect(() => {
    chrome.storage.local.get(["username", "serverUrl"], (result) => {
      setUsername(result.username || "");
      setServerUrl(result.serverUrl || "http://localhost:3000");
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    await chrome.storage.local.set({
      username: username.trim() || `User_${Math.random().toString(36).substring(2, 8)}`,
      serverUrl: serverUrl.trim() || "http://localhost:3000",
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="sw:min-h-screen sw:bg-gradient-to-br sw:from-slate-900 sw:to-slate-800 sw:text-white sw:p-8">
        <div className="sw:max-w-2xl sw:mx-auto">
          <p className="sw:text-center">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sw:min-h-screen sw:bg-gradient-to-br sw:from-slate-900 sw:to-slate-800 sw:text-white sw:p-8">
      <div className="sw:max-w-2xl sw:mx-auto">
        <h1 className="sw:text-3xl sw:font-bold sw:mb-2 sw:flex sw:items-center sw:gap-2">
          <span>🎬</span>
          <span>SyncWatch</span>
        </h1>
        <p className="sw:text-sm sw:text-white/50 sw:mb-8">
          Configure your SyncWatch settings
        </p>

        <div className="sw:bg-slate-800/50 sw:rounded-lg sw:p-6 sw:space-y-6">
          <div>
            <label
              htmlFor="username"
              className="sw:block sw:text-sm sw:font-medium sw:mb-2"
            >
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="sw:w-full"
            />
            <p className="sw:text-xs sw:text-white/40 sw:mt-1">
              This name will be displayed to other users in the room
            </p>
          </div>

          <div>
            <label
              htmlFor="serverUrl"
              className="sw:block sw:text-sm sw:font-medium sw:mb-2"
            >
              Server URL
            </label>
            <Input
              id="serverUrl"
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:3000"
              className="sw:w-full"
            />
            <p className="sw:text-xs sw:text-white/40 sw:mt-1">
              URL of the SyncWatch server
            </p>
          </div>

          <div className="sw:flex sw:items-center sw:gap-4">
            <Button onClick={handleSave} className="sw:px-6">
              {saved ? "✓ Saved" : "Save Settings"}
            </Button>
            {saved && (
              <span className="sw:text-sm sw:text-green-400">
                Settings saved successfully!
              </span>
            )}
          </div>
        </div>

        <div className="sw:mt-8 sw:text-center sw:text-xs sw:text-white/30">
          <p>Changes will take effect immediately</p>
        </div>
      </div>
    </div>
  );
}

