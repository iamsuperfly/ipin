export function arcSession() {
  if (typeof window === "undefined") return { userToken: "", walletId: "" };
  return {
    userToken: window.sessionStorage.getItem("ipin-circle-user") || "",
    walletId: window.localStorage.getItem("ipin-circle-wallet") || "",
  };
}

export function openArcWallet() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ipin-circle-start"));
}

export function arcCanSign() {
  const session = arcSession();
  return Boolean(session.userToken && session.walletId);
}
