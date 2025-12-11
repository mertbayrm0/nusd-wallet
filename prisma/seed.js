import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // 1. Cleanup
    await prisma.transaction.deleteMany();
    await prisma.p2PTrade.deleteMany();
    await prisma.p2POrder.deleteMany();
    await prisma.bankAccount.deleteMany();
    await prisma.merchant.deleteMany();
    await prisma.vault.deleteMany();
    await prisma.department.deleteMany();
    await prisma.user.deleteMany();

    // 2. Users
    const passwordHash = await bcrypt.hash('123456', 10);
    const adminHash = await bcrypt.hash('admin123', 10);

    const demoUser = await prisma.user.create({
        data: {
            email: 'demo@nusd.com',
            name: 'Kemal Öztürk',
            password: passwordHash,
            balance: 1500.00,
            role: 'user',
            trxAddress: 'TAVACpZWxdJyKoVbzC8fjvnrK15MmgYaXW',
            bankAccounts: {
                create: {
                    bankName: 'Ziraat Bankası',
                    iban: 'TR320006200011560000000001',
                    accountName: 'Kemal Öztürk'
                }
            }
        }
    });

    const investorUser = await prisma.user.create({
        data: {
            email: 'investor@nusd.com',
            name: 'Ayşe Demir',
            password: passwordHash,
            balance: 5000.00,
            role: 'user',
            trxAddress: 'TAVACpZWxdJyKoVbzC8fjvnrK15MmgYaXW',
            bankAccounts: {
                create: {
                    bankName: 'Garanti BBVA',
                    iban: 'TR330006100519786457841326',
                    accountName: 'Ayşe Demir'
                }
            }
        }
    });

    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@nusd.com',
            name: 'System Admin',
            password: adminHash,
            role: 'admin',
            trxAddress: 'TAVACpZWxdJyKoVbzC8fjvnrK15MmgYaXW'
        }
    });

    // 3. Departments
    const deptA = await prisma.department.create({
        data: { name: 'A Departmanı', color: '#10B981', category: 'MERCHANT' }
    });
    const deptB = await prisma.department.create({
        data: { name: 'B Departmanı', color: '#3B82F6', category: 'FOREX' }
    });
    const deptC = await prisma.department.create({
        data: { name: 'C Departmanı', color: '#8B5CF6', category: 'EXCHANGE' }
    });

    // 4. Vaults
    await prisma.vault.create({
        data: {
            name: 'Main Vault',
            address: 'TAeaxxAUqqpdKJmvg9JPHajTNQLRfwdJ3F',
            balance: 0.0,
            departmentId: deptA.id
        }
    });

    await prisma.vault.create({
        data: {
            name: 'Reserve Vault A',
            address: 'TFebbVDHovpwqRhCzXZsN9VcKiPqQ5zCgg',
            privateKey: 'A83E696084491C6193FFEDAA3F229590047DD95A62AC698DA9C50248B78FBC8E',
            departmentId: null // Unassigned
        }
    });

    await prisma.vault.create({
        data: {
            name: 'Reserve Vault B',
            address: 'TTdPusANCpsQ7m3zamqF542N2draowFwLB',
            privateKey: '33FA0420096BADBA9B8CE07C4B4833F69C1E34837EEA3C9F99CECE96F35F55BC',
            departmentId: null // Unassigned
        }
    });

    // 5. Merchant
    await prisma.merchant.create({
        data: {
            name: 'Firma A',
            slug: 'firma-a',
            departmentId: deptA.id,
            primaryColor: '#10B981'
        }
    });

    console.log('Seeding completed.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
