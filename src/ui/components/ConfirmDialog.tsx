interface Props {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  return (
    <div class="dialog-backdrop">
      <div class="dialog" role="alertdialog" aria-modal="true" data-testid="confirm-dialog">
        <p data-testid="confirm-message">{message}</p>
        <div class="dialog-actions">
          <button type="button" class="btn" data-testid="confirm-cancel-button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            data-testid="confirm-ok-button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
