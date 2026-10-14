/**
 * LOOOP Email Template Generator Service
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

/**
 * Base LOOOP Email Template Shell
 */
export const buildLooopEmailHtml = ({
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
}) => {
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
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px 20px; text-align: center; margin: 24px 0;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 14px;">
          YOUR VERIFICATION CODE
        </div>
        <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a; margin: 14px 0; font-family: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;">
          ${formattedOtp}
        </div>
        <div style="font-size: 13px; font-weight: 500; color: #64748b; margin-top: 12px;">
          Expires in ${otpExpiry}
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
};

/**
 * 23 Standard LOOOP Email Generators
 */
export const looopEmailTemplates = {
  // 1. Welcome / Account Created
  welcomeAccountCreated: ({ name = 'Mahesh' }) => ({
    subject: 'Welcome to LOOOP 👋',
    html: buildLooopEmailHtml({
      headline: 'Welcome to LOOOP',
      recipientName: name,
      bodyParagraphs: [
        'Welcome to LOOOP!',
        "You're now ready to discover unused products, share what you no longer need, and connect with people in your community."
      ],
      cardTitle: 'ACCOUNT STATUS',
      cardRows: [
        { label: 'Status', value: 'Active & Ready' },
        { label: 'Community', value: 'LOOOP Network' }
      ],
      buttonText: 'Explore LOOOP',
      buttonUrl: 'https://loop-five-azure.vercel.app/explore',
      extraNote: "We're happy to have you with us.",
      showFooterTagline: true,
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 2. Email Verification
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

  // 3. OTP Email (Never send actual OTP in subject)
  otpEmail: ({ name = 'Mahesh', otpCode = '482731', expiry = '10 minutes' }) => ({
    subject: 'Your LOOOP verification code',
    html: buildLooopEmailHtml({
      headline: 'Verify your account',
      recipientName: name,
      bodyParagraphs: [
        'Use the verification code below to continue with your LOOOP account.'
      ],
      isOtp: true,
      otpCode,
      otpExpiry: expiry,
      extraNote: 'For your security, never share this code with anyone, including LOOOP support.<br><br>If you didn\'t request this code, you can safely ignore this email.',
      showFooterTagline: true,
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 4. Login Alert
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

  // 5. Forgot Password
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

  // 6. Product Successfully Shared
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
      showFooterTagline: true,
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 7. Someone Requested Your Product
  someoneRequested: ({
    name = 'Owner',
    item = 'Product',
    requestedBy = 'Community Member',
    requesterEmail = '',
    requesterPhone = '',
    requesterLocation = '',
    type = 'Borrow',
    requestUrl = 'https://loop-five-azure.vercel.app/dashboard'
  }) => ({
    subject: `Someone is interested in your item: ${item}`,
    html: buildLooopEmailHtml({
      headline: 'You received a new request',
      recipientName: name,
      bodyParagraphs: [
        `Someone has requested the item "${item}" you've shared on LOOOP. Below are their details and location to coordinate pickup.`
      ],
      cardTitle: 'Customer & Request details',
      cardRows: [
        { label: 'Item', value: item },
        { label: 'Requested by', value: requestedBy },
        ...(requesterEmail ? [{ label: 'Customer Email', value: requesterEmail }] : []),
        ...(requesterPhone ? [{ label: 'Customer Phone', value: requesterPhone }] : []),
        ...(requesterLocation ? [{ label: 'Customer Location', value: requesterLocation }] : []),
        { label: 'Request type', value: type }
      ],
      buttonText: 'Open Chat & Coordinate Handover',
      buttonUrl: requestUrl,
      extraNote: 'A secure pickup coordination chat is active for this item. Once the item is taken / handed over, the temporary chat will be permanently closed and deleted from the database.',
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 8. Request Accepted
  requestAccepted: ({ name = 'Mahesh', item = 'Scientific Calculator', owner = 'Rahul', type = 'Borrow', transactionUrl = 'https://loop-five-azure.vercel.app/dashboard' }) => ({
    subject: 'Your LOOOP request was accepted 🎉',
    html: buildLooopEmailHtml({
      headline: 'Your request was accepted!',
      recipientName: name,
      bodyParagraphs: [
        'Good news! Your request for the following item has been accepted.'
      ],
      cardTitle: 'Item Details',
      cardRows: [
        { label: 'Item', value: item },
        { label: 'Owner', value: owner },
        { label: 'Request type', value: type }
      ],
      buttonText: 'View Transaction',
      buttonUrl: transactionUrl,
      extraNote: 'You can now continue to the next step and coordinate the handover.',
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 9. Request Declined
  requestDeclined: ({ name = 'Mahesh', item = 'Scientific Calculator', browseUrl = 'https://loop-five-azure.vercel.app/explore' }) => ({
    subject: 'Update on your LOOOP request',
    html: buildLooopEmailHtml({
      headline: 'Request update',
      recipientName: name,
      bodyParagraphs: [
        "Your request for the following item wasn't accepted this time."
      ],
      cardTitle: 'Item',
      cardRows: [
        { label: 'Requested Item', value: item }
      ],
      buttonText: 'Browse Items',
      buttonUrl: browseUrl,
      extraNote: "Don't worry — there may be other similar items available on LOOOP.<br><br>Thanks for being part of the LOOOP community.",
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 10. Transaction Created
  transactionCreated: ({ name = 'Mahesh', item = 'Scientific Calculator', type = 'Borrow', status = 'Pending Handover', transactionUrl = 'https://loop-five-azure.vercel.app/dashboard' }) => ({
    subject: 'Your LOOOP transaction is ready',
    html: buildLooopEmailHtml({
      headline: 'Your transaction is ready',
      recipientName: name,
      bodyParagraphs: [
        'Your LOOOP transaction has been created successfully.'
      ],
      cardTitle: 'Transaction details',
      cardRows: [
        { label: 'Item', value: item },
        { label: 'Type', value: type },
        { label: 'Status', value: status }
      ],
      buttonText: 'View Transaction',
      buttonUrl: transactionUrl,
      extraNote: 'Please open your transaction to view the next steps.',
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 11. Handover Scheduled
  handoverScheduled: ({ name = 'Mahesh', item = 'Scientific Calculator', date = 'October 10, 2026', time = '5:00 PM', location = 'Guntur', detailUrl = 'https://loop-five-azure.vercel.app/dashboard' }) => ({
    subject: 'Your LOOOP handover has been scheduled',
    html: buildLooopEmailHtml({
      headline: 'Handover scheduled',
      recipientName: name,
      bodyParagraphs: [
        'Your item handover has been scheduled.'
      ],
      cardTitle: 'Handover details',
      cardRows: [
        { label: 'Item', value: item },
        { label: 'Date', value: date },
        { label: 'Time', value: time },
        { label: 'Location', value: location }
      ],
      buttonText: 'View Handover Details',
      buttonUrl: detailUrl,
      extraNote: "Please make sure you're available at the agreed time.<br><br>For your safety, meet in a safe public location and follow LOOOP's community guidelines.",
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 12. Handover Confirmed
  handoverConfirmed: ({ name = 'Mahesh', item = 'Scientific Calculator', type = 'Borrow', status = 'Active', transactionUrl = 'https://loop-five-azure.vercel.app/dashboard' }) => ({
    subject: 'Item handover confirmed',
    html: buildLooopEmailHtml({
      headline: 'Handover confirmed ✓',
      recipientName: name,
      bodyParagraphs: [
        'The handover for your LOOOP transaction has been successfully confirmed.'
      ],
      cardTitle: 'Transaction Summary',
      cardRows: [
        { label: 'Item', value: item },
        { label: 'Transaction', value: type },
        { label: 'Status', value: status }
      ],
      buttonText: 'View Transaction',
      buttonUrl: transactionUrl,
      extraNote: 'You can view the transaction and any remaining actions from your dashboard.',
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 13. Borrowing Started
  borrowingStarted: ({ name = 'Mahesh', item = 'Scientific Calculator', returnDate = 'October 20, 2026', transactionUrl = 'https://loop-five-azure.vercel.app/dashboard' }) => ({
    subject: "You've received your borrowed item",
    html: buildLooopEmailHtml({
      headline: 'Your borrowing has started',
      recipientName: name,
      bodyParagraphs: [
        'The handover has been confirmed and your borrowing period has started.'
      ],
      cardTitle: 'Borrowing Summary',
      cardRows: [
        { label: 'Item', value: item },
        { label: 'Return date', value: returnDate }
      ],
      buttonText: 'View Transaction',
      buttonUrl: transactionUrl,
      extraNote: 'Please remember to return the item by the agreed date.<br><br>Thank you for taking care of shared products.',
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 14. Return Reminder
  returnReminder: ({ name = 'Mahesh', item = 'Scientific Calculator', returnDate = 'October 20, 2026', transactionUrl = 'https://loop-five-azure.vercel.app/dashboard' }) => ({
    subject: 'Reminder: your LOOOP item is due soon',
    html: buildLooopEmailHtml({
      headline: 'Your return date is coming up',
      recipientName: name,
      bodyParagraphs: [
        'Just a friendly reminder that your borrowed item is due soon.'
      ],
      cardTitle: 'Return Schedule',
      cardRows: [
        { label: 'Item', value: item },
        { label: 'Return date', value: returnDate }
      ],
      buttonText: 'View Transaction',
      buttonUrl: transactionUrl,
      extraNote: 'Please arrange the return with the owner.<br><br>Thanks for keeping the sharing cycle going.',
      showFooterTagline: true,
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 15. Return Confirmed
  returnConfirmed: ({ name = 'Mahesh', item = 'Scientific Calculator', status = 'Returned', transactionUrl = 'https://loop-five-azure.vercel.app/dashboard' }) => ({
    subject: 'Your item return has been confirmed',
    html: buildLooopEmailHtml({
      headline: 'Return confirmed ✓',
      recipientName: name,
      bodyParagraphs: [
        'The return of your borrowed item has been successfully confirmed.'
      ],
      cardTitle: 'Status Summary',
      cardRows: [
        { label: 'Item', value: item },
        { label: 'Status', value: status }
      ],
      buttonText: 'View Transaction',
      buttonUrl: transactionUrl,
      extraNote: 'Thank you for completing the transaction responsibly.',
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 16. Transaction Completed
  transactionCompleted: ({ name = 'Mahesh', item = 'Scientific Calculator', type = 'Borrow', status = 'Completed', reviewUrl = 'https://loop-five-azure.vercel.app/dashboard' }) => ({
    subject: 'Your LOOOP transaction is complete 🎉',
    html: buildLooopEmailHtml({
      headline: 'Transaction completed',
      recipientName: name,
      bodyParagraphs: [
        'Your LOOOP transaction has been successfully completed.',
        'We hope you had a great experience.<br>Would you like to share your experience with the other member?'
      ],
      cardTitle: 'Transaction Record',
      cardRows: [
        { label: 'Item', value: item },
        { label: 'Transaction type', value: type },
        { label: 'Status', value: status }
      ],
      buttonText: 'Leave a Review',
      buttonUrl: reviewUrl,
      extraNote: 'Thank you for helping make reuse easier.',
      showFooterTagline: true,
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 17. New Message
  newMessage: ({ name = 'Mahesh', fromUser = 'Rahul', item = 'Scientific Calculator', messageUrl = 'https://loop-five-azure.vercel.app/dashboard' }) => ({
    subject: 'You have a new message on LOOOP',
    html: buildLooopEmailHtml({
      headline: 'New message',
      recipientName: name,
      bodyParagraphs: [
        `You have a new message from ${fromUser} regarding:`
      ],
      cardTitle: 'Subject Item',
      cardRows: [
        { label: 'Item', value: item }
      ],
      buttonText: 'Open Message',
      buttonUrl: messageUrl,
      extraNote: 'Open LOOOP to read and reply.<br><br>For your safety, keep communication and transactions within LOOOP.',
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 18. Wanted Item Match
  wantedItemMatch: ({ name = 'Mahesh', item = 'Scientific Calculator', category = 'Electronics', location = 'Guntur', itemUrl = 'https://loop-five-azure.vercel.app/explore' }) => ({
    subject: 'We found a possible match for you',
    html: buildLooopEmailHtml({
      headline: 'We found something you may be looking for',
      recipientName: name,
      bodyParagraphs: [
        "Good news! A newly shared item may match something you've requested on LOOOP."
      ],
      cardTitle: 'Possible match',
      cardRows: [
        { label: 'Item', value: item },
        { label: 'Category', value: category },
        { label: 'Location', value: location }
      ],
      buttonText: 'View Match',
      buttonUrl: itemUrl,
      extraNote: 'Take a look and see if it\'s what you need.',
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 19. Someone Can Help With Your Wanted Item
  wantedItemHelp: ({ name = 'Mahesh', item = 'Scientific Calculator', responseUrl = 'https://loop-five-azure.vercel.app/dashboard' }) => ({
    subject: 'Someone may be able to help with your request',
    html: buildLooopEmailHtml({
      headline: 'Your wanted item received a response',
      recipientName: name,
      bodyParagraphs: [
        'Someone has responded to your wanted item request.'
      ],
      cardTitle: 'You requested',
      cardRows: [
        { label: 'Item', value: item }
      ],
      buttonText: 'View Response',
      buttonUrl: responseUrl,
      extraNote: 'A LOOOP member may be able to help.',
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 20. New Review Reminder
  reviewReminder: ({ name = 'Mahesh', reviewUrl = 'https://loop-five-azure.vercel.app/dashboard' }) => ({
    subject: 'How was your LOOOP experience?',
    html: buildLooopEmailHtml({
      headline: 'Share your experience',
      recipientName: name,
      bodyParagraphs: [
        'Your recent LOOOP transaction has been completed.',
        'If you have a moment, share your experience with the other member.',
        'Your review helps build trust within the LOOOP community.'
      ],
      buttonText: 'Leave a Review',
      buttonUrl: reviewUrl,
      extraNote: 'Thanks for helping make LOOOP a safer and more trustworthy community.',
      signoffTeam: '— The LOOOP Team'
    })
  }),

  // 21. Security — Password Changed
  securityPasswordChanged: ({ name = 'Mahesh', secureUrl = 'https://loop-five-azure.vercel.app/account/security' }) => ({
    subject: 'Your LOOOP password was changed',
    html: buildLooopEmailHtml({
      headline: 'Password changed',
      recipientName: name,
      bodyParagraphs: [
        'Your LOOOP account password was successfully changed.',
        'If you made this change, no further action is required.',
        "If you didn't change your password, secure your account immediately."
      ],
      buttonText: 'Secure My Account',
      buttonUrl: secureUrl,
      signoffTeam: '— The LOOOP Security Team'
    })
  }),

  // 22. Security — Email Changed
  securityEmailChanged: ({ name = 'Mahesh', secureUrl = 'https://loop-five-azure.vercel.app/account/security' }) => ({
    subject: 'Your LOOOP email address was changed',
    html: buildLooopEmailHtml({
      headline: 'Account email updated',
      recipientName: name,
      bodyParagraphs: [
        'The email address associated with your LOOOP account has been changed.',
        'If you made this change, no further action is required.',
        "If you don't recognize this activity, please secure your account immediately."
      ],
      buttonText: 'Secure My Account',
      buttonUrl: secureUrl,
      signoffTeam: '— The LOOOP Security Team'
    })
  }),

  // 23. Report Update
  reportUpdate: ({ name = 'Mahesh', reportId = '#LR-10482', status = 'Resolved', reportUrl = 'https://loop-five-azure.vercel.app/dashboard' }) => ({
    subject: 'Update on your LOOOP report',
    html: buildLooopEmailHtml({
      headline: 'Your report has been reviewed',
      recipientName: name,
      bodyParagraphs: [
        "We've reviewed the report you submitted to the LOOOP team."
      ],
      cardTitle: 'Report details',
      cardRows: [
        { label: 'Report ID', value: reportId },
        { label: 'Status', value: status }
      ],
      buttonText: 'View Report',
      buttonUrl: reportUrl,
      extraNote: 'Thank you for helping us keep LOOOP safe and trustworthy.',
      signoffTeam: '— The LOOOP Safety Team'
    })
  })
};

export default looopEmailTemplates;
