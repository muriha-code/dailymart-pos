import { redirect } from 'next/navigation';

export default function PosPageRedirect() {
  redirect('/cashier/transactions');
}
