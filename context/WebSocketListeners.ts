import type { MatchUser } from "@/types/types";

export type LikeUserEvent = {
  type: "likeUser";
  payload: MatchUser;
};

export type WebSocketMessageListeners = {
  onLikeUser: (user: MatchUser) => void;
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isMatchUser = (value: unknown): value is MatchUser => {
  if (!value || typeof value !== "object") return false;

  const user = value as Record<string, unknown>;

  return (
    typeof user.userID === "string" &&
    typeof user.name === "string" &&
    typeof user.lastname === "string" &&
    typeof user.age === "string" &&
    typeof user.job === "string" &&
    typeof user.image_url === "string" &&
    isStringArray(user.additionalProfileImageUrls) &&
    typeof user.description === "string" &&
    typeof user.city === "string" &&
    typeof user.distance === "string" &&
    isStringArray(user.hobbies)
  );
};

export function handleWebSocketMessage(
  data: unknown,
  listeners: WebSocketMessageListeners,
) {
  if (typeof data !== "string") return;

  try {
    const event: unknown = JSON.parse(data);
    if (!event || typeof event !== "object") return;

    const message = event as { type?: unknown; payload?: unknown };

    switch (message.type) {
      case "likeUser":
        if (isMatchUser(message.payload)) {
          listeners.onLikeUser(message.payload);
        }
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("Invalid WebSocket message:", error);
  }
}
