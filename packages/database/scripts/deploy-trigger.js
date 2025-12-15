
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    await prisma.$executeRawUnsafe(`
    create or replace function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer set search_path = public
    as $$
    begin
      insert into public."UserAccount" ("supabaseUid", email)
      values (new.id, new.email);
      return new;
    end;
    $$;
  `);

    await prisma.$executeRawUnsafe(`
    create or replace trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  `);

    console.log('Trigger installed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
