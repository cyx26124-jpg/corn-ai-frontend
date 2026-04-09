import { useState } from "react";
import { detectAndDiagnose } from "@/lib/api";

export function useCornDetection() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await detectAndDiagnose(file);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { analyze, loading, result, error };
}