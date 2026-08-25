import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <>
      <AppHeader title="Not found" showBack />
      <EmptyState
        icon="compass"
        title="This page does not exist"
        description="The link may be old or mistyped."
        actionLabel="Go to home"
        onAction={() => navigate('/')}
      />
    </>
  );
}
