export default async function handler(req, res) {
  // السماح بطلبات POST فقط
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { customer, items, total, notes } = req.body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(500).json({ error: 'Missing Telegram environment variables' });
    }

    // تنظيف وتنسيق رقم الهاتف المغربي
    let rawPhone = customer?.phone || '';
    let cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '212' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('+212')) {
      cleanPhone = cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('212') && cleanPhone.length === 9) {
      cleanPhone = '212' + cleanPhone;
    }

    // تجهيز قائمة المنتجات
    let itemsText = '';
    if (Array.isArray(items)) {
      itemsText = items
        .map((item, idx) => `${idx + 1}. *${item.name || item.title}* × ${item.quantity || 1} — ${item.price} DH`)
        .join('\n');
    } else {
      itemsText = 'طلب مباشر';
    }

    // نص الرسالة
    const message = `🛍️ *طلب جديد من المتجر!*

👤 *الزبون:* ${customer?.name || 'غير محدد'}
📞 *الهاتف:* \`${cleanPhone}\`
📍 *المدينة:* ${customer?.city || 'غير محدد'}
🏠 *العنوان:* ${customer?.address || 'غير محدد'}

📦 *المنتجات المطلوبة:*
${itemsText}

💰 *المجموع:* *${total} DH*
🚚 *الدفع:* عند الاستلام (COD)
${notes ? `📝 *ملاحظات:* ${notes}` : ''}`;

    // أزرار واتساب والاتصال التلقائي
    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '💬 مراسلة واتساب', url: `https://wa.me/${cleanPhone}` },
          { text: '📞 اتصال بالزبون', url: `tel:+${cleanPhone}` }
        ]
      ]
    };

    // إرسال الرسالة إلى تيليجرام
    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
      })
    });

    const data = await telegramRes.json();

    if (!data.ok) {
      return res.status(500).json({ error: 'Telegram API error', details: data });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
