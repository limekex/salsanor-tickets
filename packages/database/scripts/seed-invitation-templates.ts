/**
 * Script to seed email templates for user invitations
 * Run with: npx tsx scripts/seed-invitation-templates.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const invitationTemplates = [
  // Norwegian templates
  {
    slug: 'user-invitation',
    name: 'User Invitation',
    category: 'NOTIFICATION' as const,
    language: 'no',
    subject: 'Du er invitert til {{organizationName}}',
    preheader: 'Opprett din konto og bli med i teamet',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitasjon</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{{organizationName}}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">Du er invitert! 🎉</h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                <strong>{{inviterName}}</strong> har invitert deg til å bli med i <strong>{{organizationName}}</strong> som <strong>{{role}}</strong>.
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                Klikk på knappen nedenfor for å opprette din konto og komme i gang.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{{inviteUrl}}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">
                      Aksepter invitasjon
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 32px 0 0 0;">
                Denne invitasjonen utløper <strong>{{expiresAt}}</strong>.
              </p>
              
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0;">
                Hvis du ikke forventet denne e-posten, kan du trygt ignorere den.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                Denne e-posten ble sendt fra {{organizationName}} via RegiNor-plattformen.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    textContent: `Du er invitert til {{organizationName}}!

{{inviterName}} har invitert deg til å bli med i {{organizationName}} som {{role}}.

Klikk på lenken nedenfor for å akseptere invitasjonen:
{{inviteUrl}}

Denne invitasjonen utløper {{expiresAt}}.

Hvis du ikke forventet denne e-posten, kan du trygt ignorere den.`,
    variables: {
      organizationName: 'Navn på organisasjonen',
      inviterName: 'Navnet på personen som inviterte deg',
      role: 'Rollen du er tildelt',
      inviteUrl: 'URL for å akseptere invitasjonen',
      expiresAt: 'Utløpsdato for invitasjonen'
    }
  },
  {
    slug: 'role-assigned',
    name: 'Role Assigned Notification',
    category: 'NOTIFICATION' as const,
    language: 'no',
    subject: 'Du har fått en ny rolle i {{organizationName}}',
    preheader: 'Din tilgang er oppdatert',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ny rolle tildelt</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{{organizationName}}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">Ny rolle tildelt ✅</h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                <strong>{{inviterName}}</strong> har gitt deg rollen <strong>{{role}}</strong> i <strong>{{organizationName}}</strong>.
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                Du har nå tilgang til nye funksjoner basert på din nye rolle.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{{dashboardUrl}}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">
                      Gå til dashbord
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                Denne e-posten ble sendt fra {{organizationName}} via RegiNor-plattformen.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    textContent: `Ny rolle tildelt

{{inviterName}} har gitt deg rollen {{role}} i {{organizationName}}.

Du har nå tilgang til nye funksjoner basert på din nye rolle.

Gå til dashbord: {{dashboardUrl}}`,
    variables: {
      organizationName: 'Navn på organisasjonen',
      inviterName: 'Navnet på personen som tildelte rollen',
      role: 'Rollen du er tildelt',
      dashboardUrl: 'URL til dashbordet'
    }
  },
  // English templates
  {
    slug: 'user-invitation',
    name: 'User Invitation',
    category: 'NOTIFICATION' as const,
    language: 'en',
    subject: 'You are invited to {{organizationName}}',
    preheader: 'Create your account and join the team',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{{organizationName}}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">You're Invited! 🎉</h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                <strong>{{inviterName}}</strong> has invited you to join <strong>{{organizationName}}</strong> as <strong>{{role}}</strong>.
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                Click the button below to create your account and get started.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{{inviteUrl}}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 32px 0 0 0;">
                This invitation expires on <strong>{{expiresAt}}</strong>.
              </p>
              
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0;">
                If you weren't expecting this email, you can safely ignore it.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                This email was sent from {{organizationName}} via the RegiNor platform.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    textContent: `You are invited to {{organizationName}}!

{{inviterName}} has invited you to join {{organizationName}} as {{role}}.

Click the link below to accept the invitation:
{{inviteUrl}}

This invitation expires on {{expiresAt}}.

If you weren't expecting this email, you can safely ignore it.`,
    variables: {
      organizationName: 'Name of the organization',
      inviterName: 'Name of the person who invited you',
      role: 'The role you are assigned',
      inviteUrl: 'URL to accept the invitation',
      expiresAt: 'Expiration date of the invitation'
    }
  },
  {
    slug: 'role-assigned',
    name: 'Role Assigned Notification',
    category: 'NOTIFICATION' as const,
    language: 'en',
    subject: 'You have been assigned a new role in {{organizationName}}',
    preheader: 'Your access has been updated',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Role Assigned</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{{organizationName}}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">New Role Assigned ✅</h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                <strong>{{inviterName}}</strong> has assigned you the role <strong>{{role}}</strong> in <strong>{{organizationName}}</strong>.
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                You now have access to new features based on your new role.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{{dashboardUrl}}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                This email was sent from {{organizationName}} via the RegiNor platform.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    textContent: `New Role Assigned

{{inviterName}} has assigned you the role {{role}} in {{organizationName}}.

You now have access to new features based on your new role.

Go to dashboard: {{dashboardUrl}}`,
    variables: {
      organizationName: 'Name of the organization',
      inviterName: 'Name of the person who assigned the role',
      role: 'The role you are assigned',
      dashboardUrl: 'URL to the dashboard'
    }
  }
]

async function main() {
  console.log('🌱 Seeding invitation email templates...')

  for (const template of invitationTemplates) {
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        slug: template.slug,
        language: template.language,
        organizerId: null
      }
    })

    if (existing) {
      console.log(`  ⏭️  Template "${template.slug}" (${template.language}) already exists, skipping...`)
      continue
    }

    await prisma.emailTemplate.create({
      data: template
    })

    console.log(`  ✅ Created template: ${template.slug} (${template.language})`)
  }

  console.log('\n✨ Done seeding invitation templates!')
}

main()
  .catch((e) => {
    console.error('Error seeding templates:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
