import { RegisterForm } from '@/components/auth/RegisterForm';
export const metadata = { title: 'Create Account — VendorIQ' };
export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-dark bg-mesh-brand">
      <RegisterForm />
    </div>
  );
}
