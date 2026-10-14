/**
 * LOOOP Email Template Generator Service (Server CommonJS)
 * Standardized HTML email templates for all 23 transactional notifications.
 *
 * Design Guidelines:
 * - Brand: LOOOP
 * - Tagline: Share. Reuse. Connect.
 * - Clean white background (#ffffff)
 * - Soft rounded cards (#f8fafc with #e2e8f0 border)
 * - Mobile responsive, professional typography (-apple-system)
 * - Emerald Primary CTA Button (#059669)
 * - Special centered OTP card layout for verification codes
 */

function buildLooopEmailHtml({
  headline = 'Notification',
  recipientName = 'Member',
  bodyParagraphs = [],
  cardTitle = '',
  cardRows = [],
  isOtp = false,
  otpCode = '',
  otpExpiry = '10 minutes',
  buttonText = '',
  buttonUrl = '',
  extraNote = '',
  signoffTeam = '— The LOOOP Team',
  showFooterTagline = false
}) {
  const formattedName = recipientName ? recipientName.trim() : 'Member';

  // Format OTP digits with spacing e.g., "4 8 2 7 3 1"
  let formattedOtp = otpCode;
  if (isOtp && otpCode) {
    const rawDigits = String(otpCode).replace(/\s+/g, '');
    formattedOtp = rawDigits.split('').join(' ');
  }

  // Render Card rows key-value pairs
  const cardRowsHtml = cardRows && cardRows.length > 0
    ? cardRows.map(row => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #f1f5f9;">
          <span style="color: #64748b; font-size: 14px; font-weight: 500;">${row.label}</span>
          <span style="color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${row.value}</span>
        </div>
      `).join('')
    : '';

  const cardHtml = isOtp
    ? `
      <div style="background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border: 2px solid #10b981; border-radius: 16px; padding: 28px 20px; text-align: center; margin: 24px 0; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.12);">
        <div style="display: inline-block; background-color: #d1fae5; color: #065f46; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 20px; letter-spacing: 1.5px; text-transform: uppercase;">
          ONE-TIME VERIFICATION CODE
        </div>
        <div style="font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #047857; margin: 18px 0 12px 0; font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;">
          ${formattedOtp}
        </div>
        <div style="display: inline-block; background-color: #ffffff; border: 1px solid #a7f3d0; border-radius: 8px; padding: 4px 12px; font-size: 12px; font-weight: 700; color: #059669;">
          ⏱ Valid for ${otpExpiry || '10 minutes'}
        </div>
      </div>
    `
    : (cardRows && cardRows.length > 0) || cardTitle
      ? `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
          ${cardTitle ? `<div style="font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">${cardTitle}</div>` : ''}
          ${cardRowsHtml}
        </div>
      `
      : '';

  const paragraphsHtml = bodyParagraphs.map(p => `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">${p}</p>
  `).join('');

  const buttonHtml = buttonText && buttonUrl
    ? `
      <div style="text-align: center; margin: 28px 0;">
        <a href="${buttonUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff !important; font-size: 15px; font-weight: 600; padding: 13px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${buttonText}
        </a>
      </div>
    `
    : '';

  const extraNoteHtml = extraNote
    ? `<p style="font-size: 14px; line-height: 1.5; color: #64748b; margin: 16px 0;">${extraNote}</p>`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 24px; background-color: #ffffff;">
    
    <!-- LOOOP Header -->
    <div style="text-align: center; margin-bottom: 28px;">
      <div style="font-size: 32px; font-weight: 800; color: #059669; letter-spacing: -0.5px; margin: 0; line-height: 1;">LOOOP</div>
      <div style="font-size: 13px; font-weight: 500; color: #64748b; margin-top: 6px; letter-spacing: 0.2px;">Share. Reuse. Connect.</div>
    </div>

    <div style="border-top: 1px solid #f1f5f9; margin-bottom: 28px;"></div>

    <!-- Headline -->
    <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 20px 0; line-height: 1.3; text-align: center;">${headline}</h1>

    <!-- Greeting -->
    <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 14px;">Hi ${formattedName},</div>

    <!-- Body Paragraphs (Top) -->
    ${paragraphsHtml}

    <!-- Clean Card (Details or OTP) -->
    ${cardHtml}

    <!-- Primary Button CTA -->
    ${buttonHtml}

    <!-- Extra Note / Disclaimer -->
    ${extraNoteHtml}

    <!-- Sign-off -->
    <div style="font-size: 15px; font-weight: 600; color: #475569; margin-top: 28px;">${signoffTeam}</div>

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f1f5f9; text-align: center;">
      <div style="font-size: 14px; font-weight: 600; color: #059669; margin: 0 0 10px 0; letter-spacing: 0.3px;">Share. Reuse. Connect.</div>
      <div style="font-size: 12px; color: #94a3b8; margin: 4px 0; line-height: 1.5;">© 2026 LOOOP</div>
      <div style="font-size: 12px; color: #94a3b8; margin: 4px 0; line-height: 1.5;">You're receiving this because you have an account with LOOOP.</div>
    </div>

  </div>
</body>
</html>
  `.trim();
}

const looopEmailTemplates = {
  welcomeAccountCreated: ({ name = 'Member', appUrl = 'https://loop-five-azure.vercel.app' }) => ({
    subject: 'Welcome to LOOOP! Give Unused Things a New Life',
    html: buildLooopEmailHtml({
      headline: 'Welcome to LOOOP!',
      recipientName: name,
      bodyParagraphs: [
        'Your account has been successfully created and your email has been verified.',
        'You are now part of LOOOP — the circular reuse platform where communities keep things out of landfills and give unused products a second life.',
        'Here is how you can get started:',
        '• <strong>Share an unused product:</strong> Have books, tools, electronics, or gear sitting around? Post them in minutes so neighbors can reuse them.<br>' +
        '• <strong>Borrow or request what you need:</strong> Why buy something you will only use once? Discover items shared by people nearby.<br>' +
        '• <strong>Explore products in your area:</strong> Find high-quality items available for reuse, borrowing, or exchange right in your community.'
      ],
      cardTitle: 'YOUR LOOOP ACCOUNT',
      cardRows: [
        { label: 'Status', value: '✅ Verified & Active' },
        { label: 'Platform Mission', value: 'Circular Community Reuse' }
      ],
      buttonText: 'Start Browsing Products',
      buttonUrl: `${appUrl}/browse`,
      extraNote: 'Every item reused or shared prevents landfill waste and strengthens your neighborhood community.',
      signoffTeam: '— The LOOOP Team'
    })
  }),

  emailVerification: ({ name = 'Mahesh', verifyUrl = 'https://loop-five-azure.vercel.app/verify' }) => ({
    subject: 'Verify your LOOOP email address',
    html: buildLooopEmailHtml({
      headline: 'Verify your email',
      recipientName: name,
      bodyParagraphs: [
        'Thanks for joining LOOOP.',
        'Please verify your email address to secure your account and continue using all LOOOP features.'
      ],
      buttonText: 'Verify Email Address',
      buttonUrl: verifyUrl,
      extraNote: "This verification link will expire after a limited time.<br><br>If you didn't create a LOOOP account, you can safely ignore this email.",
      signoffTeam: '— The LOOOP Team'
    })
  }),

  otpEmail: ({ name = 'Member', otpCode = '482731', expiry = '10 minutes' }) => ({
    subject: `[LOOOP] ${otpCode} is your verification code`,
    html: buildLooopEmailHtml({
      headline: 'Verify Your Email Address',
      recipientName: name,
      bodyParagraphs: [
        'Welcome to LOOOP! To verify your email address and activate your account, please enter the 6-digit code below into your registration screen:'
      ],
      isOtp: true,
      otpCode,
      otpExpiry: expiry || '10 minutes',
      extraNote: 'This verification code is strictly confidential.<br><br>For your security, never share this code with anyone. LOOOP staff will never ask for your verification code.<br><br>If you did not request this verification code, you can safely ignore this email.',
      signoffTeam: '— The LOOOP Team'
    })
  }),

  loginAlert: ({ name = 'Mahesh', device = 'Chrome on Windows', date = 'October 8, 2026', time = '12:15 AM' }) => ({
    subject: 'New login to your LOOOP account',
    html: buildLooopEmailHtml({
      headline: 'New login detected',
      recipientName: name,
      bodyParagraphs: [
        'We noticed a new login to your LOOOP account.'
      ],
      cardTitle: 'Login details',
      cardRows: [
        { label: 'Device', value: device },
        { label: 'Date', value: date },
        { label: 'Time', value: time }
      ],
      buttonText: 'Secure My Account',
      buttonUrl: 'https://loop-five-azure.vercel.app/account/security',
      extraNote: "If this was you, no action is required.<br><br>If you don't recognize this activity, please secure your account immediately.",
      signoffTeam: '— The LOOOP Team'
    })
  }),

  forgotPassword: ({ name = 'Mahesh', resetUrl = 'https://loop-five-azure.vercel.app/reset-password' }) => ({
    subject: 'Reset your LOOOP password',
    html: buildLooopEmailHtml({
      headline: 'Reset your password',
      recipientName: name,
      bodyParagraphs: [
        'We received a request to reset the password for your LOOOP account.',
        'Click the button below to create a new password.'
      ],
      buttonText: 'Reset Password',
      buttonUrl: resetUrl,
      extraNote: "This link will expire after a limited time.<br><br>If you didn't request a password reset, you can safely ignore this email.",
      signoffTeam: '— The LOOOP Team'
    })
  }),

  productShared: ({ name = 'Mahesh', item = 'Scientific Calculator', condition = 'Good', type = 'Borrow', location = 'Guntur', itemUrl = 'https://loop-five-azure.vercel.app/explore' }) => ({
    subject: 'Your item is now live on LOOOP 🎉',
    html: buildLooopEmailHtml({
      headline: 'Your item is live!',
      recipientName: name,
      bodyParagraphs: [
        'Great news! Your item has been successfully added to LOOOP.'
      ],
      cardTitle: 'Your listing',
      cardRows: [
        { label: 'Item', value: item },
        { label: 'Condition', value: condition },
        { label: 'Sharing type', value: type },
        { label: 'Location', value: location }
      ],
      buttonText: 'View My Listing',
      buttonUrl: itemUrl,
      extraNote: 'Your item is now visible to people looking for products like yours.<br><br>Thank you for helping give unused products a second life.',
      signoffTeam: '— The LOOOP Team'
    })
  }),

  newRequestOwner: ({
    name = 'Owner',
    requesterName = 'Community Member',
    requesterEmail = '',
    requesterPhone = '',
    requesterLocation = '',
    itemTitle = 'Product',
    requestType = 'Reuse',
    message = '',
    requestId = '',
    appUrl = 'https://loop-five-azure.vercel.app'
  }) => {
    const cardRows = [
      { label: 'Product', value: itemTitle },
      { label: 'Customer Name', value: requesterName },
      ...(requesterEmail ? [{ label: 'Customer Email', value: requesterEmail }] : []),
      ...(requesterPhone ? [{ label: 'Customer Phone', value: requesterPhone }] : []),
      ...(requesterLocation ? [{ label: 'Customer Location', value: requesterLocation }] : []),
      { label: 'Request Type', value: requestType },
      { label: 'Message', value: message || 'I would like to get/reuse this item.' }
    ];

    const targetUrl = requestId ? `${appUrl}/requests/${requestId}` : `${appUrl}/requests`;

    return {
      subject: `New Request for "${itemTitle}" from ${requesterName} (Location: ${requesterLocation || 'Nearby'})`,
      html: buildLooopEmailHtml({
        headline: `Customer Wants Your Product!`,
        recipientName: name,
        bodyParagraphs: [
          `Great news! A customer wants your shared product "${itemTitle}".`,
          `Below are the customer's contact details and location so you can coordinate the pickup.`
        ],
        cardTitle: 'CUSTOMER & LOCATION DETAILS',
        cardRows,
        buttonText: 'Open Chat & Coordinate Handover',
        buttonUrl: targetUrl,
        extraNote: 'A secure pickup coordination chat is active for this item. Once the item is taken / handed over, the temporary chat will be permanently closed and deleted from the database for your privacy.',
        signoffTeam: '— The LOOOP Team'
      })
    };
  },

  requestAcceptedCustomer: ({ name = 'Member', ownerName = 'Owner', itemTitle = 'Product', appUrl = 'https://loop-five-azure.vercel.app' }) => ({
    subject: `Your request for "${itemTitle}" has been accepted!`,
    html: buildLooopEmailHtml({
      headline: 'Request Accepted!',
      recipientName: name,
      bodyParagraphs: [
        `Great news! ${ownerName} accepted your request for "${itemTitle}".`,
        'You can now message the owner directly to arrange a safe meeting time and handover location.'
      ],
      cardTitle: 'PRODUCT & OWNER',
      cardRows: [
        { label: 'Product', value: itemTitle },
        { label: 'Shared By', value: ownerName },
        { label: 'Status', value: '✅ Accepted - Handover Coordination Open' }
      ],
      buttonText: 'View Handover & Message Owner',
      buttonUrl: `${appUrl}/transactions`,
      extraNote: 'When you physically receive the item, click "I RECEIVED THE PRODUCT" in your dashboard to confirm completion.',
      signoffTeam: '— The LOOOP Team'
    })
  }),

  requestDeclinedCustomer: ({ name = 'Member', ownerName = 'Owner', itemTitle = 'Product', reason = '', appUrl = 'https://loop-five-azure.vercel.app' }) => ({
    subject: `Update on your request for "${itemTitle}"`,
    html: buildLooopEmailHtml({
      headline: 'Request Declined',
      recipientName: name,
      bodyParagraphs: [
        `Your request for "${itemTitle}" was not accepted by ${ownerName}.`
      ],
      cardTitle: 'REQUEST DETAILS',
      cardRows: [
        { label: 'Product', value: itemTitle },
        { label: 'Status', value: 'Declined' },
        { label: 'Reason', value: reason || 'Item is no longer available or was reserved.' }
      ],
      buttonText: 'Browse Similar Products',
      buttonUrl: `${appUrl}/browse`,
      extraNote: 'Don\'t worry! Many other great items are available for reuse in your community.',
      signoffTeam: '— The LOOOP Team'
    })
  }),

  pointsEarnedCustomer: ({ name = 'Member', pointsAmount = 100, itemTitle = 'Product', transactionType = 'Reuse', newBalance = 450, appUrl = 'https://loop-five-azure.vercel.app' }) => ({
    subject: `You earned +${pointsAmount} LOOOP Points! 🎉`,
    html: buildLooopEmailHtml({
      headline: `Congratulations! You Earned +${pointsAmount} Points`,
      recipientName: name,
      bodyParagraphs: [
        `Your ${transactionType.toLowerCase()} transaction for "${itemTitle}" has been successfully completed.`
      ],
      cardTitle: 'REWARD SUMMARY',
      cardRows: [
        { label: 'Product', value: itemTitle },
        { label: 'Points Earned', value: `+${pointsAmount} Points` },
        { label: 'Current Points Balance', value: `${newBalance} Points` }
      ],
      buttonText: 'View My Points History',
      buttonUrl: `${appUrl}/points`,
      extraNote: 'Thank you for participating in circular sharing and helping protect our environment!',
      signoffTeam: '— The LOOOP Team'
    })
  })
};

module.exports = {
  buildLooopEmailHtml,
  looopEmailTemplates
};
