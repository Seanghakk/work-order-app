import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

// Telegram calls this automatically whenever someone messages the bot.
// When a person clicks their personal "Connect Telegram" link, Telegram opens
// a chat with the bot and sends /start <their user id> — we read that id here
// and save this chat as theirs, so future notifications reach them.
export async function POST(req: Request) {
  const body = await req.json();
  console.log("Telegram webhook received:", JSON.stringify(body));
  const message = body.message;
  if (!message || !message.text) return NextResponse.json({ ok: true });

  const chatId = String(message.chat.id);
  const text: string = message.text;

  if (text.startsWith("/start")) {
    const parts = text.split(" ");
    const userId = parts[1];
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await prisma.user.update({ where: { id: userId }, data: { telegramChatId: chatId } });
        await sendTelegramMessage(chatId, `You're connected, ${user.name}! You'll now get Telegram notifications for work order updates alongside email.`);
      }
    }
  }
  return NextResponse.json({ ok: true });
}