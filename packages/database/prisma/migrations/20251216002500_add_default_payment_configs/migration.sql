-- Create default PaymentConfig entries if they don't exist
INSERT INTO "PaymentConfig" (id, provider, enabled, "isTest", "createdAt", "updatedAt")
VALUES 
    (gen_random_uuid(), 'STRIPE', false, true, NOW(), NOW()),
    (gen_random_uuid(), 'VIPPS', false, true, NOW(), NOW())
ON CONFLICT (provider) DO NOTHING;
