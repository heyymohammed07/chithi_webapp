import React from "react";
import { NotFoundScreen } from "@/components/system/NotFoundScreen";

export default function MailboxNotFound() {
  return (
    <NotFoundScreen
      title="This mailbox has faded."
      description="The clock ran out and this mailbox has safely dissolved into ash. You can create your own mailbox to receive letters."
      actionText="Create a Mailbox"
      actionHref="/"
    />
  );
}
