import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { BRAND } from '@/config/brand';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  /** Renders the brand lockup instead of a plain title. */
  brand?: boolean;
  actions?: ReactNode;
  /** Transparent variant used over full-bleed profile photos. */
  overlay?: boolean;
}

export function AppHeader({ title, showBack, brand, actions, overlay }: AppHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 mx-auto w-full max-w-[480px]',
        overlay ? 'bg-transparent' : 'border-b border-line bg-surface/90 backdrop-blur-lg',
      )}
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <div className="flex h-14 items-center gap-2 px-3">
        {showBack && (
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            aria-label="Go back"
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95',
              overlay ? 'bg-black/40 text-white backdrop-blur' : 'text-ink hover:bg-line/60',
            )}
          >
            <Icon name="chevron-left" size={22} />
          </button>
        )}

        {brand ? (
          <div className="flex items-center gap-2 px-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent text-brand-ink">
              <Icon name="heart" size={18} />
            </span>
            <span className="text-lg font-extrabold tracking-tight">{BRAND.name}</span>
          </div>
        ) : (
          title && (
            <h1
              className={cn(
                'truncate text-[17px] font-bold',
                overlay && 'text-white drop-shadow',
              )}
            >
              {title}
            </h1>
          )
        )}

        <div className="ml-auto flex items-center gap-1">{actions}</div>
      </div>
    </header>
  );
}
