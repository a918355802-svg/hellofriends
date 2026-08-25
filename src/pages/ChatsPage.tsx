import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * Conversations live behind the paid interaction flow, which the current MVP
 * does not unlock, so this tab is intentionally an honest empty state rather
 * than a fake inbox.
 */
export default function ChatsPage() {
  const navigate = useNavigate();

  return (
    <>
      <AppHeader title="Chats" />
      <main className="px-4">
        <EmptyState
          icon="chat"
          title="No conversations yet"
          description="Open a profile and choose Chat, Call or Video to start a request."
          actionLabel="Find people"
          onAction={() => navigate('/discover')}
        />
      </main>
    </>
  );
}
