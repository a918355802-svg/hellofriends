import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { REPORT_REASONS, reportPartner } from '@/services/reports.service';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useToast } from '@/hooks/useToast';
import { friendlyError } from '@/lib/errors';

/** Safety: lets any guest flag a profile for admin review. */
export function ReportSheet({
  open,
  partnerId,
  partnerName,
  onClose,
}: {
  open: boolean;
  partnerId: string;
  partnerName: string;
  onClose: () => void;
}) {
  const { uid } = useGuestSession();
  const toast = useToast();
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!uid) return;
    setSubmitting(true);
    try {
      await reportPartner({ reporterUid: uid, profileId: partnerId, reason, details });
      toast.success('Thanks — our team will review this profile.');
      setDetails('');
      onClose();
    } catch (cause) {
      toast.error(friendlyError(cause, 'Could not send the report.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`Report ${partnerName}`}>
      <div className="pb-3">
        <p className="text-sm text-muted">
          Tell us what is wrong. Reports are confidential and reviewed by our safety team.
        </p>

        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">Reason</legend>
          {REPORT_REASONS.map((item) => (
            <label
              key={item}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm ring-1 transition',
                reason === item ? 'bg-brand-soft ring-brand' : 'bg-elevated ring-line',
              )}
            >
              <input
                type="radio"
                name="report-reason"
                value={item}
                checked={reason === item}
                onChange={() => setReason(item)}
                className="h-4 w-4 accent-[rgb(var(--c-brand))]"
              />
              {item}
            </label>
          ))}
        </fieldset>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-semibold">Anything else? (optional)</span>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value.slice(0, 1000))}
            rows={3}
            placeholder="Add any detail that helps us review this."
            className="w-full rounded-2xl border border-line bg-surface p-3 text-[15px] outline-none transition focus:border-brand"
          />
        </label>

        <div className="mt-5 space-y-2.5">
          <Button size="lg" fullWidth loading={submitting} onClick={submit} disabled={!uid}>
            Submit report
          </Button>
          <Button size="lg" variant="ghost" fullWidth onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
