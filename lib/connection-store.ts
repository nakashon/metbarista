/**
 * Client-side connection state management
 * Persists machine IP in localStorage, provides reactive state.
 */

import { useState, useEffect } from "react";
import { testConnection } from "./machine-api";
import type { ConnectionStatus, MachineInfo } from "./types";

const IP_KEY = "mbrista_machine_ip";

export function getSavedIp(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(IP_KEY) ?? "";
}

export function saveIp(ip: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(IP_KEY, ip);
}

export function clearIp(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(IP_KEY);
}

// React hook for machine connection state
export function useConnection() {
  const [ip, setIpState] = useState<string>("");
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [machineInfo, setMachineInfo] = useState<MachineInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = getSavedIp();
    if (saved) {
      setIpState(saved);
      probe(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function probe(target: string) {
    setStatus("connecting");
    setError(null);
    try {
      const info = await testConnection(target);
      setMachineInfo(info);
      setStatus("connected");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Connection failed");
      setMachineInfo(null);
    }
  }

  async function connect(newIp: string) {
    const trimmed = newIp.trim();
    saveIp(trimmed);
    setIpState(trimmed);
    await probe(trimmed);
  }

  function disconnect() {
    clearIp();
    setIpState("");
    setStatus("disconnected");
    setMachineInfo(null);
    setError(null);
  }

  function refresh() {
    if (ip) probe(ip);
  }

  return { ip, status, machineInfo, error, connect, disconnect, refresh };
}
