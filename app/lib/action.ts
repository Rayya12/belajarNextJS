'use server'

import {z} from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';




const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
    id:z.string(),
    customerId:z.string({invalid_type_error:'Customer is required'}),
    amount:z.coerce.number().gt(0,{message:'Amount must be greater than 0'}),
    status:z.enum(['paid','pending'],{invalid_type_error:'Status is required'}),
    date:z.string().optional()

})

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

const CreateInvoice = FormSchema.omit({id:true,date:true})
const UpdateInvoice = FormSchema.omit({id:true,date:true})

export async function createInvoice(prevState:State,data:FormData){
    const validatedFields = CreateInvoice.safeParse({
        customerId:data.get('customerId'),
        amount:data.get('amount'),
        status:data.get('status'),
    })

    if(!validatedFields.success){
        const fieldErrors = validatedFields.error.flatten().fieldErrors;
        return{
            errors:{fieldErrors},
            message:"Missing Fields. Failed to Create Invoice."
        }
    }

    const { customerId, amount, status } = validatedFields.data;

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

export async function updateInvoice(id: string,prevState:State, data: FormData) {
    const validatedFields = UpdateInvoice.safeParse({
        customerId: data.get('customerId'),
        amount: data.get('amount'),
        status: data.get('status'),
    })

    if(!validatedFields.success){
        const fieldErrors = validatedFields.error.flatten().fieldErrors;
        return{
            errors:{fieldErrors},
            message:"Missing Fields. Failed to Update Invoice."
        }
    }
    const {customerId,amount,status} = validatedFields.data;

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
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
}