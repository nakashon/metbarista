export const LOCAL_NETWORK_PERMISSION_TIMEOUT_MS = 30_000;

type LocalNetworkRequestInit = RequestInit & {
  targetAddressSpace: "local";
};

export function localNetworkRequestInit(
  options: RequestInit = {},
): LocalNetworkRequestInit {
  return {
    ...options,
    targetAddressSpace: "local",
  };
}
