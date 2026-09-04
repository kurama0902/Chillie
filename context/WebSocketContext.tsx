import { AppState, type AppStateStatus } from "react-native";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAuth0 } from "react-native-auth0";
import type { MatchUser } from "@/types/types";
import { handleWebSocketMessage } from "@/context/WebSocketListeners";
import { AUTH0_AUDIENCE } from "@/lib/auth0";

const WEBSOCKET_URL = "wss://chillie.kemuri.top/ws";
const RECONNECT_DELAY_MS = 3000;
const MAX_PENDING_MESSAGES = 100;

type PendingMessage = {
  message: string;
  dedupeKey?: string;
};

type AuthenticatedWebSocketConstructor = new (
  url: string,
  protocols: string[],
  options: { headers: Record<string, string> },
) => WebSocket;

const AuthenticatedWebSocket =
  WebSocket as unknown as AuthenticatedWebSocketConstructor;

export type WebSocketStatus = "idle" | "connecting" | "open" | "closed" | "error";

export type WebSocketEvent = {
  type: string;
  payload?: Record<string, unknown>;
};

type WebSocketContextValue = {
  status: WebSocketStatus;
  likedUsers: MatchUser[];
  sendEvent: (event: WebSocketEvent) => void;
};

const WebSocketContext = createContext<WebSocketContextValue>({
  status: "idle",
  likedUsers: [],
  sendEvent: () => {},
});

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user, getApiCredentials } = useAuth0();
  const socketRef = useRef<WebSocket | null>(null);
  const pendingMessagesRef = useRef<PendingMessage[]>([]);
  const [status, setStatus] = useState<WebSocketStatus>("idle");
  const [likedUsers, setLikedUsers] = useState<MatchUser[]>([]);
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setLikedUsers([]);
  }, [user?.sub]);

  const flushPendingMessages = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const pendingMessages = pendingMessagesRef.current.splice(0);
    pendingMessages.forEach(({ message }) => socket.send(message));
  }, []);

  const sendEvent = useCallback((event: WebSocketEvent) => {
    const message = JSON.stringify(event);
    const socket = socketRef.current;

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(message);
      return;
    }

    const userID =
      event.type === "likeUser" &&
      event.payload &&
      typeof event.payload.userID === "string"
        ? event.payload.userID
        : undefined;
    const dedupeKey = userID ? `likeUser:${userID}` : undefined;

    if (
      dedupeKey &&
      pendingMessagesRef.current.some(
        (pendingMessage) => pendingMessage.dedupeKey === dedupeKey,
      )
    ) {
      return;
    }

    if (pendingMessagesRef.current.length >= MAX_PENDING_MESSAGES) {
      pendingMessagesRef.current.shift();
    }

    pendingMessagesRef.current.push({ message, dedupeKey });
  }, []);

  useEffect(() => {
    let active = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let socket: WebSocket | null = null;

    pendingMessagesRef.current = [];

    const scheduleReconnect = () => {
      if (!active || appState !== "active" || reconnectTimer) return;

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, RECONNECT_DELAY_MS);
    };

    const connect = async () => {
      if (!active || appState !== "active" || !user?.sub) {
        setStatus("idle");
        return;
      }

      setStatus("connecting");

      try {
        const credentials = await getApiCredentials(AUTH0_AUDIENCE, undefined, 60);
        if (!active) return;

        socket = new AuthenticatedWebSocket(WEBSOCKET_URL, [], {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
          },
        });
        socketRef.current = socket;

        socket.onopen = () => {
          if (!active) return;
          setStatus("open");
          flushPendingMessages();
        };

        socket.onmessage = (message) => {
          if (!active) return;


          handleWebSocketMessage(message.data, {
            onLikeUser: (user) => {
              setLikedUsers((currentUsers) =>
                currentUsers.some(
                  (currentUser) => currentUser.userID === user.userID,
                )
                  ? currentUsers
                  : [...currentUsers, user],
              );
            },
          });
        };

        socket.onerror = () => {
          if (!active) return;
          setStatus("error");
          console.error("WebSocket connection error.");
        };

        socket.onclose = (event) => {
          if (socketRef.current === socket) {
            socketRef.current = null;
          }

          if (!active) return;
          console.error(
            `WebSocket closed (code ${event.code}, reason: ${event.reason || "none"}).`,
          );
          setStatus("closed");
          scheduleReconnect();
        };
      } catch (error) {
        if (!active) return;
        setStatus("error");
        console.error("WebSocket authorization failed:", error);
        scheduleReconnect();
      }
    };

    void connect();

    return () => {
      active = false;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      pendingMessagesRef.current = [];

      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close();
      }

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      setStatus("idle");
    };
  }, [appState, flushPendingMessages, getApiCredentials, user?.sub]);

  return (
    <WebSocketContext.Provider value={{ status, likedUsers, sendEvent }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
