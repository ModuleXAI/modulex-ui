import { redirect } from 'next/navigation'

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  redirect(`/organizations/${slug}/settings/browse`)
}


