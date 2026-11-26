import React from "react";
import Modal from "./Modal";
import Button from "./Button";

/** Confirmation prompt for important or destructive actions. */
export default function ConfirmDialog({
  isOpen,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger-solid" : "primary"} onClick={onConfirm} loading={loading} loadingText="Please wait…">
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="px-5 py-5 text-sm leading-relaxed text-fg-secondary">{message}</p>
    </Modal>
  );
}
