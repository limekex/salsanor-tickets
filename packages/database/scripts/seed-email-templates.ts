import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultTemplates = [
  {
    slug: 'test-email',
    name: 'Test Email',
    category: 'SYSTEM' as const,
    language: 'no',
    subject: 'Test e-post fra SalsaNor Platform',
    preheader: 'Dette er en test e-post',
    htmlContent: `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test E-post</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Test E-post</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hei {{recipientName}},</p>
    
    <p style="font-size: 16px;">{{testMessage}}</p>
    
    <p style="font-size: 16px;">Hvis du mottar denne e-posten, betyr det at e-postsystemet fungerer som det skal! 🎉</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #666;">
        <strong>Tips:</strong> Du kan nå konfigurere e-postmaler og sende automatiske e-poster for ordrebekreftelser, billetter, ventelister og mer.
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Med vennlig hilsen,<br>
      <strong>SalsaNor Platform</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} SalsaNor Platform. Alle rettigheter reservert.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hei {{recipientName}},

{{testMessage}}

Hvis du mottar denne e-posten, betyr det at e-postsystemet fungerer som det skal!

Tips: Du kan nå konfigurere e-postmaler og sende automatiske e-poster for ordrebekreftelser, billetter, ventelister og mer.

Med vennlig hilsen,
SalsaNor Platform

© {{currentYear}} SalsaNor Platform. Alle rettigheter reservert.`,
    variables: {
      recipientName: 'Mottakers navn',
      testMessage: 'Test melding',
      currentYear: 'Nåværende år',
    },
  },
  {
    slug: 'order-confirmation',
    name: 'Ordrebekreftelse',
    category: 'TRANSACTIONAL' as const,
    language: 'no',
    subject: 'Ordrebekreftelse - {{eventName}}',
    preheader: 'Din bestilling er bekreftet',
    htmlContent: `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ordrebekreftelse</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Ordrebekreftelse</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hei {{recipientName}},</p>
    
    <p style="font-size: 16px;">Takk for din bestilling! Vi har mottatt din betaling og din påmelding er nå bekreftet.</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #667eea; margin-top: 0; font-size: 20px;">{{eventName}}</h2>
      <p style="margin: 5px 0;"><strong>Dato:</strong> {{eventDate}}</p>
      <p style="margin: 5px 0;"><strong>Beløp betalt:</strong> {{orderTotal}}</p>
      <p style="margin: 5px 0;"><strong>Ordrenummer:</strong> {{orderNumber}}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ticketUrl}}" style="display: inline-block; background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Se din billett</a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      Du finner din billett med QR-kode på lenken ovenfor. Husk å ta med billetten når du møter opp!
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Med vennlig hilsen,<br>
      <strong>{{organizationName}}</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>Spørsmål? Svar på denne e-posten eller kontakt oss.</p>
    <p>&copy; {{currentYear}} {{organizationName}}. Alle rettigheter reservert.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hei {{recipientName}},

Takk for din bestilling! Vi har mottatt din betaling og din påmelding er nå bekreftet.

{{eventName}}
Dato: {{eventDate}}
Beløp betalt: {{orderTotal}}
Ordrenummer: {{orderNumber}}

Se din billett: {{ticketUrl}}

Du finner din billett med QR-kode på lenken ovenfor. Husk å ta med billetten når du møter opp!

Med vennlig hilsen,
{{organizationName}}

Spørsmål? Svar på denne e-posten eller kontakt oss.

© {{currentYear}} {{organizationName}}. Alle rettigheter reservert.`,
    variables: {
      recipientName: 'Mottakers navn',
      organizationName: 'Organisasjonsnavn',
      organizationLogo: 'URL til organisasjonens logo',
      eventName: 'Navn på kurs/arrangement',
      eventDate: 'Dato for arrangement',
      orderTotal: 'Totalt beløp betalt',
      orderNumber: 'Ordrenummer',
      ticketUrl: 'Lenke til billett',
      currentYear: 'Nåværende år',
    },
  },
  {
    slug: 'membership-approved',
    name: 'Medlemskap godkjent',
    category: 'NOTIFICATION' as const,
    language: 'no',
    subject: 'Ditt medlemskap er godkjent!',
    preheader: 'Velkommen som medlem i {{organizationName}}',
    htmlContent: `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Medlemskap godkjent</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Velkommen som medlem!</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hei {{recipientName}},</p>
    
    <p style="font-size: 16px;">Gratulerer! Ditt medlemskap i <strong>{{organizationName}}</strong> er nå godkjent og aktivt.</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
      <p style="font-size: 14px; color: #666; margin: 0;">Ditt medlemsnummer</p>
      <p style="font-size: 32px; font-weight: bold; color: #11998e; margin: 10px 0;">{{memberNumber}}</p>
      <p style="font-size: 14px; color: #666; margin: 0;">Gyldig til: {{validUntil}}</p>
    </div>
    
    <div style="background-color: #e8f5e9; padding: 20px; margin: 20px 0; border-left: 4px solid #11998e; border-radius: 4px;">
      <h3 style="margin-top: 0; color: #11998e;">Dine medlemsfordeler:</h3>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Reduserte priser på kurs og arrangementer</li>
        <li>Tilgang til medlemsarrangementer</li>
        <li>Digital medlemskort med QR-kode</li>
        <li>Stemmerett på generalforsamling</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{membershipCardUrl}}" style="display: inline-block; background-color: #11998e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Se ditt medlemskort</a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Med vennlig hilsen,<br>
      <strong>{{organizationName}}</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} {{organizationName}}. Alle rettigheter reservert.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hei {{recipientName}},

Gratulerer! Ditt medlemskap i {{organizationName}} er nå godkjent og aktivt.

Ditt medlemsnummer: {{memberNumber}}
Gyldig til: {{validUntil}}

Dine medlemsfordeler:
- Reduserte priser på kurs og arrangementer
- Tilgang til medlemsarrangementer
- Digital medlemskort med QR-kode
- Stemmerett på generalforsamling

Se ditt medlemskort: {{membershipCardUrl}}

Med vennlig hilsen,
{{organizationName}}

© {{currentYear}} {{organizationName}}. Alle rettigheter reservert.`,
    variables: {
      recipientName: 'Mottakers navn',
      organizationName: 'Organisasjonsnavn',
      memberNumber: 'Medlemsnummer',
      validUntil: 'Gyldig til dato',
      membershipCardUrl: 'Lenke til medlemskort',
      currentYear: 'Nåværende år',
    },
  },
  {
    slug: 'waitlist-offer',
    name: 'Venteliste tilbud',
    category: 'NOTIFICATION' as const,
    language: 'no',
    subject: 'Ledig plass på {{eventName}}!',
    preheader: 'Du har nå mulighet til å melde deg på',
    htmlContent: `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ledig plass</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎊 Ledig plass!</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hei {{recipientName}},</p>
    
    <p style="font-size: 16px;">Gode nyheter! Det har blitt ledig plass på <strong>{{eventName}}</strong>.</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #f5576c; margin-top: 0; font-size: 20px;">{{eventName}}</h2>
      <p style="margin: 5px 0;"><strong>Dato:</strong> {{eventDate}}</p>
      <p style="margin: 5px 0;"><strong>Pris:</strong> {{price}}</p>
    </div>
    
    <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⏰ Viktig:</strong> Dette tilbudet utløper <strong>{{expiryDate}}</strong>. Vær rask!
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{paymentUrl}}" style="display: inline-block; background-color: #f5576c; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Bekreft påmelding</a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      Hvis du ikke lenger er interessert, kan du se bort fra denne e-posten. Plassen vil da tilbys neste person på ventelisten.
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Med vennlig hilsen,<br>
      <strong>{{organizationName}}</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} {{organizationName}}. Alle rettigheter reservert.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hei {{recipientName}},

Gode nyheter! Det har blitt ledig plass på {{eventName}}.

{{eventName}}
Dato: {{eventDate}}
Pris: {{price}}

⏰ Viktig: Dette tilbudet utløper {{expiryDate}}. Vær rask!

Bekreft påmelding: {{paymentUrl}}

Hvis du ikke lenger er interessert, kan du se bort fra denne e-posten. Plassen vil da tilbys neste person på ventelisten.

Med vennlig hilsen,
{{organizationName}}

© {{currentYear}} {{organizationName}}. Alle rettigheter reservert.`,
    variables: {
      recipientName: 'Mottakers navn',
      organizationName: 'Organisasjonsnavn',
      eventName: 'Navn på kurs/arrangement',
      eventDate: 'Dato for arrangement',
      price: 'Pris for deltakelse',
      expiryDate: 'Utløpsdato for tilbud',
      paymentUrl: 'Lenke til betaling',
      currentYear: 'Nåværende år',
    },
  },
  // English templates
  {
    slug: 'test-email',
    name: 'Test Email',
    category: 'SYSTEM' as const,
    language: 'en',
    subject: 'Test Email from SalsaNor Platform',
    preheader: 'This is a test email',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Test Email</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hello {{recipientName}},</p>
    
    <p style="font-size: 16px;">{{testMessage}}</p>
    
    <p style="font-size: 16px;">If you receive this email, it means the email system is working correctly! 🎉</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #666;">
        <strong>Tip:</strong> You can now configure email templates and send automatic emails for order confirmations, tickets, waitlists, and more.
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>SalsaNor Platform</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} SalsaNor Platform. All rights reserved.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hello {{recipientName}},

{{testMessage}}

If you receive this email, it means the email system is working correctly!

Tip: You can now configure email templates and send automatic emails for order confirmations, tickets, waitlists, and more.

Best regards,
SalsaNor Platform

© {{currentYear}} SalsaNor Platform. All rights reserved.`,
    variables: {
      recipientName: 'Recipient name',
      testMessage: 'Test message',
      currentYear: 'Current year',
    },
  },
  {
    slug: 'order-confirmation',
    name: 'Order Confirmation',
    category: 'TRANSACTIONAL' as const,
    language: 'en',
    subject: 'Order Confirmation - {{eventName}}',
    preheader: 'Your order is confirmed',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Order Confirmation</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hi {{recipientName}},</p>
    
    <p style="font-size: 16px;">Thank you for your order! We have received your payment and your registration is now confirmed.</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #667eea; margin-top: 0; font-size: 20px;">{{eventName}}</h2>
      <p style="margin: 5px 0;"><strong>Date:</strong> {{eventDate}}</p>
      <p style="margin: 5px 0;"><strong>Amount Paid:</strong> {{orderTotal}}</p>
      <p style="margin: 5px 0;"><strong>Order Number:</strong> {{orderNumber}}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ticketUrl}}" style="display: inline-block; background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Your Ticket</a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      You will find your ticket with QR code at the link above. Remember to bring your ticket when you arrive!
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>{{organizationName}}</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>Questions? Reply to this email or contact us.</p>
    <p>&copy; {{currentYear}} {{organizationName}}. All rights reserved.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hi {{recipientName}},

Thank you for your order! We have received your payment and your registration is now confirmed.

{{eventName}}
Date: {{eventDate}}
Amount Paid: {{orderTotal}}
Order Number: {{orderNumber}}

View Your Ticket: {{ticketUrl}}

You will find your ticket with QR code at the link above. Remember to bring your ticket when you arrive!

Best regards,
{{organizationName}}

Questions? Reply to this email or contact us.

© {{currentYear}} {{organizationName}}. All rights reserved.`,
    variables: {
      recipientName: 'Recipient name',
      organizationName: 'Organization name',
      organizationLogo: 'URL to organization logo',
      eventName: 'Course/event name',
      eventDate: 'Event date',
      orderTotal: 'Total amount paid',
      orderNumber: 'Order number',
      ticketUrl: 'Link to ticket',
      currentYear: 'Current year',
    },
  },
  {
    slug: 'membership-approved',
    name: 'Membership Approved',
    category: 'NOTIFICATION' as const,
    language: 'en',
    subject: 'Your membership has been approved!',
    preheader: 'Welcome as a member of {{organizationName}}',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Membership Approved</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome as a Member!</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hi {{recipientName}},</p>
    
    <p style="font-size: 16px;">Congratulations! Your membership with <strong>{{organizationName}}</strong> has been approved and is now active.</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
      <p style="font-size: 14px; color: #666; margin: 0;">Your membership number</p>
      <p style="font-size: 32px; font-weight: bold; color: #11998e; margin: 10px 0;">{{memberNumber}}</p>
      <p style="font-size: 14px; color: #666; margin: 0;">Valid until: {{validUntil}}</p>
    </div>
    
    <div style="background-color: #e8f5e9; padding: 20px; margin: 20px 0; border-left: 4px solid #11998e; border-radius: 4px;">
      <h3 style="margin-top: 0; color: #11998e;">Your Member Benefits:</h3>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Reduced prices on courses and events</li>
        <li>Access to member events</li>
        <li>Digital membership card with QR code</li>
        <li>Voting rights at general meetings</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{membershipCardUrl}}" style="display: inline-block; background-color: #11998e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Your Membership Card</a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>{{organizationName}}</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} {{organizationName}}. All rights reserved.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hi {{recipientName}},

Congratulations! Your membership with {{organizationName}} has been approved and is now active.

Your membership number: {{memberNumber}}
Valid until: {{validUntil}}

Your Member Benefits:
- Reduced prices on courses and events
- Access to member events
- Digital membership card with QR code
- Voting rights at general meetings

View Your Membership Card: {{membershipCardUrl}}

Best regards,
{{organizationName}}

© {{currentYear}} {{organizationName}}. All rights reserved.`,
    variables: {
      recipientName: 'Recipient name',
      organizationName: 'Organization name',
      memberNumber: 'Membership number',
      validUntil: 'Valid until date',
      membershipCardUrl: 'Link to membership card',
      currentYear: 'Current year',
    },
  },
  {
    slug: 'waitlist-offer',
    name: 'Waitlist Offer',
    category: 'NOTIFICATION' as const,
    language: 'en',
    subject: 'Spot Available for {{eventName}}!',
    preheader: 'You can now register',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spot Available</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎊 Spot Available!</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hi {{recipientName}},</p>
    
    <p style="font-size: 16px;">Good news! A spot has become available for <strong>{{eventName}}</strong>.</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #f5576c; margin-top: 0; font-size: 20px;">{{eventName}}</h2>
      <p style="margin: 5px 0;"><strong>Date:</strong> {{eventDate}}</p>
      <p style="margin: 5px 0;"><strong>Price:</strong> {{price}}</p>
    </div>
    
    <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⏰ Important:</strong> This offer expires <strong>{{expiryDate}}</strong>. Act fast!
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{paymentUrl}}" style="display: inline-block; background-color: #f5576c; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Confirm Registration</a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      If you are no longer interested, you can ignore this email. The spot will be offered to the next person on the waitlist.
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>{{organizationName}}</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} {{organizationName}}. All rights reserved.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hi {{recipientName}},

Good news! A spot has become available for {{eventName}}.

{{eventName}}
Date: {{eventDate}}
Price: {{price}}

⏰ Important: This offer expires {{expiryDate}}. Act fast!

Confirm Registration: {{paymentUrl}}

If you are no longer interested, you can ignore this email. The spot will be offered to the next person on the waitlist.

Best regards,
{{organizationName}}

© {{currentYear}} {{organizationName}}. All rights reserved.`,
    variables: {
      recipientName: 'Recipient name',
      organizationName: 'Organization name',
      eventName: 'Course/event name',
      eventDate: 'Event date',
      price: 'Participation price',
      expiryDate: 'Offer expiry date',
      paymentUrl: 'Payment link',
      currentYear: 'Current year',
    },
  },
  // Payment Failed - Norwegian
  {
    slug: 'payment-failed',
    name: 'Payment Failed',
    category: 'TRANSACTIONAL' as const,
    language: 'no',
    subject: 'Betaling mislyktes - {{organizationName}}',
    preheader: 'Din betaling kunne ikke behandles',
    htmlContent: `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Betaling mislyktes</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Betaling mislyktes</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hei {{recipientName}},</p>
    
    <p style="font-size: 16px;">Vi kunne dessverre ikke behandle betalingen din for <strong>{{eventName}}</strong>.</p>
    
    <div style="background-color: #fee2e2; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #991b1b;">
        <strong>Beløp:</strong> {{orderTotal}}<br>
        <strong>Ordrenummer:</strong> {{orderNumber}}<br>
        <strong>Årsak:</strong> {{failureReason}}
      </p>
    </div>
    
    <p style="font-size: 16px;">For å fullføre registreringen din, vennligst prøv igjen:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{paymentUrl}}" style="display: inline-block; padding: 15px 30px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        Prøv betaling på nytt
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      Hvis problemet vedvarer, vennligst kontakt din bank eller prøv et annet betalingskort.
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Med vennlig hilsen,<br>
      <strong>{{organizationName}}</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} {{organizationName}}. Alle rettigheter reservert.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hei {{recipientName}},

Vi kunne dessverre ikke behandle betalingen din for {{eventName}}.

Detaljer:
- Beløp: {{orderTotal}}
- Ordrenummer: {{orderNumber}}
- Årsak: {{failureReason}}

For å fullføre registreringen din, vennligst prøv igjen:
{{paymentUrl}}

Hvis problemet vedvarer, vennligst kontakt din bank eller prøv et annet betalingskort.

Med vennlig hilsen,
{{organizationName}}

© {{currentYear}} {{organizationName}}. Alle rettigheter reservert.`,
    variables: {
      recipientName: 'Mottakers navn',
      organizationName: 'Organisasjonens navn',
      eventName: 'Kurs/arrangement navn',
      orderTotal: 'Totalbeløp',
      orderNumber: 'Ordrenummer',
      failureReason: 'Årsak til feil',
      paymentUrl: 'Betalingslenke',
      currentYear: 'Inneværende år',
    },
  },

  // Payment Failed - English  
  {
    slug: 'payment-failed',
    name: 'Payment Failed',
    category: 'TRANSACTIONAL' as const,
    language: 'en',
    subject: 'Payment Failed - {{organizationName}}',
    preheader: 'Your payment could not be processed',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Payment Failed</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hi {{recipientName}},</p>
    
    <p style="font-size: 16px;">Unfortunately, we were unable to process your payment for <strong>{{eventName}}</strong>.</p>
    
    <div style="background-color: #fee2e2; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #991b1b;">
        <strong>Amount:</strong> {{orderTotal}}<br>
        <strong>Order Number:</strong> {{orderNumber}}<br>
        <strong>Reason:</strong> {{failureReason}}
      </p>
    </div>
    
    <p style="font-size: 16px;">To complete your registration, please try again:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{paymentUrl}}" style="display: inline-block; padding: 15px 30px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        Retry Payment
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      If the problem persists, please contact your bank or try a different payment card.
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>{{organizationName}}</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} {{organizationName}}. All rights reserved.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hi {{recipientName}},

Unfortunately, we were unable to process your payment for {{eventName}}.

Details:
- Amount: {{orderTotal}}
- Order Number: {{orderNumber}}
- Reason: {{failureReason}}

To complete your registration, please try again:
{{paymentUrl}}

If the problem persists, please contact your bank or try a different payment card.

Best regards,
{{organizationName}}

© {{currentYear}} {{organizationName}}. All rights reserved.`,
    variables: {
      recipientName: 'Recipient name',
      organizationName: 'Organization name',
      eventName: 'Course/event name',
      orderTotal: 'Total amount',
      orderNumber: 'Order number',
      failureReason: 'Failure reason',
      paymentUrl: 'Payment link',
      currentYear: 'Current year',
    },
  },

  // Welcome Email - Norwegian
  {
    slug: 'welcome',
    name: 'Welcome Email',
    category: 'SYSTEM' as const,
    language: 'no',
    subject: 'Velkommen til {{organizationName}}! 🎉',
    preheader: 'Kom i gang med din konto',
    htmlContent: `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Velkommen</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Velkommen!</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hei {{recipientName}},</p>
    
    <p style="font-size: 16px;">Velkommen til <strong>{{organizationName}}</strong>! Vi er glade for å ha deg med.</p>
    
    <p style="font-size: 16px;">Din konto er nå opprettet og klar til bruk. Her er noen ting du kan gjøre:</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">✨ Fullfør profilen din</li>
        <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">📅 Utforsk kommende arrangementer</li>
        <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">🎫 Meld deg på kurs og aktiviteter</li>
        <li style="padding: 10px 0;">💳 Bli medlem og få rabatter</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{profileUrl}}" style="display: inline-block; padding: 15px 30px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        Gå til min profil
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      Hvis du har spørsmål, ikke nøl med å ta kontakt med oss!
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Med vennlig hilsen,<br>
      <strong>{{organizationName}}</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} {{organizationName}}. Alle rettigheter reservert.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hei {{recipientName}},

Velkommen til {{organizationName}}! Vi er glade for å ha deg med.

Din konto er nå opprettet og klar til bruk. Her er noen ting du kan gjøre:

• Fullfør profilen din
• Utforsk kommende arrangementer
• Meld deg på kurs og aktiviteter
• Bli medlem og få rabatter

Gå til min profil: {{profileUrl}}

Hvis du har spørsmål, ikke nøl med å ta kontakt med oss!

Med vennlig hilsen,
{{organizationName}}

© {{currentYear}} {{organizationName}}. Alle rettigheter reservert.`,
    variables: {
      recipientName: 'Mottakers navn',
      organizationName: 'Organisasjonens navn',
      profileUrl: 'Profillenke',
      currentYear: 'Inneværende år',
    },
  },

  // Welcome Email - English
  {
    slug: 'welcome',
    name: 'Welcome Email',
    category: 'SYSTEM' as const,
    language: 'en',
    subject: 'Welcome to {{organizationName}}! 🎉',
    preheader: 'Get started with your account',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome!</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hi {{recipientName}},</p>
    
    <p style="font-size: 16px;">Welcome to <strong>{{organizationName}}</strong>! We're excited to have you join us.</p>
    
    <p style="font-size: 16px;">Your account is now created and ready to use. Here are some things you can do:</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">✨ Complete your profile</li>
        <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">📅 Explore upcoming events</li>
        <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">🎫 Register for courses and activities</li>
        <li style="padding: 10px 0;">💳 Become a member and get discounts</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{profileUrl}}" style="display: inline-block; padding: 15px 30px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        Go to my profile
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      If you have any questions, don't hesitate to reach out!
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>{{organizationName}}</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} {{organizationName}}. All rights reserved.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hi {{recipientName}},

Welcome to {{organizationName}}! We're excited to have you join us.

Your account is now created and ready to use. Here are some things you can do:

• Complete your profile
• Explore upcoming events
• Register for courses and activities
• Become a member and get discounts

Go to my profile: {{profileUrl}}

If you have any questions, don't hesitate to reach out!

Best regards,
{{organizationName}}

© {{currentYear}} {{organizationName}}. All rights reserved.`,
    variables: {
      recipientName: 'Recipient name',
      organizationName: 'Organization name',
      profileUrl: 'Profile link',
      currentYear: 'Current year',
    },
  },
  // EVENT_REMINDER - Norwegian
  {
    slug: 'event-reminder',
    name: 'Event Påminnelse',
    category: 'TRANSACTIONAL' as const,
    language: 'no',
    subject: 'Påminnelse: {{eventName}} starter snart!',
    preheader: 'Vi gleder oss til å se deg på arrangementet',
    htmlContent: `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Påminnelse</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
    <h1 style="color: white; margin: 0; font-size: 28px;">Event Påminnelse</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hei {{recipientName}},</p>
    
    <p style="font-size: 16px;">Dette er en vennlig påminnelse om at <strong>{{eventName}}</strong> starter snart!</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="margin-top: 0; color: #f5576c;">Detaljer</h2>
      <p style="margin: 10px 0;"><strong>📅 Dato:</strong> {{eventDate}}</p>
      <p style="margin: 10px 0;"><strong>🕐 Tid:</strong> {{eventTime}}</p>
      <p style="margin: 10px 0;"><strong>📍 Sted:</strong> {{eventLocation}}</p>
      <p style="margin: 10px 0;"><strong>🎫 Billett nr:</strong> {{ticketNumber}}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ticketUrl}}" style="background-color: #f5576c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Vis Min Billett
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      Vi ser frem til å se deg der! Husk å komme i god tid.
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Med vennlig hilsen,<br>
      <strong>{{organizerName}}</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} SalsaNor Platform. Alle rettigheter reservert.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hei {{recipientName}},

Dette er en vennlig påminnelse om at {{eventName}} starter snart!

DETALJER:
Dato: {{eventDate}}
Tid: {{eventTime}}
Sted: {{eventLocation}}
Billett nr: {{ticketNumber}}

Vis din billett: {{ticketUrl}}

Vi ser frem til å se deg der! Husk å komme i god tid.

Med vennlig hilsen,
{{organizerName}}

---
© {{currentYear}} SalsaNor Platform. Alle rettigheter reservert.`,
    variables: { 
      recipientName: 'Recipient name', 
      eventName: 'Event name',
      eventDate: 'Event date',
      eventTime: 'Event time',
      eventLocation: 'Event location',
      ticketNumber: 'Ticket number',
      ticketUrl: 'Ticket page link',
      organizerName: 'Organizer name',
      currentYear: 'Current year'
    },
  },
  // EVENT_REMINDER - English
  {
    slug: 'event-reminder',
    name: 'Event Reminder',
    category: 'TRANSACTIONAL' as const,
    language: 'en',
    subject: 'Reminder: {{eventName}} starts soon!',
    preheader: 'We look forward to seeing you at the event',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
    <h1 style="color: white; margin: 0; font-size: 28px;">Event Reminder</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hello {{recipientName}},</p>
    
    <p style="font-size: 16px;">This is a friendly reminder that <strong>{{eventName}}</strong> starts soon!</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="margin-top: 0; color: #f5576c;">Details</h2>
      <p style="margin: 10px 0;"><strong>📅 Date:</strong> {{eventDate}}</p>
      <p style="margin: 10px 0;"><strong>🕐 Time:</strong> {{eventTime}}</p>
      <p style="margin: 10px 0;"><strong>📍 Location:</strong> {{eventLocation}}</p>
      <p style="margin: 10px 0;"><strong>🎫 Ticket #:</strong> {{ticketNumber}}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ticketUrl}}" style="background-color: #f5576c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        View My Ticket
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      We look forward to seeing you there! Remember to arrive in good time.
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>{{organizerName}}</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} SalsaNor Platform. All rights reserved.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hello {{recipientName}},

This is a friendly reminder that {{eventName}} starts soon!

DETAILS:
Date: {{eventDate}}
Time: {{eventTime}}
Location: {{eventLocation}}
Ticket #: {{ticketNumber}}

View your ticket: {{ticketUrl}}

We look forward to seeing you there! Remember to arrive in good time.

Best regards,
{{organizerName}}

---
© {{currentYear}} SalsaNor Platform. All rights reserved.`,
    variables: { 
      recipientName: 'Recipient name', 
      eventName: 'Event name',
      eventDate: 'Event date',
      eventTime: 'Event time',
      eventLocation: 'Event location',
      ticketNumber: 'Ticket number',
      ticketUrl: 'Ticket page link',
      organizerName: 'Organizer name',
      currentYear: 'Current year'
    },
  },
  // MEMBERSHIP_RENEWAL_REMINDER - Norwegian
  {
    slug: 'membership-renewal-reminder',
    name: 'Medlemskap Fornyelse Påminnelse',
    category: 'TRANSACTIONAL' as const,
    language: 'no',
    subject: 'Ditt medlemskap utløper snart',
    preheader: 'Forny medlemskapet ditt for å fortsette å nyte fordelene',
    htmlContent: `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Medlemskap Fornyelse</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ffa751 0%, #ffe259 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <div style="font-size: 48px; margin-bottom: 10px;">⏰</div>
    <h1 style="color: #333; margin: 0; font-size: 28px;">Medlemskap Utløper Snart</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hei {{recipientName}},</p>
    
    <p style="font-size: 16px;">Ditt <strong>{{tierName}}</strong> medlemskap utløper snart.</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="margin-top: 0; color: #ffa751;">Medlemskapsdetaljer</h2>
      <p style="margin: 10px 0;"><strong>🎫 Medlemsnummer:</strong> {{memberNumber}}</p>
      <p style="margin: 10px 0;"><strong>📅 Utløpsdato:</strong> {{expiryDate}}</p>
      <p style="margin: 10px 0;"><strong>💎 Type:</strong> {{tierName}}</p>
    </div>
    
    <p style="font-size: 16px;">
      Forny medlemskapet ditt nå for å fortsette å nyte:
    </p>
    
    <ul style="font-size: 14px; line-height: 1.8;">
      <li>Tilgang til alle kurs og arrangementer</li>
      <li>Medlemsrabatter</li>
      <li>Prioritet ved påmelding</li>
      <li>Og mye mer!</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{renewalUrl}}" style="background-color: #ffa751; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Forny Medlemskap
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Med vennlig hilsen,<br>
      <strong>SalsaNor Platform</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} SalsaNor Platform. Alle rettigheter reservert.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hei {{recipientName}},

Ditt {{tierName}} medlemskap utløper snart.

MEDLEMSKAPSDETALJER:
Medlemsnummer: {{memberNumber}}
Utløpsdato: {{expiryDate}}
Type: {{tierName}}

Forny medlemskapet ditt nå for å fortsette å nyte:
- Tilgang til alle kurs og arrangementer
- Medlemsrabatter
- Prioritet ved påmelding
- Og mye mer!

Forny medlemskap: {{renewalUrl}}

Med vennlig hilsen,
SalsaNor Platform

---
© {{currentYear}} SalsaNor Platform. Alle rettigheter reservert.`,
    variables: { 
      recipientName: 'Recipient name',
      tierName: 'Membership tier name',
      memberNumber: 'Member number',
      expiryDate: 'Expiry date',
      renewalUrl: 'Renewal page link',
      currentYear: 'Current year'
    },
  },
  // MEMBERSHIP_RENEWAL_REMINDER - English
  {
    slug: 'membership-renewal-reminder',
    name: 'Membership Renewal Reminder',
    category: 'TRANSACTIONAL' as const,
    language: 'en',
    subject: 'Your membership expires soon',
    preheader: 'Renew your membership to continue enjoying the benefits',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Membership Renewal</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ffa751 0%, #ffe259 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <div style="font-size: 48px; margin-bottom: 10px;">⏰</div>
    <h1 style="color: #333; margin: 0; font-size: 28px;">Membership Expires Soon</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hello {{recipientName}},</p>
    
    <p style="font-size: 16px;">Your <strong>{{tierName}}</strong> membership expires soon.</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="margin-top: 0; color: #ffa751;">Membership Details</h2>
      <p style="margin: 10px 0;"><strong>🎫 Member Number:</strong> {{memberNumber}}</p>
      <p style="margin: 10px 0;"><strong>📅 Expiry Date:</strong> {{expiryDate}}</p>
      <p style="margin: 10px 0;"><strong>💎 Type:</strong> {{tierName}}</p>
    </div>
    
    <p style="font-size: 16px;">
      Renew your membership now to continue enjoying:
    </p>
    
    <ul style="font-size: 14px; line-height: 1.8;">
      <li>Access to all courses and events</li>
      <li>Member discounts</li>
      <li>Priority registration</li>
      <li>And much more!</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{renewalUrl}}" style="background-color: #ffa751; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Renew Membership
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>SalsaNor Platform</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} SalsaNor Platform. All rights reserved.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hello {{recipientName}},

Your {{tierName}} membership expires soon.

MEMBERSHIP DETAILS:
Member Number: {{memberNumber}}
Expiry Date: {{expiryDate}}
Type: {{tierName}}

Renew your membership now to continue enjoying:
- Access to all courses and events
- Member discounts
- Priority registration
- And much more!

Renew membership: {{renewalUrl}}

Best regards,
SalsaNor Platform

---
© {{currentYear}} SalsaNor Platform. All rights reserved.`,
    variables: { 
      recipientName: 'Recipient name',
      tierName: 'Membership tier name',
      memberNumber: 'Member number',
      expiryDate: 'Expiry date',
      renewalUrl: 'Renewal page link',
      currentYear: 'Current year'
    },
  },
  // PASSWORD_RESET - Norwegian
  {
    slug: 'password-reset',
    name: 'Tilbakestill Passord',
    category: 'TRANSACTIONAL' as const,
    language: 'no',
    subject: 'Tilbakestill passordet ditt',
    preheader: 'Følg denne lenken for å tilbakestille passordet ditt',
    htmlContent: `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tilbakestill Passord</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <div style="font-size: 48px; margin-bottom: 10px;">🔐</div>
    <h1 style="color: white; margin: 0; font-size: 28px;">Tilbakestill Passord</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hei {{recipientName}},</p>
    
    <p style="font-size: 16px;">Vi mottok en forespørsel om å tilbakestille passordet ditt.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{resetUrl}}" style="background-color: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Tilbakestill Passord
      </a>
    </div>
    
    <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⚠️ Viktig:</strong> Denne lenken utløper om {{expiryHours}} timer. Hvis du ikke ba om en passordtilbakestilling, kan du ignorere denne e-posten.
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      Hvis knappen over ikke fungerer, kan du kopiere og lime inn denne lenken i nettleseren din:
    </p>
    <p style="font-size: 12px; word-break: break-all; color: #667eea;">
      {{resetUrl}}
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Med vennlig hilsen,<br>
      <strong>SalsaNor Platform</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} SalsaNor Platform. Alle rettigheter reservert.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hei {{recipientName}},

Vi mottok en forespørsel om å tilbakestille passordet ditt.

Klikk på denne lenken for å tilbakestille passordet ditt:
{{resetUrl}}

⚠️ VIKTIG: Denne lenken utløper om {{expiryHours}} timer. Hvis du ikke ba om en passordtilbakestilling, kan du ignorere denne e-posten.

Med vennlig hilsen,
SalsaNor Platform

---
© {{currentYear}} SalsaNor Platform. Alle rettigheter reservert.`,
    variables: { 
      recipientName: 'Recipient name',
      resetUrl: 'Password reset link',
      expiryHours: 'Link expiry hours',
      currentYear: 'Current year'
    },
  },
  // PASSWORD_RESET - English
  {
    slug: 'password-reset',
    name: 'Password Reset',
    category: 'TRANSACTIONAL' as const,
    language: 'en',
    subject: 'Reset your password',
    preheader: 'Follow this link to reset your password',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <div style="font-size: 48px; margin-bottom: 10px;">🔐</div>
    <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hello {{recipientName}},</p>
    
    <p style="font-size: 16px;">We received a request to reset your password.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{resetUrl}}" style="background-color: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Reset Password
      </a>
    </div>
    
    <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⚠️ Important:</strong> This link expires in {{expiryHours}} hours. If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      If the button above doesn't work, you can copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; word-break: break-all; color: #667eea;">
      {{resetUrl}}
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>SalsaNor Platform</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} SalsaNor Platform. All rights reserved.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hello {{recipientName}},

We received a request to reset your password.

Click this link to reset your password:
{{resetUrl}}

⚠️ IMPORTANT: This link expires in {{expiryHours}} hours. If you didn't request a password reset, you can safely ignore this email.

Best regards,
SalsaNor Platform

---
© {{currentYear}} SalsaNor Platform. All rights reserved.`,
    variables: { 
      recipientName: 'Recipient name',
      resetUrl: 'Password reset link',
      expiryHours: 'Link expiry hours',
      currentYear: 'Current year'
    },
  },
  // REGISTRATION_CANCELLED - Norwegian
  {
    slug: 'registration-cancelled',
    name: 'Påmelding Kansellert',
    category: 'TRANSACTIONAL' as const,
    language: 'no',
    subject: 'Påmelding kansellert: {{courseName}}',
    preheader: 'Din påmelding har blitt kansellert',
    htmlContent: `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Påmelding Kansellert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
    <h1 style="color: #333; margin: 0; font-size: 28px;">Påmelding Kansellert</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hei {{recipientName}},</p>
    
    <p style="font-size: 16px;">Din påmelding til <strong>{{courseName}}</strong> har blitt kansellert.</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="margin-top: 0; color: #ee9ca7;">Kanselleringsdetaljer</h2>
      <p style="margin: 10px 0;"><strong>Kurs:</strong> {{courseName}}</p>
      <p style="margin: 10px 0;"><strong>Ordrenummer:</strong> {{orderNumber}}</p>
      <p style="margin: 10px 0;"><strong>Opprinnelig pris:</strong> {{orderTotal}}</p>
      <p style="margin: 10px 0;"><strong>Refusjon:</strong> {{refundAmount}}</p>
      <p style="margin: 10px 0;"><strong>Kansellert:</strong> {{cancelledDate}}</p>
    </div>
    
    <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>Refusjon:</strong> {{refundMessage}}
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      Hvis du kansellerte ved en feil, ta kontakt med oss så snart som mulig.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{organizerUrl}}" style="background-color: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Se Tilgjengelige Kurs
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Med vennlig hilsen,<br>
      <strong>{{organizerName}}</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} SalsaNor Platform. Alle rettigheter reservert.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hei {{recipientName}},

Din påmelding til {{courseName}} har blitt kansellert.

KANSELLERINGSDETALJER:
Kurs: {{courseName}}
Ordrenummer: {{orderNumber}}
Opprinnelig pris: {{orderTotal}}
Refusjon: {{refundAmount}}
Kansellert: {{cancelledDate}}

REFUSJON: {{refundMessage}}

Hvis du kansellerte ved en feil, ta kontakt med oss så snart som mulig.

Se tilgjengelige kurs: {{organizerUrl}}

Med vennlig hilsen,
{{organizerName}}

---
© {{currentYear}} SalsaNor Platform. Alle rettigheter reservert.`,
    variables: { 
      recipientName: 'Recipient name',
      courseName: 'Course name',
      orderNumber: 'Order number',
      orderTotal: 'Original order total',
      refundAmount: 'Refund amount',
      refundMessage: 'Refund status message',
      cancelledDate: 'Cancellation date',
      organizerName: 'Organizer name',
      organizerUrl: 'Organizer page link',
      currentYear: 'Current year'
    },
  },
  // REGISTRATION_CANCELLED - English
  {
    slug: 'registration-cancelled',
    name: 'Registration Cancelled',
    category: 'TRANSACTIONAL' as const,
    language: 'en',
    subject: 'Registration cancelled: {{courseName}}',
    preheader: 'Your registration has been cancelled',
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Cancelled</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
    <h1 style="color: #333; margin: 0; font-size: 28px;">Registration Cancelled</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hello {{recipientName}},</p>
    
    <p style="font-size: 16px;">Your registration for <strong>{{courseName}}</strong> has been cancelled.</p>
    
    <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="margin-top: 0; color: #ee9ca7;">Cancellation Details</h2>
      <p style="margin: 10px 0;"><strong>Course:</strong> {{courseName}}</p>
      <p style="margin: 10px 0;"><strong>Order Number:</strong> {{orderNumber}}</p>
      <p style="margin: 10px 0;"><strong>Original Price:</strong> {{orderTotal}}</p>
      <p style="margin: 10px 0;"><strong>Refund:</strong> {{refundAmount}}</p>
      <p style="margin: 10px 0;"><strong>Cancelled:</strong> {{cancelledDate}}</p>
    </div>
    
    <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>Refund:</strong> {{refundMessage}}
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      If you cancelled by mistake, please contact us as soon as possible.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{organizerUrl}}" style="background-color: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        View Available Courses
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>{{organizerName}}</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; {{currentYear}} SalsaNor Platform. All rights reserved.</p>
  </div>
</body>
</html>
    `,
    textContent: `Hello {{recipientName}},

Your registration for {{courseName}} has been cancelled.

CANCELLATION DETAILS:
Course: {{courseName}}
Order Number: {{orderNumber}}
Original Price: {{orderTotal}}
Refund: {{refundAmount}}
Cancelled: {{cancelledDate}}

REFUND: {{refundMessage}}

If you cancelled by mistake, please contact us as soon as possible.

View available courses: {{organizerUrl}}

Best regards,
{{organizerName}}

---
© {{currentYear}} SalsaNor Platform. All rights reserved.`,
    variables: { 
      recipientName: 'Recipient name',
      courseName: 'Course name',
      orderNumber: 'Order number',
      orderTotal: 'Original order total',
      refundAmount: 'Refund amount',
      refundMessage: 'Refund status message',
      cancelledDate: 'Cancellation date',
      organizerName: 'Organizer name',
      organizerUrl: 'Organizer page link',
      currentYear: 'Current year'
    },
  },
]

export async function seedEmailTemplates() {
  console.log('🌱 Seeding email templates...')
  
  for (const template of defaultTemplates) {
    // Check if template exists
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        organizerId: null,
        slug: template.slug,
        language: template.language,
      },
    })
    
    if (!existing) {
      await prisma.emailTemplate.create({
        data: {
          ...template,
          organizerId: null,
        },
      })
      console.log(`  ✓ Created template: ${template.name} (${template.language})`)
    } else {
      // Update existing template with new content
      await prisma.emailTemplate.update({
        where: { id: existing.id },
        data: {
          htmlContent: template.htmlContent,
          textContent: template.textContent,
          subject: template.subject,
          preheader: template.preheader,
          variables: template.variables,
        },
      })
      console.log(`  ↻ Updated template: ${template.name} (${template.language})`)
    }
  }
  
  console.log('✅ Email templates seeded!')
}

// Run if executed directly
if (require.main === module) {
  seedEmailTemplates()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
