import { LoginForm } from '@/components/auth/LoginForm';
export const metadata = { title: 'Sign In — VendorIQ' };
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-dark bg-mesh-brand">
      <LoginForm />
    </div>
  );
}
