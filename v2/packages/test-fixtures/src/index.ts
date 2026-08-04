export const LINE_USER_ID = "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

export function textMessageWebhook(params: {
  webhookEventId: string;
  text: string;
  replyToken?: string;
  userId?: string;
  timestamp?: number;
  isRedelivery?: boolean;
}) {
  return {
    destination: "Ubotdestination",
    events: [
      {
        type: "message",
        mode: "active",
        timestamp: params.timestamp ?? 1_720_000_000_000,
        source: {
          type: "user",
          userId: params.userId ?? LINE_USER_ID,
        },
        webhookEventId: params.webhookEventId,
        deliveryContext: {
          isRedelivery: params.isRedelivery ?? false,
        },
        replyToken: params.replyToken ?? "reply-token-demo",
        message: {
          id: "msg-1",
          type: "text",
          text: params.text,
        },
      },
    ],
  };
}

export function postbackWebhook(params: {
  webhookEventId: string;
  data: string;
  replyToken?: string;
  userId?: string;
  timestamp?: number;
  isRedelivery?: boolean;
}) {
  return {
    destination: "Ubotdestination",
    events: [
      {
        type: "postback",
        mode: "active",
        timestamp: params.timestamp ?? 1_720_000_000_000,
        source: {
          type: "user",
          userId: params.userId ?? LINE_USER_ID,
        },
        webhookEventId: params.webhookEventId,
        deliveryContext: {
          isRedelivery: params.isRedelivery ?? false,
        },
        replyToken: params.replyToken ?? "reply-token-postback",
        postback: {
          data: params.data,
        },
      },
    ],
  };
}

export function followWebhook(params: {
  webhookEventId: string;
  userId?: string;
}) {
  return {
    destination: "Ubotdestination",
    events: [
      {
        type: "follow",
        mode: "active",
        timestamp: 1_720_000_000_000,
        source: {
          type: "user",
          userId: params.userId ?? LINE_USER_ID,
        },
        webhookEventId: params.webhookEventId,
        replyToken: "reply-token-follow",
      },
    ],
  };
}

/** n8n → internal API payload shapes (documented + tested) */
export const n8nReminderDueRequest = {
  as_of: "2026-07-13T12:00:00.000Z",
  limit: 20,
};

export const n8nReminderDueResponse = {
  reminders: [
    {
      reminder_id: "11111111-1111-4111-8111-111111111111",
      user_id: "22222222-2222-4222-8222-222222222222",
      title: "繳電費",
      remind_at: "2026-07-13T12:00:00.000Z",
      delivery_key: "delivery:11111111-1111-4111-8111-111111111111:2026-07-13T12:00:00.000Z",
    },
  ],
};

export const n8nLinePushRequest = {
  to_user_id: LINE_USER_ID,
  messages: [{ type: "text", text: "提醒：繳電費" }],
  delivery_key: "delivery:11111111-1111-4111-8111-111111111111:2026-07-13T12:00:00.000Z",
};

export const n8nDailyWrapupRequest = {
  timezone: "Asia/Taipei",
  local_time: "21:00",
};

export const n8nFailedJobRetryRequest = {
  as_of: "2026-07-13T12:05:00.000Z",
};

export const DEMO_REMINDER_TEXT = "明天下午 8 點提醒我繳電費";
