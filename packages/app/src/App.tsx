import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function App() {
  const [message, setMessage] = useState("hello world");
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendEcho() {
    setError(null);
    try {
      const res = await api.echo.$post({ json: { message } });
      if (!res.ok) {
        setError(`Server returned ${String(res.status)}`);
        return;
      }
      const data = await res.json();
      setResponse(`${data.echo} (${String(data.length)} chars)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold">bun-mono-template</h1>
      <p className="text-muted-foreground text-center">
        React + Vite frontend talking to the Hono server via type-safe RPC.
      </p>

      <div className="flex w-full gap-2">
        <input
          className="border-input bg-background flex-1 rounded-md border px-3 py-2 text-sm"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
          }}
          placeholder="Type a message"
        />
        <Button
          onClick={() => {
            void sendEcho();
          }}
        >
          Echo
        </Button>
      </div>

      {response && (
        <div className="bg-muted w-full rounded-md p-4 text-sm">{response}</div>
      )}
      {error && (
        <div className="text-destructive w-full rounded-md p-4 text-sm">
          {error}
        </div>
      )}
    </main>
  );
}
