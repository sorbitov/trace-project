export function getIdentityState(profile) {
  const xConnected = Boolean(profile?.xUserId);
  const walletConnected = Boolean(profile?.walletAddress);
  const ready = xConnected && walletConnected;

  return {
    xConnected,
    walletConnected,
    ready,
    hasIdentity: xConnected || walletConnected,
    missing: ready ? null : xConnected ? "wallet" : walletConnected ? "x" : "both",
    nextView: ready ? "send" : "profile",
  };
}
