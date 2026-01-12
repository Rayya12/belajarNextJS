'use server'

import {z} from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
    id:z.string(),
    customerId:z.string(),
    amount:z.coerce.number(),
    status:z.enum(['paid','pending']),
    date:z.string().optional()
})

const CreateInvoice = FormSchema.omit({id:true,date:true})

export async function createInvoice(data:FormData){
    const {customerId,amount,status} = CreateInvoice.parse({
        customerId:data.get('customerId'),
        amount:data.get('amount'),
        status:data.get('status'),
    })

    const amountinCents = amount*100;
    const date = new Date().toISOString().split('T')[0];

    await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountinCents}, ${status}, ${date})
    `

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}