export async function getServerOrganizationId(): Promise<string | null> {
  try {
    const { cookies } = await import('next/headers')
    const store = await cookies()
    return store.get('selected_organization_id')?.value ?? null
  } catch {
    return null
  }
}

