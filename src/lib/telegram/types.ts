/**
 * The slice of the Telegram Bot API payload this step actually reads.
 *
 * Deliberately partial. Step 1 exists to observe what really arrives, and the full
 * `Update` shape is large and mostly irrelevant here — every message is stored in
 * `telegram_messages.raw` in full, so nothing is lost by typing narrowly now and
 * widening once the real payloads have been seen.
 */

export type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type TelegramChat = {
  id: number;
  type?: string;
  title?: string;
  username?: string;
  first_name?: string;
};

/** Sent when the seller attaches or detaches the bot in Telegram Business settings. */
export type BusinessConnection = {
  id: string;
  user: TelegramUser;
  user_chat_id: number;
  date: number;
  /** Absent on older Bot API versions, which used `can_reply` instead. */
  rights?: { can_reply?: boolean };
  can_reply?: boolean;
  is_enabled: boolean;
};

/** One resolution of an attached photo. Telegram sends several; the last is largest. */
export type TelegramPhotoSize = {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
};

/**
 * Present when the customer sent a voice note. There is no transcription
 * pipeline for it (that is a separate, much bigger feature — real speech
 * recognition, not a config toggle) — its only role right now is telling the
 * webhook "something arrived that is not text or a photo", so it gets
 * acknowledged instead of silently vanishing. Voice messages carry no
 * `caption` field in the Bot API, unlike photos.
 */
export type TelegramVoice = {
  file_id: string;
  duration: number;
};

export type BusinessMessage = {
  message_id: number;
  business_connection_id?: string;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  voice?: TelegramVoice;
};

export type TelegramUpdate = {
  update_id: number;
  message?: BusinessMessage;
  business_connection?: BusinessConnection;
  business_message?: BusinessMessage;
  edited_business_message?: BusinessMessage;
};
