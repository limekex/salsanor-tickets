
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Updating handle_new_user function to generate UUID...');

    // Updated function including gen_random_uuid() for the id column
    await prisma.$executeRawUnsafe(`
    create or replace function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer set search_path = public
    as $$
    begin
      insert into public."UserAccount" (id, "supabaseUid", email)
      values (gen_random_uuid(), new.id, new.email);
      return new;
    end;
    $$;
  `);

    console.log('Function updated successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
