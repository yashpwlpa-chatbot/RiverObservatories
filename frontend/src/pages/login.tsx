import { usePageMeta } from '@/lib/page-meta';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  usePageMeta('Sign in');
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <LoginForm />
    </div>
  );
}
