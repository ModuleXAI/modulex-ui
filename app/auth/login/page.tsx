import { LoginForm } from '@/components/login-form'
import Image from 'next/image'

export default function Page() {
  return (
    <div className="grid min-h-svh w-full grid-cols-1 md:grid-cols-5 ml-2.5">
      <div className="flex items-center justify-center p-6 md:p-10 md:col-span-3">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
      <div className="relative hidden md:flex md:col-span-2 items-center justify-center pt-6 pr-6 pb-6 md:pt-10 md:pr-10 md:pb-10">
        <Image
          src="/login-picture.svg"
          alt="Login illustration"
          width={640}
          height={640}
          priority
          className="w-full h-auto max-w-[360px] md:max-w-[420px] object-contain origin-center scale-y-125 md:scale-y-150"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-background/60 via-background/30 to-transparent" />
      </div>
    </div>
  )
}
