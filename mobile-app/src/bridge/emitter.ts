import type { NativeMessage } from './protocol';

// Native modules push messages to the WebView through this single sender, which App.tsx wires to the
// live WebView instance. Messages sent before the WebView exists are dropped (they are all re-requestable).
type Sender = (message: NativeMessage) => void;

let sender: Sender | null = null;

export const setWebSender = (fn: Sender | null): void => {
  sender = fn;
};

export const sendToWeb = (message: NativeMessage): void => {
  if (sender) {
    sender(message);
  }
};
