import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { InteractionType, Partner } from '@/types';
import { usePaymentFlow } from '@/hooks/usePaymentFlow';

const ACTIONS: { type: InteractionType; label: string; icon: IconName }[] = [
  { type: 'call', label: 'Call', icon: 'phone' },
  { type: 'chat', label: 'Chat', icon: 'chat' },
  { type: 'video', label: 'Video', icon: 'video' },
];

/**
 * Call / Chat / Video. Every tap opens the ₹99 sheet — including for someone
 * who has already paid. That is intentional: a payment buys one request, not
 * ongoing access.
 *
 * `compact` renders icon-only buttons for the discovery list; the labelled
 * layout is used on the profile screen where there is room for it.
 */
export function InteractionButtons({
  partner,
  size = 'md',
  compact = false,
}: {
  partner: Partner;
  size?: 'md' | 'lg';
  compact?: boolean;
}) {
  const { open } = usePaymentFlow();

  const handle = (type: InteractionType) => (event: React.MouseEvent) => {
    // Rows and cards are links; the action buttons must not navigate.
    event.preventDefault();
    event.stopPropagation();
    open(partner, type);
  };

  if (compact) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        {ACTIONS.map((action) => (
          <button
            key={action.type}
            type="button"
            onClick={handle(action.type)}
            aria-label={`${action.label} ${partner.name}`}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90',
              action.type === 'video'
                ? 'bg-brand text-brand-ink shadow-card'
                : 'bg-elevated text-ink ring-1 ring-line',
            )}
          >
            <Icon name={action.icon} size={16} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {ACTIONS.map((action) => (
        <button
          key={action.type}
          type="button"
          onClick={handle(action.type)}
          aria-label={`${action.label} ${partner.name}`}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-2xl font-semibold transition active:scale-[0.97]',
            size === 'lg' ? 'h-13 min-h-[52px] text-[15px]' : 'h-11 text-sm',
            action.type === 'video'
              ? 'bg-brand text-brand-ink shadow-card'
              : 'bg-elevated text-ink ring-1 ring-line hover:bg-line/40',
          )}
        >
          <Icon name={action.icon} size={size === 'lg' ? 19 : 17} />
          {action.label}
        </button>
      ))}
    </div>
  );
}
