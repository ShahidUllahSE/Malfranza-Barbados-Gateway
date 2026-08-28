import { createFileRoute } from "@tanstack/react-router";
import { Beds24ChannelPage } from "@/components/admin/Beds24ChannelPage";

export const Route = createFileRoute("/_authenticated/admin/channels/booking")({
  component: () => <Beds24ChannelPage channelId="booking" />,
});
