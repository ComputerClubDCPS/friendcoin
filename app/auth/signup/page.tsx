import { SignUp } from "@stackframe/stack"
import { FriendCoinLogo } from "@/components/friendcoin-logo"

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <FriendCoinLogo size={64} showStars className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Join FriendCoin</h1>
          <p className="text-gray-600 dark:text-gray-300">Create your account and start trading</p>
        </div>
        <SignUp />
      </div>
    </div>
  )
}
