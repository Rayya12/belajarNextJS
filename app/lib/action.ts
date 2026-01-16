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
const UpdateInvoice = FormSchema.omit({id:true,date:true})

export async function createInvoice(data:FormData){
    const {customerId,amount,status} = CreateInvoice.parse({
        customerId:data.get('customerId'),
        amount:data.get('amount'),
        status:data.get('status'),
    })

    const amountinCents = amount*100;
    const date = new Date().toISOString().split('T')[0];

    try{
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountinCents}, ${status}, ${date})
    `;
    }catch(error){
        console.error('Error creating invoice:', error);
        return {
            "message":"error creating invoice"
        }
    }    

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function updateInvoice(id: string, data: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: data.get('customerId'),
        amount: data.get('amount'),
        status: data.get('status'),
    })

    const amountinCents = amount*100;

    try{
        await sql`UPDATE invoices
        SET 
            customer_id = ${customerId},
            amount = ${amountinCents},
            status = ${status}
        WHERE id = ${id}
    `;
    }catch(error){
        console.error('Error updating invoice:', error);
        return {
            "message":"error updating invoice"
        }
    }
    

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    throw new Error('Delete invoice not implemented yet');
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
}