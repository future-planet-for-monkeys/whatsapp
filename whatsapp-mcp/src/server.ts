import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  listChats,
  getChat,
  markChatAsRead,
  getChatMessages,
  sendTextMessage,
  sendMediaMessage,
  downloadMedia,
  getClientState,
  getContactInfo,
  checkPhone,
  getAvatar,
  WhatsAppApiError,
  editMessage,
  deleteMessage,
  reactToMessage,
  getContact,
  saveContact,
  deleteContact,
  getLabels,
  getChatLabels,
  updateChatLabels,
} from "./whatsapp-client.js";

// ── Create server ────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "whatsapp-mcp",
  version: "1.0.0",
  description:
    "WhatsApp MCP Server — send/receive messages, list chats, check contacts, and manage your WhatsApp account through the whatsapp-neo-api backend.",
});

// ── Helper for consistent error formatting ───────────────────────────────────

function formatError(e: unknown): string {
  if (e instanceof WhatsAppApiError) {
    return `WhatsApp API error (${e.status}): ${e.message}`;
  }
  if (e instanceof Error) {
    return `${e.name}: ${e.message}`;
  }
  return String(e);
}

// ── 1. list_chats ────────────────────────────────────────────────────────────

server.registerTool(
  "list_chats",
  {
    description:
      "List your WhatsApp chats, newest first. Returns chat name, ID, unread count, last message preview, and more.",
    inputSchema: {
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe("Maximum number of chats to return (1-100)"),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe("Number of chats to skip for pagination"),
      includeArchived: z
        .boolean()
        .default(false)
        .describe("Whether to include archived chats"),
    },
  },
  async ({ limit, offset, includeArchived }) => {
    try {
      const chats = await listChats({ limit, offset, includeArchived });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(chats, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          { type: "text", text: `Failed to list chats: ${formatError(e)}` },
        ],
        isError: true,
      };
    }
  }
);

// ── 2. get_chat ──────────────────────────────────────────────────────────────

server.registerTool(
  "get_chat",
  {
    description:
      "Get detailed information about a specific WhatsApp chat by its ID (e.g. 1234567890@c.us).",
    inputSchema: {
      chatId: z
        .string()
        .describe(
          "The WhatsApp chat ID, typically in format 'number@c.us' for individuals or 'number@g.us' for groups"
        ),
    },
  },
  async ({ chatId }) => {
    try {
      const chat = await getChat(chatId);
      if (!chat) {
        return {
          content: [{ type: "text", text: `Chat not found: ${chatId}` }],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(chat, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          { type: "text", text: `Failed to get chat: ${formatError(e)}` },
        ],
        isError: true,
      };
    }
  }
);

// ── 3. get_messages ──────────────────────────────────────────────────────────

server.registerTool(
  "get_messages",
  {
    description:
      "Fetch messages from a specific WhatsApp chat. Returns up to 200 messages total (API limit). Messages are returned oldest-first.",
    inputSchema: {
      chatId: z
        .string()
        .describe("The WhatsApp chat ID (e.g. '1234567890@c.us')"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe("Number of messages to return (1-100)"),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe("Offset from newest messages (0 = most recent)"),
    },
  },
  async ({ chatId, limit, offset }) => {
    try {
      const messages = await getChatMessages(chatId, { limit, offset });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(messages, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get messages: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 4. send_message ──────────────────────────────────────────────────────────

server.registerTool(
  "send_message",
  {
    description:
      "Send a text message to a WhatsApp chat. Use this to reply to people or groups.",
    inputSchema: {
      chatId: z
        .string()
        .describe(
          "The WhatsApp chat ID to send to (e.g. '1234567890@c.us' for individuals)"
        ),
      message: z.string().min(1).describe("The text message to send"),
    },
  },
  async ({ chatId, message }) => {
    try {
      const sent = await sendTextMessage(chatId, message);
      return {
        content: [
          {
            type: "text",
            text: `Message sent successfully to ${chatId}.\nSent message: ${JSON.stringify(sent, null, 2)}`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to send message: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 5. send_media ────────────────────────────────────────────────────────────

server.registerTool(
  "send_media",
  {
    description:
      "Send a media file (image, video, document, audio) to a WhatsApp chat. Provide the local file path on disk.",
    inputSchema: {
      chatId: z
        .string()
        .describe("The WhatsApp chat ID to send to (e.g. '1234567890@c.us')"),
      filePath: z
        .string()
        .describe("Absolute path to the media file on the local filesystem"),
      mimeType: z
        .string()
        .optional()
        .describe(
          "MIME type of the file (e.g. 'image/png', 'video/mp4'). Auto-detected if not provided."
        ),
    },
  },
  async ({ chatId, filePath, mimeType }) => {
    try {
      const sent = await sendMediaMessage(chatId, filePath, mimeType);
      return {
        content: [
          {
            type: "text",
            text: `Media sent successfully to ${chatId}.\nSent message: ${JSON.stringify(sent, null, 2)}`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to send media: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 6. check_phone ───────────────────────────────────────────────────────────

server.registerTool(
  "check_phone",
  {
    description:
      "Check whether a phone number is registered on WhatsApp. Returns the WhatsApp ID and contact info if found.",
    inputSchema: {
      phone: z
        .string()
        .describe(
          "Phone number to check, with or without country code (e.g. '+15551234567' or '5551234567')"
        ),
    },
  },
  async ({ phone }) => {
    try {
      const result = await checkPhone(phone);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to check phone: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 7. get_contact_info ──────────────────────────────────────────────────────

server.registerTool(
  "get_contact_info",
  {
    description:
      "Get WhatsApp contact information (name, phone number, avatar URL) for one or more contact IDs.",
    inputSchema: {
      contactIds: z
        .array(z.string())
        .min(1)
        .max(20)
        .describe(
          "Array of WhatsApp contact IDs (e.g. ['1234567890@c.us', '9876543210@c.us'])"
        ),
    },
  },
  async ({ contactIds }) => {
    try {
      const info = await getContactInfo(contactIds);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get contact info: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 8. get_client_state ──────────────────────────────────────────────────────

server.registerTool(
  "get_client_state",
  {
    description:
      "Get the current WhatsApp connection state. Shows whether WhatsApp is connected, if a QR code is available for pairing, and the connection status.",
    inputSchema: {},
  },
  async () => {
    try {
      const state = await getClientState();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(state, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get client state: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 9. mark_as_read ──────────────────────────────────────────────────────────

server.registerTool(
  "mark_as_read",
  {
    description:
      "Mark all messages in a WhatsApp chat as read (sends read receipts).",
    inputSchema: {
      chatId: z.string().describe("The WhatsApp chat ID to mark as read"),
    },
  },
  async ({ chatId }) => {
    try {
      const success = await markChatAsRead(chatId);
      return {
        content: [
          {
            type: "text",
            text: success
              ? `Chat ${chatId} marked as read.`
              : `Chat ${chatId} not found or could not be marked as read.`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to mark as read: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 10. download_media ───────────────────────────────────────────────────────

server.registerTool(
  "download_media",
  {
    description:
      "Download media (image, video, audio, document) attached to a WhatsApp message. Returns base64-encoded data.",
    inputSchema: {
      messageId: z
        .string()
        .describe(
          "The serialized message ID (e.g. 'true_1234567890@c.us_ABC123DEF')"
        ),
    },
  },
  async ({ messageId }) => {
    try {
      const media = await downloadMedia(messageId);
      if (!media) {
        return {
          content: [
            {
              type: "text",
              text: `No media found for message: ${messageId}`,
            },
          ],
        };
      }
      const base64 = media.data.toString("base64");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                messageId,
                mimeType: media.mimeType,
                filename: media.filename,
                sizeBytes: media.data.length,
                base64: base64,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to download media: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 11. get_avatar ───────────────────────────────────────────────────────────

server.registerTool(
  "get_avatar",
  {
    description:
      "Get the profile picture / avatar for a WhatsApp contact or chat. Returns a base64 data URL.",
    inputSchema: {
      contactId: z
        .string()
        .describe(
          "The WhatsApp contact or chat ID (e.g. '1234567890@c.us' or group ID)"
        ),
    },
  },
  async ({ contactId }) => {
    try {
      const avatar = await getAvatar(contactId);
      if (!avatar) {
        return {
          content: [
            {
              type: "text",
              text: `No avatar found for: ${contactId}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                contactId,
                mimeType: avatar.mimeType,
                dataURL: avatar.dataURL,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get avatar: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 12. edit_message ──────────────────────────────────────────────────────────

server.registerTool(
  "edit_message",
  {
    description:
      "Edit a previously-sent message. Only messages sent by the current WhatsApp identity (fromMe) can be edited.",
    inputSchema: {
      messageId: z
        .string()
        .describe("The serialized message ID (e.g. 'true_1234567890@c.us_ABC123DEF')"),
      newBody: z.string().min(1).describe("The new text content for the message"),
    },
  },
  async ({ messageId, newBody }) => {
    try {
      const updated = await editMessage(messageId, newBody);
      return {
        content: [
          {
            type: "text",
            text: `Message edited successfully.\nUpdated message: ${JSON.stringify(updated, null, 2)}`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to edit message: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 13. delete_message ────────────────────────────────────────────────────────

server.registerTool(
  "delete_message",
  {
    description:
      "Delete a message for everyone. Only messages sent by the current WhatsApp identity (fromMe) can be deleted.",
    inputSchema: {
      messageId: z
        .string()
        .describe("The serialized message ID (e.g. 'true_1234567890@c.us_ABC123DEF')"),
    },
  },
  async ({ messageId }) => {
    try {
      const deleted = await deleteMessage(messageId);
      return {
        content: [
          {
            type: "text",
            text: `Message deleted successfully.\nDeleted message state: ${JSON.stringify(deleted, null, 2)}`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete message: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 14. react_to_message ───────────────────────────────────────────────────────

server.registerTool(
  "react_to_message",
  {
    description:
      "React to a message with an emoji. Send an empty string to remove the reaction.",
    inputSchema: {
      messageId: z
        .string()
        .describe("The serialized message ID (e.g. 'true_1234567890@c.us_ABC123DEF')"),
      emoji: z
        .string()
        .describe("The emoji character to react with, or an empty string to remove the reaction"),
    },
  },
  async ({ messageId, emoji }) => {
    try {
      const updated = await reactToMessage(messageId, emoji);
      return {
        content: [
          {
            type: "text",
            text: `Reaction updated successfully.\nUpdated message: ${JSON.stringify(updated, null, 2)}`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to react to message: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 15. get_contact ───────────────────────────────────────────────────────────

server.registerTool(
  "get_contact",
  {
    description:
      "Get contact details for a 1:1 chat. Returns phone number, name, pushname, block status, and more.",
    inputSchema: {
      chatId: z
        .string()
        .describe("The WhatsApp contact ID (e.g. '1234567890@c.us')"),
    },
  },
  async ({ chatId }) => {
    try {
      const contact = await getContact(chatId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(contact, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get contact: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 16. save_contact ──────────────────────────────────────────────────────────

server.registerTool(
  "save_contact",
  {
    description:
      "Save or edit a contact in the user's address book. Requires a resolvable phone number.",
    inputSchema: {
      chatId: z
        .string()
        .describe("The WhatsApp contact ID (e.g. '1234567890@c.us')"),
      firstName: z.string().min(1).describe("First name of the contact"),
      lastName: z.string().describe("Last name of the contact"),
      syncToAddressbook: z
        .boolean()
        .default(true)
        .describe("Whether to sync the contact to the phone's physical address book"),
    },
  },
  async ({ chatId, firstName, lastName, syncToAddressbook }) => {
    try {
      const contact = await saveContact(chatId, { firstName, lastName, syncToAddressbook });
      return {
        content: [
          {
            type: "text",
            text: `Contact saved successfully.\nContact: ${JSON.stringify(contact, null, 2)}`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to save contact: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 17. delete_contact ────────────────────────────────────────────────────────

server.registerTool(
  "delete_contact",
  {
    description:
      "Delete a contact from the user's address book.",
    inputSchema: {
      chatId: z
        .string()
        .describe("The WhatsApp contact ID (e.g. '1234567890@c.us')"),
    },
  },
  async ({ chatId }) => {
    try {
      const contact = await deleteContact(chatId);
      return {
        content: [
          {
            type: "text",
            text: `Contact deleted successfully.\nContact: ${JSON.stringify(contact, null, 2)}`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete contact: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 18. get_labels ────────────────────────────────────────────────────────────

server.registerTool(
  "get_labels",
  {
    description:
      "Get all available Labels (WhatsApp Business feature). Returns an empty array for non-Business accounts.",
    inputSchema: {},
  },
  async () => {
    try {
      const labels = await getLabels();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(labels, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get labels: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 19. get_chat_labels ───────────────────────────────────────────────────────

server.registerTool(
  "get_chat_labels",
  {
    description:
      "Get all Labels assigned to a specific chat (WhatsApp Business feature). Returns an empty array for non-Business accounts.",
    inputSchema: {
      chatId: z
        .string()
        .describe("The WhatsApp chat ID (e.g. '1234567890@c.us')"),
    },
  },
  async ({ chatId }) => {
    try {
      const labels = await getChatLabels(chatId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(labels, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get chat labels: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── 20. update_chat_labels ────────────────────────────────────────────────────

server.registerTool(
  "update_chat_labels",
  {
    description:
      "Update the Labels assigned to a chat. The provided labelIds replace the entire set of labels on the chat (WhatsApp Business feature).",
    inputSchema: {
      chatId: z
        .string()
        .describe("The WhatsApp chat ID (e.g. '1234567890@c.us')"),
      labelIds: z
        .array(z.union([z.string(), z.number()]))
        .describe("Full set of label IDs to assign to the chat (replaces existing labels)"),
    },
  },
  async ({ chatId, labelIds }) => {
    try {
      const labels = await updateChatLabels(chatId, labelIds);
      return {
        content: [
          {
            type: "text",
            text: `Chat labels updated successfully.\nLabels: ${JSON.stringify(labels, null, 2)}`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update chat labels: ${formatError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Start server ─────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[whatsapp-mcp] MCP server running on stdio");
}

main().catch((err) => {
  console.error("[whatsapp-mcp] Fatal error:", err);
  process.exit(1);
});