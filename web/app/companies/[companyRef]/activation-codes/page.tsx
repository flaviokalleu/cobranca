import { redirect } from 'next/navigation';

export default function CompanyActivationAliasPage({
  params,
}: {
  params: { companyRef: string };
}) {
  redirect(`/dashboard/companies/${params.companyRef}/activation-codes`);
}
