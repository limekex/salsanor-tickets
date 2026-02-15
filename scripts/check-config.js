const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.paymentConfig.findUnique({ 
    where: { provider: 'STRIPE' } 
  });
  
  console.log('PaymentConfig:', {
    enabled: config?.enabled,
    useStripeConnect: config?.useStripeConnect,
    hasPublishableKey: !!config?.publishableKey,
    hasSecretKey: !!config?.secretKey,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
